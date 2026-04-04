# Memory Model — toke v0.2

**Version:** 0.2-draft
**Date:** 2026-04-04
**Decision:** D3=D (hybrid arena + explicit allocator)
**Status:** Draft — extends toke-spec-v02.md Section 15

---

## 1. Overview

toke v0.2 uses a **hybrid memory model**:

- **Arena allocation** (default) — for request-processing, batch computation, and short-lived function scopes. This is the model from spec v0.1 Section 15.
- **Explicit allocator API** — for long-lived data structures that outlive a single function call or arena scope (connection pools, caches, growing collections).

The hybrid model exists because arena-only allocation has documented failure modes for workload patterns that require growing or persistent data.

---

## 2. Arena Allocation (Default)

Unchanged from spec v0.1 Section 15:

- Every function body is an implicit arena
- Bump allocator with O(1) allocation cost
- Bulk deallocation on scope exit
- Sub-arenas via `{arena ... }` blocks
- Static escape analysis prevents dangling references (E5001)

### 2.1 Supported Workload Patterns

Arena allocation is the correct choice for:

- **Request handlers** — allocate per-request, free on response
- **Batch computation** — allocate per-item, free per-iteration
- **Parse/transform/emit** — pipeline stages with bounded lifetimes
- **Short-lived functions** — any function that allocates and returns a scalar or copies result to caller's arena

### 2.2 Unsupported Workload Patterns

Arena allocation alone cannot support:

- **Growing collections** — arrays/maps that expand beyond initial capacity
- **Connection pools** — long-lived resources shared across requests
- **Caches** — data that persists across function calls
- **Event loops** — long-running processes with dynamic allocation needs
- **Recursive data structures** — trees/graphs with unpredictable depth

These patterns require the explicit allocator (Section 3).

---

## 3. Explicit Allocator API

For data that must outlive its creating scope, toke provides a typed allocator interface.

### 3.1 Allocator Interface

```
t=$alloc{
  alloc:(size:i64):$ptr!$alloc_err;
  realloc:(p:$ptr;new_size:i64):$ptr!$alloc_err;
  free:(p:$ptr):void;
};
```

### 3.2 Heap Allocator

The standard library provides a default heap allocator backed by the C runtime:

```
i=heap:std.heap;

f=example():void{
  let pool=heap.new($connection;16);  // allocate array of 16
  // ... use pool ...
  heap.free(pool);
};
```

### 3.3 Ownership Rules

1. Every heap allocation has exactly one owner
2. Ownership transfers on assignment (move semantics)
3. Use-after-move is a compile error (E5010)
4. Double-free is a compile error (E5011)
5. Leaks are reported as warnings (W5012) via static analysis when detectable

### 3.4 Escape Analysis

The compiler performs static escape analysis to determine whether a value must be heap-allocated:

- Values that do not escape their creating scope use arena allocation
- Values assigned to module-level bindings or passed to functions that store them beyond the call require heap allocation
- The compiler MAY promote arena allocations to heap allocations when escape is detected, or emit E5001 if the escape is invalid

---

## 4. Static Lifetime

Unchanged from spec v0.1 Section 15.3:

- Module-level declarations have static lifetime
- Initialised once at program start in declaration order
- Never freed during execution
- Circular initialisation dependencies are E2020

---

## 5. Memory Safety Guarantees

In well-typed toke code (no FFI):

| Property | Guarantee | Mechanism |
|----------|-----------|-----------|
| No use-after-free | Yes | Arena discipline + ownership tracking |
| No buffer overflow | Yes | Array bounds checked at runtime (RT001) |
| No uninitialised reads | Yes | All bindings require initialisation |
| No double-free | Yes | Ownership tracking (E5011) |
| No dangling pointers | Yes | Escape analysis (E5001) |
| No pointer arithmetic | Yes | Not exposed in language |

FFI code (`extern` functions) is outside the safety boundary. The compiler does not verify memory safety of extern function bodies.

---

## 6. No Pointer Arithmetic

Unchanged from spec v0.1 Section 15.4. Raw pointers are only accessible through FFI declarations.

---

## 7. Concurrency and Memory

Per D4=B, spawn/await is removed from the language. Concurrency is accessed only via C FFI. The memory model makes no guarantees about thread safety of arena or heap allocations across threads. Thread-safe data sharing requires explicit synchronization via FFI.

---

## 8. Gate 1 Evidence

Gate 1 evaluation (2026-04-03) was conducted with **arena allocation as the only memory mode**. The explicit allocator API (D3=D, Section 3) is specified in this document but was not implemented in the reference compiler during Gate 1.

Implications for Gate 1 results:

- All 46,754 training corpus programs and all 1,000 benchmark tasks used arena-only allocation. No program required heap allocation, connection pools, or growing collections.
- The Gate 1 workload (short algorithmic functions with bounded allocation) is entirely within the arena-supported pattern set (Section 2.1).
- Pass@1 (63.7%) and token efficiency (12.5%) are valid measurements of the arena-only subset of the language.
- The explicit allocator API will be implemented and evaluated in Phase 2. Gate 2+ benchmarks will include tasks that exercise heap allocation, ownership tracking, and escape analysis.

---

## 9. Implementation Notes

### 9.1 Arena Implementation

The reference compiler (tkc) implements arenas as linked lists of fixed-size pages (default 4096 bytes). When a page is exhausted, a new page is allocated from the C heap and linked. On scope exit, all pages in the chain are freed.

### 9.2 Heap Implementation

The default heap allocator delegates to `malloc`/`realloc`/`free`. Alternative allocators (pool, slab, arena-backed) may be provided as stdlib modules.

### 9.3 Interaction with Optimization

- Arena allocations that do not escape may be promoted to stack allocations by the optimizer
- Heap allocations with known lifetimes may be demoted to arena allocations by escape analysis
- The compiler emits `noalias` on arena-allocated pointers (distinct arenas never alias)
