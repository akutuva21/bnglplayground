#!/usr/bin/env node
import { dirname, resolve, basename, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync, copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { DEFAULT_BNG2_PATH, DEFAULT_PERL_CMD } from './bngDefaults.js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const defaultExampleDir = resolve(projectRoot, 'example-models');
const defaultOutDir = resolve(projectRoot, 'tests/fixtures/gdat');

function printHelp() {
  console.log(`Generate GDAT baselines with BioNetGen via Perl.

Usage: node scripts/generateGdat.mjs [options] [paths...]

Options:
  --out <dir>       Output directory for GDAT files (default: tests/fixtures/gdat)
  --bng2 <path>     Path to BNG2.pl (default: env BNG2_PATH or bundled path)
  --perl <cmd>      Perl executable to invoke (default: env PERL_CMD or perl)
  --examples        Use all BNGL files under example-models (default when no paths)
  --verbose         Print full BioNetGen output while running models
  --help            Show this message

Any positional path can be a single BNGL file or a directory that will be scanned for *.bngl files.
`);
}

function parseArgs(argv) {
  const args = {
    outDir: defaultOutDir,
    bng2: process.env.BNG2_PATH || DEFAULT_BNG2_PATH,
    perl: process.env.PERL_CMD || DEFAULT_PERL_CMD,
    verbose: false,
    targets: []
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    switch (token) {
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
      case '--out':
        args.outDir = resolve(process.cwd(), argv[++i] ?? '');
        break;
      case '--bng2':
        args.bng2 = resolve(process.cwd(), argv[++i] ?? '');
        break;
      case '--perl':
        args.perl = argv[++i] ?? args.perl;
        break;
      case '--examples':
        args.targets.push(defaultExampleDir);
        break;
      case '--verbose':
        args.verbose = true;
        break;
      default:
        args.targets.push(resolve(process.cwd(), token));
    }
  }

  if (args.targets.length === 0) {
    args.targets.push(defaultExampleDir);
  }

  return args;
}

function ensureBng2Exists(bng2Path) {
  if (!existsSync(bng2Path)) {
    throw new Error(`BNG2.pl not found at ${bng2Path}. Provide --bng2 or set BNG2_PATH.`);
  }
}

function collectBnGLTargets(targets) {
  const files = new Set();
  targets.forEach((target) => {
    let stat;
    try {
      stat = statSync(target);
    } catch (error) {
      console.warn(`Skipping missing path: ${target}`);
      return;
    }

    if (stat.isDirectory()) {
      readdirSync(target).forEach((entry) => {
        if (entry.toLowerCase().endsWith('.bngl')) {
          files.add(resolve(target, entry));
        }
      });
    } else if (stat.isFile()) {
      if (target.toLowerCase().endsWith('.bngl')) {
        files.add(resolve(target));
      } else {
        console.warn(`Ignoring non-BNGL file: ${target}`);
      }
    }
  });
  return [...files].sort();
}

function runBngModel(perlCmd, bng2Path, sourcePath, outDir, verbose) {
  const tempDir = mkdtempSync(join(tmpdir(), 'bng-'));
  const modelName = basename(sourcePath);
  const modelCopy = join(tempDir, modelName);
  copyFileSync(sourcePath, modelCopy);

  const result = spawnSync(perlCmd, [bng2Path, modelName], {
    cwd: tempDir,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  const stdout = result.stdout?.toString() ?? '';
  const stderr = result.stderr?.toString() ?? '';

  if (verbose && stdout.trim().length) {
    console.log(stdout.trim());
  }

  if (result.status !== 0) {
    if (stderr.trim().length) {
      console.error(stderr.trim());
    }
    rmSync(tempDir, { recursive: true, force: true });
    throw new Error(`BNG2.pl failed for ${modelName} with exit code ${result.status ?? 'unknown'}`);
  }

  if (stderr.trim().length) {
    console.warn(stderr.trim());
  }

  const outputs = readdirSync(tempDir);
  const gdatFiles = outputs.filter((file) => file.toLowerCase().endsWith('.gdat'));

  if (gdatFiles.length === 0) {
    rmSync(tempDir, { recursive: true, force: true });
    throw new Error(`No GDAT produced for ${modelName}.`);
  }

  if (gdatFiles.length > 1) {
    console.warn(`Multiple GDAT files produced for ${modelName}; copying the first: ${gdatFiles[0]}`);
  }

  const sourceGdat = join(tempDir, gdatFiles[0]);
  const destName = `${basename(modelName, extname(modelName))}.gdat`;
  const destPath = join(outDir, destName);
  copyFileSync(sourceGdat, destPath);

  rmSync(tempDir, { recursive: true, force: true });
  return destPath;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  ensureBng2Exists(args.bng2);
  mkdirSync(args.outDir, { recursive: true });

  const files = collectBnGLTargets(args.targets);

  if (files.length === 0) {
    console.error('No BNGL files found.');
    process.exit(1);
  }

  console.log(`Running BioNetGen for ${files.length} model(s) ...`);

  let success = 0;
  const failures = [];

  files.forEach((file) => {
    try {
  const output = runBngModel(args.perl, args.bng2, file, args.outDir, args.verbose);
      if (output) {
        success += 1;
        const rel = relative(projectRoot, output);
        console.log(`  ✔ ${relative(projectRoot, file)} -> ${rel}`);
      }
    } catch (error) {
      failures.push({ file, message: error.message });
      console.error(`  ✖ ${relative(projectRoot, file)} (${error.message})`);
    }
  });

  console.log(`Finished. ${success} GDAT file(s) copied to ${relative(projectRoot, args.outDir)}.`);

  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach((failure) => {
      console.log(`  - ${relative(projectRoot, failure.file)}: ${failure.message}`);
    });
    process.exitCode = 1;
  }
}

main();
