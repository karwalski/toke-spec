# toke Error Code Registry

**Status:** Complete (Story 2.12.1)

This file is the normative error code registry for toke Profile 1.
Error codes are stable -- never renumber or change the meaning of an existing code.

See `spec/toke-spec-v02.md` Appendix A for the diagnostic JSON schema.

---

## Series

| Series | Range | Stage |
|--------|-------|-------|
| E1xxx | 1000--1999 | Lexer |
| E2xxx | 2000--2999 | Parser |
| E3xxx | 3000--3999 | Name resolver |
| E4xxx | 4000--4999 | Type checker |
| E5xxx | 5000--5999 | Arena validator |
| E6xxx | 6000--6999 | IR lowerer |
| E9xxx | 9000--9999 | Codegen / internal |
| W1xxx | 1000--1999 | Lexer warnings |

---

## Summary Table

| Code | Severity | Stage | Short description | Conformance test(s) |
|------|----------|-------|-------------------|---------------------|
| E1001 | error | lex | Invalid escape sequence | D001, D006, D007, D008, D010, D011, D012 |
| E1002 | error | lex | Unterminated string literal | D002 |
| E1003 | error | lex | Character outside Profile 1 set | D003 |
| E1010 | error | parse | Reserved literal used as identifier | D004 |
| W1010 | warning | lex | String interpolation unsupported in P1 | D005, D009 |
| E2001 | error | parse | Declaration ordering violation | G024 |
| E2002 | error | parse | Unexpected token | -- |
| E2003 | error | parse | Missing semicolon | -- |
| E2004 | error | parse | Unclosed delimiter | -- |
| E2010 | error | type_check | Pointer type outside extern function | D013 |
| E2030 | error | name_resolution | Unresolved import | -- |
| E2031 | error | name_resolution | Circular import detected | -- |
| E2035 | error | name_resolution | Malformed version string in import | D014 |
| E2036 | error | name_resolution | No compatible version found | -- |
| E2037 | error | name_resolution | Version conflict between imports | -- |
| E3011 | error | name_resolution | Identifier not declared | -- |
| E3012 | error | name_resolution | Identifier already declared in scope | -- |
| E3020 | error | type_check | `!` applied to non-error-union value | -- |
| E4010 | error | type_check | Non-exhaustive match | -- |
| E4011 | error | type_check | Match arms have inconsistent types | -- |
| E4025 | error | type_check | Struct has no field with that name | -- |
| E4031 | error | type_check | Type mismatch / implicit coercion | -- |
| E4040 | error | type_check | Map key type mismatch | -- |
| E4041 | error | type_check | Map value type mismatch | -- |
| E4042 | error | type_check | Method on non-collection type | -- |
| E4043 | error | type_check | Inconsistent types in map literal | D015 |
| E4050 | error | type_check | spawn argument not a callable function | -- |
| E4051 | error | type_check | await argument not a Task | D016 |
| E4052 | error | type_check | Spawned function has parameters (v0.1) | -- |
| E4060 | error | type_check | FFI type mismatch | -- |
| E5001 | error | arena_check | Value escapes arena scope | -- |
| E9001 | error | codegen | Failed to write interface file | -- |
| E9002 | error | codegen | LLVM IR emission failed | -- |
| E9003 | error | codegen | clang invocation failed | -- |

**Legend:** `--` = no dedicated conformance test yet (code is exercised by compiler but not by a D/G-series test).

Codes **E2036**, **E4040**, **E4041**, **E4042**, and **E4060** are defined in headers but not yet emitted by any `diag_emit` call -- they are reserved for planned functionality.

---

## Lexer Errors (1xxx)

### E1001 -- Invalid escape sequence

| Field | Value |
|-------|-------|
| **Code** | E1001 |
| **Stage** | lex |
| **Severity** | error |
| **Message** | `invalid escape sequence in string literal` |
| **Fix field** | absent |
| **Conformance test** | D001, D006, D007, D008, D010, D011, D012 |

