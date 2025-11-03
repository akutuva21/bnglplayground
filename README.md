<div align="center">

# BioNetGen Web Simulator

An interactive workspace that lets you explore BioNetGen (BNGL) models, watch molecular networks unfold, and simulate system behaviour directly in your browser.

</div>

> **Fixture reminder:** Whenever you update one of the curated BNGL examples, regenerate its reference data with `npm run generate:gdat -- <paths...>` and rerun `npm run test` before you commit.

## What You Can Do

- Start from dozens of ready-made biological BNGL models or import your own.
- Edit models in a Monaco-powered code editor with helpful syntax colouring.
- Parse models into reaction networks and view the results as charts, graphs, or cartoons.
- Run deterministic (ODE) or stochastic (SSA) simulations without leaving the browser.
- Explore time-course plots, wiring diagrams, parameter tables, sensitivity tools, and more via modular tabs.
- Switch between light and dark themes and keep track of status messages as you work.
- Use the included Node scripts and Vitest suite to ensure examples still behave as expected.

## Getting Started (No Deep Tech Needed)

1. **Install Node.js 20+** so you can run the helper scripts that power the simulator.
2. **Install project dependencies**:

```bash
npm install
npm run dev
```

3. Point your browser to `http://localhost:3000/` to open the simulator. It automatically reloads when you make changes.

Everything runs locally—no external API keys or internet services are required once the dependencies are installed.

## Available Scripts

- `npm run dev` – start the Vite dev server
- `npm run build` – produce a production build in `dist/`
- `npm run preview` – serve the production bundle locally
- `npm run test` – run the full Vitest suite (including GDAT regression checks)
- `npm run test:watch` – start Vitest in watch mode for rapid feedback
- `npm run generate:gdat` – regenerate BioNetGen GDAT fixtures (accepts optional paths)

## Simulator Guide

- **Editor panel** – type or paste BNGL text, or load one of the curated examples. The editor highlights syntax and shows errors as you go.
- **Parse model** – converts your BNGL text into a network description that the rest of the app can use.
- **Run simulations** – choose ODE (predictable) or SSA (stochastic) methods; the simulator runs entirely in your browser’s worker thread so the page stays responsive.
- **Visualization tabs** – switch between plots over time, a network graph, rule cartoons, parameter sliders, structural analysis, and steady-state tools. Each tab updates automatically after parsing or simulating.
- **Example gallery** – browse 60 biologically inspired models with short descriptions and tags; great for inspiration or teaching.
- **Identifiability analysis** – built-in Fisher Information Matrix tools let you inspect which parameters are distinguishable from data.

Behind the scenes, the simulator uses a dedicated web worker to parse BNGL, expand rule-based networks, and perform simulations. This keeps the interface fluid even for larger models.

### What’s Under the Hood (Short Tour)

- **`App.tsx`** – orchestrates the UI, wiring the editor, worker calls, and tab views together.
- **`components/`** – contains the visual building blocks (charts, graph, modals, tabs) written in React.
- **`services/`** – houses the worker interface plus helpers for parsing, simulations, and identifiability calculations.
- **`constants.ts` & `types.ts`** – define the curated example list and shared data structures.
- **`scripts/`** – provides Node helpers for generating reference data and running regression checks outside the browser.

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

## Daily Workflow

1. Paste or load BNGL code in the editor (use the example gallery or upload a `.bngl` file).
2. Click **Parse Model** to build the internal network representation and unlock visualization tabs.
3. Choose **Simulate** and select ODE or SSA methods; steady-state runs reuse the ODE backend with adaptive RK4 convergence checks.
4. Inspect results: time-course charts, network graph layouts, rule cartoons, and parameter adjustments all update live.

## Testing

Vitest runs in a Node environment and now covers curated examples, worker utilities, and deterministic GDAT regression checks.

```bash
npm run test
```

The GDAT suite shells out to BioNetGen (`BNG2.pl`) for each example. You can:

- Set environment variables `BNG2_PATH` and `PERL_CMD` so the tests/scripts find your installation, **or**
- Edit `scripts/bngDefaults.js` to point `DEFAULT_BNG2_PATH` (and optionally `DEFAULT_PERL_CMD`) at the correct locations for your machine.

If you do not have BioNetGen and Perl installed, the GDAT tests will skip automatically.

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