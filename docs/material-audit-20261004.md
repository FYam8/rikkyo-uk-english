# Material audit, 2026-10-04

Authority: the six supplied English PDFs, FY24/FY25/FY26 A/B, visually read page by page. The PDF hashes and item inventory are in `material-audit-inventory.json`. Baseline: `e9741d5731c7f603075fd648c14370fa015d6e32`. School answer keys and listening recordings were not supplied. All answer decisions remain independent, non-official app solutions.

## Scope and findings

All 42 authored practice items were reviewed for grammaticality, meaning, answerability, answer keys, explanation, tokens and grading. All 122 runtime tasks were checked against the supplied pages, including the 16 correction items, the reading passages and choice sets. FY26B's preserved source groups Q1-Q8 were also compared; its runtime/training exclusion stays in place. The FY25 picture-writing and FY26 writing instructions, and the explicitly omitted pages, were checked without inventing missing content.

| Finding | Minimal repair / authority |
| --- | --- |
| `rwo01` has only one `he`, but its answer uses two | Add the second `he`; preserve the sentence, target and family. Exact chunk-count validation now detects this defect. |
| FY26A Q3(1)-(5) omit fixed sentence parts | Restore the prefixes and Q3(3)'s suffix from PDF p4. The missing word is still entered by the learner. |
| FY24A Q6(2), FY24B Q6(1) omit fixed parts from grading | Restore `four elves` / `the workshop`, and `How`, from their PDF p5. No extra selectable tokens. |
| FY24/FY25 Q2-Q4 lost Japanese constraints; Q4 requests absent labels | Restore all 48 Japanese guides and all 16 sets of labelled spans from PDF pp3-4; render those spans as labelled brackets. Original sentences and corrections are preserved. |
| FY24B Q2(4) lost its first context sentence | Restore `Mike goes to STARBUCKS every day.` from PDF p3. |
| FY25B Q2(4) silently changed the source's `promise` to `promises` | Restore the original spelling and retain a source note; do not silently edit the exam's English. |
| FY25A Q6(2) rejects present-perfect `has caught` | Prefer `has caught` in the current-illness dialogue, retaining permissible simple-past `caught`. PDF p5. |
| FY25A Q6(3) asks about `pass away soon` and rejects `die` | Restore the underlined target `pass away`; prefer the directly extractable `die`; retain `took its last breath` as a same-meaning phrase. PDF pp5-6. |
| FY25A Q6(4) loses Japanese-answer instruction | Restore the instruction and Japanese self-review guidance; keep manual grading. PDF p6. |
| Grammatically valid alternatives are rejected | Accept `that` in `rec03`; paired `less / easy` in FY25A Q5(1), without admitting mixed `more / easy`; valid time-adverb positions in applicable word-order items; `which` with unused `that` in FY24B Q3(1). |
| FY26A Q5(1)'s original alternatives include both `walk` and `walking` | Preserve the choices and prefer `walking` for the scene; accept bare infinitive `walk` under `see + object + infinitive`. State the non-official ambiguity in feedback. PDF p5. |
| Authored completion items allow unrelated lexical answers but grade only one | Add brief meaning/base-verb or word-count instructions to the existing authored sentences. Keep their original answer and grammar target. |
| `rwo02` explanation says not to separate words, although a complement belongs between them | Describe the relative clause and final preposition accurately. |
| Short-answer practice rejects full sentences and paraphrases | Register common equivalent sentences for all six items. Unmatched short answers receive explicit self-review against the example and evidence, not an automatic semantic verdict. Log `gradingMode` and `contentVersion`; self-review may advance the existing practice streak. |
| Saved unfinished practice can retain obsolete question data | Refresh older versions on load and import, preserving the response and historical completed work. |
| FY26B Q3 preserved records omit fixed parts | Record the five original prefixes and the Q3(3) suffix. Holdout remains locked. |
| FY26A Q8 truncates original prompt examples and writing instructions | Restore the ability examples, word-count instruction, full-sentence/paragraph and spelling/grammar instructions from PDF p10. The writing exercise remains unscored. |

Unchanged keys were independently checked against context: FY24A Q6 choice/insertion/sequence/incorrect-set, FY24B Q6 ellipsis/tag/extraction/connectors/dialogue/matching, FY25A Q6 narrative and matching, FY25B Q6 relative clause/order/passive/insertion/matching, FY26A Q4 and Q5-Q7, and FY26B Q2-Q7. No invented official key, scores, listening answers or new practice problem was introduced.

## Validation and CLEAN definition

`material-integrity.test.mjs` checks complete selectable chunks including duplicates, fixed prefixes/suffixes, missing words and surplus words; includes negative fixtures; validates all practice keys, labelled source corrections and Japanese guides. `material-browser-checks.mjs` submits all 122 runtime solutions and all 42 practice answers at 390px and 1280px, exercises accepted alternatives, wrong answers, self-review accept/reject, and stale-draft recovery. The existing full suite also covers storage isolation, holdout boundaries, scheduling, backup/import, timer, UI interaction, writing and pinned shared dependencies.

A CLEAN pass means zero additional actionable findings in this audited scope plus a passing full verification run. Two consecutive passes must refer to unchanged candidate code/data. Failing intermediate development runs do not count. Windows checkout CRLF conversion was normalized to the repository's LF before vendor hash verification; shared vendor files were not modified.

Release evidence is maintained in `release.json` and `release-gate.json`. The Pages workflow deploys the exact main commit whose verification succeeded. Original source omissions, absent official answers/audio, FY25 picture assets not yet integrated, and protected FY26B are explicit boundaries, not claims that those sections are auto-graded.

## Final review record

- Candidate: `79c744b8d9477e1eb17d4410ae71ea2cd6293f3c`.
- CLEAN 1: full [verify attempt 1](https://github.com/FYam8/rikkyo-uk-english/actions/runs/37208182759/attempts/1) succeeded; all source/data/grading findings rechecked, additional findings 0.
- CLEAN 2: after attempt 1 completed, reran the complete verify job as [attempt 2](https://github.com/FYam8/rikkyo-uk-english/actions/runs/37208182759/attempts/2); succeeded with unchanged candidate code/data and additional findings 0.
- Earlier candidate `748cc17` is not counted: follow-up source review found the truncated FY26A writing prompt and the CLEAN count was reset.
- Release metadata changes are followed by complete PR and main verification. Audited content hashes prevent unreviewed code/data changes during release finalization.
