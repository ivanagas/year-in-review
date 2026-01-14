import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Project, SyntaxKind } from "ts-morph";
import { request } from "undici";
import * as cheerio from "cheerio";
import prettier from "prettier";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_TS = path.join(__dirname, "..", "app", "data.ts");
const URLS_TXT = path.join(__dirname, "urls.txt");

function slugify(str) {
  return String(str)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
}

function inferYear(url) {
  // common patterns: /2025/, /2025/Dec/31/, ?year=2025, etc.
  const m = String(url).match(/(19|20)\d{2}/);
  return m ? Number(m[0]) : new Date().getFullYear();
}

function hostLabel(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
}

async function fetchHtml(url) {
  let currentUrl = url;
  let redirectCount = 0;
  const maxRedirects = 5;
  
  while (redirectCount <= maxRedirects) {
    const res = await request(currentUrl, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (compatible; YearInReviewBot/1.0; +https://example.invalid)",
        accept: "text/html,application/xhtml+xml",
      },
    });
    
    if (res.statusCode >= 300 && res.statusCode < 400) {
      const location = res.headers.location;
      if (!location) throw new Error(`HTTP ${res.statusCode} without Location header`);
      currentUrl = new URL(location, currentUrl).href;
      redirectCount++;
      continue;
    }
    
    if (res.statusCode >= 400) throw new Error(`HTTP ${res.statusCode}`);
    return await res.body.text();
  }
  
  throw new Error(`Too many redirects (${maxRedirects})`);
}

function pickMeta($, selectors) {
  for (const sel of selectors) {
    const v = $(sel).attr("content");
    if (v && v.trim()) return v.trim();
  }
  return null;
}

function extractFromJsonLd($) {
  // Look for JSON-LD with author/name
  const scripts = $('script[type="application/ld+json"]')
    .map((_, el) => $(el).text())
    .get();

  for (const raw of scripts) {
    try {
      const data = JSON.parse(raw);
      const nodes = Array.isArray(data) ? data : [data];
      for (const n of nodes) {
        // Article-ish
        const author = n?.author;
        if (author) {
          if (typeof author === "string") return { author };
          if (Array.isArray(author) && author[0]?.name) return { author: author[0].name };
          if (author?.name) return { author: author.name };
        }
        if (n?.name && n?.["@type"] && /person/i.test(String(n["@type"]))) {
          return { author: n.name };
        }
      }
    } catch {
      // ignore
    }
  }
  return {};
}

function extractPreview($) {
  // Try og:description first
  const ogDesc = pickMeta($, [
    'meta[property="og:description"]',
    'meta[name="description"]',
    'meta[name="twitter:description"]',
  ]);
  if (ogDesc) return ogDesc;

  // Try to find the first substantial paragraph in article/main content
  const contentSelectors = [
    'article p',
    'main p',
    '.post-content p',
    '.entry-content p',
    '.content p',
    'p',
  ];

  for (const selector of contentSelectors) {
    const paragraphs = $(selector);
    for (let i = 0; i < paragraphs.length; i++) {
      const text = $(paragraphs[i]).text().trim();
      // Look for paragraphs with meaningful content (at least 50 chars, not all caps)
      if (text.length >= 50 && text.length <= 500 && text !== text.toUpperCase()) {
        return text;
      }
    }
  }

  return null;
}

function extractWordCount($) {
  // Try to find main content area
  const contentSelectors = [
    'article',
    'main',
    '.post-content',
    '.entry-content',
    '.content',
    'body',
  ];

  for (const selector of contentSelectors) {
    const content = $(selector);
    if (content.length > 0) {
      // Get text content, remove extra whitespace, and count words
      const text = content.text()
        .replace(/\s+/g, ' ')
        .trim();

      if (text.length > 100) {
        // Count words by splitting on whitespace
        const words = text.split(/\s+/).filter(w => w.length > 0);
        return words.length;
      }
    }
  }

  return null;
}

async function urlToPost(url) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);

  const title =
    pickMeta($, [
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      'meta[name="title"]',
    ]) ||
    $("title").first().text().trim() ||
    url;

  const metaAuthor =
    pickMeta($, [
      'meta[name="author"]',
      'meta[property="article:author"]',
      'meta[name="twitter:creator"]',
    ]) || null;

  const { author: jsonLdAuthor } = extractFromJsonLd($);

  const author = (metaAuthor || jsonLdAuthor || hostLabel(url)).replace(/^@/, "").trim();
  const year = inferYear(url);
  const preview = extractPreview($);
  const wordCount = extractWordCount($);

  return {
    url,
    title,
    author,
    year,
    preview,
    wordCount,
  };
}

