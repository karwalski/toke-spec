# Reserved Character Usage Plan

**Date:** 2026-04-04
**Status:** Gate 2 review companion document
**Audience:** Research review teams T1-T8

---

## Purpose

The toke 56-character set reserves `^` and `~` for future use (spec Section 7.1). Researchers reviewing the syntax lock-in will ask two questions:

1. What are these reserved characters for?
2. Does the character set have room to grow beyond them?

This document answers both questions, showing the syntax has headroom for evolution without breaking the 56-character constraint.

References:
- Language specification: `toke/spec/spec/toke-spec-v02.md` (Section 7)
- Design decisions: `toke-spec/docs/design-decisions.md` (Decision 10)

All paths are relative to the `~/tk/` workspace root.

---

## 1. Current Reserved Characters

The 56-character set includes two reserved characters that are not assigned in v0.1:

```
CLASS        CHARACTERS                                                 COUNT
──────────────────────────────────────────────────────────────────────────────
Lowercase    a b c d e f g h i j k l m n o p q r s t u v w x y z       26
Digits       0 1 2 3 4 5 6 7 8 9                                       10
Symbols      ( ) { } = : . ; + - * / < > ! | $ @                       18
Reserved     ^ ~                                                         2
──────────────────────────────────────────────────────────────────────────────
TOTAL                                                                   56
```

### `^` -- Candidate uses (ranked by likelihood)

| Rank | Use | Syntax | Rationale |
|------|-----|--------|-----------|
| 1 | **Bitwise XOR** | `a ^ b` | Standard binary operator in C, Rust, Go, Java. Currently toke has no bitwise operators. `^` for XOR would complete the set alongside `|` (already in the character set as bitwise OR via single `|`, logical OR via `||`). Systems programming requires bitwise XOR for checksums, hashing, flag toggling, and cryptographic operations. |
| 2 | Exponentiation | `x ^ 2` | Mathematical convention. Python uses `**`, but `^` is what mathematicians write. However, this conflicts directly with XOR -- `^` cannot serve both roles. Exponentiation can be expressed as a standard library function (`math.pow(x; 2)`) without dedicating a character. |
| 3 | Pattern matching / destructuring | -- | Less likely. Match expressions already use `|` and `{}` syntax, which is sufficient for current pattern matching needs. No clear syntactic gap that `^` would fill. |

**Recommendation:** Bitwise XOR. It is the standard use of `^` across systems languages, and toke's target audience (LLMs trained on C/Rust/Go) has strong priors for this meaning.

### `~` -- Candidate uses (ranked by likelihood)

| Rank | Use | Syntax | Rationale |
|------|-----|--------|-----------|
| 1 | **Bitwise NOT** | `~x` | Standard unary prefix operator in C, Rust, Go, Java. Pairs naturally with `^` for bitwise XOR -- if toke adds bitwise operators, both belong together. Used for bit mask inversion, complement operations, and systems-level bit manipulation. |
| 2 | Approximate / fuzzy matching | `~=` | Two-character operator for approximate equality in floating-point comparisons. Useful but niche -- can be expressed as a library function (`math.approx(a; b; eps)`) without consuming a character slot. |
| 3 | Destructor / cleanup marker | `~init` | Cleanup function marker, following C++ convention (`~ClassName`). Less likely given toke's arena memory model where deallocation is deterministic on scope exit and does not require user-defined destructors. |

**Recommendation:** Bitwise NOT. It completes the bitwise operator set and pairs with `^` for XOR. The two reserved characters were chosen together precisely because they form a natural pair for bitwise operations.

---

## 2. Proposed v0.2 Allocation

| Character | Role | Type | Operands | Precedence model |
|-----------|------|------|----------|------------------|
| `^` | Bitwise XOR | Binary infix operator | Integer operands (`i64`) | Between bitwise AND (`&`, if added) and bitwise OR (`\|`) -- follows C precedence convention |
| `~` | Bitwise NOT | Unary prefix operator | Integer operand (`i64`) | Same precedence as `!` (logical NOT) -- both are unary prefix operators |

### Examples

```
// Bitwise XOR -- toggle flag bits
let flags:i64 = flags ^ mask;

// Bitwise NOT -- invert all bits
let inverted:i64 = ~flags;

// Combined -- clear specific bits
let cleared:i64 = flags ^ (flags ^ ~mask);
```

This allocation completes toke's operator set for systems programming. After this allocation, all 56 characters are assigned and no reserved characters remain. The character set is fully consumed without needing expansion.

### What about bitwise AND (`&`)?

The `&` character is explicitly excluded from the 56-character set (spec Section 7.2). The two-character sequence `&&` is already the logical AND operator. Bitwise AND can be expressed through the identity `a & b == ((a ^ b) ^ a) ^ ((a ^ b) ^ b)` or, more practically, as a compiler intrinsic or standard library function (`bits.and(a; b)`). This avoids adding `&` as a structural character while still providing full bitwise capability.

---

## 3. Characters Explicitly Excluded (and Why They Stay Out)

The following ASCII printable characters are NOT in the 56-character set. Each has a clear rationale for exclusion.

