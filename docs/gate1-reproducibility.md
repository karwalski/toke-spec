# Gate 1 Reproducibility Package

**Date:** 2026-04-04
**Gate 1 Decision:** PASS (2026-04-03)
**Story:** 10.1.4

This document bundles everything needed to independently reproduce the Gate 1 evaluation results: Pass@1 = 63.7% (588/923 compiled, 1000 tasks) and token reduction >= 12.5% vs cl100k_base.

---

## 1. Evaluation Harness

| Field | Value |
|-------|-------|
| Repository | `toke-eval` ([github.com/karwalski/toke-eval](https://github.com/karwalski/toke-eval)) |
| Entrypoint | `toke_eval/pass_at_k.py` |
| Commit | [TODO: run `git -C ~/tk/toke-eval rev-parse HEAD` and paste hash here] |
| Tag | [TODO: check for a gate1 tag with `git -C ~/tk/toke-eval tag -l '*gate1*'`] |

### Command to run

```bash
python -m toke_eval.pass_at_k \
    --solutions-dir solutions/ \
    --tests-dir hidden_tests/ \
    --compiler ./tkc \
    --output results.json \
    --timeout 10
```

### Sampling parameters

| Parameter | Value |
|-----------|-------|
| Decoding | Greedy (temperature = 0) |
| Samples per task (n) | 1 |
| k | 1 |
| Pass@k formula | Unbiased estimator: `1 - C(n-c, k) / C(n, k)` (Chen et al.) |
| Test cases per task | 120 |
| Compile timeout | 30 s |
| Runtime timeout | 10 s |
| Pass criterion | All 120 test cases must match expected output exactly |

### Error taxonomy

The harness classifies failures into categories based on compiler error codes:

| Category | Error code range | Description |
|----------|-----------------|-------------|
| syntax | E1000-E1999 | Lexer errors |
| parse | E2000-E2999 | Parser/grammar errors |
| name | E3000-E3999 | Name resolution errors |
| type | E4000-E4999 | Type checking errors |
| codegen | E9000-E9999 | Code generation / backend errors |
| runtime | (timeout/crash) | Compiled but failed at runtime |
| logic | (wrong output) | Compiled and ran but produced wrong output |

---

## 2. Hidden Test Hashes

The held-out benchmark set consists of 1,000 tasks (`gate1_v5_1000`). Per the benchmark design document, held-out test cases are stored separately and never committed to any public repository.

### Task schema

Each task comprises:
- A task YAML file with `test_cases` containing `input` and `expected` fields
- 120 test cases per task
- Task IDs follow the pattern `task-a-NNNN`

### Hash commitments

| Artifact | SHA-256 |
|----------|---------|
| `gate1_v5_1000.json` (results file) | [TODO: run `shasum -a 256 ~/tk/toke-benchmark/results/gate1_v5_1000.json`] |
| Hidden test set (tar of all 1000 task YAMLs) | [TODO: create tarball of hidden test YAMLs and compute `shasum -a 256`] |
| Solutions directory (tar of 1000 .toke files) | [TODO: create tarball of solutions and compute `shasum -a 256`] |

### Results file location

`toke-benchmark/results/gate1_v5_1000.json` -- contains per-task pass counts (120 test inputs each).

---

## 3. Training Hyperparameters

Extracted from `toke-models/finetune/configs/7b_mlx.yaml`.

| Parameter | Value |
|-----------|-------|
| Base model | `Qwen/Qwen2.5-Coder-7B-Instruct` |
| Quantisation | 4-bit (MLX default) |
| Adaptation method | LoRA |
| LoRA rank | 64 |
| LoRA alpha | 128.0 |
| LoRA dropout | 0.05 |
| LoRA scale | 2.0 (alpha / rank) |
| LoRA target layers | `self_attn.{q,k,v,o}_proj`, `mlp.{gate,up,down}_proj` |
| Train embeddings | Yes (`embed_tokens` + `lm_head` unfrozen) |
| Epochs | 3 |
| Batch size | 8 |
| Gradient accumulation steps | 4 (effective batch = 32) |
| Learning rate | 2.0e-4 |
| LR schedule | Cosine decay |
| Warmup steps | 100 |
| Max sequence length | 2048 tokens |
| Gradient checkpointing | Enabled |
| Max gradient norm | 1.0 |
| Steps per report | 10 |
| Steps per eval | 250 |
| Save every | 500 steps |
| Training data | `training-data/train.jsonl` |
| Eval data | `training-data/eval.jsonl` |
| Adapter output | `output/7b-mlx/adapter` |
| Fused model output | `output/7b-mlx/fused` |
| Seed | [TODO: check if seed is set in train_mlx.py or at invocation time] |

### Training script

`toke-models/finetune/train_mlx.py` -- uses `mlx_lm.tuner.trainer.train()` with `TrainingArgs` built from the YAML config above.

---

## 4. Hardware

| Component | Specification |
|-----------|--------------|
| Machine | Mac Studio (2025) |
| SoC | Apple M4 Max |
| Unified memory | 128 GB |
| ML framework | MLX (Apple Silicon native) |
| Inference time (1000 tasks) | 41.7 minutes |
| OS | macOS (ARM64) |

All training and inference were performed locally on this single machine. No cloud compute was used for Gate 1 evaluation.

---

## 5. Curriculum Distribution

The training corpus comprises 46,754 validated, deduplicated, compiler-checked toke programs across 4 stages:

| Stage | Programs | Description |
|-------|----------|-------------|
| A | 26,978 | Core algorithmic tasks (math, conditionals, arrays, strings, sorting, error handling) |
| B | 9,776 | Multi-function programs |
| C | 5,000 | Boundary condition programs |
| D | 5,000 | Application-level programs |
| **Total** | **46,754** | |

### Category breakdown (Stage A)

Stage A tasks are drawn from the following categories (from `toke-corpus/prompts/category/`):

| Category | Code | Description |
|----------|------|-------------|
| Mathematics | A-MTH | Arithmetic, number theory, combinatorics |
| Conditionals | A-CND | Branching, boolean logic |
| Arrays | A-ARR | Array manipulation, searching, indexing |
| Strings | A-STR | String operations, parsing |
| Sorting | A-SRT | Sorting algorithms |
| Error handling | A-ERR | Error cases, edge conditions |

[TODO: extract exact per-category counts from corpus pipeline output or stats files]

### Generation pipeline

- Multi-model generation: Claude Haiku 4.5, GPT-4.1-mini, Grok-3-mini
- 3-language differential testing (Python, C, Java) for correctness validation
- Local Qwen judge agent for quality review
- All programs validated against `tkc` compiler

---

## 6. Contamination Report

### Holdout isolation

The benchmark test set is stored separately from the training corpus:
- Training data lives in `toke-corpus/` (46,754 programs)
- Benchmark tasks live in `toke-benchmark/` (1,000 held-out tasks)
- Per the benchmark design document: "Held-out test cases used for gate evaluation are stored separately and never committed to any repository"

### Isolation method

1. **Repository separation** -- training corpus (`toke-corpus`) and benchmark (`toke-benchmark`) are separate git repositories with no cross-references in code
2. **Task ID namespaces** -- benchmark tasks use `task-a-NNNN` IDs not present in the training data
3. **Temporal ordering** -- benchmark tasks were generated before the final training data was assembled

### Hash commitment approach

To enable third-party verification without revealing the hidden test set:
1. Compute SHA-256 of each individual task YAML
2. Compute SHA-256 of the concatenated sorted task hashes (Merkle-style commitment)
3. Publish the root hash in the gate evaluation card
4. Reveal individual task hashes on request to prove non-tampering

### Semantic similarity checks

[TODO: reference Story 10.7.4 -- holdout contamination analysis; document results when complete]

### Known limitations

- No automated semantic deduplication between corpus and benchmark has been run yet (planned in Story 10.7.4)
- The benchmark and corpus were generated by the same pipeline infrastructure, though from different task specifications

---

## 7. Software Versions

| Software | Version | Notes |
|----------|---------|-------|
| Python | [TODO: run `python3 --version`] | |
| MLX | [TODO: run `python3 -c "import mlx.core; print(mlx.core.__version__)"`] | Apple Silicon ML framework |
| mlx-lm | [TODO: run `pip show mlx-lm \| grep Version`] | LoRA fine-tuning library |
| tiktoken | [TODO: run `pip show tiktoken \| grep Version`] | OpenAI tokenizer (cl100k_base baseline) |
| tkc (compiler) | [TODO: run `tkc --version` or `git -C ~/tk/tkc rev-parse HEAD`] | Reference toke compiler |
| clang | [TODO: run `clang --version`] | LLVM IR to native compilation |
| macOS | [TODO: run `sw_vers`] | |
| PyYAML | [TODO: run `pip show pyyaml \| grep Version`] | Test case parsing |

### Repository commit hashes

| Repository | Commit (at Gate 1) |
|------------|-------------------|
| toke-spec | [TODO: `git rev-parse HEAD`] |
| tkc | [TODO: `git rev-parse HEAD`] |
| toke-eval | [TODO: `git rev-parse HEAD`] |
| toke-models | [TODO: `git rev-parse HEAD`] |
| toke-benchmark | Tag: `v0.1-gate1` / [TODO: `git rev-parse v0.1-gate1`] |
| toke-corpus | [TODO: `git rev-parse HEAD`] |

---

## 8. Reproduction Steps

### Prerequisites

- Mac with Apple Silicon (M4 Max recommended, M1+ should work)
- macOS with Xcode command line tools (for clang)
- Python 3.11+
- Git access to all toke repositories

### Step-by-step

```bash
# 1. Clone repositories
git clone git@github.com:karwalski/tkc.git
git clone git@github.com:karwalski/toke-eval.git
git clone git@github.com:karwalski/toke-models.git
git clone git@github.com:karwalski/toke-benchmark.git
git clone git@github.com:karwalski/toke-corpus.git

# 2. Build the compiler
cd tkc
# [TODO: document build steps -- likely `make` or CMake]
# Verify: ./tkc --version

# 3. Install Python dependencies
cd ../toke-eval
python3 -m venv .venv && source .venv/bin/activate
pip install -e .
pip install pyyaml

# 4. Install MLX training dependencies
cd ../toke-models
python3 -m venv .venv && source .venv/bin/activate
pip install mlx mlx-lm pyyaml

# 5. Prepare training data
# Training data (train.jsonl, eval.jsonl) must be placed in
# toke-models/finetune/training-data/
# [TODO: document how to generate training JSONL from toke-corpus output]

# 6. Fine-tune the model
cd finetune
python train_mlx.py --config configs/7b_mlx.yaml
# This will download Qwen/Qwen2.5-Coder-7B-Instruct and train with LoRA.
# Output adapter saved to output/7b-mlx/adapter/

# 7. Generate solutions (inference)
# [TODO: document the inference script and command]
# Expected: 1000 .toke files in a solutions directory
# Decoding: greedy (T=0), one sample per task

# 8. Run evaluation
cd ../../toke-eval
python -m toke_eval.pass_at_k \
    --solutions-dir ../path/to/solutions/ \
    --tests-dir ../path/to/hidden_tests/ \
    --compiler ../tkc/tkc \
    --output results/gate1_reproduction.json \
    --timeout 10

# 9. Verify results
# Expected: Pass@1 >= 60% (588/923 = 63.7% in original run)
# Token reduction >= 10% vs cl100k_base
```

### Expected output

```
============================================================
  Tasks:     1000
  Compiled:  923/1000
  Pass@1:    588/923
  Mean:      0.6371
  Duration:  ~2500s
============================================================
```

### Variability notes

- Greedy decoding (T=0) should produce deterministic output given the same model weights
- Minor variations may occur due to floating-point differences across MLX versions or hardware
- The compile rate (923/1000) depends on the exact compiler version; codegen fixes from Epic 2.8 are required

---

## References

- Gate 1 decision document: `toke-spec/docs/gate1-decision.md`
- Gate criteria: `toke-spec/docs/gate-criteria.md`
- Benchmark design: `toke-benchmark/docs/benchmark-design.md`
- Benchmark results: `toke-benchmark/results/gate1_v5_1000.json`
- Training config: `toke-models/finetune/configs/7b_mlx.yaml`
- Training script: `toke-models/finetune/train_mlx.py`
- Evaluation harness: `toke-eval/toke_eval/pass_at_k.py`
- Benchmark tag: `toke-benchmark` tag `v0.1-gate1`
