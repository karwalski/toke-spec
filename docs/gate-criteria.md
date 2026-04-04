# Gate Criteria — toke project

**Last updated:** 2026-04-04

---

## Gate 1 (Completed — PASS 2026-04-03)

| Criterion | Threshold | Measured | Status |
|-----------|-----------|----------|--------|
| Token reduction vs cl100k_base | > 10% | 12.5% (8K vocab), 13.1% (32K vocab) | PASS |
| Pass@1 on held-out tasks | >= 60% | 63.7% (588/923 compiled, 1000 tasks) | PASS |

---

## Gate 1.5 — Reproducibility (Target: 2026-05-03)

**Purpose:** Demonstrate that Gate 1 results are independently reproducible before proceeding with Phase 2 work.

**Deadline:** 30 days from Gate 1 pass (2026-05-03).

### Required Artifacts

| Artifact | Location | Status |
|----------|----------|--------|
| Gate evaluation card (completed template) | toke-eval/gate1_card.md | pending |
| Raw per-task token counts CSV | toke-eval/data/gate1_token_counts.csv | pending |
| Token Efficiency Measurement Spec (TEMSpec) | toke-spec/docs/temspec.md | pending |
| Training hyperparameters + seeds | toke-models/finetune/configs/7b_mlx.yaml | done |
| Evaluation harness version + code | toke-eval/ | done |
| Hidden test set hash (SHA-256) | gate evaluation card | pending |
| Corpus composition report | toke-corpus/docs/corpus-report.md | pending |
| Contamination analysis | toke-corpus/docs/contamination-report.md | pending |
| Compiler binary hash | gate evaluation card | pending |

### Success Criteria

All of the following must be true:

1. **Complete gate evaluation card** filed with all fields populated
2. **Token counts published** as CSV with per-task breakdown across >=2 tokenizers
3. **TEMSpec published** defining all metrics unambiguously
4. **Corpus composition report** published with category distribution, quality scores, provider breakdown (no raw data required)
5. **Contamination analysis** documenting holdout isolation method, semantic similarity checks, and governance

---

## Gate 2 Readiness — Spec-Implementation Gap Closure

**Date:** 2026-04-04

All 5 key gaps identified in the original spec-implementation-delta.md (Story 10.3.7) are now **CLOSED**.

### Gap Status

| # | Gap | Resolution | Evidence |
|---|-----|-----------|----------|
| 1 | **Default syntax (Phase 2)** — compiler only supported Phase 1; no `$` sigil, `@` array syntax, or lowercase keywords | CLOSED | Lexer emits TK_DOLLAR, TK_AT; lowercase `m=/f=/i=/t=` keywords recognized; `@()` array/map literals parsed; `.get()` indexing; `[]` removed from default mode; `--legacy` flag for backward compatibility |
| 2 | **Narrow integer types** — i8/i16/i32/u8/u16/u32/f32 not in type checker | CLOSED | TY_I8 through TY_F32 in types.h; trunc/ext codegen in ir.c; Byte alias for u8 |
| 3 | **Missing error codes** — 11 codes spec'd but not emitted | CLOSED | 7 new codes implemented (E1004, E1005, E2005, E2015, E4026, E5002, W1001); 4 covered by existing codes (E2006 via E2005, E2011 via E2002, E4001 via E4031, E4020 via E4031) |
| 4 | **Sum type exhaustiveness** — match only checked bool, not sum variant coverage | CLOSED | types.c emits E4010 with per-variant missing arm messages for sum types |
| 5 | **Mutability enforcement** — `let` vs `mut` parsed but not enforced | CLOSED | E4070 emitted for assignment to immutable binding (types.c) |

### Test Results (2026-04-04)

| Suite | Count | Status |
|-------|-------|--------|
| Conformance (grammar + lexical + diagnostics) | 172 YAML tests | All passing |
| End-to-end | 13 .tk programs | All passing |
| Stress | 9 .tk programs | All passing |

