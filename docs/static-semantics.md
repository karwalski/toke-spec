# Static Semantics — toke v0.2

**Version:** 0.2-draft
**Date:** 2026-04-04
**Status:** Normative — defines the type checking rules for all toke implementations.

---

## Notation

Typing judgments use the standard form:

```
    Gamma |- e : tau
```

where `Gamma` (written `G` below) is the typing environment mapping identifiers to types, `e` is an expression or statement, and `tau` is the resulting type.

Inference rules are written in the standard natural-deduction style:

```
    premise_1    premise_2    ...
    ────────────────────────────── [Rule-Name]
    conclusion
```

A premise above the line must hold for the conclusion below the line to hold. Side conditions are written in parentheses.

**Metavariables:**

| Symbol | Meaning |
|--------|---------|
| `G` | Typing environment (maps names to types) |
| `e`, `e1`, `e2` | Expressions |
| `s` | Statements |
| `tau`, `tau1`, `tau2` | Types |
| `x` | Variable name |
| `f` | Function name |
| `T` | Struct type name |

**Base types:** `void`, `bool`, `i64`, `u64`, `f64`, `str`
**Composite types:** `[tau]` (array), `[K:V]` (map), `T` (struct), `*tau` (pointer, FFI only), `tau!E` (error union)

---

## 1. Literal Typing

```
    ────────────────────────── [T-IntLit]
    G |- INT_LIT : i64
```

An integer literal has type `i64`.

```
    ────────────────────────── [T-FloatLit]
    G |- FLOAT_LIT : f64
```

A floating-point literal has type `f64`.

```
    ────────────────────────── [T-StrLit]
    G |- STR_LIT : str
```

A string literal has type `str`.

```
    ────────────────────────── [T-BoolLit]
    G |- BOOL_LIT : bool
```

A boolean literal (`true` or `false`) has type `bool`.

**Error condition:** None. Literal typing is unconditional.

---

## 2. Variable Lookup

```
    (x : tau) in G
    ────────────────────────── [T-Var]
    G |- x : tau
```

A variable `x` has type `tau` if the environment `G` contains a binding `(x : tau)`. The lookup traverses scopes from innermost to outermost: local bindings, function parameters, then module-level declarations.

**Error condition:** If `x` is not in `G`, the expression is assigned type `unknown` and a diagnostic is emitted (unresolved identifier).

---

## 3. Unary Operators

```
    G |- e : tau    (tau in {i64, f64})
    ────────────────────────────────── [T-Neg]
    G |- -e : tau
```

Arithmetic negation requires a numeric operand and preserves its type.

```
    G |- e : tau
    ────────────────────────── [T-Propagate]
    G |- e! : tau_s
```

where `tau = tau_s!E` (an error union). The `!` operator unwraps the success type. The enclosing function must itself return an error union.

**Error conditions:**
- **E4031**: Negation applied to a non-numeric type.
- **E3020**: `!` applied to a value whose type is not an error union, or enclosing function does not return `T!Err`.

---

## 4. Binary Operators — Arithmetic

```
    G |- e1 : tau    G |- e2 : tau    (tau in {i64, u64, f64})
    ──────────────────────────────────────────────────────────── [T-Arith]
    G |- e1 op e2 : tau    (op in {+, -, *, /})
```

Both operands must have the same numeric type. The result has that same type. There is no implicit widening between numeric types (see Section 8).

**Error condition:**
- **E4031**: Operands are not numeric, or operand types differ. Diagnostic: `"type mismatch: expected '<lhs-type>', got '<rhs-type>'"`. Fix hint: `"cast RHS to <lhs-type> using 'as'"`.

---

## 5. Binary Operators — Comparison

```
    G |- e1 : tau    G |- e2 : tau
    ──────────────────────────────────────── [T-Compare]
    G |- e1 op e2 : bool    (op in {<, >, =})
```

Both operands must have the same type. The result is always `bool`.

**Error condition:**
- **E4031**: Operand types differ. Same diagnostic and fix hint as [T-Arith].

---

## 6. Function Application

```
    G |- f : (tau_1, ..., tau_n) -> tau_r
    G |- e1 : tau_1'   ...   G |- en : tau_n'
    (tau_i' = tau_i for all i in 1..n)
    ──────────────────────────────────────────── [T-Call]
    G |- f(e1, ..., en) : tau_r
```

Each argument type must match the corresponding parameter type. The result type is the function's declared return type. If the function has a return spec `tau!E`, the call expression has type `tau!E`.

