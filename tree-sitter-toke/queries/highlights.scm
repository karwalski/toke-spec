; Syntax highlighting queries for Toke (Profile 1)
; For use with Tree-sitter compatible editors (Neovim, Helix, Zed, etc.)

; ── Keywords ──────────────────────────────────────────────────────────

["M" "F" "T" "I"] @keyword

["let" "mut"] @keyword

["if" "el"] @keyword.conditional

["lp" "br"] @keyword.repeat

["as"] @keyword.operator

["rt"] @keyword.return

"<" @keyword.return

"arena" @keyword

; ── Operators ─────────────────────────────────────────────────────────

["+" "-" "*" "/" "!" "|"] @operator

["=" "<" ">"] @operator

; ── Punctuation ───────────────────────────────────────────────────────

["(" ")"] @punctuation.bracket
["{" "}"] @punctuation.bracket
["[" "]"] @punctuation.bracket

[";"] @punctuation.delimiter
[":"] @punctuation.delimiter
["."] @punctuation.delimiter

; ── Literals ──────────────────────────────────────────────────────────

(integer_literal) @number
(float_literal) @number.float
(string_literal) @string
(boolean_literal) @boolean

; ── Types ─────────────────────────────────────────────────────────────

(scalar_type) @type.builtin

(type_identifier) @type

(pointer_type "*" @type.qualifier)

(array_type) @type

(map_type) @type

; ── Declarations ──────────────────────────────────────────────────────

(module_declaration
  (module_path
    (identifier) @module))

(function_declaration
  "F" @keyword
  "=" @operator
  (identifier) @function)

(type_declaration
  "T" @keyword
  "=" @operator
  (type_identifier) @type.definition)

(import_declaration
  "I" @keyword
  "=" @operator
  (identifier) @namespace)

(const_declaration
  (identifier) @constant)

; ── Parameters and fields ─────────────────────────────────────────────

(parameter
  (identifier) @variable.parameter)

(field
  (identifier) @property)

(field_init
  (identifier) @property)

; ── Expressions ───────────────────────────────────────────────────────

(call_expression
  (postfix_expression
    (identifier) @function.call))

(postfix_expression
  "." (identifier) @property)

(bind_statement
  "let" @keyword
  (identifier) @variable)

(mut_bind_statement
  "let" @keyword
  (identifier) @variable)

(assign_statement
  (identifier) @variable)

(identifier) @variable

; ── Match ─────────────────────────────────────────────────────────────

(match_arm
  (type_identifier) @type
  (identifier) @variable)
