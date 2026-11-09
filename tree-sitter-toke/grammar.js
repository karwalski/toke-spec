/**
 * Tree-sitter grammar for the toke programming language (v0.4, default profile).
 *
 * Normative sources: toke/docs/spec/toke-spec-v0.4.md (the v0.4 amendment to
 * v0.3) and toke/docs/spec/grammar.ebnf (the grammar of record). Where the EBNF
 * is silent, this grammar follows the reference parser, toke/src/parser.c, and
 * says so at the rule.
 *
 * Keywords (14, v0.4 §A): m i t f let if el lp br rt as mt sc mut. All 14 are
 * implemented here. `m i t f` are keywords only at the head of a declaration,
 * as in the reference lexer, so `i` and `f` stay usable as ordinary names.
 *
 * v0.4 forms covered: `=` is binding/assignment only and `==`/`!=` are
 * equality (§B); `if` is an expression that requires `el`, and both forms chain
 * `el if` (§C); `&&`/`||` (§D); the 59-character default alphabet, so an
 * identifier is [a-z][a-z0-9]* with no `_` (§G, 132.71); nested `(* ... *)`
 * comments (§H, handled by src/scanner.c).
 *
 * Story 132.124 (v0.4 sync). Replaces the v0.3 grammar, which used `=` for
 * equality, `$i64` sigil scalars and had no `sc`.
 */

const PREC = {
  spawn: 0,
  or: 1,
  and: 2,
  bitor: 3,
  bitxor: 4,
  bitand: 5,
  compare: 6,
  shift: 7,
  add: 8,
  mul: 9,
  unary: 10,
  cast: 11,
  postfix: 12,
};

const sepBy1 = (sep, rule) => seq(rule, repeat(seq(sep, rule)));