For functions with no explicit return type annotation, the return type is `void`.

**Error condition:**
- **E4031**: Argument type does not match parameter type. Diagnostic: `"type mismatch: expected '<param-type>', got '<arg-type>'"`. Fix hint: `"cast argument to <param-type> using 'as'"`.

---

## 7. Composite Type Operations

### 7.1 Array Indexing

```
    G |- e1 : [tau]    G |- e2 : tau_i    (tau_i in {i64, u64})
    ──────────────────────────────────────────────────────────── [T-Index]
    G |- e1[e2] : tau
```

The base expression must be an array type `[tau]`. The index must be an integer type (`i64` or `u64`). The result is the element type `tau`.

**Error conditions:**
- **E4031**: Base expression is not an array type. Diagnostic: `"cannot index into '<type>'; expected array type"`.
- **E4031**: Index expression is not an integer type. Diagnostic: `"array index must be integer, got '<type>'"`.

### 7.2 Field Access

```
    G |- e : T    (T is a struct with field f : tau_f)
    ──────────────────────────────────────────────────── [T-Field]
    G |- e.f : tau_f
```

The base expression must be a struct type that contains the named field. The result is the field's declared type.

**Built-in pseudo-fields:**

```
    G |- e : [tau]
    ────────────────────────── [T-ArrayLen]
    G |- e.len : u64
```

```
    G |- e : [K:V]
    ────────────────────────── [T-MapLen]
    G |- e.len : u64
```

Arrays and maps expose a `.len` pseudo-field of type `u64`.

**Error condition:**
- **E4025**: Struct has no field with the given name. Diagnostic: `"struct '<name>' has no field '<field>'"`.

### 7.3 Struct Literals

```
    T = { f1 : tau_1, ..., fn : tau_n }
    G |- e1 : tau_1'   ...   G |- en : tau_n'
    (tau_i' = tau_i for all i in 1..n)
    ──────────────────────────────────────────── [T-StructLit]
    G |- T { f1: e1, ..., fn: en } : T
```

A struct literal creates a value of the named struct type. Each field initializer expression is type-checked.

### 7.4 Array Literals

```
    G |- e1 : tau   ...   G |- en : tau
    ──────────────────────────────────── [T-ArrayLit]
    G |- [e1, ..., en] : [tau]
```

The element type is inferred from the first element. All elements must have the same type. An empty array literal `[]` has type `[unknown]` and is compatible with any array type.

### 7.5 Map Literals

```
    G |- k1 : K   G |- v1 : V   ...   G |- kn : K   G |- vn : V
    ──────────────────────────────────────────────────────────────── [T-MapLit]
    G |- [k1: v1, ..., kn: vn] : [K:V]
```

All keys must have the same type `K`. All values must have the same type `V`. Key and value types are inferred from the first entry.

**Error condition:**
- **E4043**: Inconsistent key or value types across map entries. Diagnostic: `"inconsistent map key type: expected '<K>', got '<type>'"` or `"inconsistent map value type: expected '<V>', got '<type>'"`.

---

## 8. Cast Expression

```
    G |- e : tau_1
    ──────────────────────────── [T-Cast]
    G |- e as tau_2 : tau_2
```

An explicit cast converts the expression to the target type. The result type is always `tau_2`.

### Valid Cast Pairs

The following source-target pairs are permitted with `as`:

| Source | Target | Notes |
|--------|--------|-------|
| `i64` | `f64` | Integer to float (may lose precision for large values) |
| `f64` | `i64` | Float to integer (truncates toward zero) |
| `i64` | `u64` | Signed to unsigned (reinterpret bits) |
| `u64` | `i64` | Unsigned to signed (reinterpret bits) |
| `i64` | `bool` | Zero is `false`, non-zero is `true` |
| `bool` | `i64` | `false` is 0, `true` is 1 |
| `i64` | `str` | Integer to string representation |
| `f64` | `str` | Float to string representation |
| `*T` | `*U` | Pointer cast (FFI only) |

All other conversions are type errors. In particular, there are **no implicit coercions** between numeric types (see Section 10).

---

## 9. Statement Typing

### 9.1 Let Binding

```
    G |- e : tau
    ──────────────────────────────────────── [T-Let]
    G |- let x = e : void    (G' = G, x : tau)
```

A `let` binding evaluates the initializer, infers its type, and extends the environment with `(x : tau)`. The binding is immutable.

When a type annotation is present:

