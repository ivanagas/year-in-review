# Year in Review Review

A Next.js web application that curates and displays a collection of "year in review" blog posts from around the web. Browse posts by year, filter by author, sort by various criteria, and discover interesting year-end reflections from different writers.

## Features

- Browse year-in-review posts filtered by year
- Sort posts by author, streak (consecutive years), or word count
- View statistics including total posts, unique authors, longest streaks, and most prolific writers
- Random post picker for serendipitous discovery
- Automatically extracts metadata (title, author, preview, word count) from post URLs

## Getting Started

First, install dependencies:

```bash
npm install
```

Then, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

The page auto-updates as you edit files.

## Scripts

The project includes utility scripts for managing the post collection:

### Extract URLs from Data

Extract all URLs from `app/data.ts` and write them to `script/urls.txt`:

```bash
node script/extract-urls.mjs
```

This is useful for generating a list of all currently tracked posts.

### Add Posts from URLs

Read URLs from `script/urls.txt`, fetch metadata from each URL, and add new posts or enrich existing ones in `app/data.ts`:

```bash
node script/add-posts-from-urls.mjs
```

**How it works:**
- Reads URLs from `script/urls.txt` (one URL per line)
- For each URL:
  - If it's a new URL: fetches the page, extracts metadata (title, author, preview, word count), and adds it to `app/data.ts`
  - If it already exists: checks if it's missing preview or word count data, and enriches it if needed
- Automatically infers the year from the URL or uses the current year
- Extracts author information from meta tags, JSON-LD, or uses the domain name as fallback
- Formats the output using Prettier

**Usage workflow:**
1. Add new URLs to `script/urls.txt` (one per line)
2. Run `node script/add-posts-from-urls.mjs`
3. The script will fetch metadata and update `app/data.ts` automatically

## Project Structure

- `app/page.tsx` - Main page component with filtering and sorting
- `app/data.ts` - Post data array (auto-generated/updated by scripts)
- `app/components/` - React components (PostList, YearFilter)
- `script/add-posts-from-urls.mjs` - Script to add/enrich posts from URLs
- `script/extract-urls.mjs` - Script to extract URLs from data.ts
- `script/urls.txt` - List of URLs to process (one per line)

## Todo

- [ ] Add survey with PostHog asking for year in review posts to add
- [ ] Tag each post with LLM generated tags
- [ ] Sort by tag