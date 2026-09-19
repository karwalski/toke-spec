# Prior Art and Design-Space Map

**Date:** 2026-04-04
**Status:** Draft
**Story:** 10.9.1

> **Editor's note, 2026-09-19 (story 132.12).** This document was written against the
> v0.2-era language (56-character alphabet, 12 keywords) and described the grammar as
> **LL(1)**. Both descriptors are corrected in place below. The authoritative facts are
> `toke/docs/spec/toke-spec-v0.4.md`: **14 keywords** (`m i t f let if el lp br rt as mt sc
> mut`, §A), a **59-character** set, and a grammar that is **backtrack-free** — the parser
> never rescans consumed input — with an **enumerated** set of productions requiring
> **bounded lookahead of up to 3 tokens** (§E, 2026-07-02; FIRST-sets in Appendix A of
> `grammar.ebnf`). The strict-LL(1) claim "was **not accurate** for the real grammar".
> Nothing in the argument below depends on the label: a small backtrack-free grammar with
> bounded lookahead is still cheap to constrain during decoding and cheap to parse. The
> canonical description of toke lives in `toke/docs/about/canonical.md`.
>
> **Second editor's note, 2026-09-19 (story 132.15).** Every token-efficiency figure this
> document carried has been **deleted, not requalified**: "12.5% fewer tokens than Python",
> "2.5-4x fewer tokens when comparing toke-bpe against cl100k", the cross-language density
> rows and the vocabulary-utilisation figures all measured a *toke-trained* tokenizer on the
> toke side against cl100k on the baseline side, which measures the tokenizer's training
> bias and not the language (story 132.13). The sanctioned wording, and the only sanctioned
> numbers, are in `toke/docs/metrics-baseline.md`: under one shared tokenizer (cl100k_base)
> toke costs **1.34x [1.22, 1.48]** the tokens of equivalent Python on the 60 Gate-1 tasks
> (N = 60, 2026-09-19) — more, not fewer. Project-scale counts (59 characters, 14 keywords,
> 57 stdlib modules) come from the same file's "Project facts" table.

---

## 1. Design Space

The design space for token-efficient code generation sits on two axes:

**Axis A — Language approach:**
New language (purpose-built syntax) vs constrained decoding on existing languages (same syntax, smarter sampling).

**Axis B — Audience:**
Human-readable (designed for human authors first) vs machine-optimized (designed for LLM generation/consumption first).

```
                    Machine-optimised
                         |
                   toke  |
                         |
   New language ─────────┼───────── Existing language
                         |
              Zig  Odin  |  ShortCoder
              MoonBit    |  XGrammar / Outlines
                         |
                    Human-readable
```

**Placement rationale:**

| System | Axis A | Axis B | Notes |
|--------|--------|--------|-------|
| **toke** | New language | Machine-optimised | 59-char alphabet, 14 keywords, backtrack-free grammar with bounded lookahead, designed for LLM code generation |
| **Zig** | New language | Human-readable | Designed for human systems programmers; comptime is a human productivity feature |
| **Odin** | New language | Human-readable | Explicit simplicity for human authors; no AI-specific design goals |
| **MoonBit** | New language | Between | Claims "AI-friendly" design but retains full human-readable syntax |
| **ShortCoder** | Existing language | Between | Constrained decoding to produce shorter code in existing languages |
| **XGrammar** | Existing language | Human-readable | Grammar-constrained decoding; output remains standard language syntax |
| **Outlines** | Existing language | Human-readable | Structured generation framework; output remains standard language syntax |
| **Turn** | New language | Unknown | Insufficient public information to place confidently [citation needed] |
| **Anka** | New language | Human-readable | Insufficient public information to place confidently [citation needed] |
| **KERN** | Existing language (compact reversible syntax over Python) | Machine-optimised | Python -> Kern -> Python deterministic transpiler; grammar v0.4; tokenizer-aware (validated against cl100k/o200k); benchmarks published against toke (see §6.8) |
| **SimPy** | Existing language (AST-compatible Python subset) | Machine-optimised | ISSTA 2024; abbreviated keywords; ~20-30% cl100k reduction on HumanEval; needs fine-tuning (as listed by KERN) |
| **Token Sugar** | Existing language (abbreviation layer over Python) | Machine-optimised | December 2025; structured abbreviations expanding to standard Python; ~15-25% savings via few-shot, no fine-tuning (as listed by KERN) |
| **Sigil, KARN, NERD** | New language (compact / AI-agent languages with Python converters) | Machine-optimised | Listed by KERN as reproduced rivals; see §6.9 |
| **Vyxal** | New language (golf language) | Machine-optimised (byte-golf, not LLM) | Listed by KERN as a token-density frontier comparator; see §6.9 |

