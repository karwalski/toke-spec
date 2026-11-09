/*
 * External scanner for tree-sitter-toke (story 132.124).
 *
 * Two tokens a regular grammar cannot express:
 *
 *   comment         (* ... *), which NESTS (toke-spec-v0.4 §H): every `(*`
 *                   inside a comment needs its own `*)`. A comment still open
 *                   at end of file is not a token (the compiler reports E1007).
 *   string_content  a run of string text up to the next `"` or `\`. It is
 *                   scanned here so that a `(*` inside a string literal is
 *                   text, not the start of a comment.
 */
#include "tree_sitter/parser.h"

enum TokenType { COMMENT, STRING_CONTENT, ERROR_SENTINEL };

void *tree_sitter_toke_external_scanner_create(void) { return NULL; }
void tree_sitter_toke_external_scanner_destroy(void *payload) { (void)payload; }
unsigned tree_sitter_toke_external_scanner_serialize(void *payload, char *buffer) {
    (void)payload; (void)buffer; return 0;
}
void tree_sitter_toke_external_scanner_deserialize(void *payload, const char *buffer,
                                                  unsigned length) {
    (void)payload; (void)buffer; (void)length;
}

static bool scan_string_content(TSLexer *lexer) {
    bool any = false;
    while (!lexer->eof(lexer) && lexer->lookahead != '"' && lexer->lookahead != '\\') {
        lexer->advance(lexer, false);
        any = true;
    }
    lexer->mark_end(lexer);
    if (any) lexer->result_symbol = STRING_CONTENT;
    return any;
}

static bool scan_comment(TSLexer *lexer) {
    while (lexer->lookahead == ' ' || lexer->lookahead == '\t' ||
           lexer->lookahead == '\n' || lexer->lookahead == '\r' ||
           lexer->lookahead == '\f' || lexer->lookahead == '\v')
        lexer->advance(lexer, true);
    if (lexer->lookahead != '(') return false;
    lexer->advance(lexer, false);
    if (lexer->lookahead != '*') return false;
    lexer->advance(lexer, false);
    unsigned depth = 1;
    while (!lexer->eof(lexer)) {
        int32_t c = lexer->lookahead;
        lexer->advance(lexer, false);
        if (c == '(' && lexer->lookahead == '*') {
            lexer->advance(lexer, false);
            depth++;
        } else if (c == '*' && lexer->lookahead == ')') {
            lexer->advance(lexer, false);
            if (--depth == 0) {
                lexer->mark_end(lexer);
                lexer->result_symbol = COMMENT;
                return true;
            }
        }
    }
    return false; /* unterminated: E1007 in the compiler */
}

bool tree_sitter_toke_external_scanner_scan(void *payload, TSLexer *lexer,
                                            const bool *valid_symbols) {
    (void)payload;
    /* Inside a string body the text is string content, never a comment.
     * Every symbol is valid during error recovery: scan for a comment then. */
    if (valid_symbols[STRING_CONTENT] && !valid_symbols[ERROR_SENTINEL])
        return scan_string_content(lexer);
    if (valid_symbols[COMMENT]) return scan_comment(lexer);
    return false;
}
