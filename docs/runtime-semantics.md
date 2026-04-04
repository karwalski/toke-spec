# Runtime Semantics — toke v0.2

**Version:** 0.2-draft
**Date:** 2026-04-04
**Status:** Normative — defines the minimum runtime semantics contract for all toke implementations.

---

## 1. Evaluation Order

### 1.1 Argument Evaluation

Function arguments are evaluated **left to right**. Given a call `f(a, b, c)`, expression `a` is fully evaluated before `b`, and `b` before `c`. Side effects produced by argument evaluation occur in this order. Implementations must not reorder argument evaluation in a way that changes observable behavior.

### 1.2 Short-Circuit Boolean Evaluation

The logical operators `and` and `or` use short-circuit evaluation:

- `a and b` — if `a` evaluates to `false`, `b` is not evaluated. The result is `false`.
- `a or b` — if `a` evaluates to `true`, `b` is not evaluated. The result is `true`.

Side effects in `b` must not occur when `b` is short-circuited.

### 1.3 Function Call Semantics

1. Arguments are evaluated left to right (Section 1.1).
2. A new arena scope is created for the callee.
3. Control transfers to the function body.
4. On return, the callee's arena is freed (Section 9).
5. The return value is copied to the caller's scope.

Tail call optimization is permitted but not required. Implementations that perform tail call optimization must preserve the observable semantics defined here (arena lifetime, evaluation order).

---

## 2. Numeric Semantics

### 2.1 Integer Type (`i64`)

`i64` is a two's complement 64-bit signed integer with range `-2^63` to `2^63 - 1`.

Arithmetic is **checked by default**. If an operation overflows or underflows, the program traps with error code **RT002** ("integer overflow"). See [integer-overflow.md](integer-overflow.md) for the full overflow specification, including the `@wrapping` opt-out mechanism.

The following operations trap on overflow:

| Operation | Trap Condition |
|-----------|---------------|
| `a + b` | Signed overflow |
| `a - b` | Signed underflow |
| `a * b` | Signed overflow/underflow |
| `-a` | `a == -2^63` |
| `a / b` | `b == 0` (RT001) or `a == -2^63 && b == -1` (RT002) |
| `a % b` | `b == 0` (RT001) |

### 2.2 Floating-Point Type (`f64`)

`f64` conforms to IEEE 754 binary64 (double precision). All IEEE 754 rules apply:

- NaN propagation follows IEEE 754 semantics.
- Positive and negative infinity are valid values.
- Positive and negative zero are distinct values.
- The default rounding mode is round-to-nearest-even.

### 2.3 Division by Zero

Integer division by zero traps with error code **RT001** ("division by zero"). Floating-point division by zero produces `+Inf` or `-Inf` per IEEE 754.

### 2.4 No Implicit Numeric Coercion

There are no implicit conversions between numeric types. An `i64` value cannot be used where `f64` is expected, and vice versa. Explicit conversion functions (`i64.from_f64`, `f64.from_i64`) are required. Violations are compile error E4031 ("type mismatch / implicit coercion").

---

## 3. String Semantics

### 3.1 Encoding and Representation

Strings (`Str`) are:

- **UTF-8 encoded** — source content is UTF-8; the `Str` type guarantees valid UTF-8.
- **Length-prefixed** — the length in bytes is stored alongside the data. Strings are not null-terminated.
- **Immutable** — string values cannot be modified after creation. Operations that appear to modify a string produce a new string.

### 3.2 Indexing

Indexing a string with `s[i]` returns the byte value at byte offset `i` as an `i64`. Indexing is zero-based. Out-of-bounds indexing traps with **RT003** (see Section 6).

### 3.3 Escape Sequences

String literals support the escape sequences defined in [string-escaping.md](string-escaping.md): `\"`, `\\`, `\n`, `\t`, `\r`, `\0`, and `\xNN`. Unrecognised escape sequences are compile error E1001.

### 3.4 Embedded Null Bytes

Embedded null bytes (`\0`, `\x00`) are valid within string values because strings are length-prefixed. They do not truncate the string.

---

## 4. Array Semantics

### 4.1 Representation

Arrays are **length-prefixed contiguous blocks** of homogeneously-typed elements. The length is stored at offset `-1` relative to the data pointer (i.e., `ptr[-1] == length`). Elements are laid out contiguously starting at `ptr[0]`.

### 4.2 Indexing

Array indexing is zero-based. Out-of-bounds access (index < 0 or index >= length) traps with error code **RT003** ("array index out of bounds"). The diagnostic includes the index value and the array length.

### 4.3 Value Semantics

Arrays are value types. Assignment copies the entire array:

```
let a = [1, 2, 3];
let b = a;          // b is an independent copy
```

Mutations to `b` do not affect `a`. The implementation may use copy-on-write internally, but the observable semantics must be value-type (independent copies).

---

## 5. Map Semantics

### 5.1 Key Lookup

Accessing a map with a key that does not exist traps with error code **RT004** ("map key not found"). The diagnostic includes the key value. Use `map.has(key)` to test for existence before access.

### 5.2 Iteration Order

Map iteration order is **insertion order**. Keys are visited in the order they were first inserted. Updating an existing key's value does not change its position in the iteration order.