```
    G |- e : tau'    resolve(ann) = tau    tau' = tau
    ─────────────────────────────────────────────────── [T-LetAnn]
    G |- let x = e : ann : void    (G' = G, x : tau)
```

The inferred type of the initializer must match the declared annotation.

**Error condition:**
- **E4031**: Annotated type does not match initializer type.

### 9.2 Mutable Binding

```
    G |- e : tau
    ──────────────────────────────────────────── [T-MutBind]
    G |- let x = mut.e : void    (G' = G, x : tau, mutable)
```

Same as [T-Let] but the binding is marked mutable, permitting subsequent assignment.

### 9.3 Assignment

```
    (x : tau, mutable) in G    G |- e : tau'    tau' = tau
    ────────────────────────────────────────────────────── [T-Assign]
    G |- x = e : void
```

Assignment requires that `x` is a mutable binding and the right-hand side type matches the variable's declared type.

**Error condition:**
- **E4031**: Type of RHS does not match type of LHS. Fix hint: `"cast RHS to <lhs-type> using 'as'"`.

### 9.4 Return Statement

```
    G |- e : tau    tau = tau_ret
    ──────────────────────────────── [T-Return]
    G |- <e : void
```

The return value type must match the enclosing function's declared return type `tau_ret`.

Special cases for error-union return types (`tau_ret = T!E`):
- Returning a value of type `T` (the success type) is valid.
- Returning a value of type `E` (the error type) is valid.

```
    tau_ret = T!E    (tau = T  or  tau = E)
    G |- e : tau
    ──────────────────────────────────────── [T-ReturnErr]
    G |- <e : void
```

**Error conditions:**
- **E4031**: Void function returns a value. Diagnostic: `"void function cannot return a value"`. Fix hint: `"remove the return value"`.
- **E4031**: Return type does not match declared return type. Fix hint: `"cast return value to <ret-type> using 'as'"`.

### 9.5 If/Else Statement

```
    G |- e_cond : bool
    G |- s_then : tau_1
    G |- s_else : tau_2
    ────────────────────────── [T-If]
    G |- if (e_cond) { s_then } el { s_else } : void
```

The condition must be a boolean. Both branches are type-checked independently. The `if` statement itself has type `void`.

### 9.6 Loop Statement

```
    G |- e_init : tau_i    G |- e_cond : bool    G |- e_step : tau_s
    G' = G, x : tau_i
    G' |- s_body : void
    ──────────────────────────────────────────────────────────────────── [T-Loop]
    G |- lp (let x = e_init; e_cond; x = e_step) { s_body } : void
```

The loop introduces its iteration variable into a new scope for the body. The loop statement has type `void`.

### 9.7 Match Expression

```
    G |- e : tau_s
    G |- arm_1 : tau_a    ...    G |- arm_n : tau_a
    (exhaustive over tau_s)
    ──────────────────────────────────────────────────── [T-Match]
    G |- e |{ arm_1; ...; arm_n } : tau_a
```

All match arms must produce the same type `tau_a`. The match must be exhaustive over the scrutinee type.

**Error conditions:**
- **E4010**: Non-exhaustive match. For `bool` scrutinees, both `true` and `false` arms must be present. Diagnostic: `"non-exhaustive match: missing arm for '<value>'"`.
- **E4011**: Match arms have inconsistent types. Diagnostic: `"match arms have inconsistent types: '<type1>' vs '<type2>'"`.

### 9.8 Arena Statement

```
    G |- s_body : void    (no values escape to outer scope)
    ──────────────────────────────────────────────────────── [T-Arena]
    G |- {arena s_body} : void
```

An arena block creates a sub-arena. All allocations within the block are freed on exit. The type checker verifies that no arena-allocated values are assigned to variables in the outer scope.

**Error condition:**
- **E5001**: Value escapes arena scope. Diagnostic: `"value escapes arena scope: cannot assign arena-allocated value to outer variable"`.

---

## 10. Type Coercion Rules

### 10.1 No Implicit Coercions

Toke has **no implicit type coercions**. All conversions between types require an explicit `as` cast. This is a deliberate design choice to eliminate a class of subtle bugs common in languages with implicit widening or narrowing.

In particular:
- `i64` is **not** implicitly promoted to `f64`.
- `u64` is **not** implicitly interchangeable with `i64`.
- `bool` is **not** implicitly convertible to or from integers.

### 10.2 Explicit Conversions

