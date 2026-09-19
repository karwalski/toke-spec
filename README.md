# toke-spec

Specification archive and measurement specifications for the toke programming language.

## About toke

> toke: a compiled language designed for LLM code generation, with a small grammar, one
> canonical form and compiler verification.

toke is a compiled programming language designed for LLM code generation. It has 14
keywords, a 59-character set, a backtrack-free grammar with bounded lookahead, and one
canonical form per construct, chosen by measurement in a 46-pattern catalogue and
reproduced by `tkc --min`. That makes generated code cheap to constrain during decoding,
cheap for a compiler to verify afterwards, and compact to emit. Token efficiency is one
measured property of toke, always reported with its tokenizer and its baseline, not the
whole claim.

*The one-liner and the paragraph above are reproduced word for word from the canonical
description,
[`docs/about/canonical.md`](https://github.com/karwalski/toke/blob/main/docs/about/canonical.md).
Every number published about toke comes from
[`docs/metrics-baseline.md`](https://github.com/karwalski/toke/blob/main/docs/metrics-baseline.md)
and nowhere else.*

## Where the normative specification lives

**The normative specification is `docs/spec/toke-spec-v0.4.md` in the
[toke](https://github.com/karwalski/toke) repository**, beside the compiler that
implements it. So are the machine-readable grammar artefacts
(`docs/spec/grammar.ebnf`, `docs/spec/toke.gbnf`), the idiom standard
(`docs/spec/idiom-v0.4.md`) and the pattern protocol that decides the canonical form of
each construct (`docs/spec/patterns-protocol-v0.4.md`).

This repository holds the **historical** specification documents and the measurement
specifications that are not tied to a language version. Anything here describing v0.2 or
v0.3 syntax — the "phase 1" 80-character profile and the "phase 2" profile — is an
archive of what the language used to be, not a description of what it is.

## Repository contents

| Path | What it is |
|------|------------|
| `rfc/draft-watt-toke-lang-00.md` | RFC-formatted draft of the language specification (v0.3 era; realignment tracked as story 132.8) |
| `spec/toke-spec-v02.md` | v0.2 specification — historical |
| `spec/phase2-profile.md` | The "phase 2" profile — historical; superseded by `toke-spec-v0.4.md` §A |
| `spec/grammar.ebnf` | Phase-1 formal grammar — historical; the current grammar is `docs/spec/grammar.ebnf` in the toke repo |
| `spec/semantics.md` | Type rules and memory model |
| `spec/errors.md` | Error code registry |
| `docs/temspec.md` | **TEMSpec** — the token-efficiency measurement specification. Normative and current: §6.3 defines the four reporting fields (metric type, tokenizer, baseline, N) that every published toke number must carry |
| `docs/` (rest) | Design decisions, prior art, gate criteria, review packages |
| `examples/` | Example programs in the phase-1 and phase-2 profiles — historical syntax |
| `tree-sitter-toke/` | Tree-sitter grammar; targets v0.3, v0.4 pass pending |

## Two corrections that apply to every document in this archive

The documents here were written against the v0.3 specification and were not rewritten in
place. Two of their claims are retired, and neither may be repeated:

- **toke is not LL(1).** `toke-spec-v0.4.md` §E retired that claim on 2026-07-02: it was
  not accurate for the real grammar. The verified property is that the parser never
  rescans input it has already consumed, and that a small, enumerated set of productions
  require bounded lookahead of up to 3 tokens, never more.
- **The keyword count is 14, not 13.** §A fixes the set at `m i t f let if el lp br rt as
  mt sc mut`, verified against the lexer keyword table.

## Related repositories

| Repository | Description |
|------------|-------------|
| [toke](https://github.com/karwalski/toke) | The language: normative v0.4 specification, reference compiler (`tkc`) and standard library |
| [toke-corpus](https://github.com/karwalski/toke-corpus) | Corpus generation and audit pipeline |
| [toke-eval](https://github.com/karwalski/toke-eval) | Benchmark tasks and evaluation harness |
| [toke-tokenizer](https://github.com/karwalski/toke-tokenizer) | Tokenizer training and the token-efficiency baselines |
| [toke-mcp](https://github.com/karwalski/toke-mcp) | Model Context Protocol server for toke |

## Licence

MIT. See [LICENSE](LICENSE).
