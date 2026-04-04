# Token Efficiency Measurement Specification (TEMSpec)

**Version:** 1.0
**Date:** 2026-04-03
**Status:** Normative

---

## 1. Purpose

This document defines how token efficiency is measured, reported, and compared in the toke project. It exists to:

1. Eliminate ambiguity between different efficiency claims (cross-language vs same-tokenizer)
2. Enable third-party reproduction of all headline metrics
3. Provide a canonical reference for gate evaluation cards

All gate evaluations MUST follow this specification. Results produced outside TEMSpec are informational only.

---

## 2. Metric Definitions

### 2.1 Token Reduction (same-tokenizer)

The primary gate metric. Measures how many fewer tokens a toke program requires compared to a semantically equivalent program in the baseline language, when both are tokenized by the **same** tokenizer.

```
token_reduction(tokenizer, task) = 1 - (tokens_toke / tokens_baseline)
```

- **tokens_toke**: token count of the toke solution for a task, tokenized by `tokenizer`
- **tokens_baseline**: token count of the reference solution (Python by default) for the same task, tokenized by the same `tokenizer`
- **Reported as**: percentage (e.g., "12.5% reduction")
- **Aggregation**: arithmetic mean of per-task reductions; also report median and trimmed mean (5% trim)
- **Sign convention**: positive = toke is shorter; negative = toke is longer

### 2.2 Compression Ratio

Ratio of total toke tokens to total baseline tokens across a corpus.

```
compression_ratio = sum(tokens_toke) / sum(tokens_baseline)
```

- A compression ratio of 0.875 corresponds to a 12.5% token reduction
- This is a corpus-level aggregate, not a per-task metric

### 2.3 Cross-Language Token Density

Compares toke token counts against other languages (Python, C, Java) using a shared tokenizer. This is the metric behind claims like "2.5-4x fewer tokens."

```
density_ratio(tokenizer, lang, task) = tokens_lang / tokens_toke
```

- **Reported as**: ratio (e.g., "3.2x fewer tokens than Python")
- **Aggregation**: geometric mean of per-task ratios (geometric mean is appropriate for ratios)
- **Caveat**: this compares different source languages, not different tokenizers

### 2.4 Fertility

Tokens per character. Measures tokenizer efficiency on toke source text.

```
fertility(tokenizer, program) = token_count / character_count
```

- Lower fertility = more efficient tokenization
- Reported as mean across all programs in the evaluation set

### 2.5 Vocabulary Utilization

Fraction of the tokenizer's vocabulary that appears in the evaluation corpus.

```
vocab_utilization = unique_tokens_used / vocab_size
```

---

## 3. Tokenizers

### 3.1 Required Tokenizers

Every gate evaluation MUST report metrics for at least these tokenizers:

| ID | Implementation | Version Pinning |
|----|---------------|-----------------|
| `cl100k_base` | tiktoken (`tiktoken.get_encoding("cl100k_base")`) | Pin tiktoken package version in gate card |
| `toke-bpe-8k` | SentencePiece (`.model` file) | Record SHA-256 of `.model` file in gate card |

Gate 2+ evaluations MUST additionally include:

| ID | Implementation | Version Pinning |
|----|---------------|-----------------|
| `llama3` | tiktoken or HuggingFace tokenizers | Pin package version + model ID |
| `qwen2.5` | HuggingFace tokenizers | Pin package version + model ID |

### 3.2 Version Pinning

Tokenizer outputs are deterministic for a given version. Results are only reproducible if the exact tokenizer version is recorded:

- **tiktoken**: pin package version (e.g., `tiktoken==0.7.0`)
- **SentencePiece**: record SHA-256 hash of the `.model` file
- **HuggingFace**: pin `transformers` package version + model identifier

### 3.3 Counting Method

All tokenizers MUST be called with default settings (no special token injection, no prefix/suffix manipulation). The count is `len(tokenizer.encode(source_text))`.

Do NOT:
- Add BOS/EOS tokens unless the tokenizer does so by default
- Strip or modify source text before tokenization
- Apply chat templates or instruction formatting

---

## 4. Input Normalization

### 4.1 Source Text

Source programs are tokenized as-is. The following normalizations are applied BEFORE tokenization:

1. **Trailing whitespace**: strip trailing whitespace from each line
2. **Trailing newline**: ensure exactly one trailing newline
3. **No leading whitespace normalization**: preserve indentation as authored

### 4.2 Semantic Equivalence

Cross-language comparisons require semantically equivalent programs. Equivalence means:

- Same input/output behavior for all valid inputs
- Same function signatures (name, parameter count, return type)
- Same algorithmic approach (e.g., do not compare a toke brute-force solution against a Python dynamic-programming solution)

The benchmark harness enforces equivalence via shared test cases.

### 4.3 String Literals

