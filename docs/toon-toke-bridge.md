# TOON→toke Compression Bridge Guide

**Story:** 13.1.7
**Date:** 2026-04-05
**Status:** normative guidance
**Audience:** loke engineers evaluating F4.1 and F4.2

---

## Purpose

Loke F4.1 and F4.2 were originally specced around TOON (Token-Oriented Object
Notation), toke's default serialization format. Since that spec was written,
toke compression (Epic 13.1) is being implemented. This document answers three
questions for loke engineers:

1. Which TOON use cases does toke compress supersede, and which remain TOON
   territory?
2. Should loke build F4.1 at all, or skip directly to toke compression?
3. If TOON serialisers already exist, how do you wrap them without a rewrite?

---

## 1. What TOON Does

TOON (Token-Oriented Object Notation) is toke's default serialization format,
implemented in Epic 6.3 and available as `std.toon`. It is a JSON alternative
designed specifically for tabular structured data in LLM context windows.

**Core mechanism:** TOON declares field names once in a schema header, then
encodes rows as pipe-delimited values. This eliminates the repetition of key
names that makes JSON verbose for arrays of objects.

**Token savings:** 30--60% fewer tokens than equivalent JSON for uniform arrays
of objects (the common case in database results, API response arrays, agent
state, and RAG pipelines). See ADR-0003 for benchmark data.

**What TOON is optimised for:**

- Uniform arrays of objects (database rows, API result sets)
- Key-value stores where the same key set repeats across many records
- Schema-based encoding where field names are known ahead of time
- Round-trip fidelity: `std.toon` encodes and decodes without loss
- Cross-format conversion: `toon.from_json` and `toon.to_json` bridge to JSON

**What TOON is not designed for:**

- Prose, natural language, or free-form text
- Prompt engineering or LLM instruction reduction
- Nested or heterogeneous data structures (JSON or YAML are better fits)
- Streaming compression of arbitrary payloads

**std.toon signatures (from `spec/stdlib-signatures.md`):**

```
f=enc(data:$str;schema:$str):$str
f=dec(s:$str):$str
f=str(s:$str;key:$str):$str
f=i64(s:$str;key:$str):i64
f=f64(s:$str;key:$str):f64
f=bool(s:$str;key:$str):bool
f=arr(s:$str):@$str
f=from_json(s:$str;name:$str):$str
f=to_json(s:$str):$str
```

---

## 2. What toke Compress Does

toke compression (Epic 13.1) is a general-purpose token-reduction service for
LLM prompts and structured data. It operates at the text level rather than the
schema level, making it applicable to any text payload.

