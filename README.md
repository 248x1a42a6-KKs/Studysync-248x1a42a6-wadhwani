# StudySync

AI-generated study plans (1-7 days, your choice), grounded in the real syllabus (from the model's own knowledge) instead of generic topics.

## How it works
- `public/index.html` — the frontend the user sees (plain HTML/CSS/JS).
- `server.js` — a small backend that holds your Mistral API key secretly and
  calls the Mistral API on the frontend's behalf, asking it to recall the real
  syllabus for the subject/exam before building the plan.

Your API key never touches the browser — that's the whole point of the backend.

## Run it locally

1. Install Node.js 18+ if you don't have it: https://nodejs.org

2. Install dependencies:
   ```
   npm install
   ```

3. Get an API key from https://console.mistral.ai/api-keys

4. Copy `.env.example` to `.env` and paste your key in:
   ```
   cp .env.example .env
   ```
   Then edit `.env` so it has your real key.

5. Start the server:
   ```
   npm start
   ```

6. Open http://localhost:3000 in your browser. Try it out.

## Deploy it so others can use it

The easiest free option is **Render**:

1. Push this folder to a GitHub repo.
2. Go to https://render.com, sign up, click "New +" → "Web Service".
3. Connect your GitHub repo.
4. Build command: `npm install`. Start command: `npm start`.
5. Under "Environment", add `MISTRAL_API_KEY` with your real key as the value.
6. Deploy. Render gives you a public URL — that's your live site.

Other options that work the same way: **Railway**, **Vercel** (needs slight
adjustment for serverless functions instead of a long-running server), or your
own VPS. The important part everywhere is the same: the API key goes in the
host's environment variable settings, never in your code or in a file you
commit to GitHub.

## Cost note
Each plan generation is a single, plain Mistral call (no web search), so it's
quick (a few seconds) and cheap. Note that syllabus details come from the
model's training data, not a live lookup — for very new or niche courses,
double-check the topics it suggests.

## Install it as an app

### On your phone (PWA)
Once the site is running (locally at http://localhost:3000, or deployed per
above), it's installable as a Progressive Web App:

- **Android (Chrome)**: open the site, tap the ⋮ menu → "Install app" or "Add
  to Home screen".
- **iPhone (Safari)**: open the site, tap the Share icon → "Add to Home
  Screen".

It'll appear as a normal app icon and open full-screen, no browser bar. Note:
for this to work on your phone, the site needs to be reachable from your
phone — either deployed (see above) or on the same Wi-Fi network as your
computer using your computer's local IP instead of `localhost`.

### On Windows (desktop app)
This project includes an Electron wrapper that packages the whole app
(server + frontend) into a real `.exe`.

1. Install the extra dependencies:
   ```
   npm install
   ```
   (this pulls in `electron` and `electron-builder` from devDependencies)

2. Make sure your `.env` file has your real `MISTRAL_API_KEY` — the packaged
   app bundles whatever's in `.env` at build time.

3. To try it without building an installer first:
   ```
   npm run electron
   ```
   This opens StudySync in its own window (server running invisibly inside).

4. To build a real installable `.exe`:
   ```
   npm run dist
   ```
   This produces a Windows installer in the `dist/` folder using
   `electron-builder`. Run that installer to get StudySync as a normal
   Windows app with a Start Menu entry and desktop shortcut.

Note: since the API key ships inside the packaged app, only distribute the
built `.exe` to people you trust with that key — for wider distribution,
you'd want each user to enter their own key instead (a small addition: a
settings screen that writes to a local config file rather than `.env`).
