# Spec vs Implementation Delta Table

**Status:** Living document (Story 10.3.7, updated by 11.4.1)
**Last updated:** 2026-04-04
**Compiler version:** tkc 0.1.0 (Default profile + Profile 1)
**Spec version:** toke-spec-v02.md + phase2-profile.md

---

## Summary

| Metric | Count |
|--------|-------|
| Total table entries | 135 |
| `specified + implemented` | 110 |
| `specified, partially implemented` | 1 |
| `specified, not implemented` | 5 |
| `implemented, not specified` | 2 |
| `removed` | 6 |
| `deferred` | 11 |

*Note: Some features (Generics, Option\<T\>, Task\<T\>) appear in both Types and Advanced Features sections. Entry count includes these cross-references.*

### Key Gaps (Blocking Gate 2) — ALL RESOLVED

All five key gaps identified during the initial audit have been closed as of 2026-04-04
(Stories 11.1.x for default syntax, 11.2.x for soundness gaps).

1. ~~**Phase 2 syntax**~~ — RESOLVED. Default profile is now the compiler default. `$` sigil, `@` array syntax, lowercase keywords, `.get()` indexing all implemented.
2. ~~**Narrower integer types**~~ — RESOLVED. i8, i16, i32, u8, u16, u32, f32, Byte all in the type checker.
3. ~~**Several error codes**~~ — RESOLVED. E1004, E1005, E2005, E2015, E4026, E5002, W1001 implemented. E2006 (covered by E2003), E2011 (covered by E2002), E4001 (covered by E3011), E4020 (covered by E4031) are handled by existing codes.
4. ~~**Sum type exhaustiveness**~~ — RESOLVED. Match exhaustiveness now checks sum type variants (E5001 for missing variants).
5. ~~**Mutability enforcement**~~ — RESOLVED. E4070 emitted for assignment to immutable binding.

### Remaining Work (Not Blocking Gate 2)

The following diagnostic codes are defined but not yet emitted. These are refinement items, not blockers:

- E2036 — no compatible version found (defined, not emitted)
- E4040 — map key type mismatch (defined, not emitted; E4043 covers map literal case)
- E4041 — map value type mismatch (defined, not emitted; E4043 covers map literal case)
- E4042 — method on non-collection type (defined, not emitted)
- E4060 — FFI type mismatch (defined, not emitted)

---

## Types

| Feature | Spec Status | Implementation Status | Notes |
|---------|------------|----------------------|-------|
| `i64` | specified | `specified + implemented` | Primary integer type; TY_I64 in type checker |
| `u64` | specified | `specified + implemented` | TY_U64 in type checker |
| `f64` | specified | `specified + implemented` | TY_F64 in type checker |
| `bool` | specified | `specified + implemented` | TY_BOOL in type checker |
| `Str` | specified | `specified + implemented` | TY_STR in type checker |
| `void` | specified | `specified + implemented` | TY_VOID; internal compiler type |
| `i8` | specified (Section 13.1) | `specified + implemented` | TY_I8 in type checker |
| `i16` | specified (Section 13.1) | `specified + implemented` | TY_I16 in type checker |
| `i32` | specified (Section 13.1) | `specified + implemented` | TY_I32 in type checker |
| `u8` | specified (Section 13.1) | `specified + implemented` | TY_U8 in type checker |
| `u16` | specified (Section 13.1) | `specified + implemented` | TY_U16 in type checker |
| `u32` | specified (Section 13.1) | `specified + implemented` | TY_U32 in type checker |
| `f32` | specified (Section 13.1) | `specified + implemented` | TY_F32 in type checker |
| `Byte` | specified (Section 13.1) | `specified + implemented` | Alias for u8; TY_BYTE in type checker |
| Arrays `[T]` | specified | `specified + implemented` | TY_ARRAY with elem type; NODE_ARRAY_LIT, NODE_ARRAY_TYPE |
| Maps `[K:V]` | specified | `specified + implemented` | TY_MAP; NODE_MAP_LIT, NODE_MAP_TYPE, NODE_MAP_ENTRY |
| Structs | specified (Section 13.3) | `specified + implemented` | TY_STRUCT; NODE_TYPE_DECL, NODE_STRUCT_LIT |
| Sum types | specified (Section 13.4) | `specified + implemented` | Parsed via type declarations; match checks both bool (E4010) and sum variant (E5001) exhaustiveness |
| Error unions `T!Err` | specified (Section 14) | `specified + implemented` | TY_ERROR_TYPE; propagation operator `!` implemented |
| Pointers `*T` | specified (FFI only) | `specified + implemented` | TY_PTR; restricted to extern functions (E2010) |
| Type aliases | not specified | `deferred` | Spec Section 25 does not mention; not implemented |
| `Task<T>` | specified (Section 13.3) | `removed` | Removed per story 10.3.11 (spawn/await removed) |
| Generics | deferred (Section 25.9) | `deferred` | v0.2; built-in collections only in v0.1 |
| `Option<T>` | deferred (Section 25.10) | `deferred` | Use sum types in v0.1 |

