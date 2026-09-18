# Rikkyo English — Shared UI migration hold

The current `index.html`, `styles.css` and view markup in `app.js` are **prototype-only**. They proved the Rikkyo data/engine path, but they are not the long-term UI source of truth.

## Decision

Waseda English owns the Shared English UI/UX source of truth.

Rikkyo will ultimately be:

`Shared Engine + Shared UI + Rikkyo Adapter + Rikkyo Data`

rather than maintaining a hand-copied Waseda-like interface.

## Preserve

Keep all Rikkyo work that is school/data specific:

- six exam IDs FY24A/B, FY25A/B, FY26A/B
- FY26A recovered/canonical question data
- independent non-official answer audit
- authored practice bank
- holdout isolation
- Rikkyo storage namespace and backup semantics
- Rikkyo policy/config

## Replace after Shared UI release

Replace the prototype-only presentation duplication with a pinned Shared UI artifact:

- header/footer/navigation shell
- responsive design tokens/layout
- Today presentation
- route cards
- past-paper attempt shell
- answer panel interaction conventions
- weakness/review list
- remediation drill shell
- progress/stat cards
- backup/import presentation

Rikkyo-specific question renderers remain pluggable where the exam format differs from Waseda.

## Deployment gate

Do not merge/deploy the Rikkyo UI prototype as production. `release-gate.json` stays `deployAllowed:false` until the Waseda Shared UI release is pinned and Rikkyo browser/mobile parity is clean.
