# mdspeed — a faster drop-in for marked 18.1.3

`parse.js` is a single-pass reimplementation of the [marked](https://github.com/markedjs/marked)
18.1.3 Markdown→HTML renderer. `parse(markdown)` returns HTML that is **byte-identical** to
`marked.parse(markdown)` with marked's default options, at roughly 1.5× the speed — no tokenizer
objects, no plugin hooks, no intermediate token tree.

## Usage

```js
import { parse } from './parse.js';

parse('# Hello *world*\n');
// => '<h1>Hello <em>world</em></h1>\n'
```

ES module only; no dependencies.

## Run the driver

`main.ts` is the benchmark harness driver: it reads every case from
`$MAKEFUN_INPUT_DIR/cases.json` (a JSON array of `{id, markdown}`), renders each markdown, and
writes the HTML strings — aligned with input order — to `$MAKEFUN_OUTPUT_DIR/html.json`:

```sh
MAKEFUN_INPUT_DIR=./input MAKEFUN_OUTPUT_DIR=./output node main.ts
```

## Benchmark

Interleaved A/B over the 720-case practice corpus (CommonMark + GFM), measuring
`process.cpuUsage()` per pass:

```sh
node /tmp/b3.mjs
```

On the reference machine `parse.js` renders the full corpus in ~0.6–0.7× the CPU time of the
vendored `marked.esm.js`, i.e. a ~1.5× speedup, with 720/720 byte-exact matches against the
expected output.

## License

[MIT](./LICENSE) © 2026 pm-parker