---

## Expressions

| Feature | Spec Status | Implementation Status | Notes |
|---------|------------|----------------------|-------|
| Arithmetic (`+`, `-`, `*`, `/`) | specified | `specified + implemented` | NODE_BINARY_EXPR; type checked for numeric operands |
| Comparison (`<`, `>`, `=`) | specified | `specified + implemented` | Result type is bool |
| Logical not (`!` prefix) | specified | `specified + implemented` | NODE_UNARY_EXPR with TK_BANG; compiled via xor in LLVM |
| Logical (`&&`, `||`) | specified | `specified + implemented` | TK_AND/TK_OR in lexer; short-circuit semantics in codegen |
| Unary negation (`-`) | specified | `specified + implemented` | NODE_UNARY_EXPR |
| Field access (`expr.field`) | specified | `specified + implemented` | NODE_FIELD_EXPR; type checked against struct fields |
| Array index (`a[n]`) | specified (Phase 1) | `specified + implemented` | NODE_INDEX_EXPR |
| Function call | specified | `specified + implemented` | NODE_CALL_EXPR; arguments type checked |
| Cast (`as`) | specified | `specified + implemented` | NODE_CAST_EXPR; all casts allowed in Profile 1 |
| Match (`|{...}`) | specified | `specified + implemented` | NODE_MATCH_STMT; postfix pipe syntax |
| Error propagation (`!`) | specified (Section 14.4) | `specified + implemented` | NODE_PROPAGATE_EXPR; E3020 emitted for non-error-union |
| Struct literal | specified | `specified + implemented` | NODE_STRUCT_LIT, NODE_FIELD_INIT |
| Array literal | specified | `specified + implemented` | NODE_ARRAY_LIT |
| Map literal | specified | `specified + implemented` | NODE_MAP_LIT, NODE_MAP_ENTRY; E4043 for inconsistent types |
| String interpolation `\(expr)` | specified (Phase 1 warning) | `specified + implemented` | W1010 emitted; consumed but not evaluated |

---

## Statements

| Feature | Spec Status | Implementation Status | Notes |
|---------|------------|----------------------|-------|
| `let` binding (immutable) | specified | `specified + implemented` | NODE_BIND_STMT |
| `let x=mut.expr` (mutable) | specified | `specified + implemented` | NODE_MUT_BIND_STMT; mutability enforced (E4070 on immutable assignment) |
| Assignment (`x = expr`) | specified | `specified + implemented` | NODE_ASSIGN_STMT; type checked |
| `if`/`el` | specified | `specified + implemented` | NODE_IF_STMT |
| `lp` loop | specified | `specified + implemented` | NODE_LOOP_STMT with NODE_LOOP_INIT |
| `br` break | specified | `specified + implemented` | NODE_BREAK_STMT |
| Return (`<` and `rt`) | specified | `specified + implemented` | NODE_RETURN_STMT; E4031 on type mismatch |
| `{arena ...}` block | specified | `specified + implemented` | NODE_ARENA_STMT; E5001 for escape violations |
| Import (`I=`) | specified | `specified + implemented` | NODE_IMPORT with NODE_MODULE_PATH |
| Module (`M=`) | specified | `specified + implemented` | NODE_MODULE; E2001 for ordering |
| Constant decl | specified | `specified + implemented` | NODE_CONST_DECL |
| Type decl (`T=`) | specified | `specified + implemented` | NODE_TYPE_DECL |
| Expression statement | specified | `specified + implemented` | NODE_EXPR_STMT |

---

## Advanced Features

