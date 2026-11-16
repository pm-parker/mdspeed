# mdspeed

A drop-in, dependency-free replacement for the Markdown rendering core of
[marked](https://github.com/markedjs/marked) 18.1.3.

`parse(markdown)` returns exactly the HTML that `marked.parse(markdown)`
returns under marked's default configuration — byte for byte — while running
the same job in roughly two thirds of the CPU time (~1.5× faster). The price
of admission: none of the extensibility. There is no token object you can
inspect afterwards, no plugin hook layer, and no options to flip; what the
lexer learns is handed straight to the renderer and released.

## What is inside

The engine lives in a single ES module, `parse.js`, organized as:

- a **grammar table** — every regular expression marked 18.1.3 defines,
  compiled once at startup into block, inline and auxiliary rule sets;
- a **Tokenizer** that turns source text into tokens, block-level first and
  inline second;
- a **Lexer** that drives the tokenizer, queues inline passes until all link
  definitions are known, and maintains the emphasis "mask" (a copy of each
  chunk with links, code spans and tags blanked out so they cannot be read as
  `*`/`_`/`~` delimiters);
- a **Renderer** plus a plain-text variant used for `alt` attributes, and a
  small **Parser** that walks tokens and dispatches to them;
- a tail of shared utilities — tab expansion, label normalization, escaping,
  and the charCode probes that let hot loops skip rules without touching the
  regex engine.

The speed comes from doing the same work cheaper, not from cutting corners:
first-character dispatch tables instead of trying every rule, memoized regex
builders for indent-parameterized patterns, lazy closer scans for emphasis,
and distance-from-end caches for constructs (tables, setext underlines) that
need to know what lies ahead.

## Usage

```js
import { parse } from './parse.js';

parse('# Hello *world*\n');
// => '<h1>Hello <em>world</em></h1>\n'
```

ES module only; no dependencies; no build step.

## The benchmark driver

`main.ts` is the entry point the rendering benchmark invokes. It expects a
`cases.json` file — a JSON array of `{ id, markdown }` objects (a wrapper
object with a `cases` array also works) — renders each document with
`parse()`, and writes `html.json`: a bare JSON array of HTML strings whose
position `i` answers case `i`.

Both locations come from the environment so the same file runs in the
grading container and on a developer machine:

```sh
MAKEFUN_INPUT_DIR=./input MAKEFUN_OUTPUT_DIR=./output node main.ts
```

## Correctness and performance

On the 720-case practice corpus (CommonMark 0.31.2 plus GFM tables,
strikethrough, autolinks and task lists), every rendered document matches the
reference output exactly — 720/720 — and an interleaved `process.cpuUsage()`
comparison against the marked 18.1.3 ESM build measures this engine at about
0.6–0.7× its CPU time for the full corpus.

## License

[MIT](./LICENSE) © 2026 pm-parker
