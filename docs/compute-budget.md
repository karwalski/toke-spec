# Compute Budget and Infrastructure Plan

**Last updated:** 2026-04-04
**Story:** 10.10.3
**Status:** Planning document (estimates, not commitments)

---

## 1. Gate 1 Actual Costs

Gate 1 was completed entirely on local hardware with zero cloud spend.

| Activity | Hardware | Duration | Cost |
|----------|----------|----------|------|
| LoRA fine-tune (Qwen 2.5 Coder 7B, 4-bit, 3 epochs) | Mac Studio M4 Max 128GB | ~2.5 hours | $0 (local) |
| Inference (1000 tasks, greedy T=0) | Mac Studio M4 Max 128GB | 41.7 minutes | $0 (local) |
| Evaluation harness (compile + run 120 tests x 1000 tasks) | Mac Studio M4 Max 128GB | ~20 minutes | $0 (local) |
| Corpus generation (46,754 programs, multi-model pipeline) | Mac Studio M4 Max 128GB + API | ~40 hours wall clock | ~$150 API costs |
| **Total Gate 1** | | | **~$150** |

### Key observations

- MLX on M4 Max is highly capable for 7B-class models at 4-bit quantisation
- Training throughput: ~450 tokens/sec with gradient checkpointing, batch=8, grad_accum=4
- Inference throughput: ~1.4 tasks/minute (greedy, single sample)
- The entire Gate 1 training-eval cycle fits in a single afternoon on local hardware

---

## 2. Gate 2 Projected Costs

Gate 2 requirements (from gate-criteria.md): Pass@1 >= 75%, token reduction >= 15%, compile rate >= 95%, corpus >= 100K programs, multi-tokenizer validation (>= 3), benchmark alignment (>= 200 tasks).

### 2.1 Training

| Activity | Hardware | Estimated time | Estimated cost |
|----------|----------|---------------|----------------|
| DoRA fine-tune on expanded corpus (~100K programs) | Mac Studio M4 Max | ~5-6 hours | $0 (local) |
| Hyperparameter sweep (5 configs x 3 epochs) | Mac Studio M4 Max | ~25-30 hours | $0 (local) |
| DoRA vs LoRA comparison runs (2 adapters) | Mac Studio M4 Max | ~5 hours | $0 (local) |
| **Subtotal training** | | **~36-41 hours** | **$0** |

Rationale: Corpus grows ~2x (46K to 100K), so training time roughly doubles per run. DoRA adds ~15% overhead vs LoRA based on mlx-lm benchmarks. Hyperparameter sweep is the dominant cost.

### 2.2 Evaluation

| Activity | Hardware | Estimated time | Estimated cost |
|----------|----------|---------------|----------------|
| Pass@1 eval (1000 tasks, greedy) per config | Mac Studio M4 Max | ~42 min each | $0 (local) |
| Pass@5 eval (T=0.2, 20 samples x 1000 tasks) | Mac Studio M4 Max | ~14 hours | $0 (local) |
| Pass@10 eval (T=0.8, 50 samples x 1000 tasks) | Mac Studio M4 Max | ~35 hours | $0 (local) |
| Multi-tokenizer token counting (3 tokenizers) | Mac Studio M4 Max | ~30 minutes | $0 (local) |
| Benchmark alignment (200+ tasks, HumanEval/MBPP) | Mac Studio M4 Max | ~3 hours | $0 (local) |
| **Subtotal evaluation** | | **~53 hours** | **$0** |

Pass@5 and Pass@10 are the expensive items. Each requires multiple samples per task. These can run overnight.

### 2.3 Corpus expansion

| Activity | Hardware | Estimated cost |
|----------|----------|----------------|
| Generate ~55K new programs (multi-model API pipeline) | API calls + local validation | ~$200-300 |
| Differential testing (Python/C/Java reference) | Mac Studio M4 Max | $0 (local) |
| Compiler validation of all 100K programs | Mac Studio M4 Max | $0 (local) |
| **Subtotal corpus** | | **~$200-300** |

### 2.4 Infrastructure

| Item | Estimated cost |
|------|----------------|
| EC2 corpus instance (Mumbai, existing) | ~$30/month when active |
| MCP service hosting (if needed) | ~$10/month |
| CI/CD (GitHub Actions, free tier) | $0 |
| **Subtotal infrastructure** | **~$40/month** |

### Gate 2 Total Estimate

| Category | GPU-hours (local) | Cloud/API cost |
|----------|-------------------|----------------|
| Training | ~41 hours | $0 |
| Evaluation | ~53 hours | $0 |
| Corpus expansion | ~40 hours | $200-300 |
| Infrastructure | — | ~$40/month x 3 months |
| **Total** | **~134 local GPU-hours** | **$320-420** |

---

## 3. Gate 3 Projections (Rough)

Gate 3 requires multi-model generalisation: Pass@1 >= 85% on primary model, Pass@1 >= 60% on 2+ additional model families outside Qwen.

| Activity | Hardware | Estimated cost |
|----------|----------|----------------|
| Fine-tune 2 additional 7B models (e.g., Llama-3, Mistral) | Mac Studio M4 Max | $0 (local, ~6 hours each) |
| Fine-tune 1 larger model (13B-14B class) | Cloud GPU (A100 spot) | ~$15-25 |
| Pass@k evaluation across 3+ models | Mac Studio M4 Max + cloud | ~$20-40 |
| Token reduction validation (4+ tokenizers) | Mac Studio M4 Max | $0 |
| HumanEval/MBPP benchmark publication | Mac Studio M4 Max | $0 |
| **Estimated Gate 3 total** | **~150 local GPU-hours** | **$50-100 cloud** |