All type conversions use the `e as tau` syntax. See Section 8 for the full table of valid cast pairs.

### 10.3 Type Equivalence

Two types are equivalent (`tau_1 = tau_2`) if and only if:

| Type kind | Equivalence rule |
|-----------|-----------------|
| Scalars (`void`, `bool`, `i64`, `u64`, `f64`, `str`) | Same kind |
| Struct | Same name (nominal equality) |
| Array `[tau]` | Element types are equivalent |
| Map `[K:V]` | Key types equivalent and value types equivalent |
| Pointer `*T` | Pointee types are equivalent |
| Error union `T!E` | Success types are equivalent |
| `unknown` | Compatible with any type (error recovery) |

The `unknown` type is a sentinel used for error recovery. When a sub-expression has already emitted a diagnostic, its type is `unknown`, which is compatible with any other type to prevent cascading errors.

---

## 11. Well-Formedness Rules

### 11.1 Module Declaration

```
    (exactly one M= declaration in the source file)
    ────────────────────────────────────────────────── [WF-Module]
    well-formed(M = path)
```

Every source file must contain exactly one module declaration `M = path;`. The module path is a dot-separated identifier sequence.

### 11.2 Function Declaration

```
    (all parameters have explicit type annotations)
    (return type is explicitly declared)
    (body type-checks under G extended with parameters)
    ──────────────────────────────────────────────────── [WF-Func]
    well-formed(F = name(params) : ret_spec { body })
```

Functions require:
- All parameters annotated with explicit types.
- An explicit return type (or `void`).
- The body must type-check with parameters in scope.

**Pointer restriction (E2010):** Pointer types (`*T`) are only permitted in `extern` function signatures (functions without a body). Using `*T` in a non-extern function's parameters or return type is an error.

### 11.3 Type (Struct) Declaration

```
    (all fields have explicit type annotations)
    (field names are unique within the struct)
    ──────────────────────────────────────────── [WF-Type]
    well-formed(T = Name { field1: tau1; ...; fieldn: taun })
```

All fields must have explicit type annotations. Field names must be unique within the struct.

### 11.4 Declaration Order

Declarations within a module are processed in source order. Name resolution operates at module scope, so declarations within the same module can reference each other. However, the type checker processes declarations top-down, so forward references to variables are not resolved (functions and types are visible throughout the module because they are collected in a name-resolution pass before type checking).

---

## 12. Error Code Summary

All type checking errors are compile-time diagnostics. Each has a unique error code and a structured diagnostic format (see [diagnostic-schema.json](diagnostic-schema.json)).

| Code | Rule violated | Description |
|------|--------------|-------------|
| E2010 | [WF-Func] | Pointer type `*T` used outside extern function |
| E3020 | [T-Propagate] | `!` applied to non-error-union value, or function does not return `T!Err` |
| E4010 | [T-Match] | Non-exhaustive match (missing arm for a required case) |
| E4011 | [T-Match] | Match arms have inconsistent types |
| E4025 | [T-Field] | Struct has no field with the given name |
| E4031 | [T-Arith], [T-Compare], [T-Call], [T-Let], [T-Assign], [T-Return], [T-Cast], [T-Index], [T-Neg] | Type mismatch (general: expected vs got) |
| E4043 | [T-MapLit] | Inconsistent key or value types in map literal |
| E5001 | [T-Arena] | Value escapes arena scope |

### Error code ranges

| Range | Category |
|-------|----------|
| E1xxx | Lexer errors |
| E2xxx | Parser / syntax errors |
| E3xxx | Semantic errors (non-type) |
| E4xxx | Type system errors |
| E5xxx | Lifetime / ownership errors |

---

## Conformance

An implementation conforms to this specification if:

1. It assigns the types specified by rules [T-IntLit] through [T-BoolLit] to all literal expressions.
2. It implements environment-based variable lookup per [T-Var].
3. It enforces operand type agreement for arithmetic ([T-Arith]) and comparison ([T-Compare]) operators with no implicit coercions.
4. It checks argument types against parameter types on function calls ([T-Call]).
5. It enforces array index typing ([T-Index]) and struct field existence ([T-Field]).
6. It enforces the cast validity table (Section 8).
7. It rejects non-exhaustive match expressions ([T-Match], E4010) and inconsistent arm types (E4011).
8. It enforces arena escape analysis ([T-Arena], E5001).
9. It restricts pointer types to extern functions ([WF-Func], E2010).
10. It emits the error codes listed in Section 12 for their respective violations.
