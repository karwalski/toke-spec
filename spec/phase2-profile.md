# toke Phase 2 — Normative Profile Specification

**Status:** FROZEN — Syntax lock-in 2026-04-05 (v0.2-syntax-lock). No syntax changes without formal amendment.
**Date:** 2026-04-05
**Spec version:** 0.2
**Supersedes:** toke-spec-v02.md Section 8 (which described Phase 2 as a secondary profile)

---

## 1. Profile Status [N]

Phase 2 is the **normative default profile** of the toke language. All new toke source files, corpus entries, model training data, and tooling SHALL target Phase 2 unless explicitly marked otherwise.

Phase 1 (80-character, uppercase keywords) is redesignated as the **legacy compatibility profile**. Phase 1 remains a valid input to conforming compilers but is no longer the default. New specification work, examples, and conformance tests SHALL be written in Phase 2 syntax.

A conforming compiler SHALL:
- Accept Phase 2 source by default (no flag required).
- Accept Phase 1 source when the `--phase1` flag is provided or a Phase 1 file header is detected.
- Reject mixed Phase 1/Phase 2 syntax within a single source file.

The `--phase2` flag, if present, SHALL be accepted as a no-op for backward compatibility.

---

## 2. Character Set (56 Characters) [N]

Phase 2 uses exactly 56 structural characters. No character outside this set shall appear in toke source except within string literal content, where arbitrary UTF-8 is permitted.

```
CLASS        CHARACTERS                                                 COUNT
------------------------------------------------------------------------------
Lowercase    a b c d e f g h i j k l m n o p q r s t u v w x y z       26
Digits       0 1 2 3 4 5 6 7 8 9                                       10
Symbols      ( ) { } = : . ; + - * / < > ! | $ @                       18
Reserved     ^ ~                                                         2
------------------------------------------------------------------------------
TOTAL                                                                   56
```

Characters removed from Phase 1: all 26 uppercase letters (`A`-`Z`), square brackets (`[`, `]`).

Characters added in Phase 2: `$` (type sigil), `@` (array sigil).

Reserved characters `^` and `~` are not assigned in this version. They are excluded from use to preserve availability for future extensions.

### 2.1 String Literals

String literal rules are identical to Phase 1 (toke-spec-v02.md Section 7.3). The double-quote `"` is a lexer-level delimiter, not a structural character. Escape sequences (`\"`, `\\`, `\n`, `\t`, `\r`, `\0`, `\xNN`) are unchanged. See `docs/string-escaping.md` for the complete specification.

---

## 3. Keywords [N]

Phase 2 defines 12 keywords. All keywords are lowercase. The four declaration keywords that were uppercase single letters in Phase 1 (`M`, `F`, `I`, `T`) are lowercased in Phase 2 (`m`, `f`, `i`, `t`).

| Keyword | Role | Phase 1 equivalent |
|---------|------|--------------------|
| `m`     | Module declaration | `M` |
| `f`     | Function definition | `F` |
| `i`     | Import declaration | `I` |
| `t`     | Type definition | `T` |
| `if`    | Conditional branch | `if` (unchanged) |
| `el`    | Else branch | `el` (unchanged) |
| `lp`    | Loop | `lp` (unchanged) |
| `br`    | Break | `br` (unchanged) |
| `let`   | Immutable binding | `let` (unchanged) |
| `mut`   | Mutable qualifier | `mut` (unchanged) |
| `as`    | Type cast | `as` (unchanged) |
| `rt`    | Return (long form) | `rt` (unchanged) |

The short-form return operator `<` is unchanged.

Boolean literals `true` and `false` are predefined identifiers, not keywords. They are unchanged from Phase 1.

---

## 4. Type Sigils [N]

### 4.1 The `$` Type Name Prefix

In Phase 2, all user-defined type names and built-in reference type names are prefixed with `$` and written in lowercase. The `$` sigil replaces the uppercase-initial convention of Phase 1.

| Phase 1 | Phase 2 | Context |
|---------|---------|---------|
| `User` | `$user` | User-defined struct type |
| `HttpError` | `$httperror` | User-defined struct type |
| `Str` | `$str` | Built-in string type |
| `Byte` | `$byte` | Built-in byte type |
| `Ok` | `$ok` | Result variant |
| `Err` | `$err` | Result variant |
| `Task` | `$task` | Async task handle |