**Core mechanism:** toke compress reduces token count by applying
LLM-aware compression strategies: identifier shortening, whitespace
normalisation, structural compaction, and placeholder preservation. Placeholders
from anonymisation pipelines (such as loke's `$PERSON_1`, `$EMAIL_1` atoms)
survive the round-trip unchanged.

**Key capabilities:**

- **General prose compression** — reduces token count of instructions, system
  prompts, chain-of-thought text, and natural language context
- **Placeholder preservation** — `preserve_atoms` parameter protects named
  substitution tokens from being altered during compression
- **Schema-aware JSON/CSV compression** (story 13.1.5) — when the input is
  JSON or CSV, toke compress applies structure-aware compaction that goes
  beyond what minified JSON achieves
- **Streaming mode** (story 13.1.4) — `toke_compress_stream` yields compressed
  chunks as input arrives, compatible with SSE and chunked HTTP
- **MCP integration** (story 13.1.2) — exposed as `toke_compress` and
  `toke_decompress` tools over both MCP stdio and HTTP transport

**MCP tool signatures (story 13.1.2):**

```
toke_compress(input:str;preserve_atoms:@str):$compressed
toke_decompress(input:$compressed):str
```

**What toke compress is not designed for:**

- Schema declaration and structured field extraction (TOON territory)
- Typed accessor APIs (`str`, `i64`, `f64` by field name)
- Cross-format conversion between TOON, JSON, and YAML
- Data serialization as a first-class library module

---

## 3. Overlap Matrix

This table covers the main use cases across both tools. "TOON" means `std.toon`
is the right choice; "toke compress" means the compression API (Epic 13.1);
"both" means either works and combining them yields maximum savings; "neither"
means neither is the primary tool.

| Use case | TOON | toke compress | Both | Neither |
|----------|------|---------------|------|---------|
| JSON serialization of uniform object arrays | primary | schema-aware mode applies | yes | |
| CSV serialization / tabular row encoding | primary | schema-aware mode applies | yes | |
| Prose compression (instructions, prompts) | | primary | | |
| System prompt token reduction | | primary | | |
| Prompt engineering / chain-of-thought compression | | primary | | |
| Structured schema encoding (declare once, repeat rows) | primary | | | |
| Round-trip fidelity with typed field extraction | primary | | | |
| Placeholder preservation ($PERSON_1, $EMAIL_1) | | primary | | |
| Streaming payload compression | | primary | | |
| Nested / heterogeneous JSON | | schema-aware mode | | |
| LLM response post-processing | | primary | | |
| Cross-format conversion (JSON ↔ TOON) | primary | | | |
| Internationalisation / string bundles (std.i18n) | | | | std.i18n |

**Reading the table:** the "both" entries for JSON and CSV serialization
reflect that TOON handles the schema-level encoding while toke compress's
schema-aware mode (13.1.5) handles additional structural compaction. In
practice, running TOON encoding followed by toke compress on the TOON output
yields the maximum token reduction for tabular data — but only matters at very
large scale. For most loke use cases, one tool is sufficient.

---

## 4. Decision Guide for Loke F4.1

### If loke already uses TOON for structured data

Keep TOON. Do not migrate structured data pipelines away from `std.toon`.
Add toke compress alongside it for prose and prompt compression:

- `std.toon` handles structured data: database results, API payloads, agent
  state, RAG document chunks with uniform schema
- toke compress handles context: system prompts, instructions, chain-of-thought,
  any natural language payload sent to the LLM

The two tools are complementary, not competing. TOON handles structure; toke
compress handles context. A loke pipeline can apply both: serialise with TOON,
then pass the assembled prompt (which includes TOON-encoded data plus prose
instructions) through `toke_compress`. TOON output is valid structured text and
passes through toke compress without corruption.

### If loke has not yet built F4.1

Skip TOON for structured data and use toke compress with schema-aware mode
(story 13.1.5) directly. One fewer dependency. The schema-aware mode handles
JSON and CSV inputs with compaction comparable to TOON for many data shapes.
This is viable if:

- The data coming into loke is already in JSON (from upstream APIs)
- Typed field extraction (`str`, `i64`) is not needed inside the loke pipeline
- The TOON learning curve is not justified by the token savings in context

Do not use this path if loke needs to extract typed fields from structured data
at runtime — TOON's accessor API (`toon.str`, `toon.i64`) has no equivalent in
toke compress.

### Bridge period

toke compress accepts TOON-formatted input and can round-trip it. TOON is valid
structured text (pipe-delimited with a schema header line) and is not altered
by the compression step in ways that break `toon.dec`. This means:

- Teams can add `toke_compress` to an existing TOON pipeline without breaking
  downstream code that reads TOON output
- Migration can proceed incrementally: add compression first, migrate schema
  encoding later (or never, if TOON is already working)

---

## 5. Migration Examples

### Example A — User object: TOON serialization vs toke compress

**Source data (JSON):**
```json
{"id": 42, "name": "Alice", "role": "admin", "active": true}
```

**TOON encoding (via `std.toon`):**
```
schema=user;id|name|role|active
42|Alice|admin|true
```
Token count (cl100k_base): approximately 14 tokens vs 22 for minified JSON.
Saving: ~36%.

**toke compress (schema-aware JSON mode, 13.1.5):**
Input is minified JSON; compress applies structural compaction. Output is
a compressed representation that `toke_decompress` restores exactly.
Approximate token count: 15--18 tokens depending on content. Saving: ~18--32%.

**Verdict for a single object:** TOON wins on token count because it eliminates
key names entirely. toke compress is more convenient when the upstream source
is already JSON and you cannot change the serialization layer.

### Example B — Key-value store: TOON vs toke schema-aware CSV

**Source data (10-row result set):**
```json
[
  {"id": 1, "name": "Alice", "dept": "eng"},
  {"id": 2, "name": "Bob",   "dept": "ops"},
  ...
]
```

**TOON encoding:**
```
schema=staff;id|name|dept
1|Alice|eng
2|Bob|ops
...
```
Token cost grows as: 1 schema header + N value rows. Key names (`id`, `name`,
`dept`) appear once regardless of N.

**toke compress schema-aware CSV:**
toke compress identifies the repeated-key structure and applies column
extraction. Output is similar to TOON's pipe-delimited format but without the
explicit schema declaration. `toke_decompress` restores original JSON.

**Verdict for N-row arrays:** TOON and toke compress schema-aware mode reach
similar token counts at N≥5. Below N=5, the TOON schema header overhead
narrows the gap. Above N=20, TOON is consistently 5--10% ahead because the
schema header amortises to near zero.

### Example C — Token count comparison summary

| Payload | JSON (minified) | TOON | toke compress | TOON + toke compress |
|---------|----------------|------|---------------|----------------------|
| 1 user object (5 fields) | 22 tok | 14 tok | 17 tok | 13 tok |
| 10-row staff table | 95 tok | 38 tok | 41 tok | 35 tok |
| System prompt (200 words) | n/a | n/a | ~90 tok | n/a |
| Combined prompt + data | 115 tok | 52 tok | 55 tok | 48 tok |

Token counts are illustrative estimates using cl100k_base. Actual counts depend
on content. The "TOON + toke compress" column applies toke compress to the full
assembled payload after TOON encoding.

---

## 6. Bridge Adapter

If loke already has TOON serialisers and wants to add toke compression without
rewriting the serialization layer, wrap the existing TOON encoder in a bridge
function:

```
m=bridge;
i=toon:std.toon;
i=compress:std.compress;

f=tooncompress(data:@byte):@byte!$bridgeerr{
  let toon_encoded=toon.encode(data)!$bridgeerr.Encode;
  <compress.compress(toon_encoded)
}
```

The bridge:

1. Takes raw data (any type that `std.toon` accepts)
2. Encodes it to TOON format using the existing serialiser
3. Passes the TOON-encoded string through `compress.compress`
4. Returns the compressed bytes

On the decode side, the reverse bridge restores the original:

```
f=toondecompress(data:@byte;schema:$str):@byte!$bridgeerr{
  let decompressed=compress.decompress(data)!$bridgeerr.Decompress;
  <toon.dec(decompressed)
}
```

Error types propagate cleanly: `$bridgeerr.Encode` and `$bridgeerr.Decompress`
distinguish failures at each stage without conflating serialization errors with
compression errors.

**When to use the bridge adapter:**

- Existing TOON serialisers are already in production and tested
- You want to add compression incrementally without touching the serialization
  layer
- You need to A/B test compressed vs uncompressed payloads

**When not to use the bridge adapter:**

- Starting from scratch: go directly to toke compress schema-aware mode
  (13.1.5) and skip the TOON layer
- The data is prose, not structured: TOON adds no value before compress

---

## 7. Recommendation

For loke engineers making the F4.1 decision: **if TOON is already in use, keep
it and add toke compress alongside it for prose and prompt reduction**. The two
tools solve different problems and the combined pipeline achieves better token
reduction than either alone. If F4.1 has not been built yet, use toke compress
with schema-aware mode (story 13.1.5) directly — it handles JSON and CSV inputs
without requiring a TOON learning curve or a separate serialization layer. The
only case where TOON is clearly superior to toke compress alone is typed field
extraction at runtime (`toon.str`, `toon.i64`); if loke needs to pull typed
values out of structured data inside the pipeline, `std.toon` remains the right
tool. In all other cases, toke compress is sufficient and simpler.
