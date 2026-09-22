# P1 Shared Answer Widgets consumer

Baseline main: 73b6a3a1a8c4a8eb30ccbe4614551c4daf3c7630. Vendor Shared UI 1.2.0, widget contract 1, from Waseda candidate 90ae0a9b8af6590ca19c83d22ee1cdabf4063ab7. ui.lock.json pins the exact source and checks every artifact blob. Merge this consumer only after Waseda's candidate passes two full verification runs and source release succeeds.

Shared code handles choices, multiple selections, text, multi-slot, textarea and reorder UI/state transitions. School adapters keep examIds, scoring/completeness, native choice labels, fixed sentence framing, correction groups and currentAttempt.responses serialization. No schema/storage namespace changes. FY26A diagnostic, FY26B holdout, manual/writing source boundaries, AI/cloud OFF, family rotation and daily/remediation engine are unchanged.

## Defects found during P1 verification

1. All FY24/FY25 word-order questions explicitly contain one unused token, but answered() required every token. Correctly assembled answers were marked unanswered. Completeness now subtracts one when the school record declares an unused token; the shared widget does not determine scoring policy.
2. FY24A Q3(1): source PDF 立教_FY24_英語A_問題.pdf, PDF page 3 / printed page 1 has fixed prefix `Ms. White` and suffix `English.` outside the braces. These were absent from the data/renderer. Add those exact source fields, show the fixed frame, and include it in the school evaluator. Original token order and existing full answer are unchanged.
3. FY24B Q3(4): source PDF 立教_FY24_英語B_問題.pdf, PDF page 3 / printed page 1 supplies `story / this / strange / what / is / how`. The old independent solution `What a strange story this is!` required an unavailable `a`. Correct the independent (non-official) solution to `How strange this story is!`, with `what` unused. No word is added to the source bank. Existing attempts/results are not recalculated.
4. Editing an already inserted missing word saved the draft but left the assembled display stale. Shared preview refresh now updates the visible answer without replacing the focused input.

Question IDs and existing learning history remain unchanged. Source correction is restricted to the two entries above, supported by visual inspection of the supplied original PDFs. No unavailable material is inferred.

## Verification

- Existing 13 browser scenarios, including source grouping, FY24/FY25 Q6, FY26A, holdout and storage isolation.
- 3 correct → reserve 2 → day rollover → 2 correct → mastered.
- Shared P0 timeout/panel/Resume regression at 390px and 1280px.
- P1 actual controls: select/unselect, text/slots/manual drafts, reorder/undo/clear, inserted missing-word edits, reload, Backup replace/merge.
- All 16 FY24/FY25 word-order questions assemble from their real tokens, leave one unused and score correct through submitAttempt().
- Unit tests protect repeated words by token index, immutable state, invalid/duplicate indices, disabled controls and escaping.

P2–P4 remain outside this release.
