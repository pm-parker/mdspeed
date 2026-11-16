// Entry point for the markdown-render-speed-02 benchmark.
//
// Loads the benchmark's case list, renders each document through the local
// parser (parse.js), and emits the resulting HTML in the same order the cases
// arrived. Two environment knobs decide where to look:
//
//   MAKEFUN_INPUT_DIR   directory holding cases.json (default: /input)
//   MAKEFUN_OUTPUT_DIR  directory to receive html.json  (default: /output)
//
// cases.json may be either a top-level array of case objects or a wrapper
// object like { cases: [...] }; both shapes are accepted. html.json is a bare
// JSON array of HTML strings, position i answering case i.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from './parse.js';

type Case = { id: string; markdown: string };

const sourceDir = process.env.MAKEFUN_INPUT_DIR || '/input';
const targetDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';

const loaded: unknown = JSON.parse(
  readFileSync(resolve(sourceDir, 'cases.json'), 'utf8'),
);
const batch: Case[] | undefined = Array.isArray(loaded)
  ? (loaded as Case[])
  : (loaded as { cases?: Case[] })?.cases;
if (!batch) {
  throw new Error('cases.json must be an array or contain a "cases" array');
}

// Encode each render as it is produced, then concatenate once — cheaper than
// assembling a second array of raw strings only to stringify it again.
const encoded: string[] = [];
for (const entry of batch) {
  encoded.push(JSON.stringify(parse(entry.markdown)));
}

writeFileSync(resolve(targetDir, 'html.json'), `[${encoded.join(',')}]`, 'utf8');