### 4.2 Scalar Types Without Sigil

Scalar numeric and boolean types do NOT take the `$` prefix because they are already lowercase in Phase 1:

| Type | Phase 2 form | Notes |
|------|-------------|-------|
| `i8`, `i16`, `i32`, `i64` | unchanged | Signed integers |
| `u8`, `u16`, `u32`, `u64` | unchanged | Unsigned integers |
| `f32`, `f64` | unchanged | Floating-point |
| `bool` | unchanged | Boolean |
| `void` | unchanged | Unit type; valid as a sum-type variant payload for zero-payload (enum-style) variants |

### 4.3 Type Identifier Lexical Rule

In Phase 2, the TYPE_IDENT token class is replaced by the SIGIL_TYPE token class:

- **SIGIL_TYPE**: `$` followed by one or more lowercase letters or digits: `$[a-z][a-z0-9]*`

The `$` character SHALL NOT appear in any other structural position. It is always the first character of a type name.

---

## 5. Array Syntax [N]

### 5.1 Array Literals

Phase 1 array literals `[e1;e2;e3]` are replaced by `@(e1;e2;e3)` in Phase 2. The `@` sigil followed by `(` introduces an array literal; `)` closes it.

| Phase 1 | Phase 2 |
|---------|---------|
| `[1;2;3]` | `@(1;2;3)` |
| `["a";"b"]` | `@("a";"b")` |
| `[]` | `@()` |

### 5.2 Array Type Expressions

Phase 1 array type syntax `[T]` is replaced by `@T` in Phase 2:

| Phase 1 | Phase 2 |
|---------|---------|
| `[i64]` | `@i64` |
| `[Str]` | `@$str` |
| `[User]` | `@$user` |

### 5.3 Array Indexing

Phase 1 bracket indexing `a[n]` is eliminated. Phase 2 uses:

- **Constant index**: `a.0`, `a.1`, etc. (dot followed by integer literal)
- **Variable index**: `a.get(n)` (method-style call)

| Phase 1 | Phase 2 | Notes |
|---------|---------|-------|
| `a[0]` | `a.0` | Constant index |
| `a[i]` | `a.get(i)` | Variable index |
| `a[i+1]` | `a.get(i+1)` | Expression index |

The `.get()` method returns the element at the given index. Out-of-bounds access is a runtime trap (RT003).

### 5.4 Map Syntax

Map literals and map type syntax follow the same transformation:

| Phase 1 | Phase 2 |
|---------|---------|
| `[k1:v1;k2:v2]` | `@(k1:v1;k2:v2)` |
| `[K:V]` (type) | `@(K:V)` (type) — where K,V use `$` sigil if applicable |

---

## 6. Grammar — Phase 2 Formal EBNF [N]

The following EBNF defines the complete normative grammar for toke Phase 2. Changes from the Phase 1 grammar (toke-spec-v02.md Section 11) are marked with `(* P2 *)`.

