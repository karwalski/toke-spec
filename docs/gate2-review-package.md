# Gate 2 Review Package — toke Default Syntax

**Version:** 0.2 (default profile)
**Date:** 2026-04-04
**Review window:** 2 weeks (closes 2026-04-18)
**Prepared for:** Research review teams T1-T8

---

## 1. Executive Summary

toke is a statically typed, machine-native programming language designed for reliable generation by large language models. Its primary optimisation target is token efficiency: fewer LLM tokens to express the same program logic.

Since Gate 1 (passed 2026-04-03), we have implemented the **default syntax profile** -- a 56-character subset of printable ASCII that replaces the original 80-character profile. This is the syntax we propose to freeze as normative in version 0.2.

**What changed:** The compiler now defaults to the 56-character profile with `$` type sigils, `@()` array/map literals, lowercase keywords, and `.get()` indexing. The 80-character profile remains available via `--legacy`. All 5 spec-implementation gaps identified during the initial audit have been closed.

**What we are asking reviewers to evaluate:**
1. Does the 56-character default syntax meet the stated design goals?
2. Are there blocking concerns before we freeze this syntax as normative?
3. Are there specific constructs that should be reconsidered?

---

## 2. Syntax Overview

### 2.1 Character Set (56 Characters)

```
CLASS        CHARACTERS                                                 COUNT
----------------------------------------------------------------------
Lowercase    a b c d e f g h i j k l m n o p q r s t u v w x y z       26
Digits       0 1 2 3 4 5 6 7 8 9                                       10
Symbols      ( ) { } = : . ; + - * / < > ! | $ @                       18
Reserved     ^ ~                                                         2
----------------------------------------------------------------------
TOTAL                                                                   56
```

