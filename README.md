# toke specification

The normative language specification for toke (tk) — a compiled,
statically typed programming language designed for LLM code generation.

## What is toke?

toke is a programming language built for machines, not humans. Its syntax
is designed to minimise token usage in LLM generation while eliminating
ambiguity and providing structured, machine-readable compiler diagnostics.

- **Phase 2 (normative default):** 56-character set, lowercase keywords, `$` type sigils, `@()` arrays
- **Phase 1 (legacy):** 80-character set, compatible with existing LLM tokenizers

Programs compile to native machine code via LLVM. No runtime. No GC.

## Repository contents

- `rfc/` — the original toke specification document (RFC-formatted draft)
- `spec/phase2-profile.md` — **Phase 2 normative profile** (grammar, lexical rules, transformation rules)
- `spec/grammar.ebnf` — Phase 1 formal grammar (legacy)
- `spec/semantics.md` — type rules and memory model (applies to both profiles)
- `spec/errors.md` — error code registry
- `examples/` — example programs in Phase 1 and Phase 2 syntax

## Related repositories

| Repository | Description |
|------------|-------------|
| [tkc](https://github.com/karwalski/tkc) | Reference compiler |
| [toke-stdlib](https://github.com/karwalski/toke-stdlib) | Standard library |
| [toke-corpus](https://github.com/karwalski/toke-corpus) | Corpus generation |
| [toke-benchmark](https://github.com/karwalski/toke-benchmark) | Benchmarks |

## Licence

MIT. See [LICENSE](LICENSE).
