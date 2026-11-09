; Syntax highlighting queries for toke (v0.4)
; For use with Tree-sitter compatible editors (Neovim, Helix, Zed, etc.)

; -- Comments ------------------------------------------------------------------

(comment) @comment

; -- Keywords (14, toke-spec-v0.4 §A) -----------------------------------------

["m" "f" "t" "i"] @keyword

["let" "mut"] @keyword

["if" "el"] @keyword.conditional

["lp"] @keyword.repeat

(break_statement) @keyword.repeat

["mt"] @keyword

["sc" "spawn" "arena"] @keyword

["fn"] @keyword.function

["as"] @keyword.operator

["rt"] @keyword.return

(return_statement "<" @keyword.return)

; -- Operators -----------------------------------------------------------------

(binary_expression operator: _ @operator)
(unary_expression operator: _ @operator)
(propagate_expression "!" @operator)
(return_spec "!" @operator)

"=" @operator
"&" @operator

; -- Punctuation ---------------------------------------------------------------

["(" ")"] @punctuation.bracket
["{" "}"] @punctuation.bracket

[";"] @punctuation.delimiter
[":"] @punctuation.delimiter
["."] @punctuation.delimiter

"@" @punctuation.special
"$" @punctuation.special

; -- Literals ------------------------------------------------------------------

(integer_literal) @number
(float_literal) @number.float
(string_literal) @string
(escape_sequence) @string.escape
(interpolation
  "\\(" @punctuation.special
  ")" @punctuation.special)
(boolean_literal) @boolean

; -- Types ---------------------------------------------------------------------

(primitive_type) @type.builtin
(type_name) @type
(qualified_type module: (identifier) @module)

; -- Declarations --------------------------------------------------------------

(module_declaration
  (module_path
    (identifier) @module))

(import_declaration
  alias: (identifier) @module)

(import_declaration
  path: (module_path (identifier) @module))

(function_declaration
  name: (identifier) @function)

(type_declaration
  name: (identifier) @type.definition)

(const_declaration
  name: (identifier) @constant)

; -- Parameters and fields -----------------------------------------------------

(parameter
  name: (identifier) @variable.parameter)

(field
  name: (identifier) @property)

(variant
  name: (identifier) @constructor)

(field_init
  name: (identifier) @property)

; -- Expressions ---------------------------------------------------------------

(call_expression
  function: (identifier) @function.call)

(call_expression
  function: (field_expression
    field: (identifier) @function.method.call))

(field_expression
  field: (identifier) @property)

(function_reference
  name: (identifier) @function)

(bind_statement
  name: (identifier) @variable)

(mut_bind_statement
  name: (identifier) @variable)

; -- Match ---------------------------------------------------------------------

(match_arm
  binding: (identifier) @variable)

(identifier) @variable
