/**
 * Tree-sitter grammar for the Toke programming language (v0.3).
 *
 * v0.3 syntax uses lowercase keywords, $ type sigils, @() array literals,
 * and semicolons as separators. No square brackets in the language.
 *
 * This grammar targets v0.3. The language has 14 keywords —
 * m, f, t, i, if, el, lp, br, let, mut, as, rt, mt, sc — and a closed 59-character
 * alphabet: lowercase a-z (26), digits (10) and the symbols
 * ! " $ % & ( ) * + - . / : ; < = > @ ^ { | } ~ (23), derived from src/lexer.c
 * (toke/docs/metrics-baseline.md). The rules below cover only 13 of the keywords:
 * `sc` (scope) is not implemented, and the comma, underscore and `#` this header used
 * to list as members of the alphabet are rejected outside string literals (E1003).
 * Both are part of the pending v0.4 pass. Corrected 2026-09-19, story 132.15.
 */

module.exports = grammar({
  name: "toke",

  extras: ($) => [/\s/],

  word: ($) => $.identifier,

  conflicts: ($) => [
    // struct literal vs. block after type identifier
    [$.primary_expression, $.struct_literal],
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
    // Module: m=name;
    // ================================================================

    module_declaration: ($) =>
      seq("m", "=", $.module_path, $._terminator),

    module_path: ($) =>
      seq($.identifier, repeat(seq(".", $.identifier))),

    // ================================================================
    // Imports: i=alias:path;
    // ================================================================

    import_declaration: ($) =>
      seq(
        "i",
        "=",
        $.identifier,
        ":",
        $.module_path,
        $._terminator
      ),

    // ================================================================
    // Type declarations: t=name{fields}
    // ================================================================

    type_declaration: ($) =>
      seq("t", "=", $.identifier, "{", $.field_list, "}", $._terminator),

    field_list: ($) => seq($.field, repeat(seq(";", $.field))),

    field: ($) => seq($.identifier, ":", $.type_expression),

    // ================================================================
    // Constant declarations
    // ================================================================

    const_declaration: ($) =>
      seq($.identifier, "=", $._literal, ":", $.type_expression, $._terminator),

    // ================================================================
    // Function declarations: f=name(params):$rettype{body}
    // ================================================================

    function_declaration: ($) =>
      seq(
        "f",
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
        $.expression_statement
      ),

    bind_statement: ($) =>
      seq("let", $.identifier, "=", $._expression, $._terminator),

    mut_bind_statement: ($) =>
      seq("mut", $.identifier, "=", $._expression, $._terminator),

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
      choice(
        // C-style loop: lp(init;cond;step){body}
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
        // Infinite loop: lp{body}
        seq("lp", "{", $.statement_list, "}")
      ),

    loop_init: ($) =>
      seq(optional("let"), $.identifier, "=", $._expression),

    loop_step: ($) => seq($.identifier, "=", $._expression),

    // mt expr{cases}
    match_expression: ($) =>
      seq("mt", $.compare_expression, "{", $.match_arm_list, "}"),

    expression_statement: ($) => seq($._expression, $._terminator),

    // ================================================================
    // Expressions -- precedence from lowest to highest
    // ================================================================

    _expression: ($) => choice($.match_expression, $.compare_expression),

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
            field("operator", choice("*", "/", "%")),
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
        $.primary_expression
      ),

    primary_expression: ($) =>
      choice(
        $.identifier,
        $._literal,
        seq("(", $._expression, ")"),
        $.struct_literal,
        $.array_literal
      ),

    // ================================================================
    // Match arms
    // ================================================================

    match_arm_list: ($) => seq($.match_arm, repeat(seq(";", $.match_arm))),

    match_arm: ($) =>
      seq($.identifier, ":", $.identifier, $._expression),

    // ================================================================
    // Struct and array literals
    // ================================================================

    struct_literal: ($) =>
      seq(
        $.identifier,
        "{",
        $.field_init,
        repeat(seq(";", $.field_init)),
        "}"
      ),

    field_init: ($) => seq($.identifier, ":", $._expression),

    // Array literal: @(1;2;3)
    array_literal: ($) =>
      seq("@", "(", optional(seq($._expression, repeat(seq(";", $._expression)))), ")"),

    // ================================================================
    // Argument list
    // ================================================================

    argument_list: ($) =>
      seq($._expression, repeat(seq(";", $._expression))),

    // ================================================================
    // Type expressions -- $ sigil prefix for built-in types
    // ================================================================

    type_expression: ($) =>
      choice(
        $.array_type,
        $.function_type,
        $.sigil_type,
        $.identifier
      ),

    // Array type: @($i64)
    array_type: ($) => seq("@", "(", $.type_expression, ")"),

    function_type: ($) =>
      seq(
        "(",
        $.type_expression,
        repeat(seq(";", $.type_expression)),
        ")",
        ":",
        $.type_expression
      ),

    // Built-in types with $ sigil
    sigil_type: ($) =>
      choice(
        "$i8",
        "$i16",
        "$i32",
        "$i64",
        "$u8",
        "$u16",
        "$u32",
        "$u64",
        "$f32",
        "$f64",
        "$bool",
        "$str",
        "$byte",
        "$void"
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

    // v0.3: all lowercase, no uppercase letters in the 55-char alphabet
    identifier: ($) => /[a-z_][a-z0-9_]*/,

    // ================================================================
    // Statement terminator
    // ================================================================

    _terminator: ($) => ";",
  },
});
