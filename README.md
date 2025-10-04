# Consistent Hashing Demo

Interactive Vite + TypeScript app for experimenting with consistent hashing. The demo lets you add nodes, tweak replica counts, toggle node health, probe keys, and watch ownership shares/movement update in real time.

## Getting Started

```bash
npm install
npm run dev
```

`npm run dev` starts the Vite dev server. Open the printed URL to interact with the canvas and control panel.

## Available Scripts

- `npm run dev` – start the development server
- `npm run build` – produce a production build in `dist/`
- `npm run preview` – serve the built output locally

## Deployment

The project is configured for Vercel or any static host. Run `npm run build` and deploy the contents of `dist/`.

## Features

- Visual ring rendering with per-slot ownership coloring
- Node controls for replicas, health, and removal
- Live metrics showing per-node key share and key movement
- Probe tooling to inspect hash slots and owner sets