```ebnf
(* toke Phase 2 Formal Grammar — EBNF *)
(* Normative per phase2-profile.md Section 6. *)

(* Notation: same as Phase 1 grammar.                                    *)
(*   =   definition          ;   termination                             *)
(*   |   alternation         ( ) grouping                                *)
(*   [ ] optional (0 or 1)   { } repetition (0 or more)                 *)

(* ================================================================== *)
(* Top-level structure                                                 *)
(* ================================================================== *)

SourceFile   = ModuleDecl { ImportDecl } { TypeDecl } { ConstDecl }
               { FuncDecl } EOF ;


(* ================================================================== *)
(* Module                                              (* P2: 'm' *)  *)
(* ================================================================== *)

ModuleDecl   = 'm' '=' ModulePath ';' ;
ModulePath   = IDENT { '.' IDENT } ;


(* ================================================================== *)
(* Imports                                             (* P2: 'i' *)  *)
(* ================================================================== *)

ImportDecl   = 'i' '=' IDENT ':' ModulePath ';' ;


(* ================================================================== *)
(* Type declarations                                   (* P2: 't' *)  *)
(* ================================================================== *)

TypeDecl     = 't' '=' SIGIL_TYPE '{' FieldList '}' ';' ;
FieldList    = Field { ';' Field } ;
Field        = IDENT ':' TypeExpr ;


(* ================================================================== *)
(* Constant declarations                                               *)
(* ================================================================== *)

ConstDecl    = IDENT '=' LiteralExpr ':' TypeExpr ';' ;


(* ================================================================== *)
(* Function declarations                               (* P2: 'f' *)  *)
(* ================================================================== *)

FuncDecl     = 'f' '=' IDENT '(' [ ParamList ] ')' ':' ReturnSpec
               [ '{' StmtList '}' ] ';' ;
ParamList    = Param { ';' Param } ;
Param        = IDENT ':' TypeExpr ;
ReturnSpec   = TypeExpr [ '!' TypeExpr ] ;


(* ================================================================== *)
(* Statements                                                          *)
(* ================================================================== *)

StmtList     = { Stmt } ;

Stmt         = BindStmt
             | MutBindStmt
             | AssignStmt
             | ReturnStmt
             | IfStmt
             | LoopStmt
             | BreakStmt
             | ArenaStmt
             | ExprStmt
             ;

BindStmt     = 'let' IDENT '=' Expr ';' ;
MutBindStmt  = 'let' IDENT '=' 'mut' '.' Expr ';' ;
AssignStmt   = IDENT '=' Expr ';' ;
ReturnStmt   = ( '<' | 'rt' ) Expr ';' ;
BreakStmt    = 'br' ';' ;

IfStmt       = 'if' '(' Expr ')' '{' StmtList '}' [ 'el' '{' StmtList '}' ] ;
LoopStmt     = 'lp' '(' LoopInit ';' Expr ';' LoopStep ')' '{' StmtList '}' ;
LoopInit     = [ 'let' ] IDENT '=' Expr ;
LoopStep     = IDENT '=' Expr ;
ArenaStmt    = '{' 'arena' StmtList '}' ;

ExprStmt     = Expr ';' ;


(* ================================================================== *)
(* Expressions — precedence from lowest to highest                     *)
(* ================================================================== *)

Expr         = MatchExpr ;

MatchExpr    = CompareExpr [ '|' '{' MatchArmList '}' ] ;

CompareExpr  = AddExpr [ ( '<' | '>' | '=' ) AddExpr ] ;

AddExpr      = MulExpr { ( '+' | '-' ) MulExpr } ;

MulExpr      = UnaryExpr { ( '*' | '/' ) UnaryExpr } ;

UnaryExpr    = '-' UnaryExpr
             | '!' UnaryExpr
             | CastExpr
             ;

CastExpr     = PropagateExpr [ 'as' TypeExpr ] ;

PropagateExpr = CallExpr [ '!' TypeExpr ] ;

CallExpr     = PostfixExpr { '(' [ ArgList ] ')' } ;

PostfixExpr  = PrimaryExpr { '.' ( IDENT | INT_LIT ) } ;  (* P2: .N constant index *)

PrimaryExpr  = IDENT
             | LiteralExpr
             | '(' Expr ')'
             | StructLit
             | ArrayLit                                    (* P2: @(...) *)
             | MapLit                                      (* P2: @(k:v;...) *)
             ;


(* ================================================================== *)
(* Match arms                                                          *)
(* ================================================================== *)

MatchArmList = MatchArm { ';' MatchArm } ;
MatchArm     = SIGIL_TYPE ':' IDENT Expr ;                 (* P2: $type *)


(* ================================================================== *)
(* Struct, array, and map literals                     (* P2 *)        *)
(* ================================================================== *)

StructLit    = SIGIL_TYPE '{' FieldInit { ';' FieldInit } '}' ;
FieldInit    = IDENT ':' Expr ;

ArrayLit     = '@' '(' [ Expr { ';' Expr } ] ')' ;        (* P2: replaces [...] *)

MapLit       = '@' '(' MapEntry { ';' MapEntry } ')' ;    (* P2: replaces [...] *)
MapEntry     = Expr ':' Expr ;


(* ================================================================== *)
(* Argument list                                                       *)
(* ================================================================== *)

ArgList      = Expr { ';' Expr } ;


(* ================================================================== *)
(* Type expressions                                    (* P2 *)        *)
(* ================================================================== *)

TypeExpr     = PtrTypeExpr
             | MapTypeExpr
             | ArrayTypeExpr
             | FuncTypeExpr
             | ScalarType
             | SIGIL_TYPE                                  (* P2: $typename *)
             ;

PtrTypeExpr  = '*' TypeExpr ;

MapTypeExpr  = '@' '(' TypeExpr ':' TypeExpr ')' ;         (* P2: @(K:V) *)

ArrayTypeExpr = '@' TypeExpr ;                             (* P2: @T *)

FuncTypeExpr = '(' TypeExpr { ';' TypeExpr } ')' ':' TypeExpr ;

ScalarType   = 'u8'  | 'u16' | 'u32' | 'u64'
             | 'i8'  | 'i16' | 'i32' | 'i64'
             | 'f32' | 'f64'
             | 'bool'
             | 'void'                                      (* unit type; valid as sum-type variant payload *)
             | '$str'                                      (* P2: was 'Str' *)
             | '$byte'                                     (* P2: was 'Byte' *)
             ;


(* ================================================================== *)
(* Literals                                                            *)
(* ================================================================== *)

LiteralExpr  = INT_LIT | FLOAT_LIT | STR_LIT | BOOL_LIT ;


(* ================================================================== *)
(* Token classes (produced by the lexer)               (* P2 *)        *)
(* ================================================================== *)
(* IDENT       — lowercase identifier         [a-z][a-z0-9]*          *)
(* SIGIL_TYPE  — $-prefixed type identifier   '$' [a-z][a-z0-9]*     *)
(* INT_LIT     — decimal integer literal      [0-9]+                  *)
(* FLOAT_LIT   — decimal float literal        [0-9]+ '.' [0-9]+      *)
(* STR_LIT     — double-quoted string literal '"' ... '"'             *)
(* BOOL_LIT    — boolean literal              'true' | 'false'        *)
(* EOF         — end of input                                         *)
```

