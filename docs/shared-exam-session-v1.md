# Shared exam interaction migration

Baseline: main 0a0f30711e802a1adbc8e2091247e18c6e7bf025. Waseda latest main before work: ce29faf3767c3df22a191dc138a9d516518cc9af. engine/ and ui/ matched exactly at audit time.

P0 consumes Waseda's Shared UI 1.1.0 controller contract 1, pinned to a7d4eea07269bc90093c1056ead79269779718f6 (PR #21). Full verify succeeded on that candidate twice: 35778241984 and 35778268691. G0/G1 audit 35778268640 also succeeded. Waseda merged as 54948540323f36c8b2c033da5c83429bb5327a24.

ui.lock.json records the immutable source commit and every ui/ blob SHA; the consumer test now verifies those hashes. engine/ is unchanged. Controller and artifact contents are identical to Waseda.

School-owned adapter: getState/save/render; exact problem DOM ID mapping; missing-position notice. Rikkyo does not adopt Waseda's timeout answer-lock policy. No storage namespace, schema, learning selection, question data, holdout, scoring, AI or cloud changes.

Real-browser validation covers existing fresh/attempt/subset/reading/renderer/drill/resume/backup/mobile/coverage/crossyear/scheduler/holdout scenarios plus production index interaction at 390px and 1280px. Additional clock-driven verification covers 3 correct, next-day reservation, day rollover, 2 correct and mastery.

## Failure classification

- Readiness assertions fixed to UI 1.0.0 required update to 1.1.0; no behavior expectation was removed.
- Existing mobile fixture failed on baseline and candidate at 390px: source token span `games` extended to 409px. Missing flex/wrap on `.token-list` caused actual overflow. A school-theme rule fixes wrapping; existing overflow assertion remains intact.
- New clock test initially dismissed submit confirmation by default; explicitly accept dialogs in the test. Day rollover clears dailyProgress to null; assert its effective count is zero, matching the engine contract.

## Remaining units

P1: answer-widget operations (selection, reorder, missing word, undo, clear) with school-specific schema/scoring adapters.
P2: Today action/future-confirmation presenters with school labels and route IDs supplied by adapters.
P3: source/question grouping with school source renderers and completeness boundaries retained.
P4: backup/import/day-change presentation; validation, namespaces and recovery policy remain school-owned.

Each unit requires its own Waseda-first implementation and compatibility gate; this PR implements P0 only.
