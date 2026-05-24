; Syntax highlighting queries for Toke (v0.3)
; For use with Tree-sitter compatible editors (Neovim, Helix, Zed, etc.)

; -- Keywords ------------------------------------------------------------------

["m" "f" "t" "i"] @keyword

["let" "mut"] @keyword

["if" "el"] @keyword.conditional

["lp" "br"] @keyword.repeat

["mt"] @keyword

["as"] @keyword.operator

["rt"] @keyword.return

"<" @keyword.return

; -- Operators -----------------------------------------------------------------

["+" "-" "*" "/" "%" "!"] @operator

["=" "<" ">"] @operator

; -- Punctuation ---------------------------------------------------------------

["(" ")"] @punctuation.bracket
["{" "}"] @punctuation.bracket

[";"] @punctuation.delimiter
[":"] @punctuation.delimiter
["."] @punctuation.delimiter

"@" @punctuation.special

; -- Literals ------------------------------------------------------------------

(integer_literal) @number
(float_literal) @number.float
(string_literal) @string
(boolean_literal) @boolean

; -- Types ---------------------------------------------------------------------

(sigil_type) @type.builtin

(array_type) @type

; -- Declarations --------------------------------------------------------------

(module_declaration
  (module_path
    (identifier) @module))

(function_declaration
  "f" @keyword
  "=" @operator
  (identifier) @function)

(type_declaration
  "t" @keyword
  "=" @operator
  (identifier) @type.definition)

(import_declaration
  "i" @keyword
  "=" @operator
  (identifier) @namespace)

(const_declaration
  (identifier) @constant)

; -- Parameters and fields -----------------------------------------------------

(parameter
  (identifier) @variable.parameter)

(field
  (identifier) @property)

(field_init
  (identifier) @property)

; -- Expressions ---------------------------------------------------------------

(call_expression
  (postfix_expression
    (identifier) @function.call))

(postfix_expression
  "." (identifier) @property)

(bind_statement
  "let" @keyword
  (identifier) @variable)

(mut_bind_statement
  "mut" @keyword
  (identifier) @variable)

(assign_statement
  (identifier) @variable)

(identifier) @variable

; -- Match ---------------------------------------------------------------------

(match_arm
  (identifier) @type
  (identifier) @variable)