### 6.1 Grammar Properties [N]

The Phase 2 grammar preserves all properties of the Phase 1 grammar:
- **Context-free** — no production requires semantic context to resolve.
- **LL(1)** — every production is unambiguously determined by the next token. The `@` sigil followed by `(` unambiguously introduces an array/map literal. The `@` sigil followed by a type identifier unambiguously introduces an array type expression.
- **Unambiguous** — no input string has more than one parse tree.

### 6.2 Array vs Map Literal Disambiguation

Both array literals and map literals use the `@(...)` form. Disambiguation follows the same rule as Phase 1 `[...]`: if the first entry contains a `:` separator between two expressions, the literal is a map; otherwise it is an array.

---

## 7. Phase 1 to Phase 2 Transformation Rules [N]

This section defines the complete, mechanical transformation from Phase 1 source to Phase 2 source. The transformation is lossless and reversible.

### 7.1 Keyword Lowercasing

| Phase 1 | Phase 2 | Context |
|---------|---------|---------|
| `M=` | `m=` | Module declaration |
| `F=` | `f=` | Function declaration |
| `I=` | `i=` | Import declaration |
| `T=` | `t=` | Type declaration |

All other keywords (`if`, `el`, `lp`, `br`, `let`, `mut`, `as`, `rt`) are already lowercase and are unchanged.

### 7.2 Type Name Transformation

Every occurrence of a TYPE_IDENT token (uppercase-initial identifier) is transformed:
1. Prefix with `$`.
2. Convert all characters to lowercase.

| Phase 1 | Phase 2 |
|---------|---------|
| `User` | `$user` |
| `HttpReq` | `$httpreq` |
| `Str` | `$str` |
| `Byte` | `$byte` |
| `Ok` | `$ok` |
| `Err` | `$err` |
| `Task` | `$task` |

### 7.3 Array Literal Transformation

| Phase 1 form | Phase 2 form |
|-------------|-------------|
| `[e1;e2;e3]` | `@(e1;e2;e3)` |
| `[]` | `@()` |
| `[k1:v1;k2:v2]` (map) | `@(k1:v1;k2:v2)` |

### 7.4 Array Type Transformation

