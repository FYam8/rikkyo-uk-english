# Shared Today Presenter — UI 1.3.0 / presenter contract 1

Baseline main: Waseda `45b62c949db70e2d03a174272c2c3ab4893f7ea9`; Rikkyo `da72dab20719886c1b36bee64888a489622cb5e9`. Both engine/ and ui/ trees matched before P2.

`ui/today-presenter.js` owns the Today header, daily count/remaining/target-achieved display, main action, Resume queue, alternatives, route link, completion marker and future confirmation list. It uses the existing shared completion component and Today card/CSS. Resume exposes only its resume action and a non-clickable preview of three queued actions. Normal state exposes the primary action and up to three alternatives, preserving Engine order. The target is a guideline, not a stop: reaching 10 still shows the available actions. Future items retain adapter order, show three rows and the remaining count, and use the supplied tomorrow date.

## Adapter contract

- `content({action, summary, goal, goalControlsHtml, goalEstimateHtml, actionsHtml, futureHtml, labels})`: precomputed Engine summary includes answered/target/remaining/targetReached. Goal label/value/note are school text. HTML slots are trusted school code or shared presenter output; never untrusted source text.
- `learningActions({action, available, routeCommand, labels})`: each action supplies kind, label, note, command and optionally complete. `available` includes the primary action in position zero when not resuming. Commands are trusted adapter JavaScript, HTML-attribute escaped; they must not be assembled from untrusted strings without JavaScript escaping.
- `futureConfirmations({rows, tomorrow, target, labels})`: rows contain date/label only. Labels optionally override common copy; `labels.extra(count,target)` returns text, escaped by the presenter.

No Engine selection, eligibility, sorting, reservation, day rollover or persistence is implemented here. Date and all state are passed in. The functions are pure and do not mutate inputs.

Waseda keeps goal tiers, goal switching, ETA calculation/display and its Resume eligibility. Rikkyo keeps all-range policy, no unverified score targets, exam IDs and FY26B exclusion. School wrappers map Engine results and commands into this contract. AI/cloud, branding, question data and source policies are unchanged.

## Compatibility and QA

No schema, namespace, backup/import, currentAttempt/currentDrill or dailyPlan/dailyProgress changes. The existing Engine is byte-identical. Repeated Today rendering preserves the initialized learning state.

Unit tests cover immutability, Resume queue, completion, alternatives, date labels, count boundaries (0/9/10/12), safe text/attribute escaping and real app delegation. Both apps run the same browser harness at 390px and 1280px through their production index. It checks fresh diagnostic navigation, school goal policy, due confirmation, alternatives, Resume/reload with the existing normalizer, target continuation, future overflow and all-work completion. Existing P0/P1 and school browser/regression suites continue to run.

Development test adjustments: the previous static assertion expected completion rendering directly in app.js; it now asserts delegation via this presenter to the shared completion component. The existing shared Resume normalizer adds a missing empty textDraft; the new browser test compares normalized drafts so that its expectation matches existing persistence behavior.

P3 source grouping and P4 backup/day-change presentation are outside this release.