### 5.3 Key Types

Map keys must be equality-comparable types (`i64`, `Str`, `bool`). Using a non-comparable type as a map key is compile error E4040.

---

## 6. Bounds-Check Traps

All array and map accesses are bounds-checked at runtime. Implementations must not elide bounds checks unless they can statically prove the access is within bounds.

| Code | Condition | Message |
|------|-----------|---------|
| RT003 | Array index < 0 or >= length | Array index out of bounds: index {i} on array of length {n} |
| RT004 | Map key not present | Map key not found: {key} |

On trap:

1. Execution halts immediately.
2. A structured diagnostic is emitted with the error code, message, and source location.
3. The process exits with a non-zero exit code.

---

## 7. Recursion Limits

### 7.1 Stack Depth

The maximum recursion depth is implementation-defined. Implementations should support a minimum of **1000 frames**. When the stack depth limit is exceeded, the program traps with error code **RT005** ("stack overflow").

### 7.2 Trap Behavior

On stack overflow:

1. Execution halts immediately.
2. A structured diagnostic is emitted: RT005 with the current call depth and the function that exceeded the limit.
3. The process exits with a non-zero exit code.

### 7.3 Tail Calls

Implementations that perform tail call optimization may exceed the 1000-frame minimum without trapping, since tail calls reuse the current frame. This is conformant behavior.

---

## 8. Error Propagation

### 8.1 Error Unions

A function returning `T!E` produces either a value of type `T` (success) or a value of type `E` (error). The `!` operator unwraps the success value:

```
let val = try_parse("42")!;  // traps if try_parse returned an error
```

### 8.2 Unhandled Error Trap

If the `!` operator is applied to an error value (i.e., the function returned an error rather than a success), the program traps with error code **RT006** ("unhandled error"). The diagnostic includes the error value and the source location of the `!` expression.

### 8.3 Explicit Handling

Errors can be handled without trapping via `match`:

```
match try_parse("abc") {
  ok(v) => use(v);
  err(e) => handle(e);
};
```

Non-exhaustive match on an error union is compile error E4010.

---

## 9. Arena Lifetime

### 9.1 Scope-Based Deallocation

Every function body creates an implicit arena. All allocations within the function use this arena. On scope exit (function return, early return, or trap), the arena and all its blocks are freed in bulk. See [memory-model.md](memory-model.md) for the full memory model.

### 9.2 Sub-Arenas

Explicit `{arena ... }` blocks create sub-arenas that are freed when the block exits. Sub-arena allocations are not visible after the block ends.

### 9.3 Dangling References

References into a freed arena are **undefined behavior**. The compiler performs static escape analysis (E5001) to prevent values from escaping their arena scope. Programs that pass escape analysis are guaranteed free of dangling arena references. FFI code is outside this guarantee.

### 9.4 Heap Allocations

Values that must outlive their creating scope use the explicit allocator API (see memory-model.md Section 3). Heap-allocated values follow ownership rules: single owner, move on assignment, compile-time enforcement of use-after-move (E5010) and double-free (E5011).

---

## 10. Concurrency

### 10.1 Single-Threaded Execution

Per decision D4=B, `spawn` and `await` are removed from the language. All toke programs execute on a **single thread**. There is no concurrent or parallel execution within the toke runtime.

### 10.2 Thread Safety

The toke runtime (arena allocator, standard library) is **not thread-safe**. It does not use locks, atomic operations, or memory barriers internally.

### 10.3 FFI Threading

C FFI (`extern` functions) may introduce threading. When FFI code creates threads that access toke-managed memory, the behavior is undefined unless the FFI code provides its own synchronization. The toke memory model makes no guarantees about cross-thread visibility of arena or heap allocations. See memory-model.md Section 7.

---

## Error Code Summary

| Code | Category | Description |
|------|----------|-------------|
| RT001 | Arithmetic | Division by zero |
| RT002 | Arithmetic | Integer overflow (checked arithmetic) |
| RT003 | Bounds | Array index out of bounds |
| RT004 | Bounds | Map key not found |
| RT005 | Resources | Stack overflow (recursion limit exceeded) |
| RT006 | Error handling | Unhandled error (`!` applied to error value) |

All runtime traps share the following behavior:

1. Execution halts immediately (no undefined behavior, no silent recovery).
2. A structured diagnostic is emitted containing the error code, a human-readable message, and the source location.
3. The process exits with a non-zero exit code.

---

## Conformance

An implementation conforms to this specification if:

1. It implements all six runtime traps (RT001-RT006) with the specified trap behavior.
2. It evaluates arguments left to right and short-circuits boolean operators.
3. It provides checked integer arithmetic by default (with `@wrapping` opt-out).
4. It enforces IEEE 754 binary64 semantics for `f64`.
5. It implements strings as UTF-8, length-prefixed, and immutable.
6. It implements arrays as length-prefixed contiguous blocks with value semantics.
7. It implements maps with insertion-order iteration and trapping key lookup.
8. It frees arena memory on scope exit.
9. It executes single-threaded (no spawn/await).
10. It supports a minimum recursion depth of 1000 frames (or documents its limit).
