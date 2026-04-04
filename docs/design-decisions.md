# Design Decisions -- toke 56-Character Default Syntax

**Date:** 2026-04-04
**Status:** Gate 2 review companion document
**Audience:** Research review teams T1-T8

---

## Purpose

This document explains **why** each major syntax decision was made in the toke 56-character default profile. For each decision, it states the alternatives that were considered, the reasons they were rejected, and the trade-offs accepted.

Researchers evaluating the Gate 2 review package will naturally ask "why not X?" for many of these choices. This document is intended to pre-empt those questions with concrete rationale grounded in toke's design principles (RFC Section 4): machine-first syntax, deterministic structure, token efficiency, and strong explicit typing.

References:
- Language specification: `toke/spec/spec/toke-spec-v02.md`
- RFC: `toke-spec/rfc/draft-watt-toke-lang-00.md`
- Gate 2 review package: `toke-spec/docs/gate2-review-package.md`
- Prior art analysis: `toke-spec/docs/prior-art.md`

All paths are relative to the `~/tk/` workspace root.

---

## 1. Why `$` for Type Sigil?

**Decision:** All user-defined type references are prefixed with `$` and written in lowercase: `$user`, `$vec2`, `$err`. Built-in primitive types (`i64`, `str`, `bool`, `f64`) remain bare.

**Alternatives considered:**

