<div align="center">

# BioNetGen Web Simulator

Interactive BNGL playground for building models, inspecting generated networks, and running ODE/SSA simulations entirely in the browser.

</div>

## Features

- Monaco-powered BNGL editor with syntax highlighting, example gallery, and file import/export helpers
- Dedicated web worker that parses BNGL, expands rule-based networks, and runs adaptive RK4 ODE or Gillespie SSA simulations
- Multi-tab visualization panel with time-course plots (Recharts), Cytoscape-powered reaction network graph, rule cartoons, parameter editing, structure analysis, and steady-state finder
- Light/dark theming, responsive Tailwind UI, and rich status messaging for parse/simulation feedback
- Stand-alone scripts for validating the worker bundle (`scripts/testParse.mjs`, `scripts/runWorkerTest.mjs`) and a growing Vitest suite for catalog integrity checks

## Quick Start

**Prerequisites:** Node.js 20+

```bash
npm install
npm run dev
```

The Vite dev server runs on `http://localhost:3000/` and hot-reloads as you edit code. No external API keys are required.

## Available Scripts

- `npm run dev` – start the Vite dev server
- `npm run build` – produce a production build in `dist/`
- `npm run preview` – serve the production bundle locally
- `npm run test` – execute Vitest unit tests

## Architecture Overview

- **BNGL worker (`services/bnglService.ts`)** – embeds the parser/simulator inside `String.raw` template code so it executes inside a web worker; exposes `parse`, `simulate`, and `generateNetwork` APIs.
- **UI shell (`App.tsx`)** – coordinates editor state, model parsing, simulation requests, and surface-level status handling.
- **Visualization layer (`components/`)** – modular tabs for charts, network graph, rule cartoons, parameter editing, structural analysis, and steady-state exploration.
- **Shared utilities (`constants.ts`, `types.ts`)** – typed BNGL model representations, initial template, and curated example catalog.
- **Scripts (`scripts/`)** – Node-based harnesses that run the worker logic outside the browser for debugging and regression testing.

```
.
├── App.tsx
├── components/
│   ├── EditorPanel.tsx
│   ├── tabs/
│   └── ui/
├── services/
│   └── bnglService.ts
├── scripts/
│   ├── runWorkerTest.mjs
│   └── testParse.mjs
├── constants.ts
├── types.ts
└── tests/
	└── constants.spec.ts
```

## Simulation Workflow

1. Paste or load BNGL code in the editor (use the example gallery or upload a `.bngl` file).
2. Click **Parse Model** to build the internal network representation and unlock visualization tabs.
3. Choose **Simulate** and select ODE or SSA methods; steady-state runs reuse the ODE backend with adaptive RK4 convergence checks.
4. Inspect results: time-course charts, network graph layouts, rule cartoons, and parameter adjustments all update live.

## Testing

Vitest runs in a Node environment and currently covers the curated example catalog and synchronization with the default template.

```bash
npm run test
```

## Deployment Notes

- The app is a static Vite build—any static host (GitHub Pages, Netlify, Vercel, S3) can serve the `dist/` directory.
- Ensure that the static host allows loading CDN-hosted dependencies declared in `index.html` import maps.

## Roadmap

- [ ] Implement backend logic for the parameter scan UI (currently front-end only)
- [ ] Extend structural analysis tooling with conservation law reporting
- [ ] Polish rule cartoon renderer with binding/state glyphs

## Identifiability analysis (FIM)

This project includes a Fisher Information Matrix (FIM) based identifiability analysis built into the UI. It computes parameter sensitivities using central finite differences, assembles the FIM, and performs eigen-decomposition to report practical identifiability diagnostics.

Quick example (browser/console usage):

```typescript
import { computeFIM, exportFIM } from './services/fim';

// model: BNGLModel loaded from the editor
// selectedParams: string[] of parameter names to analyze
const result = await computeFIM(
	model,
	selectedParams,
	{ method: 'ode', t_end: 50, n_steps: 100 },
	undefined, // optional AbortSignal
	(cur, tot) => console.log(`Progress: ${cur}/${tot}`),
	true, // includeAllTimepoints
	false, // useLogParameters
	true, // approxProfile (run cheap profile scans)
	false // approxProfileReopt
);

console.log('Identifiable parameters:', result.identifiableParams);
console.log('Unidentifiable parameters:', result.unidentifiableParams);
console.log('High VIF parameters (multicollinearity):', result.highVIFParams);

// Export JSON for external validation
const exportData = exportFIM(result);
// download helper
function downloadJSON(obj: any, filename = 'fim_analysis.json') {
	const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}
downloadJSON(exportData);
```

Interpretation notes:

- Condition number: large values (>>1e4) indicate an ill-conditioned FIM and potential practical non-identifiability.
- VIF &gt; 10 indicates strong multicollinearity between parameters.
- The UI shows `identifiableParams` and `unidentifiableParams` as badges, and profile plots include approximate 95% confidence intervals (χ², df=1) computed on the grid.


## Acknowledgements

- Built on top of the BioNetGen rule-based modeling paradigm
- Uses Monaco Editor, Cytoscape, Recharts, Tailwind CSS, and Vite