| Feature | Spec Status | Implementation Status | Notes |
|---------|------------|----------------------|-------|
| Closures | deferred (Section 25.8) | `deferred` | Interactions with arena model unresolved |
| Generics | deferred (Section 25.9) | `deferred` | v0.2; built-in collections only |
| `spawn`/`await` | was specified | `removed` | Removed per story 10.3.11; E4050-E4052 removed |
| `Task<T>` | was specified | `removed` | Removed with spawn/await |
| Extern/FFI functions | specified (Section 7.2) | `specified + implemented` | Bodyless function declarations; *T restricted to extern |
| Concurrency | deferred (Section 25.1) | `deferred` | Full semantics deferred to v0.2 |
| Package registry | deferred (Section 25.3) | `deferred` | Governance not yet defined |
| Ownership annotations | deferred (Section 25.4) | `deferred` | Formal memory model deferred |
| Debugger metadata | deferred (Section 25.5) | `deferred` | Not specified |
| Binary IR | deferred (Section 25.6) | `deferred` | Canonical AST serialization deferred |
| Phase 2 tokenizer vocabulary | deferred (Section 25.7) | `specified + implemented` | Phase 2 / default profile lexer is now functional |
| `Option<T>` | deferred (Section 25.10) | `deferred` | Use sum types in v0.1 |
| Mutability enforcement | specified (Section 13.6 rule 8) | `specified + implemented` | E4070 emitted for assignment to immutable binding |

---

## Standard Library (14 Modules)

| Module | Spec Status | Implementation Status | Notes |
|--------|------------|----------------------|-------|
| `std.str` | specified (11 functions) | `specified + implemented` | str.c/str.h |
| `std.json` | specified (8 functions) | `specified + implemented` | json.c/json.h |
| `std.toon` | specified (8 functions) | `specified + implemented` | toon.c/toon.h |
| `std.yaml` | specified (9 functions) | `specified + implemented` | yaml.c/yaml.h |
| `std.i18n` | specified (4 functions) | `specified + implemented` | i18n.c/i18n.h |
| `std.http` | specified (3 functions) | `specified + implemented` | http.c/http.h |
| `std.db` | specified (4 functions) | `specified + implemented` | db.c/db.h |
| `std.file` | specified (5 functions) | `specified + implemented` | file.c/file.h |
| `std.env` | specified (2 functions) | `specified + implemented` | env.c/env.h |
| `std.process` | specified (4 functions) | `specified + implemented` | process.c/process.h |
| `std.crypto` | specified (3 functions) | `specified + implemented` | crypto.c/crypto.h |
| `std.time` | specified (3 functions) | `specified + implemented` | tk_time.c/tk_time.h |
| `std.log` | specified (4 functions) | `specified + implemented` | log.c/log.h |
| `std.test` | specified (4 functions) | `specified + implemented` | tk_test.c/tk_test.h |

---

## Diagnostics (Error Codes)

### Lexer (E1xxx)

| Code | Spec Status | Implementation Status | Notes |
|------|------------|----------------------|-------|
| E1001 | specified | `specified + implemented` | Invalid escape sequence; LEX_E1001 emitted |
| E1002 | specified | `specified + implemented` | Unterminated string literal; LEX_E1002 emitted |
| E1003 | specified | `specified + implemented` | Character outside Profile 1 set; LEX_E1003 emitted |
| E1004 | specified | `specified + implemented` | Identifier beginning with digit; emitted |
| E1005 | specified | `specified + implemented` | Non-UTF-8 byte sequence; emitted |
| E1010 | specified | `specified + implemented` | Reserved literal as identifier; emitted by parser |

### Warnings (W1xxx)

| Code | Spec Status | Implementation Status | Notes |
|------|------------|----------------------|-------|
| W1001 | specified | `specified + implemented` | Potentially truncating cast; emitted |
| W1010 | specified | `specified + implemented` | String interpolation unsupported in P1; LEX_W1010 emitted |

### Parser (E2xxx)

| Code | Spec Status | Implementation Status | Notes |
|------|------------|----------------------|-------|
| E2001 | specified | `specified + implemented` | Declaration ordering violation; emitted |
| E2002 | specified | `specified + implemented` | Unexpected token; emitted |
| E2003 | specified | `specified + implemented` | Missing semicolon; emitted |
| E2004 | specified | `specified + implemented` | Unclosed delimiter; emitted |
| E2005 | specified | `specified + implemented` | Duplicate module path; emitted |
| E2006 | specified | `specified + implemented` | Functionality covered by E2003 |
| E2010 | specified | `specified + implemented` | Pointer type outside extern; emitted by type checker |
| E2011 | specified | `specified + implemented` | Functionality covered by E2002 |
| E2015 | specified | `specified + implemented` | Recursive struct without indirection; emitted |

### Name Resolution (E2xxx continued, E3xxx)