| Alternative | Why rejected |
|-------------|-------------|
| `#` prefix | `#` is the comment character in Python, Ruby, shell, YAML, TOML, and Markdown. LLMs trained on those languages have strong priors that `#` begins a comment. Using it as a type sigil would fight those priors and increase generation errors. |
| `@` prefix | Needed for collection sigil (see Decision 2). Using the same character for both types and collections would create ambiguity: `@user` could be a type or a collection. Two distinct sigils for two distinct roles is cleaner. |
| `%` prefix | Low visual salience; easily confused with the modulo operator in C-family languages. Not in the 56-character set. |
| Uppercase first letter (`User`, `Vec2`) | Requires uppercase letters in the character set, expanding it from 56 to 82 characters. Uppercase letters add 26 characters that serve only one purpose (type distinction), wasting tokenizer vocabulary on case variants of the same identifiers. |
| Backtick (`` ` ``) | Backtick is used for template literals in JavaScript, code spans in Markdown, and command substitution in shell. Strong conflicting priors in LLM training data. Also not in the 56-character set. |

**Why `$` is the right choice:**

1. **Visual salience.** `$` is immediately visible at the start of an identifier, making type references stand out in dense code. A human or model scanning `f=parse(s:str):$result` can instantly identify which identifiers are types.

2. **Not overloaded in the grammar.** `$` has exactly one role: it prefixes a type name. It never appears in any other syntactic position. This gives the parser a single-token, zero-ambiguity signal.

3. **BPE tokenizer alignment.** Because `$` always precedes a type name, the co-occurrence is 100%. BPE training merges `$` with the following identifier into a single vocabulary token (`$i64`, `$user`, `$str` each become one token). This is not possible with uppercase-initial names, where the uppercase letter is just one of 52 possible letter values at that position.

4. **Familiar association.** `$` is associated with "variable" or "reference" in shell, PHP, and Perl. While toke uses it for types rather than variables, the general concept of "this identifier is special" transfers. LLMs have strong priors for `$` as a sigil character.

5. **Single character.** One byte of overhead per type reference. Shorter than any keyword-based prefix (`type.`, `T.`, etc.).

**Trade-off acknowledged:** `$` has a strong "variable" association from PHP/Perl/shell. In toke, it means "type", not "variable". This semantic shift requires learning, but is mitigated by the fact that toke's primary audience is LLMs trained specifically on toke source, not humans transferring habits from PHP.

---

## 2. Why `@` for Collection Sigil?

**Decision:** Array and map literals use `@(...)` syntax. Array types use `@type`. Map types use `@(key:val)`.

**Alternatives considered:**

| Alternative | Why rejected |
|-------------|-------------|
| `#` prefix | Same problem as for types: strong comment-character priors in LLM training data. |
| Prefix keyword (`arr(...)`, `map(...)`) | Multi-character overhead. `arr(1; 2; 3)` is 4 characters longer than `@(1; 2; 3)`. At scale across a program, this adds up. Also, `arr` and `map` would need to be reserved keywords, reducing the namespace available for user identifiers. |
| Generic syntax (`list<i64>`, `map<str; i64>`) | Requires `<` and `>` for type parameters, but `<` is the return operator and `>` is the greater-than comparison operator. Using `<>` for generics would require multi-token lookahead to disambiguate `< expr` (return) from `<type>` (generic). This breaks the LL(1) grammar guarantee. |
| Square brackets (`[1; 2; 3]`) | Requires `[` and `]` in the character set. Removing brackets was a deliberate choice to reduce the character set from 58 to 56. See Decision 3 for the full rationale. |

**Why `@` is the right choice:**

1. **Visually distinct from `$`.** The two sigils serve complementary roles: `$` for types, `@` for collections. They are visually dissimilar, reducing confusion.

2. **Mnemonic.** "at" suggests "array" (both start with 'a'). `@(` can be read as "array of".

3. **Unique two-character opener.** `@(` is a two-character sequence that appears nowhere else in the grammar. The parser sees `@` and knows the next character must be `(` (for a literal or map type) or a type name (for an array type like `@i64`). This is deterministic with one token of lookahead.

4. **BPE mergeability.** `@(` always co-occurs, so BPE training merges it into a single token. This means the two-character overhead is actually one-token overhead after tokenizer training.

---

## 3. Why `.get()` for Indexing Instead of `[]`?

**Decision:** Array and map indexing use method-call syntax: `arr.get(0)`, `m.get("key")`. Square brackets do not exist in the language.

**Alternatives considered:**

| Alternative | Why rejected |
|-------------|-------------|
| `arr[0]` (square brackets) | Would require adding `[` and `]` to the character set (56 becomes 58). Those two characters would serve only one purpose (indexing), since array literals use `@()` and array types use `@type`. Every character in the set must justify its presence; two characters for a single syntactic role does not meet that bar. Additionally, `[]` creates ambiguity with array type syntax if both exist in the grammar. |
| `arr(0)` (parentheses) | Indistinguishable from a function call. `arr(0)` could be "index into arr" or "call arr with argument 0". This violates the deterministic-structure principle (one parse tree per source). |
| `arr.0` (dot-index) | Works for constant integer indices but cannot express variable indices (`arr.i` would be member access on field `i`, not indexing by variable `i`). Also cannot express map key access (`m."key"` is not a valid production). |

**Why `.get()` is the right choice:**

1. **Eliminates two characters from the character set.** Removing `[` and `]` reduced the character set from 58 to 56. Every character removed from the set means fewer possible byte-pair merges, tighter tokenizer vocabulary, and higher token density.

2. **No new grammar production needed.** `.get(expr)` is a method call -- it uses the existing member-access (`.`) and function-call (`()`) productions. The parser already knows how to handle `expr.ident(args)`. No special indexing production is required.

3. **Unambiguous.** `arr.get(0)` can only mean one thing. There is no syntactic context in which it could be misinterpreted.

4. **Consistent with other method calls.** `arr.len`, `arr.push(x)`, `arr.get(0)` all use the same syntax pattern. Indexing is not a special syntactic form; it is a regular method call on the collection.

**Trade-off acknowledged:** `.get(i)` is 7 characters where `[i]` is 3. This is a 4-character overhead per index operation. However:
- The overhead is constant per access, not per-program. Programs with many index operations pay more.
- The character set reduction from 58 to 56 benefits every program, not just those with indexing.
- After BPE training, `.get(` merges into a single token, reducing the effective overhead to approximately 1 extra token per access.

---

## 4. Why No Comments in Source?

**Decision:** toke source files contain no comment syntax. There is no `//`, `/* */`, `#`, or any other comment delimiter. Documentation and metadata are stored in companion files (`.tkc.md`).

**Alternatives considered:**

| Alternative | Why rejected |
|-------------|-------------|
| `//` line comments | Every comment adds tokens to the source that carry zero semantic information for the compiler. In a language optimised for token efficiency, this is pure overhead. LLMs generating toke code would either waste tokens on comments (reducing effective code density) or learn to omit them (making the feature unused). |
| `/* */` block comments | Same token overhead problem. Additionally, block comments require two more multi-character sequences in the grammar and create nesting ambiguity (can `/* */` nest?). |
| `#` comments | Same token overhead problem. Also, `#` is excluded from the character set. |

**Why no comments is the right choice:**

1. **Zero token overhead.** Every character in a toke source file is meaningful code. There is no structural overhead from documentation mixed into the token stream.

2. **Simpler lexer.** The lexer never needs to scan for comment boundaries, handle nested comments, or decide whether `//` is a comment or two consecutive division operators. (In toke, `//` is not valid syntax at all.)

3. **LLMs do not benefit from inline comments during generation.** When an LLM generates code, inline comments do not improve the generated code's correctness -- they add tokens that describe what the model is doing, but the model already knows its intent from the prompt. Published research on code generation shows that stripping comments from training data does not reduce generation accuracy for models above 3B parameters.

4. **Metadata belongs outside the token stream.** Comments are metadata about code. toke separates metadata (stored in `.tkc.md` companion files) from code (stored in `.tk` files). This separation means the compiler never processes non-code content, and tools that need documentation can read it from a structured companion file rather than parsing it out of source.

**Trade-off acknowledged:** This is the most controversial design choice for human readers. Developers accustomed to reading inline comments will find toke source harder to understand at a glance. This is mitigated by:
- toke's primary audience is LLMs, not human readers.
- The companion file system (`.tkc.md`) provides structured documentation that is richer than inline comments (it can include examples, rationale, cross-references).
- For human review scenarios, tooling can display companion file content alongside source.

---

## 5. Why Lowercase-Only (No Uppercase Letters)?

**Decision:** The 56-character set contains only lowercase letters (a-z). No uppercase letters appear in structural source positions.

**Alternatives considered:**

| Alternative | Why rejected |
|-------------|-------------|
| Mixed case with PascalCase types (`User`, `Vec2`) | Requires 26 additional characters in the set (A-Z), expanding it from 56 to 82. Those 26 characters serve one purpose: distinguishing types from values by capitalisation. The `$` sigil achieves the same distinction with one character instead of 26. |
| Case-insensitive (accept both `user` and `User`) | Violates the one-canonical-form principle. If both `User` and `user` refer to the same type, LLMs must learn that two surface forms are semantically identical. This doubles the generation space for type references and invites case-sensitivity bugs. |

**Why lowercase-only is the right choice:**

1. **26 fewer characters in the set.** This is the single largest reduction from the 80-character development profile. Fewer characters means fewer possible byte-pair merges, tighter BPE vocabulary, and more predictable tokenization.

2. **Eliminates case-sensitivity bugs.** In languages with case-sensitive identifiers, `User` and `user` are different names. This is a common source of bugs in both human-written and LLM-generated code. With lowercase-only, this class of error is impossible.

3. **More predictable BPE tokenization.** In mixed-case languages, the tokenizer sees `User`, `user`, `USER`, `uSer` as distinct token sequences. BPE training must allocate separate vocabulary entries for each variant. With lowercase-only, `user` is the only form, and BPE vocabulary is not fragmented across case variants.

4. **`$` sigil replaces the role uppercase served.** The traditional reason for PascalCase in type names is to visually distinguish types from values. `$user` achieves this more reliably than `User` -- the `$` prefix is an explicit, unambiguous signal, not a convention that can be violated.

**Trade-off acknowledged:** Sum type variant names in the spec use uppercase in the internal token class (`TK_TYPE_IDENT`) for disambiguation in match arms. This is an internal compiler representation detail, not a source-level concern -- source code writes sum type variants in lowercase with the `$` prefix.

---

## 6. Why Context Keywords (`m`, `f`, `t`, `i`) Instead of Reserved Keywords?

**Decision:** The declaration keywords `m` (module), `f` (function), `t` (type), `i` (import) are context keywords, not reserved words. They are recognised as declaration introducers only when they appear at the top level followed by `=`. Inside function bodies, `m`, `f`, `t`, and `i` may be used as ordinary variable names.

**Alternatives considered:**

| Alternative | Why rejected |
|-------------|-------------|
| Reserved single-letter keywords | `i` and `f` are extremely common variable names. `i` is the universal loop counter. `f` is a common abbreviation for "float", "file", or "flag". Reserving them would force developers and LLMs to use `ii`, `idx`, `jj`, `fl`, or other workarounds everywhere, wasting tokens and fighting deeply ingrained naming habits from C, Python, Java, and Go. |
| Multi-character keywords (`mod`, `func`, `type`, `import`) | Token overhead. `func=square(x:i64):i64` is 4 characters longer than `f=square(x:i64):i64`. Over a program with 20 function declarations, that is 80 extra characters. With BPE, `f=` merges into a single token; `func=` may not. Additionally, `type` and `import` are reserved keywords in TypeScript, Go, and Python respectively -- reserving them would create naming conflicts in corpus translation tasks. |

**Why context keywords are the right choice:**

1. **Preserves `i` and `f` as variable names.** The most common loop counter (`i`) and a frequent abbreviation (`f`) remain available. This matches the conventions LLMs have learned from billions of tokens of C, Python, and Java.

2. **Minimal token footprint.** `m=`, `f=`, `t=`, `i=` are each two characters. After BPE training, each merges into a single token. A function declaration begins with one token (`f=`) rather than 2-3 tokens (`func =` or `function =`).

3. **Unambiguous in context.** The parser recognises `f=` as a function declaration only at the top level. Inside a function body, `f=5;` is a variable assignment. There is no ambiguity because the parser tracks its position in the grammar (top-level vs. block-level). This is a standard LL(1) technique -- no extra lookahead is required beyond the `=` that follows the identifier.

4. **Smaller reserved word set.** Only 8 identifiers are truly reserved (`if`, `el`, `lp`, `br`, `let`, `mut`, `as`, `rt`). This leaves the maximum namespace available for user-defined identifiers, reducing naming conflicts.

---

## 7. Why Semicolons as Statement Terminators?

**Decision:** Every statement ends with `;`. Semicolons are required, not optional. Whitespace (including newlines) is structurally meaningless.

**Alternatives considered:**

| Alternative | Why rejected |
|-------------|-------------|
| Newline-significant (Python style) | Requires the parser to track indentation levels. Indentation-as-syntax means the parser must maintain a stack of indentation widths and emit synthetic INDENT/DEDENT tokens. This adds complexity to the lexer, makes the grammar context-sensitive (not LL(1)), and means the model must generate correct indentation -- a common source of errors in LLM-generated Python. |
| Optional semicolons (JavaScript/Go style) | Automatic semicolon insertion (ASI) creates ambiguity. In JavaScript, `return\n  x` and `return x` have different semantics because ASI inserts a semicolon after `return` at the newline. This violates the one-canonical-form principle: two visually similar programs parse differently. Go's ASI rules are simpler but still position-dependent. |

**Why required semicolons are the right choice:**

1. **Unambiguous statement boundaries.** The parser knows exactly where every statement ends. There is no ambiguity about whether a newline terminates a statement or continues it.

2. **Whitespace-insensitive.** An entire toke program can be written on a single line. This is valuable for token efficiency: the model does not waste tokens on newlines and indentation that serve only formatting purposes. `f=sq(x:i64):i64{<x*x;};` is a valid, complete function definition.

3. **Simpler for LLMs.** LLMs generating toke code do not need to track indentation state. Every statement ends with `;`, every block ends with `};`. The generation pattern is mechanical and predictable.

4. **Enables compact representation.** When toke source is transmitted between systems (e.g., in a generate-compile-repair loop), whitespace can be stripped entirely without changing semantics. This reduces payload size in API calls.

---

## 8. Why `<` for Return Instead of `return` / `rt`?

**Decision:** The primary return syntax is `<expr;`. The long-form `rt expr;` is available as an alias for clarity in deeply nested expressions, but `<` is idiomatic.

**Rationale:**

1. **Single character.** `<` is one byte. `return` is 6 bytes. In a function with 5 return statements, that is 25 bytes saved. After BPE tokenization, `return` is typically 1-2 tokens; `<` is always part of a merged token (e.g., `<x` or `<$res.ok`).

2. **Mnemonic.** The left-pointing angle bracket suggests "send back" or "output left". The value flows leftward out of the function. This is a visual mnemonic, not a syntactic convention borrowed from another language.

3. **Deterministic parse.** `<` at the start of a statement unambiguously begins a return expression. It cannot be confused with a less-than comparison because comparisons appear inside expressions, not at statement position. The parser disambiguates by syntactic position: statement-initial `<` is return; expression-internal `<` is comparison.

4. **`rt` exists for readability.** The long-form `rt` (2 characters) is available when clarity is needed, such as in deeply nested match arms where `<` might be visually lost. The two forms are semantically identical.

**Trade-off acknowledged:** `<` as return is unfamiliar. No widely-used language uses this convention. However, toke is not optimised for human familiarity -- it is optimised for token efficiency and unambiguous generation. LLMs trained on toke will learn the `<` convention from the training corpus.

---

## 9. Why `;` as Element Separator in `@()` Instead of `,`?

**Decision:** Array and map literals use `;` as the element separator: `@(1; 2; 3)`, `@("key": val; "key2": val2)`.

**Rationale:**

1. **Comma is not in the 56-character set.** The `,` character was removed from the character set. If commas were used as element separators, they would need to be added back, expanding the set to 57 characters. Every character must justify its inclusion.

2. **`;` already exists in the grammar.** The semicolon is the statement terminator. Reusing it as an element separator means no additional character is needed. The parser disambiguates by context: inside `@(...)`, `;` separates elements; outside, it terminates statements.

3. **Consistent mental model.** In toke, `;` is the universal separator. It separates statements in blocks, elements in arrays, and entries in maps. One character, one role (separation), multiple contexts.

**Trade-off acknowledged:** Using `;` for both statement termination and element separation is unfamiliar. In most languages, `;` and `,` serve distinct roles. toke collapses them because the parser's context (inside `@()` or not) provides the disambiguation. This is a minor learning cost for a 1-character reduction in the character set.

---

## 10. Why 56 Characters Specifically?

**Decision:** The toke character set contains exactly 56 printable ASCII characters: 26 lowercase letters, 10 digits, 18 symbols (including 2 reserved).

**How we got to 56:**

The development started with an 80-character set (the "legacy" profile) that included uppercase letters (A-Z), square brackets `[]`, comma `,`, and other symbols. Each removal was validated by demonstrating that the removed characters' roles could be absorbed by remaining characters without ambiguity:

| Removed | Count | Replaced by | Validated |
|---------|-------|-------------|-----------|
| Uppercase A-Z | 26 | `$` sigil for types, lowercase for all keywords | Grammar remains LL(1); all type references unambiguous |
| `[` and `]` | 2 | `@()` for literals, `.get()` for indexing | All array/map operations expressible; no new ambiguity |
| `,` | 1 | `;` as universal separator | Parser disambiguates by context (inside `@()` vs. block) |

**Why not fewer than 56?**

Each of the 56 characters serves at least one necessary role. The 18 symbols are:

- 4 grouping delimiters: `( ) { }`
- 6 operators: `+ - * / < >`
- 3 structural: `= : ;`
- 2 sigils: `$ @`
- 2 logical/error: `! |` (also compose into `&&`, `||`)
- 1 member access: `.`
- 2 reserved for future use: `^ ~`

Removing any of these would eliminate a necessary syntactic role. The 26 lowercase letters and 10 digits are irreducible for identifiers and numeric literals.

**Why not more than 56?**

Every additional character:
- Fragments BPE vocabulary (more possible byte-pair sequences)
- Increases the space of syntactically valid but semantically meaningless programs
- Adds probability mass that the model must assign to characters that appear rarely

The 56-character set is the minimum that preserves all language constructs without ambiguity, with `^` and `~` reserved for future extensions (e.g., bitwise operations, pattern matching) that are deferred in v0.1.

---

## Legacy to Default Mapping Table

The following table shows every syntax change between the 80-character legacy profile and the 56-character default profile. This is the complete set of differences; all other syntax is identical between profiles.

| Feature | Legacy (80-char) | Default (56-char) | Characters saved |
|---------|-------------------|--------------------|-----------------|
| Module declaration | `M=name;` | `m=name;` | 0 (case change only) |
| Function declaration | `F=name(...)` | `f=name(...)` | 0 (case change only) |
| Type declaration | `T=Name{...}` | `t=name{...}` | 0 (case change only) |
| Import declaration | `I=alias:path;` | `i=alias:path;` | 0 (case change only) |
| Type reference (user) | `TypeName` | `$typename` | -1 (adds `$`, but removes uppercase) |
| Built-in types | `I64`, `Str`, `Bool` | `i64`, `str`, `bool` | 0 (case change only) |
| Array literal | `[1, 2, 3]` | `@(1; 2; 3)` | -1 (longer, but eliminates `[`, `]`, `,`) |
| Map literal | `{1:10, 2:20}` | `@(1:10; 2:20)` | -2 (longer, but eliminates `,`) |
| Array type | `[I64]` | `@i64` | +1 (shorter) |
| Map type | `[I64:Str]` | `@(i64:str)` | -1 (slightly longer) |
| Indexing | `arr[0]` | `arr.get(0)` | -4 (longer per access) |
| Logical AND | not available | `&&` | N/A (new feature) |
| Logical OR | not available | `||` | N/A (new feature) |

**Net effect on character set:** 80 characters reduced to 56 (-24 characters removed from the alphabet). The per-expression overhead of longer syntax (e.g., `.get()` vs `[]`) is offset by the tokenizer-level gains from a smaller, more predictable character set.

**Net effect on token efficiency:** The Gate 2 evaluation measures 63.0% fewer tokens than equivalent Python programs and 73.8% mean reduction across Python, Java, and C -- all using the cl100k_base tokenizer. With the purpose-built toke tokenizer, further gains of 2.5-4x are projected from BPE merges on high-frequency patterns like `$str`, `@(`, `f=`, and `.get(`.

---

*This document accompanies the Gate 2 review package (gate2-review-package.md) and is prepared for research review teams T1-T8. It reflects the state of the language specification and compiler as of 2026-04-04.*
