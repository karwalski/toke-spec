# String Escaping Specification

**Status:** Normative supplement to toke-spec-v02.md Section 7.3 and Section 9.6.

## 1. String Literal Delimiters

String literals are delimited by the double-quote character `"` (U+0022). The opening and closing `"` are consumed by the lexer and do not appear in the token stream. The `"` character is not part of the Phase 1 or Phase 2 structural character sets; it exists solely as a lexer-level delimiter.

## 2. Content Encoding

Source files are UTF-8. Within string literal content, any valid UTF-8 byte sequence is permitted. Characters outside the Phase 1/Phase 2 structural sets (including whitespace, Unicode, and raw binary via `\xNN`) may appear freely inside string literals. This is the only context in toke source where non-structural characters are legal.

## 3. Escape Sequences

The backslash character `\` (U+005C) is the escape introducer. It is excluded from both the Phase 1 (80-char) and Phase 2 (56-char) structural character sets but is permitted inside string literal content because string content allows arbitrary UTF-8.

The following escape sequences are defined. No others are valid.

| Sequence | Produced Bytes | Description |
|----------|---------------|-------------|
| `\"` | U+0022 | Literal double-quote |
| `\\` | U+005C | Literal backslash |
| `\n` | U+000A | Line feed (newline) |
| `\t` | U+0009 | Horizontal tab |
| `\r` | U+000D | Carriage return |
| `\0` | U+0000 | Null byte |
| `\xNN` | byte 0xNN | Arbitrary byte value; `NN` must be exactly two hexadecimal digits (0-9, a-f, A-F) |

### 3.1 Escape Sequence Errors

An unrecognised escape sequence (backslash followed by any character not listed above) is a compile error: **E1001** ("Unrecognised escape sequence in string literal"). The compiler shall halt lexing on this error.

For `\x`, if fewer than two hex digits follow, the compiler shall emit **E1001** with the message "invalid escape sequence: \\x requires two hex digits".

### 3.2 Backslash in Phase 2

Phase 2 eliminates uppercase letters and square brackets from the structural character set but does not alter string literal content rules. The backslash escape mechanism is identical in Phase 1 and Phase 2. Since `\` never appears in a structural position in either phase, its role as escape introducer inside strings is unambiguous in both modes.

## 4. String Interpolation

String interpolation uses the syntax `\(expr)` where `expr` is a toke expression resolving to a `Str`-compatible type. Interpolation is specified for the language but **not supported in Profile 1** of the compiler. In Profile 1, the lexer emits warning **W1010** and the fix field directs the user to `str.concat()`. The interpolation syntax is reserved; using `\(` is not an E1001 error but a warning with guidance.

## 5. Edge Cases

### 5.1 Empty Strings

The literal `""` is valid and produces a zero-length `Str` value.

### 5.2 Strings Containing Only Escaped Characters

Strings composed entirely of escape sequences are valid:

```
"\n\t\r"        (* three bytes: 0x0A 0x09 0x0D *)
"\x00\x00"      (* two null bytes *)
"\"\\"          (* two characters: quote, backslash *)
```

### 5.3 Multi-line Strings

toke has no multi-line string literal syntax. A newline character inside a string must be expressed as `\n`. A raw newline (U+000A) appearing between the opening and closing `"` is permitted by the lexer (since any UTF-8 is valid inside string content), but produces a literal newline in the string value. There is no line-continuation syntax.

### 5.4 Unterminated Strings

If end-of-file is reached before a closing `"`, the lexer emits **E1002** ("Unterminated string literal at end of file") and halts. There is no recovery; the token stream is not produced.

### 5.5 Null Bytes

The `\0` escape and `\x00` are equivalent and both produce a null byte (U+0000) in the string value. String values in toke are length-prefixed, not null-terminated, so embedded null bytes are valid and do not truncate the string.

### 5.6 High-byte Values

`\xNN` where NN > 7F produces a byte that is not valid standalone UTF-8. Sequences of `\xNN` escapes may be used to construct arbitrary byte sequences. Whether the resulting `Str` value must be valid UTF-8 is enforced at the type level (the `Str` type guarantees UTF-8; use `[Byte]` via `str.bytes()` / `str.frombytes()` for arbitrary byte data), not at the lexer level.

## 6. Numeric Literals

This section documents the syntax of integer and floating-point literals as implemented in the reference lexer (Profile 1).

### 6.1 Integer Literals

| Form | Syntax | Example | Token Kind |
|------|--------|---------|------------|
| Decimal | `[0-9]+` | `42`, `0`, `1000` | `INT_LIT` |
| Hexadecimal | `0x[0-9a-fA-F]+` or `0X[0-9a-fA-F]+` | `0xFF`, `0x1A3` | `INT_LIT` |
| Binary | `0b[01]+` or `0B[01]+` | `0b1010`, `0B110` | `INT_LIT` |

Octal literals (e.g., `0o77`) are **not supported**. A leading zero followed by decimal digits is parsed as a decimal integer (no C-style octal).

### 6.2 Float Literals

Float literals consist of a decimal digit sequence, a `.` (dot), and one or more decimal digits:

```
float_literal = [0-9]+ "." [0-9]+
```

Examples: `3.14`, `0.5`, `100.0`.

The following are **not supported** in Profile 1:

- **Exponent notation** (`1e10`, `3.14e-2`) — not recognized by the lexer
- **Leading-dot floats** (`.5`) — lexed as a dot token followed by an integer
- **Trailing-dot floats** (`5.`) — lexed as an integer followed by a dot token

### 6.3 Restrictions (Profile 1)

The following numeric literal features are explicitly excluded:

| Feature | Status | Rationale |
|---------|--------|-----------|
| Separator underscores (`1_000_000`) | Not supported | Minimizes character set; LLMs do not benefit from visual separators |
| Numeric suffixes (`42u`, `3.14f`) | Not supported | toke has a single integer type (`i64`) and infers float from context |
| Octal (`0o77`) | Not supported | Rarely used in LLM-generated code; reduces ambiguity |
| Exponent notation (`1e10`) | Not supported | May be added in a future profile |

### 6.4 All Integer Literals Are `i64`

Regardless of base (decimal, hex, binary), all integer literals produce a signed 64-bit value. There are no unsigned integer literals. Values outside the `i64` range (`-2^63` to `2^63 - 1`) are a compile error.

---

## 7. Lexer Implementation Notes

The lexer processes string literals character-by-character:

1. On `"`: emit `STR_LIT` token and return.
2. On `\`: consume the next character and match against the escape table. Emit E1001 on mismatch.
3. On any other byte: consume and continue.
4. On EOF: emit E1002 and halt.

The escape table lookup is identical for Phase 1 and Phase 2. The `--phase` flag or file header does not affect string literal scanning.
