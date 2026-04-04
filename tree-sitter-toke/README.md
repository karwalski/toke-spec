# tree-sitter-toke

Tree-sitter grammar for the [Toke](https://github.com/karwalski/toke-spec) programming language (Profile 1).

## Status

This grammar covers the full Profile 1 syntax as defined in `spec/grammar.ebnf`.

Toke Profile 1 has no comment syntax. All source text is significant.

## Building

Requires [tree-sitter CLI](https://tree-sitter.github.io/tree-sitter/creating-parsers#installation):

```sh
npm install
npx tree-sitter generate
```

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

Toke source files use the `.tk` extension.
