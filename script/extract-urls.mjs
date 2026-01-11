import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Project, SyntaxKind } from "ts-morph";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_TS = path.join(__dirname, "..", "app", "data.ts");
const URLS_TXT = path.join(__dirname, "urls.txt");

function extractUrlsFromDataTs() {
  const project = new Project({ tsConfigFilePath: undefined });
  const sourceFile = project.addSourceFileAtPath(DATA_TS);

  const urls = [];
  const postsVar = sourceFile.getVariableDeclarationOrThrow("posts");
  const arr = postsVar.getInitializerIfKindOrThrow(SyntaxKind.ArrayLiteralExpression);

  for (const el of arr.getElements()) {
    const txt = el.getText();
    const urlMatch = txt.match(/url:\s*['"]([^'"]+)['"]/);

    if (urlMatch) {
      urls.push(urlMatch[1]);
    }
  }

  return urls;
}

function main() {
  try {
    console.log("Extracting URLs from data.ts...");

    const urls = extractUrlsFromDataTs();

    if (!urls.length) {
      console.error("No URLs found in data.ts");
      process.exit(1);
    }

    // Write URLs to file, one per line
    fs.writeFileSync(URLS_TXT, urls.join("\n") + "\n", "utf8");

    console.log(`✓ Extracted ${urls.length} URLs to urls.txt`);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