### New Features Since Gate 1

- Logical operators (`&&`, `||`) — TK_AND, TK_OR in lexer; binary expr codegen
- Default syntax (Phase 2 profile) — lowercase keywords, `$`/`@` sigils, `.get()` indexing
- Narrow integer types — i8/i16/i32/u8/u16/u32/f32 with LLVM trunc/ext
- Mutability enforcement — E4070
- Sum type exhaustiveness — E4010 extended to sum variants

### Remaining Work Before Gate 2

- **Story 11.4.3** — Full spec alignment audit (update spec-implementation-delta.md to reflect closures)
- **Story 11.4.4** — Researcher signoff on spec completeness
- **Story 11.4.5** — Syntax freeze declaration
- Gate 2 evaluation run (model training, Pass@1, token reduction measurements)

---

## Gate 2 — Extended Features (Target: TBD)

**Purpose:** Demonstrate that extended language features + expanded training produce material improvement over Gate 1 baseline.

### Success Criteria

All of the following must be met:

| Criterion | Threshold | How to Measure |
|-----------|-----------|----------------|
| **Pass@1 on held-out tasks** | >= 75% | Same harness as Gate 1, greedy decoding (T=0) |
| **Token reduction vs cl100k_base** | >= 15% | TEMSpec methodology, >=3 tokenizers |
| **Compile rate** | >= 95% | Fraction of generated solutions that compile |
| **Corpus size** | >= 100K programs | Across >= 10 categories |
| **Error taxonomy published** | Complete | Syntax/parse/type/runtime/logic breakdown |
| **Multi-tokenizer validation** | >= 3 tokenizers | cl100k_base + Llama-3 + Qwen |
| **Benchmark alignment** | >= 200 tasks | Ported to HumanEval/MBPP JSON schema |
| **Reproducibility** | Gate 1.5 complete | All Gate 1.5 artifacts published |
| **Spec completeness** | No critical gaps | Integer overflow, string escaping, Phase 2 normative |
| **Compiler hardening** | --emit-llvm, IR verification | llvm-as validation in CI |
| **Evaluation contract** | Complete | Gate card filed for every scored run |

### Evaluation Protocol

- **Model:** Same base model family as Gate 1 (Qwen 2.5 Coder 7B) unless upgrade justified
- **Decoding:** Greedy (T=0) for Pass@1; also report Pass@5 at T=0.2 and Pass@10 at T=0.8
- **Sampling:** Unbiased Pass@k estimator (Chen et al. formula)
- **Confidence:** 95% bootstrap CI on all headline metrics
- **Baseline:** Gate 1 results as baseline; also compare Pass@1 to same model generating Python on equivalent tasks
- **Hardware:** Document in gate card; results must be reproducible on different hardware within stated CIs

### Failure Protocol

If Gate 2 fails:
1. Analyse error taxonomy to identify systematic failure modes
2. If failures are in corpus coverage: expand corpus and retrain
3. If failures are in model capacity: evaluate DoRA or full fine-tuning
4. If failures are fundamental (token efficiency thesis invalid): document and publish negative results per falsifiability principle

---

## Gate 3 — Multi-Model Generalization (Criteria TBD)

**Purpose:** Demonstrate toke advantage holds across multiple model families.

**Minimum requirements (preliminary):**
- Pass@1 >= 85% on primary model
- Pass@1 >= 60% on at least 2 additional model families (outside Qwen)
- Token reduction consistent across >= 4 tokenizers
- External benchmark presence (HumanEval/MBPP results published)

---

## Gate 4 — Production Readiness (Criteria TBD)

**Purpose:** Demonstrate production-grade tooling, ecosystem, and adoption readiness.

**Minimum requirements (preliminary):**
- Formatter, LSP, and package manager shipped
- Stdlib >= 20 modules with >= 80% spec coverage
- Community contributions from external developers
- Security audit completed
- Published on HuggingFace with model card