| Phase 1 form | Phase 2 form |
|-------------|-------------|
| `[i64]` | `@i64` |
| `[Str]` | `@$str` |
| `[User]` | `@$user` |
| `[[i64]]` | `@@i64` |

### 7.5 Array Index Transformation

| Phase 1 form | Phase 2 form | Notes |
|-------------|-------------|-------|
| `a[0]` | `a.0` | Constant integer index |
| `a[n]` | `a.get(n)` | Variable index |
| `a[n+1]` | `a.get(n+1)` | Expression index |

### 7.6 Map Type Transformation

| Phase 1 form | Phase 2 form |
|-------------|-------------|
| `[Str:i64]` | `@($str:i64)` |
| `[i64:User]` | `@(i64:$user)` |

### 7.7 HTTP Method Transformation

HTTP method names in route declarations (`GET`, `POST`, `PUT`, `DELETE`, `PATCH`) are lowercased:

| Phase 1 | Phase 2 |
|---------|---------|
| `server.GET("/path";handler)` | `server.get("/path";handler)` |
| `server.POST("/path";handler)` | `server.post("/path";handler)` |

### 7.8 Transformation Completeness

The transformation rules above are exhaustive. Every syntactic difference between Phase 1 and Phase 2 is covered by exactly one rule. Applying all rules to a valid Phase 1 program produces a valid Phase 2 program with identical semantics.

---

## 8. Lexical Rules — Phase 2 Amendments [N]

This section specifies how the lexical rules in toke-spec-v02.md Section 9 are modified for Phase 2.

### 8.1 Token Classes

| Class | Phase 2 status | Change from Phase 1 |
|-------|---------------|---------------------|
| KEYWORD | `m`, `f`, `i`, `t`, `if`, `el`, `lp`, `br`, `let`, `mut`, `as`, `rt` | `M`/`F`/`I`/`T` lowercased to `m`/`f`/`i`/`t` |
| IDENT | `[a-z][a-z0-9]*` | Unchanged |
| TYPE_IDENT | **Removed** | Replaced by SIGIL_TYPE |
| SIGIL_TYPE | `$[a-z][a-z0-9]*` | **New** — replaces TYPE_IDENT |
| INT_LIT | Unchanged | |
| FLOAT_LIT | Unchanged | |
| STR_LIT | Unchanged | |
| BOOL_LIT | Unchanged | |
| DOLLAR | `$` | **New** — type sigil (consumed as part of SIGIL_TYPE) |
| AT | `@` | **New** — array sigil |
| LBRACKET | **Removed** | `[` is not in Phase 2 character set |
| RBRACKET | **Removed** | `]` is not in Phase 2 character set |

All other token classes (LPAREN, RPAREN, LBRACE, RBRACE, EQ, COLON, DOT, SEMI, PLUS, MINUS, STAR, SLASH, LT, GT, BANG, PIPE, EOF) are unchanged.

### 8.2 Identifier Rules

An identifier in Phase 2:
- Begins with a lowercase letter (`a`-`z`).
- Continues with lowercase letters or digits (`a`-`z`, `0`-`9`).
- Is case-sensitive (trivially, since only lowercase exists).
- Must not be a reserved keyword.

Uppercase letters are not valid in identifiers. Any uppercase letter in a structural position is a lexer error (E1003).

### 8.3 Lexer Errors

Phase 2 adds one new lexer error condition:
- An uppercase letter in a structural position (E1003) — uppercase letters are not in the Phase 2 character set.
- A `[` or `]` in a structural position (E1003) — square brackets are not in the Phase 2 character set.

All other lexer error conditions from toke-spec-v02.md Section 9.7 apply unchanged.

---

## 9. Reserved Identifiers — Phase 2 [N]

The following identifiers are reserved in Phase 2:

**Keywords:** `m` `f` `i` `t` `if` `el` `lp` `br` `let` `mut` `as` `rt`

**Predefined values:** `true` `false`

**Built-in types (scalar):** `u8` `u16` `u32` `u64` `i8` `i16` `i32` `i64` `f32` `f64` `bool`

**Built-in types (sigiled):** `$str` `$byte`

**Built-in type constructors:** `$ok` `$err`

**Special identifiers:** `arena` `len` `get`

**Standard library prefix:** `std`

---

## 10. Semantic Equivalence [N]

