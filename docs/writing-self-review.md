# Freedom writing AI feedback

Scope: FY25A/B Q9 (picture stories), FY26A/B Q8 (stories), 80–100 words. FY24 A/B PDF page 7 explicitly omits Q7–Q9; nothing reconstructed.

The FY25 PNGs are source-page crops (provided page 7), not generated images. Source-page illustrations were visually reviewed; the Worker uses a conservative human transcription of visible panel facts, not image inference or an official answer. Narrative elaboration is allowed. FY26 conditions are transcribed from provided page 10.

UI/transport/legacy response validation/fingerprint are `ui/writing-feedback.js`, maintained in FYam8/waseshibu-english and pinned as an identical vendored module here. Worker inference, transport, CORS, error handling, model and legacy score contracts share the existing Worker. School-owned registration, rubric and learning scoring are in its `src/adapters/rikkyo.mjs`.

Each rubric dimension earns 0–4; seven dimensions total 28 unofficial learning points. Length is computed locally: 80–100 words = 4, 60–79 / 101–120 = 2, otherwise 0. Under 60 words, task/content/structure are capped at 1 each, because evidence is insufficient. Explicit task failures cap task fulfilment at 2. Grammar/vocabulary errors cap those dimensions consistently with corrections. These are app rules, not school marks. Never alter exam scores, practice correctness, mastery or past exam attempts.

Drafts retain FY26A's old `writingPractice` key; other tasks use `writingDrafts`. Up to 20 submissions per task retain answer and feedback. Edits hide old current evaluation; historic submissions remain explicitly labelled. In-flight results are associated with the submitted answer and cannot replace a changed answer or imported state. Export/replace import includes drafts/history; merge keeps local drafts. Draft text itself is never deleted by network failures.

FY26B is not used for training or fetched before final completion. The previous app cannot run a FY26B exam; this feature adds an explicit paper-exam completion record after all preceding runtime exams are completed. It records a learner's attestation, not a score. Existing graded FY26B attempts also unlock review. This is a learning/UI guard, not server authentication or protection against deliberate URL inspection/forged backups. Only after completion does the app fetch `writing-holdout-task.json` and offer feedback.

AI data is sent only when the learner presses the grade button. No browser key, no raw-answer server logging. Rikkyo requests use canonical school/task authority, 1200-char limit, Origin allowlist, rate limit 4/minute/IP per Cloudflare location, model timeout, at most one bounded repair, strict result validation including correction substring grounding and revised-example word range. Failed validation returns an error, not invented feedback. Model correctness is not guaranteed by JSON/substring checks; live quality samples are required, not just mocked responses.

Release evidence is separate from the historical 1.0.1 content audit. Changed writing files are validated by the new writing test suite; the old release hashes continue to protect unchanged materials. Production remains gated by successful exact-main verification.
