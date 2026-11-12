# tree-sitter-toke

Tree-sitter grammar for the [toke](https://github.com/karwalski/toke) programming language.

## Status

This grammar targets **toke v0.4**, default profile. Its sources are the normative
`docs/spec/toke-spec-v0.4.md` and `docs/spec/grammar.ebnf` in the
[toke](https://github.com/karwalski/toke) repository; where the EBNF is silent it
follows the reference parser (`src/parser.c`), and `grammar.js` says so at the rule.

Covered (story 132.124):

- all 14 keywords, `m i t f let if el lp br rt as mt sc mut`, including the `sc{...}`
  scope block and `spawn`;
- `=` for binding and assignment only, `==` / `!=` for equality (v0.4 §B); a bare `=`
  in expression position is an `ERROR`;
- `if` as an expression, which requires `el`, and `el if` chains in both the statement
  and the expression form (§C); match expressions (`mt v {$ok:x ...; $err:e <0}`);
- `&&` / `||` (§D), the bitwise and shift operators, `as` casts and `!` error
  propagation, at the reference parser's precedences;
- module constants (`max=10:i64;`), module-level `let` globals, extern (bodyless)
  functions, sum types with `$variant` fields, array / map / struct literals including
  the typed-empty forms, function references (`&name`), closures (`fn(...)`), the
  `{arena ...}` block and constant indexing (`a.0`);
- nested `(* ... *)` comments (§H) and string interpolation `"\(expr)"`, both handled by
  the external scanner in `src/scanner.c`.

Deliberately not accepted, following the specification rather than the compiler's
recovery paths:

- uppercase letters in an identifier (§G). The reference lexer currently accepts them
  after the first letter (`sawEof`), which §G excludes;
- `//` and `#` line comments, which the compiler skips only as error recovery (W1020);
- the legacy profile (`--legacy`).

## Building

Requires [tree-sitter CLI](https://tree-sitter.github.io/tree-sitter/creating-parsers#installation):

```sh
npm install
npx tree-sitter generate --no-bindings
```

`src/scanner.c` is hand-written and tracked; everything else under `src/` is generated
and ignored.

## Testing

```sh
npx tree-sitter test
```

## Parsing a file

```sh
npx tree-sitter parse example.tk
```

## Editor integration

Copy `queries/highlights.scm` to your editor's queries directory for syntax highlighting. Supported editors include Neovim, Helix, and Zed.

## File extension

toke source files use the `.tk` extension.
