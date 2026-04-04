/**
 * Tree-sitter grammar for the Toke programming language (Profile 1).
 *
 * Based on the formal EBNF grammar in toke-spec/spec/grammar.ebnf.
 * Matches the reference compiler (tkc) as of 2026-03-29.
 *
 * Note: Toke Profile 1 has no comment syntax. All source text is
 * significant. This is a deliberate language design choice.
 */

module.exports = grammar({
  name: "toke",

  extras: ($) => [/\s/],

  word: ($) => $.identifier,

  conflicts: ($) => [
    // struct literal vs. block after type identifier
    [$.primary_expression, $.struct_literal],
    // map literal vs. array literal (both start with '[')
    [$.map_literal, $.array_literal],
  ],

  rules: {
    // ================================================================
    // Top-level structure
    // ================================================================

    source_file: ($) =>
      seq(
        $.module_declaration,
        repeat($.import_declaration),
        repeat($.type_declaration),
        repeat($.const_declaration),
        repeat($.function_declaration)
      ),

    // ================================================================
    // Module
    // ================================================================

    module_declaration: ($) =>
      seq("M", "=", $.module_path, $._terminator),

    module_path: ($) =>
      seq($.identifier, repeat(seq(".", $.identifier))),

    // ================================================================
    // Imports
    // ================================================================

    import_declaration: ($) =>
      seq(
        "I",
        "=",
        $.identifier,
        ":",
        $.module_path,
        optional($.string_literal),
        $._terminator
      ),

    // ================================================================
    // Type declarations
    // ================================================================

    type_declaration: ($) =>
      seq("T", "=", $.type_identifier, "{", $.field_list, "}", $._terminator),

    field_list: ($) => seq($.field, repeat(seq(";", $.field))),

    field: ($) => seq($.identifier, ":", $.type_expression),

    // ================================================================
    // Constant declarations
    // ================================================================

    const_declaration: ($) =>
      seq($.identifier, "=", $._literal, ":", $.type_expression, $._terminator),

    // ================================================================
    // Function declarations
    // ================================================================

    function_declaration: ($) =>
      seq(
        "F",
        "=",
        $.identifier,
        "(",
        optional($.parameter_list),
        ")",
        ":",
        $.return_spec,
        optional(seq("{", $.statement_list, "}")),
        $._terminator
      ),

    parameter_list: ($) => seq($.parameter, repeat(seq(";", $.parameter))),

    parameter: ($) => seq($.identifier, ":", $.type_expression),

    return_spec: ($) =>
      seq($.type_expression, optional(seq("!", $.type_expression))),

    // ================================================================
    // Statements
    // ================================================================

    statement_list: ($) => repeat1($._statement),

    _statement: ($) =>
      choice(
        $.bind_statement,
        $.mut_bind_statement,
        $.assign_statement,
        $.return_statement,
        $.if_statement,
        $.loop_statement,
        $.break_statement,
        $.arena_statement,
        $.expression_statement
      ),

    bind_statement: ($) =>
      seq("let", $.identifier, "=", $._expression, $._terminator),

    mut_bind_statement: ($) =>
      seq("let", $.identifier, "=", "mut", ".", $._expression, $._terminator),

    assign_statement: ($) =>
      seq($.identifier, "=", $._expression, $._terminator),

    return_statement: ($) =>
      choice(
        seq("<", $._expression, $._terminator),
        seq("rt", $._expression, $._terminator)
      ),

    break_statement: ($) => seq("br", $._terminator),

    if_statement: ($) =>
      seq(
        "if",
        "(",
        $._expression,
        ")",
        "{",
        $.statement_list,
        "}",
        optional($.else_clause)
      ),

    else_clause: ($) => seq("el", "{", $.statement_list, "}"),

    loop_statement: ($) =>
      seq(
        "lp",
        "(",
        $.loop_init,
        ";",
        $._expression,
        ";",
        $.loop_step,
        ")",
        "{",
        $.statement_list,
        "}"
      ),

    loop_init: ($) =>
      seq(optional("let"), $.identifier, "=", $._expression),

    loop_step: ($) => seq($.identifier, "=", $._expression),

    arena_statement: ($) =>
      seq("{", "arena", $.statement_list, "}"),

    expression_statement: ($) => seq($._expression, $._terminator),

    // ================================================================
    // Expressions -- precedence from lowest to highest
    // ================================================================

    _expression: ($) => $.match_expression,

    match_expression: ($) =>
      choice(
        seq($.compare_expression, "|", "{", $.match_arm_list, "}"),
        $.compare_expression
      ),

    compare_expression: ($) =>
      choice(
        prec.left(
          1,
          seq(
            $.additive_expression,
            field("operator", choice("<", ">", "=")),
            $.additive_expression
          )
        ),
        $.additive_expression
      ),

    additive_expression: ($) =>
      choice(
        prec.left(
          2,
          seq(
            $.additive_expression,
            field("operator", choice("+", "-")),
            $.multiplicative_expression
          )
        ),
        $.multiplicative_expression
      ),

    multiplicative_expression: ($) =>
      choice(
        prec.left(
          3,
          seq(
            $.multiplicative_expression,
            field("operator", choice("*", "/")),
            $.unary_expression
          )
        ),
        $.unary_expression
      ),

    unary_expression: ($) =>
      choice(
        prec(4, seq(field("operator", "-"), $.unary_expression)),
        prec(4, seq(field("operator", "!"), $.unary_expression)),
        $.cast_expression
      ),

    cast_expression: ($) =>
      choice(
        prec(5, seq($.propagate_expression, "as", $.type_expression)),
        $.propagate_expression
      ),

    propagate_expression: ($) =>
      choice(
        prec(6, seq($.call_expression, "!", $.type_expression)),
        $.call_expression
      ),

    call_expression: ($) =>
      choice(
        prec(7, seq($.call_expression, "(", optional($.argument_list), ")")),
        $.postfix_expression
      ),

    postfix_expression: ($) =>
      choice(
        prec.left(
          8,
          seq($.postfix_expression, ".", $.identifier)
        ),
        prec.left(
          8,
          seq($.postfix_expression, "[", $._expression, "]")
        ),
        $.primary_expression
      ),

    primary_expression: ($) =>
      choice(
        $.identifier,
        $._literal,
        seq("(", $._expression, ")"),
        $.struct_literal,
        $.array_literal,
        $.map_literal
      ),

    // ================================================================
    // Match arms
    // ================================================================

    match_arm_list: ($) => seq($.match_arm, repeat(seq(";", $.match_arm))),

    match_arm: ($) =>
      seq($.type_identifier, ":", $.identifier, $._expression),

    // ================================================================
    // Struct, array, and map literals
    // ================================================================

    struct_literal: ($) =>
      seq(
        $.type_identifier,
        "{",
        $.field_init,
        repeat(seq(";", $.field_init)),
        "}"
      ),

    field_init: ($) => seq($.identifier, ":", $._expression),

    array_literal: ($) =>
      seq("[", optional(seq($._expression, repeat(seq(";", $._expression)))), "]"),

    map_literal: ($) =>
      seq("[", $.map_entry, repeat(seq(";", $.map_entry)), "]"),

    map_entry: ($) => seq($._expression, ":", $._expression),

    // ================================================================
    // Argument list
    // ================================================================

    argument_list: ($) =>
      seq($._expression, repeat(seq(";", $._expression))),

    // ================================================================
    // Type expressions
    // ================================================================

    type_expression: ($) =>
      choice(
        $.pointer_type,
        $.map_type,
        $.array_type,
        $.function_type,
        $.scalar_type,
        $.type_identifier
      ),

    pointer_type: ($) => seq("*", $.type_expression),

    map_type: ($) => seq("[", $.type_expression, ":", $.type_expression, "]"),

    array_type: ($) => seq("[", $.type_expression, "]"),

    function_type: ($) =>
      seq(
        "(",
        $.type_expression,
        repeat(seq(";", $.type_expression)),
        ")",
        ":",
        $.type_expression
      ),

    scalar_type: ($) =>
      choice(
        "u8",
        "u16",
        "u32",
        "u64",
        "i8",
        "i16",
        "i32",
        "i64",
        "f32",
        "f64",
        "bool",
        "Str",
        "Byte",
        "void"
      ),

    // ================================================================
    // Literals
    // ================================================================

    _literal: ($) =>
      choice(
        $.integer_literal,
        $.float_literal,
        $.string_literal,
        $.boolean_literal
      ),

    integer_literal: ($) => /[0-9]+/,

    float_literal: ($) => /[0-9]+\.[0-9]+/,

    string_literal: ($) => /"[^"]*"/,

    boolean_literal: ($) => choice("true", "false"),

    // ================================================================
    // Identifiers
    // ================================================================

    identifier: ($) => /[a-z_][a-zA-Z0-9_]*/,

    type_identifier: ($) => /[A-Z][a-zA-Z0-9_]*/,

    // ================================================================
    // Statement terminator
    // ================================================================
    // Semicolon elision: trailing semicolons before '}' or EOF are optional.
    // Tree-sitter handles this by making the terminator optional.

    _terminator: ($) => ";",
  },
});
