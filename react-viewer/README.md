# Examen Flashcards

React + Vite app that lets you quickly review Spanish driver-exam questions from a large JSON dataset (`public/json/data.json`). It ships as a Progressive Web App (PWA) so you can install it on mobile and use it offline once cached.

## Local development

```bash
npm install
npm run dev   # opens https://localhost:5173 by default
npm run build # validates production build
```

## Deploying to GitHub Pages (HTTPS)

This repository now includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds the site and publishes the `dist/` folder to GitHub Pages automatically.

1. **Repository settings**
   - Push these changes to the `main` branch on GitHub.
   - In the repo, go to **Settings → Pages** and set “Source” to **GitHub Actions**.
2. **Trigger a build**
   - Every push to `main` (or a manual “Run workflow”) will:
     - install dependencies with `npm ci`
     - run `npm run build`
     - upload `dist/` as the Pages artifact
     - deploy it with `actions/deploy-pages`.
3. **Live URL**
   - Once the workflow finishes, the app is live at `https://drving-test.github.io/react-viewer/`.
   - If you later move the repo or use a custom domain, update the `base` option inside `vite.config.ts` accordingly so asset paths stay correct.

## Offline/PWA notes

- The Vite PWA plugin injects the `public/sw.js` service worker during build.
- Remember to bump the version (e.g., tweak `public/sw.js`) when you want clients to refresh cached assets.
