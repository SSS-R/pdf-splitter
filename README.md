# PDF Tools — Split & Merge PDFs

A free, privacy-first PDF toolkit that runs entirely in your browser. No servers, no uploads, no sign-ups.

## Features

- ✂️ **Split PDFs** — Extract specific pages or ranges into separate files
- 🔗 **Merge PDFs** — Combine up to 3 PDF files into a single document
- 🔒 **100% Private** — All processing happens client-side using [pdf-lib](https://pdf-lib.js.org/)

## Tech Stack

- **React 19** + **Vite 7**
- **pdf-lib** for PDF manipulation
- **Lucide React** for icons
- Deployed on **GitHub Pages**

## Development

```bash
npm install
npm run dev
```

## Deploy to GitHub Pages

### Option 1: GitHub Actions (Recommended)

1. Push this repo to GitHub.
2. Go to **Settings → Pages → Source** and select **GitHub Actions**.
3. Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

4. Push the workflow file and your site will deploy automatically.

### Option 2: Manual deploy with `gh-pages`

```bash
npm install -D gh-pages
npx gh-pages -d dist
```

> **Note:** The `base` path in `vite.config.js` is set to `/pdf-splitter/`. If your GitHub repo has a different name, update it accordingly.

## License

MIT
