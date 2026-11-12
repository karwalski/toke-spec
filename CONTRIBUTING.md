# Contributing to toke-spec

## Where specification changes go

This repository is an archive by charter. The normative specification —
`docs/spec/toke-spec-v0.4.md`, the grammars `docs/spec/grammar.ebnf` and
`docs/spec/toke.gbnf`, the error registry `docs/spec/errors.md` and the standard
library signatures `docs/spec/stdlib-signatures.md` — lives in the
[toke](https://github.com/karwalski/toke) repository, beside the compiler that
implements it. Propose normative changes there, not here.

The toke specification uses a structured amendment process:

**For clarifications** (wording, examples, non-normative sections):
- Open an issue using the Clarification template
- Small clarifications may go directly to a PR with a clear rationale

**For normative changes** (grammar rules, type rules, error codes,
stdlib signatures):
- Open a Spec Amendment issue first
- Describe the problem the change solves
- Propose the change and its impact on existing implementations
- Allow 30 days for community comment before a PR is raised

**For new error codes:**
- Error codes are assigned sequentially within their series range
- Never reassign or renumber an existing code
- Every new code requires a prose description, an example, and
  a fix field specification if a mechanical fix is possible

## What changes here

- **The archived documents** (`spec/`, `rfc/`, `examples/`, most of `docs/`) are a
  dated record. Correct a factual error in a banner; do not bring a superseded
  document up to date in place.
- **`docs/temspec.md`** is normative and current; a change to it follows the
  amendment process above.
- **`tree-sitter-toke/`** tracks the v0.4 grammar in the toke repository. A change
  must keep `npx tree-sitter generate --no-bindings` free of conflicts and
  `npx tree-sitter test` passing (see `tree-sitter-toke/README.md`).

## Developer Certificate of Origin

All contributions require a DCO sign-off:
`Signed-off-by: Your Name <your@email.com>`

Add `-s` to your git commit command.