---

## 2. Comparison Matrix

| Language/Tool | Token Density | Pass@1 | Compilation Target | Safety Model | Ecosystem Maturity | AI-Specific Design |
|--------------|---------------|--------|-------------------|-------------|-------------------|-------------------|
| **toke** | Costs **1.34x [1.22, 1.48]** the cl100k_base tokens of equivalent Python on the 60 Gate-1 tasks (N = 60, 2026-09-19) — more, not fewer; see `toke/docs/metrics-baseline.md` | 58.8% (Qwen 2.5 Coder 7B, Gate 1; 588/1,000) | LLVM IR -> native (x86-64, ARM64) | Static types, error unions, no null | 57 stdlib modules; 23,382 frozen v0.4 corpus records | Yes: 59-char alphabet, backtrack-free grammar, single-token keywords, compiler-in-the-loop training |
| **Zig** | No published data; expected similar to C [citation needed] | No published LLM Pass@1 data [citation needed] | LLVM IR -> native; also self-hosted backend | comptime safety, no hidden control flow, no hidden allocations, optional safety checks | Mature; large community; package manager; extensive stdlib | No |
| **Odin** | No published data [citation needed] | No published LLM Pass@1 data [citation needed] | LLVM IR -> native | Explicit allocators, bounds checking, no hidden control flow | Growing; ~100+ packages; used in production at JangaFX [citation needed] | No |
| **MoonBit** | Claims "AI-friendly" but no published token density comparisons [citation needed] | No published LLM Pass@1 data [citation needed] | Wasm, JS backend | Algebraic types, pattern matching, ownership | Early; stdlib under development; IDE tooling | Partial: claims AI-friendly design; details unclear |
| **ShortCoder** | Claims token reduction via constrained decoding on existing languages [citation needed] | Not published separately [citation needed] | N/A (meta-tool over existing languages) | Inherits from target language | N/A (research prototype) | Yes: constrained decoding to minimize output tokens |
| **XGrammar** | N/A (does not change token count of valid programs) | N/A | N/A (meta-tool) | Grammar constraints guarantee syntactic validity | Library; integrates with vLLM, MLC-LLM [citation needed] | Yes: grammar-constrained decoding for structured output |
| **Outlines** | N/A (does not change token count of valid programs) | N/A | N/A (meta-tool) | Regex/CFG constraints guarantee structural validity | Library; integrates with HuggingFace, vLLM [citation needed] | Yes: structured generation with regex, JSON schema, CFG |
| **Turn** | No data available [citation needed] | No data available [citation needed] | Unknown [citation needed] | Unknown [citation needed] | Unknown [citation needed] | Unknown [citation needed] |
| **Anka** | No data available [citation needed] | No data available [citation needed] | Unknown [citation needed] | Unknown [citation needed] | Unknown [citation needed] | Unknown [citation needed] |
| **KERN** | Kern Compact 28.25% fewer cl100k tokens than Python (1,682 EvalPlus/BigCodeBench programs); 4.56% beyond python-minifier 3.2.0; Kern-16K native BPE 38.11% below Python+cl100k. vs toke: 3,012 vs 6,347 cl100k on 60 Gate-1-era JSON-CLI pairs (reproduced) | No generation Pass@1 published; 541/542 is transpiler round-trip fidelity on EvalPlus | None: Kern -> Python source, run by CPython | Python's; deterministic round-trip guarantee | Single-author research repo (GitHub `OscarCode9/kern`), grammar v0.4, no PyPI, no licence file; full Python ecosystem inherited | Yes: tokenizer-aware syntax design, compact profile with BPE-aware alias ordering, purpose-built 16K BPE |
| **SimPy** | ~20-30% cl100k reduction vs Python on HumanEval (per KERN's summary of ISSTA 2024 paper) | Requires fine-tuning; base models default to Python | None (Python subset) | Python's | Research artefact, no production implementation (per KERN) | Yes: AST-compatible compact Python subset |
| **Token Sugar** | ~15-25% savings (per KERN) | Few-shot, no fine-tuning (per KERN) | None (expands to Python) | Python's | Rules hand-maintained (per KERN) | Yes: abbreviation layer over Python |
| **Sigil 0.1.0** | KERN reports Kern 21.51% below Sigil on 1,682 programs (136,202 vs 173,520 cl100k) | KERN reports 4/542 EvalPlus for Sigil | Python converter/compiler (per KERN) | Unknown | Alpha, on PyPI (`sigil-lang`) | Yes |
| **KARN v1.0.0** | Claims 76% fewer tokens than Python; KERN could not reproduce (sources/tokenizer unpublished) and measured Kern 2.19% below KARN on 46 executable pairs (670 vs 685) | 46/46 on KERN's pairs | Interpreter (per KERN) | Unknown | Unknown | Yes: AI-agent language |
| **NERD 3.0.0** | Claims 50-70% fewer tokens (lexical count, not an LLM tokenizer, per KERN); KERN measured Kern 9.92% below NERD on 7 deterministic pairs (436 vs 484) | 7/7 | LLVM-backed (per KERN) | Unknown | Unknown | Yes: "machine-authorship" language |
| **Vyxal 3.12.0** | Golf language; KERN measured 91 vs 151 cl100k on 14 frontier programs (Vyxal's own one-byte code page scores lower in bytes) | 14/14 | JVM interpreter | n/a | Mature golf-language community | No (byte-golf for humans; used by KERN as a density ceiling) |

Rows for SimPy, Token Sugar, Sigil, KARN, NERD and Vyxal are transcribed from KERN's page and repository as they list them (https://oscarcode9.github.io/kern-language.html, fetched 2026-09-18; details in `toke/docs/about/reviews/kern-2026-08.md`); they have not been independently verified here.

**Notes on toke metrics:** Token density and Pass@1 are from Gate 1 evaluation (2026-04-03). Methodology is documented in TEMSpec v1.0. All measurements are reproducible with published tooling and raw data.

---

## 3. Why a New Language?

### 3.1 Character set control enables structural guarantees impossible with constrained decoding alone

toke's 59-character ASCII alphabet is not an arbitrary restriction --- it is a design choice that produces measurable downstream effects:

- **Tokenizer alignment.** Fewer unique characters mean fewer possible byte-pair merges, so common multi-character sequences merge into single tokens more consistently. Standard languages with 95+ printable ASCII characters fragment tokenizer vocabulary across rarely-used symbols. (The v0.3-era fertility and vocabulary-utilisation figures that used to appear here are withdrawn: no toke tokenizer currently beats cl100k_base on canonical v0.4 text — see `toke/docs/metrics-baseline.md`.)

- **Deterministic parsing.** The restricted character set, combined with a backtrack-free grammar (bounded lookahead of up to 3 tokens on an enumerated set of productions), means every character position has a single valid interpretation. There is no ambiguity about whether `<` is a comparison operator, a generic type parameter, or an XML tag. In toke, `<` is the return operator --- always.

- **Training signal density.** When the character set is fixed and small, every character the model generates carries more information. There are no wasted probability mass on characters that never appear in valid programs.

Constrained decoding on existing languages can enforce grammar rules, but it cannot change the alphabet. A Python program will always contain uppercase letters, backticks, backslashes, tildes, and other characters that consume tokenizer vocabulary entries even when they appear rarely.

### 3.2 A closed 59-character alphabet eliminates tokenizer waste from rarely-used symbols

Standard tokenizers (cl100k_base, Llama 3 tokenizer) allocate vocabulary entries to character sequences that appear in natural language, markdown, HTML, and dozens of programming languages. When generating code in any single language, most of this vocabulary is wasted.

toke's approach is different: the language is designed so that a purpose-built tokenizer *could* achieve high vocabulary utilisation on a single language. That is a design rationale, not a result: no shipped toke tokenizer currently beats cl100k_base on canonical v0.4 text (the 8K SentencePiece needs 15.4% more tokens, N = 2,000, 2026-09-18), and no such claim is supportable until the v0.4 tokenizer is trained and locked (story 116.9).

### 3.3 Compiler-in-the-loop training creates a virtuous cycle

toke's reference compiler (`tkc`) was designed alongside the language to serve as a training signal source:

1. **Generate** toke programs from an LLM
2. **Compile** with `tkc` --- get structured diagnostics (JSON with error code, span, fix suggestion)
3. **Filter** the training corpus to only compiler-validated programs
4. **Train** on validated programs, using compiler errors as negative signal
5. **Repeat** with improved model

This loop produced 46,754 validated training programs across 4 stages, with 3-language differential testing. The compiler is not an afterthought; it is an integral part of the training pipeline.

Constrained decoding cannot provide this feedback loop. XGrammar and Outlines ensure syntactic validity at generation time, but they cannot verify semantic correctness, type safety, or runtime behavior. toke's compiler provides all of these.

### 3.4 Language-level error types map directly to training signal

toke's diagnostic system emits structured JSON errors with:
- Error code (e.g., `E0101` for type mismatch)
- Source span (line, column, length)
- Fix suggestion (machine-readable replacement text)

These diagnostics are designed to be consumed by training pipelines, not just human developers. Each error code maps to a specific class of model mistake, enabling targeted data augmentation for failure modes.

In existing languages, compiler errors are natural-language strings designed for human readers. Extracting structured training signal from `gcc` or `rustc` output requires brittle parsing of messages that change between compiler versions.

---

## 4. Why Not Constrained Decoding Alone?

### 4.1 Constrained decoding reduces tokens but cannot change inherent verbosity

ShortCoder and similar constrained-decoding approaches work by biasing the LLM's token sampling to prefer shorter valid completions. XGrammar and Outlines work by masking out tokens that would violate a grammar, ensuring syntactically valid output.

Both approaches are valuable, but they share a fundamental limitation: **the source language's syntax is fixed.** No amount of constrained decoding can make Python's `def calculate_average(numbers: list[int]) -> float:` shorter than toke's `f avg(ns: @i64): f64 {`. The verbosity is baked into the language.

Measured impact:
- toke vs Python (cl100k_base): **52 tokens vs 156 tokens** for equivalent complete programs (3.0x ratio)
- This 3x gap is due to language design, not tokenizer tricks
- Constrained decoding on Python cannot close this gap

### 4.2 toke attacks both dimensions

toke's strategy operates at two levels:

1. **Language design** (Phase 1, completed): 59-character alphabet, single-character declaration keywords, a backtrack-free grammar, sigil-based type system. This reduces the number of characters and structural tokens needed to express a program.

2. **Constrained decoding** (D12=C ablation study, planned): toke's small backtrack-free grammar is specifically designed to be expressible as a context-free grammar suitable for constrained-decoding frameworks. A future ablation study (D12=C in the spec) will measure the additional benefit of layering grammar-constrained decoding on top of the already-compact language.

The hypothesis: combining both approaches will yield greater token reduction than either alone. Constrained decoding can provide additional gains by eliminating syntactically invalid token sequences during generation.

### 4.3 Constrained decoding does not provide compilation or semantic feedback

Grammar-constrained decoding ensures the output parses. It does not ensure:
- Type safety
- Correct use of standard library APIs
- Semantic equivalence with the specification
- Runtime correctness

toke's compiler-in-the-loop approach catches all of these. The two approaches are complementary, not competing.

---

## 5. Acknowledged Risks

### 5.1 No ecosystem

**Risk:** New languages start with zero libraries, zero Stack Overflow answers, zero blog posts. Developers (and LLMs) cannot leverage existing packages.

**Mitigation:**
- toke is a *code generation target*, not a general-purpose human programming language. The primary "developer" is an LLM, which does not need Stack Overflow.
- The standard library (57 modules) covers the core functionality needed for the benchmark tasks (string manipulation, JSON, HTTP, file I/O, etc.).
- C FFI enables calling into existing C libraries when needed.
- The compiler emits LLVM IR, enabling integration with the LLVM ecosystem for optimisation and cross-compilation.

### 5.2 No existing training data

**Risk:** LLMs are trained on billions of tokens of Python, JavaScript, C, and Java. A new language has zero tokens in any pre-training corpus. This is a cold-start problem.

**Mitigation:**
- Phase 1 demonstrated that a 7B parameter model (Qwen 2.5 Coder) can be fine-tuned with LoRA on the v0.2-era corpus of 46,754 toke programs (2026-04-01) to achieve 58.8% Pass@1 on held-out tasks (588 of 1,000 generated; published as 63.7% until 2026-09-19, when the denominator was corrected under story 128.19). The cold-start problem is real but surmountable with targeted fine-tuning.
- toke's syntax borrows structural patterns from C, Rust, and Go (curly braces, semicolons, type annotations). Models with pre-training on these languages transfer syntactic intuitions to toke.
- The training corpus is generated via multi-model pipeline (Claude, GPT, Grok) with differential testing, providing diversity that mitigates overfitting to any single model's style.
- Corpus scaling is planned for Phase 2: larger programs, more domains, more diverse algorithmic patterns.

### 5.3 Cold-start problem for model quality

**Risk:** Without millions of human-written toke programs, model quality may plateau below that of models generating Python or JavaScript.

**Mitigation:**
- Gate 1 Pass@1 of 58.8% with a 7B model (588/1,000; this claim previously quoted 63.7%, corrected under story 128.19) is in the range of early code generation benchmarks on established languages [citation needed]. Phase 2 plans include larger base models and expanded training data.
- The compiler-in-the-loop training pipeline enables automated corpus generation at scale. The bottleneck is not human programmers writing toke --- it is LLMs generating and compilers validating toke programs.
- toke's restricted syntax may actually *help* small models: fewer valid syntactic forms means less probability mass wasted on syntactic variations. The model can focus on algorithmic correctness rather than syntax choices.

### 5.4 Language adoption risk

**Risk:** If toke fails to achieve sufficient token efficiency or model quality, the engineering investment in the compiler, standard library, and training infrastructure is wasted.

**Mitigation:**
- The project uses explicit go/no-go gates with falsification criteria. Gate 1 required >= 10% token reduction and >= 60% Pass@1. Both were met. If a future gate fails, the spec defines a pivot to typed-IR approach.
- The compiler, standard library, and training infrastructure are modular. Lessons learned (small backtrack-free grammar design, structured diagnostics, compiler-in-the-loop training) transfer to other projects even if toke itself does not proceed.

### 5.5 Evaluation methodology risk

**Risk:** Token efficiency measured against Python may not generalise to other baselines. Pass@1 on synthetic benchmarks may not predict real-world code generation quality.

**Mitigation:**
- TEMSpec v1.0 requires reporting against multiple tokenizers (cl100k_base, toke-bpe-8k, and for Gate 2+: Llama 3, Qwen 2.5 tokenizers).
- Cross-language comparisons include Python, C, and Java baselines.
- The benchmark harness uses 1,000 held-out tasks with 120 test inputs each, with automated compile-run-score pipeline.
- All raw data (per-task token counts, model outputs, reference solutions) is published for independent verification.

---

## 6. Related Work Details

### 6.1 Zig

Zig is a systems programming language created by Andrew Kelley, positioned as a "better C." Key features include comptime (compile-time code execution that replaces macros and generics), no hidden allocations, no hidden control flow, and first-class C interop. Zig compiles via LLVM or its own self-hosted backend.

**Relevance to toke:** Zig demonstrates that a new systems language can gain traction by being genuinely simpler than alternatives (C++, Rust). However, Zig is designed for human systems programmers, not for LLM code generation. Its syntax, while cleaner than C++, uses standard-length keywords (`const`, `return`, `struct`, `while`) and the full ASCII character set. No published work measures Zig's token density for LLM generation.

**Key difference:** Zig optimises for human comprehension and explicit control. toke optimises for LLM token efficiency. These are different design objectives that lead to different syntax decisions.

### 6.2 Odin

Odin is a systems programming language by Bill Hall (gingerbill), emphasising simplicity, readability, and explicit memory management via custom allocators. It targets LLVM for code generation.

**Relevance to toke:** Odin shares toke's value of syntactic simplicity, but defines "simple" as "easy for humans to read and understand." Odin's syntax is more verbose than toke's (standard-length keywords, explicit type annotations with human-readable names).

**Key difference:** Odin has no AI-specific design goals. Its simplicity benefits humans; whether it incidentally benefits LLMs has not been studied.

### 6.3 MoonBit

MoonBit is a programming language designed for WebAssembly, featuring pattern matching, algebraic data types, type inference, and a multi-tier garbage collector. Its creators have described it as "AI-friendly" [citation needed].

**Relevance to toke:** MoonBit is the closest comparator in intent --- it explicitly considers AI as a use case. However, MoonBit's "AI-friendly" claims appear to focus on IDE integration and AI-assisted development (AI helping human programmers write MoonBit) rather than on making MoonBit a generation target for AI (AI generating MoonBit as output) [citation needed]. No published token density measurements or LLM Pass@1 benchmarks for MoonBit are available.

**Key difference:** MoonBit retains human-readable syntax and a full character set. toke's restricted 59-character alphabet and single-character keywords represent a more radical optimisation for machine generation.

### 6.4 ShortCoder

ShortCoder is a research project exploring constrained decoding strategies to produce more token-efficient code in existing programming languages [citation needed]. The approach modifies the LLM sampling process to prefer shorter valid completions without changing the source language.

**Relevance to toke:** ShortCoder represents the "constrained decoding on existing language" quadrant of the design space. If ShortCoder achieves significant token reductions on Python or JavaScript, it would partially validate toke's premise (token efficiency matters) while offering a lower-investment alternative (no new language required).

**Key difference:** ShortCoder is bounded by the target language's inherent verbosity. toke attacks verbosity at the language level, which is complementary to and stackable with constrained decoding.

### 6.5 XGrammar

XGrammar is a grammar-constrained decoding library developed by the MLC-AI team. It enables LLMs to generate output that conforms to a specified context-free grammar (CFG) or regular expression, with efficient token masking during generation [citation needed].

**Relevance to toke:** XGrammar demonstrates that grammar-constrained decoding is practical and efficient. toke's small backtrack-free grammar was designed to be expressible as a CFG, making it compatible with XGrammar-style constrained decoding. The D12=C ablation study in toke's spec plans to measure the benefit of layering XGrammar-style constraints on top of toke's language design.

**Key difference:** XGrammar ensures syntactic validity but does not reduce the token count of valid programs. toke reduces token counts through language design and can additionally use XGrammar-style decoding for syntactic guarantees.

### 6.6 Outlines

Outlines (by dottxt) is a structured generation library for LLMs, supporting regex-guided generation, JSON schema enforcement, and CFG-constrained generation. It integrates with HuggingFace Transformers and vLLM [citation needed].

**Relevance to toke:** Like XGrammar, Outlines demonstrates the viability of grammar-constrained decoding. Outlines' CFG support could be used to constrain generation to valid toke programs, providing an additional layer of syntactic guarantees on top of toke's language design.

**Key difference:** Same as XGrammar --- Outlines ensures structural validity but does not address language-level verbosity.

### 6.7 Turn and Anka

Insufficient public information is available about Turn and Anka to provide meaningful comparison [citation needed]. If these projects have published design documents, benchmarks, or source code, they should be evaluated against the same axes (language approach, audience, token density, Pass@1) and added to the comparison matrix.

### 6.8 KERN (KERN-py)

KERN (Oscar Martinez; https://oscarcode9.github.io/kern-language.html, published 2026-03-03, updated 2026-08-01; repository https://github.com/OscarCode9/kern, no licence file, no PyPI release) is "a compact representation of Python with a formal, deterministic and reversible grammar". A transpiler maps Python to Kern and a compiler maps Kern back to Python for execution; an optional compact profile alpha-renames locals with BPE-aware alias ordering. Every syntax decision is stated to be validated against cl100k_base and o200k_base. Because any Python corpus is Kern training data via the transpiler, KERN has no cold-start problem and inherits Python's ecosystem.

**Relevance to toke:** KERN is the first third party to publish a benchmark directly against toke. Its shared-tokenizer result (Kern Compact 3,012 vs toke 6,347 cl100k tokens on 60 public Gate-1-era JSON-CLI pairs; 29/60 of those April-2026 generated toke sources accepted by tkc 2.8.0) reproduces exactly and is consistent with toke's own published cl100k figures. Its equal-vocabulary native-tokenizer lane (2,788 vs 3,906) scores toke's v0.3 tokenizer on legacy-syntax text; on migrated text the gap is 2,788 vs 2,872 with a confidence interval that includes parity. Its 541/542 "Pass@1" is transpiler fidelity on EvalPlus, not model generation. Full review: `toke/docs/about/reviews/kern-2026-08.md`.

**Key difference:** KERN compresses Python's surface syntax and keeps Python's semantics, runtime and tests; toke is a separate compiled language with its own runtime and native binaries. Under TEMSpec, Kern-vs-Python numbers are same-tokenizer reductions of a re-encoding, Kern-vs-toke numbers are cross-language density ratios (informational), and neither project's correctness criterion (transpile-and-execute vs compile-natively-and-execute) applies to the other; the shared criterion for a joint benchmark is output equality on the same tests.

### 6.9 Projects listed by KERN as comparators

Transcribed from the KERN page and repository (fetched 2026-09-18) as they list them; not independently verified here.

- **SimPy** (ISSTA 2024, arXiv 2404.16333): AST-compatible simplified Python subset with abbreviated keywords; ~20-30% token reduction on HumanEval; requires fine-tuning; research artefact without a production implementation.
- **Token Sugar** (December 2025, arXiv 2512.08266): a "syntactic sugar" abbreviation layer over Python that expands back to standard Python; ~15-25% savings with few-shot prompting, no fine-tuning; rules are hand-maintained.
- **Sigil 0.1.0** (PyPI `sigil-lang`): alpha compact language with a Python converter and compiler; KERN reports Kern 21.51% below Sigil on 1,682 programs and Sigil passing 4/542 EvalPlus tasks.
- **KARN v1.0.0**: AI-agent language claiming 76% fewer tokens than Python; KERN reports the claim is not reproducible from public artefacts and measures Kern 2.19% below KARN on 46 matched executable pairs (46/46 both).
- **NERD 3.0.0**: LLVM-backed "machine-authorship" language claiming 50-70% fewer tokens; KERN reports the counter is lexical rather than an LLM tokenizer and measures Kern 9.92% below NERD on 7 deterministic pairs.
- **Vyxal 3.12.0**: stack-based code-golf language used by KERN as a density ceiling; 91 vs 151 cl100k tokens on 14 frontier programs (14/14 both), with Vyxal's one-byte code page scored separately.
- Also named on the page: **LLMLingua** (prompt compression, 50-75%), and in the repository: Ax, zerolang, K, GolfScript, J, Pyth, Jelly, Uiua, BQN, GNU APL, CJam, Kona, Nibbles, Dyalog APL.

---

## Appendix: toke Gate 1 Results Summary

For full details, see [gate1-decision.md](gate1-decision.md).

| Metric | Value |
|--------|-------|
| Pass@1 | **58.8%** (588 passed / 1,000 generated; Qwen 2.5 Coder 7B + LoRA, held-out tasks) |
| Model | Qwen 2.5 Coder 7B + LoRA |
| Training corpus | 46,754 validated programs (v0.2-era, 2026-04-01) |

Every token-efficiency row this table used to carry — token reduction vs Python, the
cross-language density multiples, tokenizer fertility and vocabulary utilisation — was
deleted on 2026-09-19 (stories 132.6 / 132.13 / 132.15): each compared a toke-trained
tokenizer against cl100k on the baseline side. The "92.3% compile success" rate was
deleted with them (story 132.16).

The Pass@1 denominator is a separate matter and was corrected, not deleted, on
2026-09-19 (story 128.19): "588/923" was **wrong**, not merely unreproducible.
1,000 solutions were generated and the 77 that failed to compile were dropped
from the denominator, making 63.7% a Pass@1 *given that the solution compiled*.
The Pass@1 is 588/1,000 = **58.8%**, below the gate's own >= 60% threshold, and
the Gate 1 verdict is re-opened. See `gate1-decision.md`. `toke/docs/metrics-baseline.md` is the only
source for what toke has actually measured.

---

*This document contains claims marked [citation needed] where live source verification was not available at time of writing. These should be verified against current sources before publication.*