| Character | Reason for exclusion |
|-----------|---------------------|
| `A`-`Z` (26 chars) | Replaced by `$` sigil for type references, lowercase keywords for all declarations. Adding uppercase would expand the set from 56 to 82 characters, fragmenting BPE vocabulary across case variants for no semantic gain. |
| `[` `]` (2 chars) | Replaced by `@()` for collection literals and `@type` for collection types. Indexing uses `.get()`. Two characters that would serve only one syntactic role (indexing) do not justify their inclusion. |
| `#` | Strongly associated with "comment" in Python, Ruby, shell, YAML, TOML, and Markdown. LLMs trained on those languages have deep priors that `#` begins a comment. Using it for any other purpose would fight those priors and increase generation errors. |
| `%` | Modulo operator in C-family languages. Modulo can be expressed as `a - (a / b) * b` using existing operators, or as a standard library function. Not worth a character slot for a single arithmetic operation. |
| `&` | Bare `&` is not a valid token (E1003 error). The two-character sequence `&&` is logical AND, composed from two `|`-class characters. Adding `&` as a standalone operator would require disambiguating `&` (bitwise AND) from `&&` (logical AND), adding parser complexity. |
| `` ` `` (backtick) | Used for template literals in JavaScript, code spans in Markdown, and command substitution in shell. Strong conflicting priors in LLM training data. No use case identified that existing syntax cannot serve. |
| `\` (backslash) | Appears only inside string literals as the escape character (`\n`, `\t`, `\"`, etc.). Not a structural symbol -- consumed by the lexer during string scanning. Adding it as a structural character would create ambiguity with string escape sequences. |
| `'` (single quote) | No character type in toke; all strings use `"`. Single-quote strings would be a second way to write the same thing, violating the one-canonical-form principle. |
| `,` (comma) | Replaced by `;` as the universal separator (statement terminator, array element separator, map entry separator). Eliminating `,` reduced the character set by one and unified separation syntax. Parser disambiguates `;` role by context (inside `@()` vs. block level). |
| `?` | No ternary operator in toke; `match` expressions serve this role. Optional types, if added, can use existing syntax (e.g., sum types with `$none` variant). No syntactic gap that `?` would fill. |
| `"` (double quote) | String delimiter, consumed by the lexer during string literal scanning. Never produces a token in the structural token stream. Analogous to whitespace in this regard -- present in source but not in the grammar. Listed in the spec as not a structural symbol. |

---

## 4. Expansion Headroom Analysis

The 56-character set can accommodate future language features WITHOUT adding new characters. Each feature below uses only existing characters and multi-character tokens.

### Generics / Parameterized Types

```
// Using existing $ and () syntax
t=stack($t){data:@$t;len:i64;};
f=push(s:$stack($i64);val:i64):$stack($i64){...};
```

Type parameters use `$t` (existing type sigil) inside existing parentheses. No new characters needed.

### Closures / Lambdas

```
// Anonymous function using existing f + braces
let sq = f(x:i64):i64{<x * x;};
let mapped = arr.map(f(x:i64):i64{<x * 2;});
```

Anonymous functions reuse the `f` keyword and existing brace/parenthesis syntax. No new delimiter required.

### Async / Await

```
// If re-added as a language feature, uses keywords within existing character set
let handle = sp task(x);    // sp = spawn
let result = aw handle;      // aw = await
```

Two-character keywords (`sp`, `aw`) follow the same pattern as `rt` (return), `br` (break), `el` (else). No new characters consumed.

### Modules with Versions

```
// Version specifiers using existing . and digits
i=http:pkg.http.v2;
i=json:pkg.json.v1;
```

Dots and digits are already in the character set. Version suffixes are parsed as part of the module path.

### Annotations / Attributes

```
// Using existing @ in a context-dependent role
@inline
f=square(x:i64):i64{<x * x;};

@compile(target:"arm64")
f=neon_add(a:@i64;b:@i64):@i64{...};
```

The `@` character currently means "collection". In annotation position (preceding a declaration, not followed by `(`), `@` introduces an attribute. The parser disambiguates by syntactic position: `@(` is a collection literal, `@ident` before a declaration is an annotation, `@type` in a type position is a collection type. This is context-dependent but deterministic with one token of lookahead.

### Bitwise Shift

```
// Multi-character operators from existing characters
let shifted = x << 3;   // left shift (two < characters)
let right = x >> 1;     // right shift (two > characters)
```

Shift operators use doubled `<` and `>`, following C/Rust convention. The parser disambiguates `<<` (shift) from `<` (return or comparison) by syntactic position, the same technique used for `&&` (logical AND from two `&`-class characters) and `||` (logical OR from two `|` characters).

---

## 5. Conclusion

The 56-character set is not minimal by accident -- it was reduced from 80 through systematic elimination of redundant characters (see design-decisions.md, Decision 10). Each removal was validated by demonstrating that the removed characters' roles could be absorbed by remaining characters without ambiguity.

The two reserved characters (`^`, `~`) provide immediate expansion for bitwise operations -- the most likely systems programming feature to be added in v0.2. Their allocation as bitwise XOR and bitwise NOT respectively follows universal convention across C, Rust, Go, and Java, meaning LLMs will have strong priors for their correct usage.

The exclusion list (Section 3) shows that each omitted ASCII character has a clear rationale grounded in toke's design principles: one canonical form, no redundant characters, no conflicting LLM priors.

Future language features -- generics, closures, async, annotations, bitwise shifts -- can all be expressed using existing characters and multi-character tokens (Section 4). This confirms the syntax has headroom for significant language evolution without expanding the character set beyond 56.

The character budget is intentional, complete, and sufficient.

---

*This document accompanies the Gate 2 review package (gate2-review-package.md) and is prepared for research review teams T1-T8. It reflects the state of the language specification and compiler as of 2026-04-04.*
