# Changelog

## 1.0.1 - 2026-10-04

Material repair release following visual comparison with all six supplied FY24-FY26 A/B English PDFs.

- Fix the missing second `he` in practice `rwo01`.
- Restore seven runtime word-order frames, 48 Japanese guides and 16 sets of correction labels. Restore omitted context and Japanese-response instructions.
- Correct FY25A reading answer coverage (`has caught`, `die`), accept reviewed grammar/word-order alternatives, and retain the original source text and choice sets.
- Clarify authored completion constraints and the `rwo02` explanation. Support short answers in sentences; unmatched wording receives explicit self-review with its grading method recorded.
- Restore FY26A writing examples and original instructions. Preserve FY26B fixed frames without opening the final holdout.
- Refresh obsolete unfinished practice on load/import while retaining drafts and completed history.
- Add chunk-level validation and browser grading checks for all 42 practice items and 122 runtime tasks at mobile/desktop widths, with positive and negative cases.

Candidate `79c744b8d9477e1eb17d4410ae71ea2cd6293f3c` completed two consecutive full verification attempts and reviews with zero additional findings: [verification evidence](https://github.com/FYam8/rikkyo-uk-english/actions/runs/37208182759). Release metadata pins the audited content hashes. Main must pass verification before its exact commit is deployed by Pages.

School answer keys, official scores and missing listening recordings remain unavailable. Answers are non-official app solutions. Writing is not automatically graded; FY26A supports local drafting/self-review. FY26B remains excluded from training.

See [the full audit](docs/material-audit-20261004.md) and [source hashes/item inventory](docs/material-audit-inventory.json).
