# Twistora

Twistora is a speedcubing web application that combines a precise timer with an interactive 3D Rubik's Cube simulator. It includes scramble generation, manual face and middle-slice turns, automatic solving, solve history, and performance statistics in a responsive interface with light and dark themes.

## Features

- Precision speedcubing timer.
- Interactive 3D cube with manual face and middle-slice moves.
- Cube scrambling and automatic solving.
- Scramble notation and training.
- Solve history and performance statistics.
- Responsive interface with light and dark themes.

## Technologies

- HTML5
- CSS3
- TypeScript
- Three.js
- Kociemba-based cube solving via the existing cube solver integration

## Local development

Requires Node.js 22 or newer and npm.

```sh
npm ci
npm start
```

Open `http://127.0.0.1:5173`. Run `npm run verify` to type-check, run the tests, build the static site, validate its entry points, and package it with Wrangler's dry run.

## Production preview

Twistora is a static browser application deployed as a Cloudflare Worker with static assets. `npm run preview` builds `dist/` and starts Wrangler locally; it does not deploy anything. The repository has no required environment variables or Cloudflare bindings.

The deploy command is `npm run deploy`. It builds before invoking Wrangler, but requires Cloudflare authentication and publishes remotely. It is intentionally not run by CI.

## Docker preview

Docker is for a reproducible build and local Wrangler preview, not the production runtime. Build and start the preview with:

```sh
docker compose up --build
```

Open `http://127.0.0.1:8787`. The container build runs type checking, tests, the production build, and static-output validation. Stop it with `Ctrl+C`.

## Credits

Made by MichaelAcostaDev

GitHub: [https://github.com/MichaelAcostaDev](https://github.com/MichaelAcostaDev)

LinkedIn: [https://www.linkedin.com/in/michael-acosta-dev](https://www.linkedin.com/in/michael-acosta-dev)