module.exports = grammar({
  name: "toke",

  // _error_sentinel is never produced: it is valid only during error
  // recovery, which lets src/scanner.c tell recovery from a string body.
  externals: ($) => [$.comment, $.string_content, $._error_sentinel],

  extras: ($) => [/\s/, $.comment],

  word: ($) => $.identifier,

  rules: {
    // ================================================================
    // Top level. Declarations come in a fixed order (parser.c phases):
    // module, imports, types, constants, `let` globals, functions.
    // ================================================================

    source_file: ($) =>
      seq(
        $.module_declaration,
        repeat($.import_declaration),
        repeat($.type_declaration),
        repeat($.const_declaration),
        repeat($.global_declaration),
        repeat($.function_declaration)
      ),

    // m=name;
    module_declaration: ($) => seq("m", "=", $.module_path, ";"),

    module_path: ($) => sepBy1(".", $.identifier),

    // i=alias:path;  (an optional version string follows the path: parser.c)
    import_declaration: ($) =>
      seq(
        "i",
        "=",
        field("alias", $.identifier),
        ":",
        field("path", $.module_path),
        optional(field("version", $.string_literal)),
        ";"
      ),

    // t=$name{fields};  A field may be a `$variant` (sum types). The reference
    // parser also accepts the name without `$`; it rejects a ';' before '}'.
    type_declaration: ($) =>
      seq(
        "t",
        "=",
        field("name", choice($.type_name, $.identifier)),
        "{",
        sepBy1(";", choice($.field, $.variant)),
        "}",
        ";"
      ),

    field: ($) =>
      seq(field("name", $.identifier), ":", field("type", $._type)),

    variant: ($) =>
      seq("$", field("name", $.identifier), ":", field("type", $._type)),

    // NAME=literal:type;  (a module constant)
    const_declaration: ($) =>
      seq(
        field("name", $.identifier),
        "=",
        field("value", $._literal),
        ":",
        field("type", $._type),
        ";"
      ),

    // let name=expr;  or  let name=mut.expr;  at module level (story 114.44)
    global_declaration: ($) =>
      seq(choice($.bind_statement, $.mut_bind_statement), ";"),

    // f=name(params):ret{body};  A function without a body is an extern.
    // The trailing ';' is optional here because the last declaration of a
    // file may omit it (semicolon elision before EOF).
    function_declaration: ($) =>
      seq(
        "f",
        "=",
        field("name", $.identifier),
        $.parameter_list,
        ":",
        field("return_type", $.return_spec),
        optional(field("body", $.block)),
        optional(";")
      ),

    parameter_list: ($) => seq("(", optional(sepBy1(";", $.parameter)), ")"),

    parameter: ($) =>
      seq(field("name", $.identifier), ":", field("type", $._type)),

    // ReturnSpec = TypeExpr [ '!' TypeExpr ]
    return_spec: ($) =>
      seq(field("ok", $._type), optional(seq("!", field("error", $._type)))),

    // ================================================================
    // Blocks and statements
    //
    // Every simple statement ends with ';', except the last one before '}'
    // (semicolon elision). An `if` or `lp` statement ends at its '}' and may
    // be followed by an optional ';'. An arena statement ends at its '}' and
    // the reference parser rejects a ';' after it.
    // ================================================================

    block: ($) => seq("{", optional($._statements), "}"),

    _statements: ($) =>
      choice(
        seq(repeat1($._terminated_statement), optional($._simple_statement)),
        $._simple_statement
      ),

    _terminated_statement: ($) =>
      choice(
        seq($._simple_statement, ";"),
        seq($._compound_statement, optional(";")),
        $.arena_statement
      ),

    _simple_statement: ($) =>
      choice(
        $.bind_statement,
        $.mut_bind_statement,
        $.assign_statement,
        $.return_statement,
        $.break_statement,
        $.scope_statement,
        $.expression_statement
      ),

    _compound_statement: ($) => choice($.if_statement, $.loop_statement),

    // let x=e;  let x:type=e;
    bind_statement: ($) =>
      seq(
        "let",
        field("name", $.identifier),
        optional(seq(":", field("type", $._type))),
        "=",
        field("value", $._expression)
      ),

    // let x=mut.e;
    mut_bind_statement: ($) =>
      seq(
        "let",
        field("name", $.identifier),
        optional(seq(":", field("type", $._type))),
        "=",
        "mut",
        ".",
        field("value", $._expression)
      ),

    // x=e;  (only a plain name can be assigned)
    assign_statement: ($) =>
      seq(field("name", $.identifier), "=", field("value", $._expression)),

    // <e;  rt e;  (the value is optional: a bare `<` returns void)
    return_statement: ($) =>
      prec.right(seq(choice("<", "rt"), optional(field("value", $._expression)))),

    break_statement: ($) => "br",

    // sc{...}  structured-concurrency scope (keyword `sc`, parser.c)
    scope_statement: ($) => seq("sc", field("body", $.block)),

    // {arena ...}  (parser.c ArenaStmt)
    arena_statement: ($) => seq("{", "arena", optional($._statements), "}"),

    expression_statement: ($) => $._expression,

    // The statement form: `el` is optional. Preferred over an expression
    // statement holding an if-expression, as in the reference parser, which
    // dispatches a leading `if` to the statement form.
    if_statement: ($) =>
      prec(
        1,
        seq(
          "if",
          "(",
          field("condition", $._expression),
          ")",
          field("consequence", $.block),
          optional(
            seq(
              "el",
              field("alternative", choice($.if_statement, $.block))
            )
          )
        )
      ),

    // lp(init;cond;step){...}  or the while form  lp(cond){...}
    loop_statement: ($) =>
      seq(
        "lp",
        "(",
        choice(
          seq(
            field("init", $.loop_init),
            ";",
            field("condition", $._expression),
            ";",
            field("step", $.loop_step)
          ),
          field("condition", $._expression)
        ),
        ")",
        field("body", $.block)
      ),

    loop_init: ($) =>
      seq(
        optional("let"),
        field("name", $.identifier),
        "=",
        field("value", $._expression)
      ),

    loop_step: ($) =>
      seq(field("name", $.identifier), "=", field("value", $._expression)),

    // ================================================================
    // Expressions
    //   Expr = IfExpr | MatchExpr | LogOrExpr   (v0.4 §C)
    // Binary precedence, loosest first, after parser.c:
    //   ||  &&  |  ^  &  (== != < > <= >=)  (<< >>)  (+ -)  (* / %)
    // then unary - ! ~, then `as` and `!` propagation, then postfix.
    // ================================================================

    _expression: ($) =>
      choice(
        $.if_expression,
        $.match_expression,
        $.spawn_expression,
        $._operand
      ),

    _operand: ($) =>
      choice(
        $.binary_expression,
        $.unary_expression,
        $.cast_expression,
        $.propagate_expression,
        $._postfix
      ),

    // An expression-if REQUIRES `el` (v0.4 §C); the arms are blocks whose
    // tail expression is the value.
    if_expression: ($) =>
      seq(
        "if",
        "(",
        field("condition", $._expression),
        ")",
        field("consequence", $.block),
        "el",
        field("alternative", choice($.if_expression, $.block))
      ),

    // mt value { $variant:binding expr; ... }
    match_expression: ($) =>
      seq(
        "mt",
        field("value", $._operand),
        "{",
        sepBy1(";", $.match_arm),
        optional(";"),
        "}"
      ),

    // An arm's body may also be an early return `<expr` (story 114.47).
    match_arm: ($) =>
      seq(
        field("pattern", choice($.type_name, $.identifier)),
        ":",
        field("binding", $.identifier),
        field("body", choice($._expression, $.return_statement))
      ),

    // spawn expr  (inside an `sc` block; parser.c)
    spawn_expression: ($) =>
      prec.right(PREC.spawn, seq("spawn", field("value", $._expression))),

    binary_expression: ($) => {
      const table = [
        [PREC.or, "||"],
        [PREC.and, "&&"],
        [PREC.bitor, "|"],
        [PREC.bitxor, "^"],
        [PREC.bitand, "&"],
        [PREC.compare, choice("==", "!=", "<", ">", "<=", ">=")],
        [PREC.shift, choice("<<", ">>")],
        [PREC.add, choice("+", "-")],
        [PREC.mul, choice("*", "/", "%")],
      ];
      return choice(
        ...table.map(([p, op]) =>
          prec.left(
            p,
            seq(
              field("left", $._operand),
              field("operator", op),
              field("right", $._operand)
            )
          )
        )
      );
    },

    unary_expression: ($) =>
      prec(
        PREC.unary,
        seq(field("operator", choice("-", "!", "~")), field("operand", $._operand))
      ),

    // x as i64
    cast_expression: ($) =>
      prec.left(
        PREC.cast,
        seq(field("value", $._operand), "as", field("type", $._type))
      ),

    // call()!$err  (error propagation)
    propagate_expression: ($) =>
      prec.left(
        PREC.cast,
        seq(field("value", $._operand), "!", field("error", $._type))
      ),

    _postfix: ($) =>
      choice(
        $.call_expression,
        $.field_expression,
        $.index_expression,
        $._primary
      ),

    call_expression: ($) =>
      prec(
        PREC.postfix,
        seq(field("function", $._postfix), field("arguments", $.argument_list))
      ),

    argument_list: ($) => seq("(", optional(sepBy1(";", $._expression)), ")"),

    // a.b
    field_expression: ($) =>
      prec(
        PREC.postfix,
        seq(field("value", $._postfix), ".", field("field", $.identifier))
      ),

    // a.0  (constant index, sugar for a.get(0); story 127.13)
    index_expression: ($) =>
      prec(
        PREC.postfix,
        seq(field("value", $._postfix), ".", field("index", $.integer_literal))
      ),

    _primary: ($) =>
      choice(
        $.identifier,
        $._literal,
        $.parenthesized_expression,
        $.struct_literal,
        $.type_name,
        $.array_literal,
        $.map_literal,
        $.function_reference,
        $.closure
      ),

    parenthesized_expression: ($) => seq("(", $._expression, ")"),

    // $name{field:value; ...}  A `$variant:` field builds a sum value.
    struct_literal: ($) =>
      prec(
        1,
        seq(
          field("type", $.type_name),
          "{",
          sepBy1(";", $.field_init),
          optional(";"),
          "}"
        )
      ),

    field_init: ($) =>
      seq(
        optional("$"),
        field("name", $.identifier),
        ":",
        field("value", $._expression)
      ),

    // @()  @(1;2;3)  and the typed-empty @($str)
    array_literal: ($) =>
      seq(
        "@",
        "(",
        optional(seq(sepBy1(";", $._expression), optional(";"))),
        ")"
      ),

    // @(k:v; ...)  and the typed-empty @($str:$i64)
    map_literal: ($) =>
      seq("@", "(", sepBy1(";", $.map_entry), optional(";"), ")"),

    map_entry: ($) =>
      seq(field("key", $._expression), ":", field("value", $._expression)),

    // &name  &alias.name
    function_reference: ($) =>
      prec.right(
        seq(
          "&",
          field("name", $.identifier),
          optional(seq(".", field("member", $.identifier)))
        )
      ),

    // fn(params):ret{body}  (story 76.1.9a)
    closure: ($) =>
      seq(
        "fn",
        $.parameter_list,
        optional(seq(":", field("return_type", $.return_spec))),
        field("body", $.block)
      ),

    // ================================================================
    // Types
    // ================================================================

    _type: ($) =>
      choice(
        $.primitive_type,
        $.type_name,
        $.qualified_type,
        $.array_type,
        $.map_type,
        $.function_type,
        $.pointer_type
      ),

    primitive_type: ($) =>
      choice(
        "i8", "i16", "i32", "i64",
        "u8", "u16", "u32", "u64",
        "f32", "f64",
        "bool", "str", "byte", "void"
      ),

    // $name — a named type, or a type used as a value ($err(...))
    type_name: ($) => seq("$", field("name", $.identifier)),

    // alias.$name — a type from an imported module (db.$conn)
    qualified_type: ($) =>
      seq(field("module", $.identifier), ".", field("type", $.type_name)),

    // @T  or  @(T). After `@`, a '(' always opens @(T) or @(K:V), never a
    // function type (parser.c parse_type_expr).
    array_type: ($) =>
      choice(
        prec.right(seq("@", field("element", $._type))),
        prec(1, seq("@", "(", field("element", $._type), ")"))
      ),

    // @(K:V)
    map_type: ($) =>
      seq("@", "(", field("key", $._type), ":", field("value", $._type), ")"),

    // (T;T):R
    function_type: ($) =>
      seq("(", sepBy1(";", $._type), ")", ":", field("return", $._type)),

    // *T
    pointer_type: ($) => prec.right(seq("*", $._type)),

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

    integer_literal: ($) => /0x[0-9a-fA-F]+|0b[01]+|[0-9]+/,

    float_literal: ($) => /[0-9]+\.[0-9]+/,

    // "text \n \x1b \(expr)"  Content is scanned by src/scanner.c so that a
    // `(*` inside a string is text, not a comment (v0.4 §H).
    string_literal: ($) =>
      seq(
        '"',
        repeat(choice($.string_content, $.escape_sequence, $.interpolation)),
        token.immediate('"')
      ),

    escape_sequence: ($) =>
      token.immediate(/\\(x[0-9a-fA-F]{2}|[^(x])/),

    // \(expr)  (string interpolation; story 127.24)
    interpolation: ($) =>
      seq(token.immediate("\\("), field("value", $._expression), ")"),

    boolean_literal: ($) => choice("true", "false"),

    // ================================================================
    // Identifiers
    // ================================================================

    // lowercase only: no uppercase letters in the 59-char default alphabet (toke-spec-v0.4 §G)
    // 132.71: no `_` -- an identifier is [a-z][a-z0-9]* (toke-spec-v0.4 §G:
    // `_` is normatively excluded, no-underscore rule 113.2a; v0.3 §8.1 had
    // the same pattern). The grammar used to accept `max_size`.
    identifier: ($) => /[a-z][a-z0-9]*/,
  },
});