Note: If all target models are 7B-class and run in 4-bit on MLX, Gate 3 may require zero cloud spend. Cloud is budgeted as contingency for models that do not run efficiently on Apple Silicon.

---

## 4. Gate 4 Projections (Rough)

Gate 4 is production readiness. Compute needs shift from training/eval to CI/CD and tooling.

| Activity | Hardware | Estimated cost |
|----------|----------|----------------|
| Regression eval suite (automated, per-commit) | Mac Studio M4 Max | $0 |
| Model card + HuggingFace publication | — | $0 |
| Security audit tooling | Mac Studio M4 Max | $0 |
| CI/CD for 8 repositories | GitHub Actions | $0 (free tier) |
| **Estimated Gate 4 total** | **Minimal** | **~$50** |

Gate 4 compute is dominated by tooling and ecosystem work, not model training.

---

## 5. Hardware Strategy

### Local: Mac Studio M4 Max (128GB unified memory)

**Use for:**
- All 7B-class model training (LoRA, DoRA, QLoRA) via MLX
- All greedy (Pass@1) evaluation runs
- Development iteration and debugging
- Compiler builds and testing
- Corpus validation
- Token counting and analysis

**Capabilities:**
- Qwen 2.5 Coder 7B (4-bit): trains at ~450 tok/s, infers at ~24 tasks/min
- Can handle up to ~14B models in 4-bit quantisation within 128GB
- MLX provides native Metal GPU acceleration with zero data-transfer overhead
- Runs 24/7 with no per-hour cost

### Cloud: AWS (on-demand, as needed)

**Use for:**
- Models that exceed 128GB memory (32B+ full precision, 70B+ quantised)
- Large-scale parallel evaluation (if wall-clock time is critical)
- Multi-model comparison requiring GPU types not available locally
- Corpus generation pipeline (EC2 in Mumbai for API cost optimisation)

**Planned instances:**
- `g5.xlarge` (A10G, 24GB) — $1.01/hr on-demand, ~$0.30/hr spot — small model eval
- `g5.2xlarge` (A10G, 24GB) — $1.21/hr on-demand, ~$0.36/hr spot — training overflow
- `p3.2xlarge` (V100, 16GB) — $3.06/hr on-demand, ~$0.92/hr spot — if needed for PyTorch training

**When to go to cloud:**
1. Model exceeds M4 Max memory (>14B at 4-bit)
2. Wall-clock deadline requires parallel evaluation across multiple GPUs
3. Reproducibility check on non-Apple hardware (validating results are not platform-specific)

### Decision rule

**Default to local.** Only provision cloud when one of the three conditions above is met. Tear down cloud resources immediately after use.

---

## 6. Cost Summary Table

| Gate | Training (local hrs) | Eval (local hrs) | Cloud/API ($) | Infra ($/month) | Total $ |
|------|---------------------|-------------------|---------------|------------------|---------|
| **Gate 1 (actual)** | 2.5 | 1 | $150 (API) | $0 | **$150** |
| **Gate 1.5** | 0 | 2 | $0 | $40 | **$40** |
| **Gate 2** | 41 | 53 | $200-300 | $120 (3 months) | **$320-420** |
| **Gate 3** | 12 | 30 | $50-100 | $80 (2 months) | **$130-180** |
| **Gate 4** | 2 | 10 | $0-50 | $40 (1 month) | **$40-90** |
| **Total through Gate 4** | **~58 hrs** | **~96 hrs** | **$400-600** | **$280** | **$680-880** |

All local GPU-hours are zero marginal cost (hardware already owned).

---

## 7. Optimisation Strategies

### Spot instances
Use AWS spot instances for all non-critical cloud workloads. Spot pricing is typically 60-70% below on-demand for GPU instances. Acceptable for training (checkpointed) and evaluation (idempotent).

### Scale-to-zero
No persistent cloud GPU instances. Provision on demand, run workload, terminate. The EC2 corpus instance (Mumbai) should be stopped when not actively generating programs.

### MLX-first development
MLX on Apple Silicon eliminates the iteration tax of cloud provisioning. Every training run, evaluation, and debug cycle happens locally first. Cloud is only for scale-out or hardware diversity.

### Deferred cloud
Do not provision cloud resources until a specific story requires it. Gate 2 is achievable entirely on local hardware. Cloud budget is contingency, not planned spend.

### Batch evaluation overnight
Pass@5 and Pass@10 campaigns (14-35 hours) run overnight on the Mac Studio. No need to parallelise across cloud GPUs unless a deadline requires faster turnaround.

### Checkpoint-and-resume
All training uses checkpoint saving (every 500 steps per config). If a training run is interrupted, it resumes from the last checkpoint with no wasted compute.

---

## 8. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| 7B model insufficient for Gate 2 Pass@1 >= 75% | Medium | High | Budget one 14B DoRA run as fallback (~$0 local if 4-bit fits) |
| MLX bug blocks training | Low | Medium | PyTorch fallback on same hardware (slower but functional) |
| Corpus API costs exceed estimate | Low | Low | Cap at $500; reduce to 2-model generation if needed |
| Spot instance unavailability | Low | Low | Fall back to on-demand for short runs; defer non-urgent work |
| Mac Studio hardware failure | Very low | High | All code in git; model weights re-downloadable; re-trainable in hours |

---

## References

- Gate criteria: `toke-spec/docs/gate-criteria.md`
- Gate 1 reproducibility: `toke-spec/docs/gate1-reproducibility.md`
- Training config (LoRA): `toke-models/finetune/configs/7b_mlx.yaml`
- Training config (DoRA): `toke-models/finetune/configs/7b_mlx_dora.yaml`
- Gate 1 decision: `toke-spec/docs/gate1-decision.md`