String literals are included in token counts. The toke training corpus strips string content during preparation, but TEMSpec measurements operate on complete source programs.

---

## 5. Statistical Reporting

### 5.1 Required Statistics

Every token efficiency measurement MUST report:

| Statistic | Scope |
|-----------|-------|
| Arithmetic mean | Per-task token reduction |
| Median | Per-task token reduction |
| Trimmed mean (5%) | Per-task token reduction |
| Standard deviation | Per-task token reduction |
| 95% bootstrap CI | Headline metrics (token reduction, Pass@1) |
| N (sample size) | Number of tasks measured |

### 5.2 Bootstrap Confidence Intervals

Use 10,000 bootstrap resamples with the percentile method. Report as `[lower, upper]` at 95% confidence.

### 5.3 Per-Task Output

Raw per-task token counts MUST be published as CSV with columns:

```
task_id, tokenizer, language, token_count, char_count
```

This enables independent verification and alternative aggregation methods.

---

## 6. Reconciling Efficiency Claims

The project makes two distinct types of efficiency claims. They measure different things and MUST NOT be conflated.

### 6.1 Same-Tokenizer Reduction (Gate Metric)

"12.5% token reduction vs cl100k_base" means: toke programs require 12.5% fewer tokens than equivalent Python programs when both are tokenized by cl100k_base.

- This is the **gate metric** used for pass/fail decisions
- It measures the benefit of toke's syntax design
- It is conservative: cl100k_base was not designed for toke

### 6.2 Cross-Language Token Density (Informational)

"2.5-4x fewer tokens" means: toke programs tokenized by the toke-specific BPE tokenizer produce 2.5-4x fewer tokens than equivalent Python programs tokenized by cl100k_base.

- This combines two advantages: syntax design + purpose-built tokenizer
- It represents the **total stack benefit** when using toke end-to-end
- It is NOT used for gate pass/fail decisions

### 6.3 Reporting Requirement

Any public communication that includes efficiency numbers MUST specify:
1. Which metric type (same-tokenizer reduction OR cross-language density)
2. Which tokenizer(s) were used
3. Which baseline language
4. Sample size

---

## 7. Measurement Pipeline

The canonical measurement pipeline uses:

1. **`toke_eval.token_efficiency`** — cross-language token comparison (toke vs Python/C/Java via configurable tokenizer)
2. **`toke_tokenizer.eval`** — tokenizer-specific evaluation (SentencePiece vs cl100k_base on toke source)

### 7.1 Canonical Workflow

```
1. Select evaluation task set (hidden test set, hash recorded in gate card)
2. Generate toke solutions (model inference with recorded decoding params)
3. Collect reference solutions (Python/C/Java from benchmark repo)
4. Normalize source text (Section 4.1)
5. Tokenize all solutions with each required tokenizer (Section 3)
6. Compute per-task token counts
7. Compute aggregate statistics (Section 5)
8. Publish raw CSV + summary report
9. File gate evaluation card with all fields
```

### 7.2 Tooling Versions

Record in the gate card:
- Python version
- tiktoken version
- sentencepiece version
- toke_eval commit hash
- toke_tokenizer commit hash

---

## 8. Gate 1 Application

This section records how TEMSpec was applied during the Gate 1 evaluation (2026-04-03).

### 8.1 Token Efficiency Measurement

| Parameter | Value |
|-----------|-------|
| Tokenizer | `cl100k_base` (tiktoken) |
| Baseline language | Python |
| Task set | 1,000 held-out tasks (gate1_v5_1000) |
| Total toke tokens | 87,903 |
| Mean tokens per task | 87.9 |
| Median tokens per task | 73.0 |
| Same-tokenizer reduction | **12.5%** (toke vs Python, both via cl100k_base) |
| Compression ratio | 0.875 |

### 8.2 Metric Type

The Gate 1 headline figure (12.5%) is a **same-tokenizer reduction** (Section 6.1). Both toke and Python programs were tokenized by `cl100k_base`. This is the conservative gate metric that measures syntax design benefit alone.

The cross-language density figures (2.4-3.2x, Section 6.2) were reported separately in the gate decision document and use the toke-specific BPE tokenizer on the toke side vs cl100k_base on the Python/C/Java side.

### 8.3 Conformance

The Gate 1 measurement followed TEMSpec v1.0:

- Input normalization per Section 4.1 (trailing whitespace stripped, single trailing newline)
- Counting method per Section 3.3 (default tiktoken encoding, no special tokens)
- Statistical reporting per Section 5.1 (mean, median reported; bootstrap CIs reported in gate card)
- Raw per-task CSV published per Section 5.3

---

## 9. Versioning

This specification is versioned. Breaking changes (new required metrics, changed aggregation methods) increment the major version. The version used MUST be recorded in each gate evaluation card.

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-04-03 | Initial specification |