**Notes:** Emitted when a backslash in a string literal is followed by a character
that is not one of `"`, `\`, `n`, `t`, `r`, `0`, `x`, or `(`. Also emitted when
`\x` is not followed by exactly two hex digits.

**Example trigger:**
```toke
M=test;
F=bad():Str{<"\q"};
```

---

### E1002 -- Unterminated string literal

| Field | Value |
|-------|-------|
| **Code** | E1002 |
| **Stage** | lex |
| **Severity** | error |
| **Message** | `unterminated string literal` |
| **Fix field** | absent |
| **Conformance test** | D002 |

**Notes:** The lexer reaches end-of-input before encountering a closing `"`.

**Example trigger:**
```toke
M=test;
F=bad():Str{<"unterminated};
```

---

### E1003 -- Character outside Profile 1 character set

| Field | Value |
|-------|-------|
| **Code** | E1003 |
| **Stage** | lex |
| **Severity** | error |
| **Message** | `character outside Profile 1 character set` |
| **Fix field** | absent |
| **Conformance test** | D003 |

**Notes:** Any byte that is not whitespace, alphanumeric, or a recognised symbol
triggers this error. The Profile 1 character set is ASCII-only.

**Example trigger:**
```toke
M=test;
F=bad():i64{<1£};
```

---

### E1010 -- Reserved literal used as identifier

| Field | Value |
|-------|-------|
| **Code** | E1010 |
| **Stage** | parse |
| **Severity** | error |
| **Message** | `reserved literal cannot be used as an identifier` |
| **Fix field** | absent |
| **Conformance test** | D004 |

**Notes:** The lexer produces `BOOL_LIT` tokens for `true` and `false`. When one
appears in a position that requires `IDENT` (e.g. `let true = ...`), the parser
emits this error. Although the code is in the 1xxx lexer range, the diagnostic is
actually emitted by the parser stage.

**Example trigger:**
```toke
M=test;
F=bad():i64{let true=1;<true};
```

---

## Lexer Warnings (W1xxx)

### W1010 -- String interpolation not supported in Profile 1

| Field | Value |
|-------|-------|
| **Code** | W1010 |
| **Stage** | lex |
| **Severity** | warning |
| **Message** | `string interpolation \( is not supported in Profile 1; use str.concat() instead` |
| **Fix field** | `"use str.concat() for string composition"` |
| **Conformance test** | D005, D009 |

**Notes:** The `\(` sequence inside a string literal triggers this warning. The
lexer consumes the parenthesised content as part of the string literal. The fix
field is informational only -- there is no mechanical auto-fix.

**Example trigger:**
```toke
M=test;
F=interp():Str{<"hello \(name)"};
```

---

## Parser Errors (2xxx)

### E2001 -- Declaration ordering violation

| Field | Value |
|-------|-------|
| **Code** | E2001 |
| **Stage** | parse |
| **Severity** | error |
| **Message** | `declaration ordering violation` or `module declaration must appear first` |
| **Fix field** | absent |
| **Conformance test** | G024 |

**Notes:** A toke source file must follow the declaration order:
`M` (module) then `I` (import) then `T` (type) then constants then `F` (function).
This error fires when a declaration appears out of order or when `M=` is missing.

**Example trigger:**
```toke
F=bad():i64{<0};
```

---

### E2002 -- Unexpected token

| Field | Value |
|-------|-------|
| **Code** | E2002 |
| **Stage** | parse |
| **Severity** | error |
| **Message** | `unexpected token` |
| **Fix field** | absent |
| **Conformance test** | -- |

**Notes:** The parser encountered a token it cannot consume in the current
grammatical context. This is the general-purpose parse error for tokens that do
not match any expected production.

**Example trigger:**
```toke
M=test;
F=bad():i64{<1 @};
```

---

### E2003 -- Missing semicolon

| Field | Value |
|-------|-------|
| **Code** | E2003 |
| **Stage** | parse |
| **Severity** | error |
| **Message** | `missing semicolon` |
| **Fix field** | absent |
| **Conformance test** | -- |

**Notes:** A semicolon was expected between statements. Semicolons may be elided
before `}` or `EOF` (trailing-semicolon elision), but are required between
consecutive statements inside a block.

**Example trigger:**
```toke
M=test;
F=bad():i64{let x=1 let y=2;<x};
```

---

### E2004 -- Unclosed delimiter

| Field | Value |
|-------|-------|
| **Code** | E2004 |
| **Stage** | parse |
| **Severity** | error |
| **Message** | `unclosed delimiter` |
| **Fix field** | absent |
| **Conformance test** | -- |

**Notes:** A `(`, `[`, or `{` was opened but the matching `)`, `]`, or `}` was
not found before EOF. Also emitted when `xp()` expects a closing delimiter and
the current token is `TK_EOF`.

**Example trigger:**
```toke
M=test;
F=bad():i64{<(1+2};
```

---

### E2010 -- Pointer type outside extern function

| Field | Value |
|-------|-------|
| **Code** | E2010 |
| **Stage** | type_check |
| **Severity** | error |
| **Message** | `pointer type *T used outside extern function` |
| **Fix field** | absent |
| **Conformance test** | D013 |

**Notes:** Pointer types (`*T`) are only valid in extern (bodyless) function
signatures. If a function has a body (i.e. it is not an FFI declaration), using
`*T` in its parameters or return type emits this error.

**Example trigger:**
```toke
M=test;
F=bad(s:*u8):i64{<42};
```

---

## Import/Module Errors (2xxx continued)

### E2030 -- Unresolved import

| Field | Value |
|-------|-------|
| **Code** | E2030 |
| **Stage** | name_resolution |
| **Severity** | error |
| **Message** | `module '<path>' not found; available: <list>` |
| **Fix field** | absent |
| **Conformance test** | -- |

**Notes:** The module path in an `I=` declaration does not resolve to any `.tki`
interface file on the search path.

---

### E2031 -- Circular import detected

| Field | Value |
|-------|-------|
| **Code** | E2031 |
| **Stage** | name_resolution |
| **Severity** | error |
| **Message** | `circular import detected: '<path>' is already being resolved` |
| **Fix field** | absent |
| **Conformance test** | -- |

**Notes:** The import graph contains a cycle. Module A imports B which (directly
or transitively) imports A.

---

### E2035 -- Malformed version string in import

| Field | Value |
|-------|-------|
| **Code** | E2035 |
| **Stage** | name_resolution |
| **Severity** | error |
| **Message** | `malformed version string "<ver>" in import` |
| **Fix field** | absent |
| **Conformance test** | D014 |

**Notes:** The optional version string in an import declaration does not match
the expected `MAJOR.MINOR` or `MAJOR.MINOR.PATCH` format.

**Example trigger:**
```toke
M=test;
I=io:std.io "abc";
F=noop():bool{<true};
```

---

### E2036 -- No compatible version found (reserved)

| Field | Value |
|-------|-------|
| **Code** | E2036 |
| **Stage** | name_resolution |
| **Severity** | error |
| **Message** | *(not yet emitted)* |
| **Fix field** | TBD |
| **Conformance test** | -- |

**Notes:** Defined in `names.h` but not yet emitted. Reserved for when version
resolution finds interface files but none match the requested version constraint.

---

### E2037 -- Version conflict between imports

| Field | Value |
|-------|-------|
| **Code** | E2037 |
| **Stage** | name_resolution |
| **Severity** | error |
| **Message** | `version conflict for module '<path>': "<v1>" vs "<v2>"` |
| **Fix field** | absent |
| **Conformance test** | -- |

**Notes:** Two import declarations reference the same module path but with
different major versions. Toke does not support diamond-dependency version
conflicts within a single compilation unit.

---

## Name Resolution Errors (3xxx)

### E3011 -- Identifier not declared

| Field | Value |
|-------|-------|
| **Code** | E3011 |
| **Stage** | name_resolution |
| **Severity** | error |
| **Message** | `identifier '<name>' is not declared` |
| **Fix field** | absent |
| **Conformance test** | -- |

**Notes:** A reference to an identifier that does not exist in any enclosing
scope.

**Example trigger:**
```toke
M=test;
F=bad():i64{<x};
```

---

### E3012 -- Identifier already declared in this scope

| Field | Value |
|-------|-------|
| **Code** | E3012 |
| **Stage** | name_resolution |
| **Severity** | error |
| **Message** | `identifier '<name>' is already declared in this scope` |
| **Fix field** | absent |
| **Conformance test** | -- |

**Notes:** A second declaration of the same name in the same scope. Shadowing
across scope boundaries is allowed; duplicate declaration within one scope is not.

**Example trigger:**
```toke
M=test;
F=bad():i64{let x=1;let x=2;<x};
```

---

### E3020 -- `!` applied to non-error-union value

| Field | Value |
|-------|-------|
| **Code** | E3020 |
| **Stage** | type_check |
| **Severity** | error |
| **Message** | `! applied to a non-error-union value; function must return T!Err` |
| **Fix field** | absent |
| **Conformance test** | -- |

**Notes:** The propagation operator `!` can only be applied to a value whose type
is an error union (`T!Err`), and only inside a function whose return type is also
an error union.

---

## Type Checker Errors (4xxx)

### E4010 -- Non-exhaustive match

| Field | Value |
|-------|-------|
| **Code** | E4010 |
| **Stage** | type_check |
| **Severity** | error |
| **Message** | `non-exhaustive match: missing arm for 'true'` or `...for 'false'` |
| **Fix field** | absent |
| **Conformance test** | -- |

**Notes:** A `match` expression over a `bool` scrutinee must cover both `true`
and `false`. If either arm is missing, this error is emitted (potentially twice,
once per missing arm).

**Example trigger:**
```toke
M=test;
F=bad():i64{match true{true=>{<1}}};
```

---

### E4011 -- Match arms have inconsistent types

| Field | Value |
|-------|-------|
| **Code** | E4011 |
| **Stage** | type_check |
| **Severity** | error |
| **Message** | `match arms have inconsistent types: '<T1>' vs '<T2>'` |
| **Fix field** | absent |
| **Conformance test** | -- |

**Notes:** All arms of a `match` expression must evaluate to the same type. If
one arm returns `i64` and another returns `Str`, this error fires.

---

### E4025 -- Struct has no field with that name

| Field | Value |
|-------|-------|
| **Code** | E4025 |
| **Stage** | type_check |
| **Severity** | error |
| **Message** | `struct '<Name>' has no field '<field>'` |
| **Fix field** | absent |
| **Conformance test** | -- |

**Notes:** A field access expression (`expr.field`) references a field name that
does not exist in the struct type.

---

### E4031 -- Type mismatch

| Field | Value |
|-------|-------|
| **Code** | E4031 |
| **Stage** | type_check |
| **Severity** | error |
| **Message** | `type mismatch: expected '<T1>', got '<T2>'` |
| **Fix field** | present (contextual, e.g. `"cast RHS to i64 using 'as'"`) |
| **Conformance test** | -- |

**Notes:** The workhorse type error. Emitted for mismatched operands in binary
expressions, mismatched function arguments, mismatched binding annotations,
mismatched assignment sides, and mismatched return values. The fix field, when
present, suggests an explicit `as` cast.

---

### E4040 -- Map key type mismatch (reserved)

| Field | Value |
|-------|-------|
| **Code** | E4040 |
| **Stage** | type_check |
| **Severity** | error |
| **Message** | *(not yet emitted)* |
| **Fix field** | TBD |
| **Conformance test** | -- |

**Notes:** Defined in `types.h` but not yet emitted. Reserved for map key type
checking beyond literal consistency (see E4043).

---

### E4041 -- Map value type mismatch (reserved)

| Field | Value |
|-------|-------|
| **Code** | E4041 |
| **Stage** | type_check |
| **Severity** | error |
| **Message** | *(not yet emitted)* |
| **Fix field** | TBD |
| **Conformance test** | -- |

**Notes:** Defined in `types.h` but not yet emitted. Reserved for map value type
checking beyond literal consistency (see E4043).

---

### E4042 -- Method on non-collection type (reserved)

| Field | Value |
|-------|-------|
| **Code** | E4042 |
| **Stage** | type_check |
| **Severity** | error |
| **Message** | *(not yet emitted)* |
| **Fix field** | TBD |
| **Conformance test** | -- |

**Notes:** Defined in `types.h` but not yet emitted. Reserved for calling
collection methods (e.g. `.push`, `.get`) on non-collection types.

---

### E4043 -- Inconsistent types in map literal

| Field | Value |
|-------|-------|
| **Code** | E4043 |
| **Stage** | type_check |
| **Severity** | error |
| **Message** | `inconsistent map key type: expected '<T1>', got '<T2>'` or `inconsistent map value type: ...` |
| **Fix field** | absent |
| **Conformance test** | D015 |

**Notes:** All entries in a map literal must have the same key type and the same
value type. The first entry establishes the expected types; subsequent entries
that deviate trigger this error.

**Example trigger:**
```toke
M=test;
F=bad():i64{<[1:10; 2:"x"]};
```

---

### E4050 -- spawn argument not a callable function

| Field | Value |
|-------|-------|
| **Code** | E4050 |
| **Stage** | type_check |
| **Severity** | error |
| **Message** | `spawn argument not a callable function` |
| **Fix field** | absent |
| **Conformance test** | -- |

**Notes:** `spawn(f)` requires its argument to be a declared function. Passing a
non-function identifier or omitting the argument triggers this error.

---

### E4051 -- await argument not a Task

| Field | Value |
|-------|-------|
| **Code** | E4051 |
| **Stage** | type_check |
| **Severity** | error |
| **Message** | `await argument not a Task` |
| **Fix field** | absent |
| **Conformance test** | D016 |

**Notes:** `await(t)` requires its argument to have type `Task<T>`. Passing a
value of any other type emits this error.

**Example trigger:**
```toke
M=test;
F=notask():i64{<42};
F=main():i64{<await(notask())};
```

---

### E4052 -- Spawned function has parameters

| Field | Value |
|-------|-------|
| **Code** | E4052 |
| **Stage** | type_check |
| **Severity** | error |
| **Message** | `spawned function has parameters; v0.1 requires nullary functions` |
| **Fix field** | absent |
| **Conformance test** | -- |

**Notes:** In Profile 1 (v0.1), `spawn` only accepts nullary (zero-parameter)
functions. This restriction may be lifted in a future profile.

---

### E4060 -- FFI type mismatch (reserved)

| Field | Value |
|-------|-------|
| **Code** | E4060 |
| **Stage** | type_check |
| **Severity** | error |
| **Message** | *(not yet emitted)* |
| **Fix field** | TBD |
| **Conformance test** | -- |

**Notes:** Defined in `types.h` but not yet emitted. Reserved for type mismatches
at FFI boundaries (e.g. passing a toke `Str` where the extern declaration
expects `*u8`).

---

## Arena Errors (5xxx)

### E5001 -- Value escapes arena scope

| Field | Value |
|-------|-------|
| **Code** | E5001 |
| **Stage** | arena_check |
| **Severity** | error |
| **Message** | `value escapes arena scope: cannot assign arena-allocated value to outer variable` |
| **Fix field** | absent |
| **Conformance test** | -- |

**Notes:** Inside an `{arena ...}` block, assigning to a variable declared in an
outer scope would cause a dangling reference when the arena is freed.

**Example trigger:**
```toke
M=test;
F=bad():i64{let x=0;{arena x=1};<x};
```

---

## Codegen / Internal Errors (9xxx)

### E9001 -- Failed to write interface file

| Field | Value |
|-------|-------|
| **Code** | E9001 |
| **Stage** | codegen |
| **Severity** | error |
| **Message** | `failed to write interface file '<path>': <OS error>` |
| **Fix field** | absent |
| **Conformance test** | -- |

**Notes:** The compiler could not open or flush the `.tki` interface file. This
is an I/O error, not a source-level error. Position fields are zero.

---

### E9002 -- LLVM IR emission failed

| Field | Value |
|-------|-------|
| **Code** | E9002 |
| **Stage** | codegen |
| **Severity** | error |
| **Message** | `LLVM IR emission failed: cannot open output file` or `...I/O error writing .ll file` |
| **Fix field** | absent |
| **Conformance test** | -- |

**Notes:** The compiler could not create or write the `.ll` output file.
Position fields are zero.

---

### E9003 -- clang invocation failed

| Field | Value |
|-------|-------|
| **Code** | E9003 |
| **Stage** | codegen |
| **Severity** | error |
| **Message** | `clang invocation failed with exit code <N>` |
| **Fix field** | absent |
| **Conformance test** | -- |

**Notes:** After emitting `.ll` IR, the compiler invokes `clang -O1` to produce
a binary. If clang exits non-zero, this error is reported. Position fields are
zero.

---

## Conformance Test Cross-Reference

| Test | Series | Error code(s) | Description |
|------|--------|---------------|-------------|
| D001 | D | E1001 | Fix field absent for unrecognised escape |
| D002 | D | E1002 | Fix field absent for unterminated string |
| D003 | D | E1003 | Fix field absent for out-of-set character |
| D004 | D | E1010 | Fix field absent for reserved literal as ident |
| D005 | D | W1010 | Fix field is informational string |
| D006 | D | E1001 | schema_version field is "1.0" |
| D007 | D | E1001 | Diagnostic has pos.line and pos.col |
| D008 | D | E1001 | Severity field is "error" for E-codes |
| D009 | D | W1010 | Severity field is "warning" for W-codes |
| D010 | D | E1001 | pos.line is 1-based |
| D011 | D | E1001 | error_code field matches "E1001" |
| D012 | D | E1001 x2 | Multiple errors produce multiple records |
| D013 | D | E2010 | Pointer type in non-extern function |
| D014 | D | E2035 | Malformed version string in import |
| D015 | D | E4043 | Inconsistent map literal types |
| D016 | D | E4051 | await on non-Task |
| G024 | G | E2001 | Missing module declaration |