function loadExistingPostsFromDataTs(sourceFile) {
  const posts = new Map(); // url -> { element, hasPreview, hasWordCount }
  const postsVar = sourceFile.getVariableDeclarationOrThrow("posts");
  const arr = postsVar.getInitializerIfKindOrThrow(SyntaxKind.ArrayLiteralExpression);

  for (const el of arr.getElements()) {
    const txt = el.getText();
    const urlMatch = txt.match(/url:\s*['"]([^'"]+)['"]/);

    if (urlMatch) {
      const url = urlMatch[1];
      const hasPreview = /preview:\s*['"]/.test(txt);
      const hasWordCount = /wordCount:\s*\d+/.test(txt);

      posts.set(url, {
        element: el,
        hasPreview,
        hasWordCount,
        url
      });
    }
  }

  return posts;
}

function makeId(author, year) {
  return `${slugify(author)}-${year}`;
}

async function main() {
  const urls = fs
    .readFileSync(URLS_TXT, "utf8")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (!urls.length) {
    console.error("urls.txt is empty");
    process.exit(1);
  }

  const project = new Project({ tsConfigFilePath: undefined });
  const sourceFile = project.addSourceFileAtPath(DATA_TS);

  const existingPosts = loadExistingPostsFromDataTs(sourceFile);

  const newOnes = [];
  const toEnrich = [];

  for (const url of urls) {
    const existing = existingPosts.get(url);

    if (existing) {
      // Check if we need to enrich this post
      if (!existing.hasPreview || !existing.hasWordCount) {
        toEnrich.push({ url, existing });
      }
    } else {
      // New post
      try {
        const info = await urlToPost(url);
        newOnes.push(info);
        console.log("✓ [new]", url);
      } catch (e) {
        console.warn("✗ [new]", url, "-", e.message || e);
      }
    }
  }

  // Enrich existing posts with missing data
  let enrichedCount = 0;
  for (const { url, existing } of toEnrich) {
    try {
      const info = await urlToPost(url);
      const el = existing.element;
      const txt = el.getText();

      // Build the updated post object text
      let updatedText = txt;

      // Add preview if missing
      if (!existing.hasPreview && info.preview) {
        const sanitizedPreview = info.preview.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/'/g, "\\'");
        const previewField = `\n      preview: '${sanitizedPreview}',`;
        // Insert before the closing brace
        updatedText = updatedText.replace(/(\n\s*})$/, `${previewField}$1`);
      }

      // Add wordCount if missing
      if (!existing.hasWordCount && info.wordCount) {
        const wordCountField = `\n      wordCount: ${info.wordCount},`;
        // Insert before the closing brace
        updatedText = updatedText.replace(/(\n\s*})$/, `${wordCountField}$1`);
      }

      if (updatedText !== txt) {
        el.replaceWithText(updatedText);
        enrichedCount++;
        console.log("✓ [enriched]", url);
      }
    } catch (e) {
      console.warn("✗ [enrich]", url, "-", e.message || e);
    }
  }

  if (!newOnes.length && !enrichedCount) {
    console.log("No new URLs to add and no posts to enrich.");
    return;
  }

  // Add new posts
  if (newOnes.length > 0) {
    const postsVar = sourceFile.getVariableDeclarationOrThrow("posts");
    const arr = postsVar.getInitializerIfKindOrThrow(SyntaxKind.ArrayLiteralExpression);

    // Track IDs to avoid collisions
    const existingIds = new Set(
      arr.getElements()
        .map((el) => el.getText().match(/id:\s*['"]([^'"]+)['"]/)?.[1])
        .filter(Boolean)
    );

    for (const p of newOnes) {
      let id = makeId(p.author, p.year);
      let i = 2;
      while (existingIds.has(id)) {
        id = `${makeId(p.author, p.year)}-${i++}`;
      }
      existingIds.add(id);

      const previewField = p.preview
        ? `\n      preview: '${p.preview.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/'/g, "\\'")}',`
        : '';
      const wordCountField = p.wordCount
        ? `\n      wordCount: ${p.wordCount},`
        : '';

      arr.addElement(`{
      id: '${id}',
      url: '${p.url}',
      year: ${p.year},
      author: '${p.author.replace(/'/g, "\\'")}',
      title: '${p.title.replace(/'/g, "\\''")}',${previewField}${wordCountField}
    }`);
    }
  }

  // Format with prettier
  const raw = sourceFile.getFullText();
  const formatted = await prettier.format(raw, { parser: "typescript" });
  fs.writeFileSync(DATA_TS, formatted, "utf8");

  console.log(`Added ${newOnes.length} new posts and enriched ${enrichedCount} existing posts.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