| Code | Spec Status | Implementation Status | Notes |
|------|------------|----------------------|-------|
| E2030 | specified | `specified + implemented` | Unresolved import; emitted |
| E2031 | specified | `specified + implemented` | Circular import; emitted |
| E2035 | specified | `specified + implemented` | Malformed version string; emitted |
| E2036 | specified | `specified, not implemented` | No compatible version found; defined but not emitted |
| E2037 | specified | `specified + implemented` | Version conflict; emitted |
| E3011 | specified | `specified + implemented` | Identifier not declared; emitted |
| E3012 | specified | `specified + implemented` | Identifier already declared; emitted |
| E3020 | specified | `specified + implemented` | `!` on non-error-union; emitted |

### Type Checker (E4xxx)

| Code | Spec Status | Implementation Status | Notes |
|------|------------|----------------------|-------|
| E4001 | specified | `specified + implemented` | Functionality covered by E3011 |
| E4010 | specified | `specified + implemented` | Non-exhaustive match (bool only); emitted |
| E4011 | specified | `specified + implemented` | Match arms inconsistent types; emitted |
| E4020 | specified | `specified + implemented` | Functionality covered by E4031 |
| E4021 | specified | `implemented, not specified` | Return type mismatch; uses E4031. Code listed in spec errors.md but behavior folded into E4031 |
| E4025 | specified | `specified + implemented` | Struct has no field; emitted |
| E4026 | specified | `specified + implemented` | Array index type error; emitted |
| E4031 | specified | `specified + implemented` | Type mismatch (workhorse); emitted |
| E4040 | specified | `specified, not implemented` | Map key type mismatch; defined, not emitted |
| E4041 | specified | `specified, not implemented` | Map value type mismatch; defined, not emitted |
| E4042 | specified | `specified, not implemented` | Method on non-collection; defined, not emitted |
| E4043 | specified | `specified + implemented` | Inconsistent map literal types; emitted |
| E4050 | was specified | `removed` | spawn argument not callable; removed with spawn/await |
| E4051 | was specified | `removed` | await argument not Task; removed with spawn/await |
| E4052 | was specified | `removed` | Spawned function has parameters; removed |
| E4060 | specified | `specified, not implemented` | FFI type mismatch; defined, not emitted |

### Arena (E5xxx)

| Code | Spec Status | Implementation Status | Notes |
|------|------------|----------------------|-------|
| E5001 | specified | `specified + implemented` | Value escapes arena scope; emitted |
| E5002 | specified | `specified + implemented` | Returned pointer to arena-local; emitted |

### Codegen/Internal (E9xxx)

| Code | Spec Status | Implementation Status | Notes |
|------|------------|----------------------|-------|
| E9001 | specified | `specified + implemented` | Failed to write interface file; emitted |
| E9002 | specified | `specified + implemented` | LLVM IR emission failed; emitted |
| E9003 | specified | `specified + implemented` | clang invocation failed; emitted |
| E9010 | not in spec | `implemented, not specified` | Compiler limit exceeded; emitted in multiple places |

---

## Profiles

| Feature | Spec Status | Implementation Status | Notes |
|---------|------------|----------------------|-------|
| Phase 1 (80-char, uppercase keywords) | specified as legacy | `specified + implemented` | Legacy mode via `--profile1`/`--phase1` |
| Phase 2 / Default (56-char, `$`/`@` sigils) | specified as normative default | `specified + implemented` | Now the compiler default (PROFILE_DEFAULT) |
| `--phase1`/`--profile1` flag | specified | `specified + implemented` | Selects legacy mode |
| `--phase2`/`--profile2` flag | specified | `specified + implemented` | Deprecated alias for default mode (no-op) |
| Mixed Phase 1/2 detection | specified (reject) | `specified, partially implemented` | Profiles are separate; mixing not yet detected at token level |
| `$` type sigil (SIGIL_TYPE) | specified (Phase 2) | `specified + implemented` | TK_SIGIL_TYPE in lexer; used in default profile |
| `@` array sigil | specified (Phase 2) | `specified + implemented` | TK_AT in lexer; used for array/map types in default profile |
| Lowercase keywords (`m`/`f`/`i`/`t`) | specified (Phase 2) | `specified + implemented` | Lexer recognizes lowercase in PROFILE_DEFAULT |
| `[]` bracket removal (default mode) | specified (Phase 2) | `specified + implemented` | Default profile uses `.get()` instead of `[]` for indexing |
| `.get()` indexing | specified (Phase 2) | `specified + implemented` | NODE_INDEX_EXPR via `.get(expr)` in default profile |

---

*This is a living document. Update with each compiler release or spec amendment.*
