// Driver for markdown-render-speed-02.
// Reads cases.json (a JSON array of {id, markdown}, or {cases:[...]}), renders each markdown with
// parse() from ./parse.js, and writes html.json: a JSON array of HTML strings aligned with input
// order. MAKEFUN_INPUT_DIR / MAKEFUN_OUTPUT_DIR override /input and /output outside a container.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from './parse.js';

const input = process.env.MAKEFUN_INPUT_DIR ?? '/input';
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const raw = JSON.parse(readFileSync(join(input, 'cases.json'), 'utf8'));
const cases: readonly { id: string; markdown: string }[] = Array.isArray(raw) ? raw : raw.cases;

// Render once, stringify per element while we walk (no second pass over a big array).
const n = cases.length;
const parts: string[] = new Array(n);
for (let i = 0; i < n; i++) parts[i] = JSON.stringify(parse(cases[i].markdown));

writeFileSync(join(output, 'html.json'), '[' + parts.join(',') + ']');