**Excluded from structural source:** uppercase letters (A-Z), square brackets `[]`, whitespace (structurally meaningless), comments (no comment syntax -- metadata stored externally), and 9 unused ASCII symbols (`#`, `%`, `&`, `` ` ``, `\`, `'`, `,`, `?`).

### 2.2 Key Design Choices

| Feature | Syntax | Rationale |
|---------|--------|-----------|
| **Type references** | `i64`, `str` (primitives); `$user`, `$vec2` (user-defined) | `$` sigil marks user-defined types, distinguishing them from bare primitives. Enables single-token BPE merges (e.g. `$user` as one token). |
| **Array/map literals** | `@(1; 2; 3)`, `@("k": v)` | `@(` is a unique two-character opener. No overloading of `[]` for both indexing and literals. |
| **Array/map types** | `@i64`, `@str:i64` | Consistent `@` prefix for collection types. Primitives remain bare inside `@`. |
| **Indexing** | `a.get(0)`, `m.get("k")` | Method-style indexing avoids needing `[]` in the character set entirely. |
| **Declaration keywords** | `m=` (module), `f=` (function), `t=` (type), `i=` (import) | Single lowercase letter + `=`. Minimal tokens, deterministic parse (LL(1)). |
| **Lowercase keywords** | `let`, `if`, `el`, `lp`, `br`, `rt`, `as` | All keywords lowercase, most 2-3 characters. No reserved single-letter keywords. |
| **Semicolons** | Required statement terminator | Unambiguous statement boundaries; no newline-as-syntax. |
| **No comments** | Metadata external to source | Zero overhead in token stream; simplifies lexer. |

### 2.3 Example

```
m=math;

f=square(x:i64):i64{
  <x*x;
};

f=sum_squares(a:@i64):i64{
  let total=mut.0;
  lp i:0..a.len{
    total=total+square(a.get(i));
  };
  <total;
};
```

---

## 3. Design Goals Assessment

### 3.1 Token Efficiency

| Comparison | Reduction | Evidence |
|------------|-----------|---------|
| toke vs Python | **63.0%** fewer tokens | cl100k_base tokenizer, 3,886 verified program pairs |
| toke vs Java | **73.5%** fewer tokens | Same methodology |
| toke vs C | **84.9%** fewer tokens | Same methodology |
| **Mean reduction** | **73.8%** | Across all three languages |

toke programs average 75.6 tokens (cl100k_base) compared to Python's 204.0 tokens for equivalent functionality. The median toke program is 68 tokens; p95 is 140 tokens.

**Gate 1 baseline for reference:** 12.5% token reduction (tokenizer-level, custom SentencePiece vs cl100k_base on toke source). Gate 2 measures language-level reduction (toke source vs equivalent programs in other languages, all tokenized with cl100k_base). These are complementary metrics.

### 3.2 Unambiguous Grammar

The grammar is **LL(1)**: the parser never requires more than one token of lookahead. Every construct is deterministic from its first token:

- `$` always begins a type reference
- `@(` always begins an array or map literal
- `f=` always begins a function declaration
- `<` always begins a return statement
- `|{` always begins a match expression

**Evidence:** 172 conformance tests (grammar, lexical, diagnostics) all passing. 13 end-to-end tests and 9 stress tests all passing.

### 3.3 Generic Tokenizer Friendliness

The 56-character printable ASCII subset was chosen to maximise compatibility with existing LLM tokenizers:

- All characters are in the printable ASCII range (no Unicode structural syntax)
- No whitespace-sensitive grammar (indentation does not affect parsing)
- Frequent co-occurring patterns (`$str`, `$i64`, `@(`, `f=`) are designed to merge into single BPE tokens after retraining
- Expected 2.5-4x improvement in LLM token density vs cl100k_base after purpose-built tokenizer retraining

### 3.4 Learnability

- **Consistent sigils:** `$` always means type, `@` always means collection
- **No reserved single-letter keywords:** `m`, `f`, `t`, `i` are context keywords (only special after `=`), not reserved identifiers
- **Minimal keyword set:** all keywords are 2-3 characters, all lowercase
- **One form per construct:** no syntax synonyms, no optional delimiters, no style variants

---

## 4. Implementation Status

### 4.1 Spec-Implementation Delta Summary

| Metric | Count |
|--------|-------|
| Total table entries | 135 |
| Specified + implemented | 110 |
| Specified, partially implemented | 1 |
| Specified, not implemented | 5 |
| Implemented, not specified | 2 |
| Removed | 6 |
| Deferred | 11 |

All 5 key gaps that were blocking Gate 2 have been **RESOLVED**:

1. Default syntax (Phase 2 profile) -- CLOSED
2. Narrow integer types (i8-u32, f32, Byte) -- CLOSED
3. Missing error codes (11 specified, now all implemented or covered) -- CLOSED
4. Sum type exhaustiveness checking -- CLOSED
5. Mutability enforcement (E4070) -- CLOSED

The 5 remaining "specified, not implemented" items are refinement diagnostics (E2036, E4040, E4041, E4042, E4060) that are non-blocking -- existing error codes cover the same conditions.

### 4.2 Standard Library

All 14 specified standard library modules are implemented: `std.str`, `std.json`, `std.toon`, `std.yaml`, `std.i18n`, `std.http`, `std.db`, `std.file`, `std.env`, `std.process`, `std.crypto`, `std.time`, `std.log`, `std.test`.

### 4.3 Test Results (2026-04-04)

| Suite | Count | Status |
|-------|-------|--------|
| Conformance (grammar + lexical + diagnostics) | 172 YAML tests | All passing |
| End-to-end (.tk programs) | 13 programs | All passing |
| Stress (.tk programs) | 9 programs | All passing |
| **Total** | **194 tests** | **All passing** |

### 4.4 Corpus Compilation Rate

- **Gate 2 eval corpus:** 80.9% pass rate (4,044 of 5,000 programs pass `tkc --check`)
- **Story 11.1.8 corpus:** 53.2% pass rate (older corpus, pre-default-syntax)
- Failures are primarily parse errors (E2002, E2003) from corpus programs written in the old syntax

---

## 5. Known Issues

These are known, tracked, and non-blocking for syntax freeze. They require post-freeze work.

### 5.1 BPE Tokenizer — RESOLVED

Retrained on 46,754 default-syntax entries with 14 user-defined symbols (story 11.6.2). 14/14 key syntax patterns now tokenize as single tokens (was 0/14). Char-to-token ratio improved 7.5% (0.352 vs 0.381). Model installed at `toke-tokenizer/models/toke.model`.

**Evidence:** `toke-tokenizer/docs/eval_retrain_11_6_2.json`

### 5.2 Corpus — RESOLVED

Corpus regenerated in default syntax (story 11.6.1): `corpus_default.jsonl`, 46,754 entries. ~90% `tkc --check` pass rate. Remaining failures are pre-existing bugs (E4070 immutable ~75%, E4031 type mismatch ~20%), not transformation errors.

### 5.3 Migration Tool — RESOLVED

`tkc --migrate` implemented (story 11.3.5) -- reads legacy `.tk` file, outputs default syntax. Transforms keywords (`M`->`m`, `F`->`f`, `T`->`t`, `I`->`i`), type identifiers (`Vec2`->`$vec2`). Preserves whitespace and formatting.

### 5.4 Mixed Profile Detection

Detection of mixed Phase 1 / Phase 2 syntax within a single file is partially implemented. Profiles are currently separate; token-level mixing detection is not yet enforced.

### 5.5 Companion Files

New `tkc --companion` feature generates `.tkc.md` companion files with SHA-256 hash, structured sections (Module, Types, Functions, Constants). `tkc --verify-companion` checks hash freshness. `tkc --companion-diff` detects structural divergences. MCP tool `toke_companion` available. Format spec at `toke/docs/companion-file-spec.md`.

---

## 6. Open Questions for Reviewers

We are specifically seeking feedback on:

1. **Character set completeness:** Are the 56 characters sufficient? Are there constructs that would benefit from an additional character (noting `^` and `~` are reserved for v0.2)?

2. **Sigil choices:** Is `$` for types and `@` for collections the right assignment? Would the reverse, or different characters, improve tokenizer efficiency or readability?

3. **Indexing syntax:** `.get()` replaces `[]` entirely. Is method-style indexing acceptable for array and map access, or does this create ergonomic problems for LLM generation patterns?

4. **Keyword brevity:** Keywords like `el` (else), `lp` (loop), `br` (break), `rt` (return) are very short. Does extreme brevity help or hurt LLM generation accuracy?

5. **No comments:** Comments are excluded from source entirely (metadata is external). Is this acceptable for the LLM-generation use case, or do LLMs benefit from inline comments as generation scaffolding?

6. **Token efficiency claims:** The 63% reduction vs Python is measured on cl100k_base. Are there concerns about the methodology, comparison fairness, or generalizability?

7. **Missing constructs:** Are there language constructs whose absence would block practical use in benchmarks (beyond the items already deferred to v0.2)?

8. **Blocking concerns:** Is there anything in the syntax design that should prevent freezing at this point?

---

## 7. Timeline

| Date | Milestone |
|------|-----------|
| 2026-04-04 | Review package distributed to T1-T8 |
| 2026-04-18 | Review window closes (2 weeks) |
| 2026-04-18 -- 2026-04-25 | Address feedback, resolve blocking concerns |
| 2026-04-25 (target) | Syntax freeze declaration (v0.2-syntax-lock) |
| Post-freeze | ~~Tokenizer retraining~~ (done), ~~corpus regeneration~~ (done), Gate 2 evaluation run |

Reviewers may submit feedback at any time during the review window. Any blocking concerns raised will be addressed before syntax freeze proceeds.

---

## 8. Appendix: Artifact Links

| Artifact | Location |
|----------|----------|
| Language specification (v0.2) | `toke/spec/spec/toke-spec-v02.md` |
| Spec-implementation delta table | `toke-spec/docs/spec-implementation-delta.md` |
| Gate criteria | `toke-spec/docs/gate-criteria.md` |
| Token efficiency eval report (Gate 2) | `toke-eval/data/eval_report_gate2.json` |
| BPE tokenizer validation | `toke-tokenizer/docs/eval_syntax_tokens_11_4_6.json` |
| BPE retrain eval | `toke-tokenizer/docs/eval_retrain_11_6_2.json` |
| Default syntax corpus | `toke-corpus/data/corpus_default.jsonl` |
| Companion file spec | `toke/docs/companion-file-spec.md` |
| Conformance test suite | `toke/test/conformance/` |
| End-to-end test suite | `toke/test/e2e/` |
| Stress test suite | `toke/test/stress/` |
| Research review request template | `toke-spec/docs/research-review-request.md` |
| Prior art analysis | `toke-spec/docs/prior-art.md` |

All paths are relative to the `~/tk/` workspace root.

---

*This document is the Gate 2 review package for toke syntax freeze evaluation. It was prepared on 2026-04-04 and reflects the state of the compiler (tkc 0.1.0) and specification (toke-spec-v02.md) as of that date.*