Phase 2 is a purely syntactic transformation of Phase 1. The type system, evaluation order, memory model, error model, and all runtime semantics are identical between Phase 1 and Phase 2. The formal semantics specification (`spec/semantics.md`) applies to both profiles without modification, with the understanding that:

- References to `F=` in the semantics document apply to `f=` in Phase 2.
- References to `T=` apply to `t=`.
- References to `I=` apply to `i=`.
- References to `M=` apply to `m=`.
- References to TYPE_IDENT apply to SIGIL_TYPE.
- References to `[T]` array types apply to `@T`.

---

## 11. Conformance Requirements [N]

### 11.1 Phase 2 Conformance

A conforming Phase 2 implementation SHALL:

1. Accept all programs conforming to the Phase 2 grammar defined in Section 6.
2. Reject any program containing Phase 1-only syntax (uppercase keywords, TYPE_IDENT without `$`, square bracket arrays) with a clear diagnostic suggesting Phase 1 mode or providing the Phase 2 equivalent.
3. Produce identical object code for semantically equivalent Phase 1 and Phase 2 programs.
4. Support the `--phase1` flag to accept Phase 1 input.

### 11.2 Phase 1 Legacy Conformance

A conforming implementation SHALL continue to accept Phase 1 source when the `--phase1` flag is provided. Phase 1 conformance requirements from toke-spec-v02.md remain in effect for `--phase1` mode.

### 11.3 Corpus and Tooling

All conformance test programs SHALL be provided in Phase 2 syntax. Phase 1 variants MAY be provided for backward compatibility testing but are not required.

---

## 12. Examples [I]

### 12.1 Module with Function

```
Phase 1:  M=math;F=add(a:i64;b:i64):i64{<a+b}
Phase 2:  m=math;f=add(a:i64;b:i64):i64{<a+b}
```

### 12.2 Type Declaration

```
Phase 1:  T=User{id:u64;name:Str;email:Str}
Phase 2:  t=$user{id:u64;name:$str;email:$str}
```

### 12.3 Import

```
Phase 1:  I=http:std.http;
Phase 2:  i=http:std.http;
```

### 12.4 Array Operations

```
Phase 1:  let nums=[1;2;3];let first=nums[0];let nth=nums[i];
Phase 2:  let nums=@(1;2;3);let first=nums.0;let nth=nums.get(i);
```

### 12.5 Error Union with Type Sigil

```
Phase 1:  F=safediv(a:i64;b:i64):i64!MathErr{if(b=0){<MathErr{msg:"div by zero"}};<a/b}
Phase 2:  f=safediv(a:i64;b:i64):i64!$matherr{if(b=0){<$matherr{msg:"div by zero"}};<a/b}
```

### 12.6 Array Sum with Loop

```
Phase 1:  M=sum;F=sum(arr:[i64]):i64{let total=mut.0;lp(let i=0;i<arr.len;i=i+1){total=total+arr[i]};<total}
Phase 2:  m=sum;f=sum(arr:@i64):i64{let total=mut.0;lp(let i=0;i<arr.len;i=i+1){total=total+arr.get(i)};<total}
```

---

## 13. Relationship to Other Specification Documents

| Document | Relationship |
|----------|-------------|
| `spec/toke-spec-v02.md` | Parent specification. Phase 2 profile amends Sections 7-9, 11-12, Appendices D-E. All other sections apply unchanged. |
| `spec/grammar.ebnf` | Phase 1 grammar. The Phase 2 grammar in this document (Section 6) supersedes it for Phase 2 mode. |
| `spec/semantics.md` | Applies to both profiles without modification (Section 10). |
| `spec/errors.md` | Error codes apply to both profiles. No new error codes defined by Phase 2 beyond E1003 applicability to `$`/`@` context. |
| `spec/stdlib-signatures.md` | Already written in Phase 2 syntax (`f=`, `$str`, `@T`). Normative for Phase 2. |
| `docs/string-escaping.md` | Identical rules for both profiles. |
| `docs/integer-overflow.md` | Identical rules for both profiles. |
| `docs/memory-model.md` | Identical rules for both profiles. |

---

*toke Phase 2 normative profile specification — 2026-04-04. All normative sections are marked [N]. All informative sections are marked [I].*
