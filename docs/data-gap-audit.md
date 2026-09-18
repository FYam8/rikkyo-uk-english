# Rikkyo UK English - Initial data / contract gap audit

## Scope

Sources: FY24-FY26 English A/B papers supplied for this project.

The current repository is intentionally not deployable yet. This audit records only structure supported by the supplied papers. Missing official answers, omitted source sections and official scoring are not guessed.

## Six stable paper identities

- FY24A
- FY24B
- FY25A
- FY25B
- FY26A
- FY26B

A/B identity must survive save/export/import and must never be collapsed into a year-only record.

## Observed format

### FY24 A/B
- supplied file: 7 pages
- cover says an approximately 10-minute Listening Test comes first
- visible written sections include Japanese-guided completion, word order, error correction, paraphrase and long reading
- later questions 7-9 are omitted in the supplied paper image set, including writing-related material

### FY25 A/B
- supplied file: 7 pages
- same broad early grammar/reading pattern as FY24
- questions 7-8 are omitted in the supplied source
- question 9 Writing Test is visible: picture-sequence story writing, about 80-100 words

### FY26 A/B
- supplied file: 10 pages
- Listening Part 1 is present in the supplied source: questions 1-4 multiple choice and 5-8 short answer
- Japanese-guided completion and word order remain
- error correction asks the learner to identify and rewrite five erroneous sentences from ten
- reading expands to long reading, short informational-text multiple choice and short-answer reading
- question 8 Writing Test asks for about 80-100 words

## True gaps before runtime

1. Official answer authority is not supplied.
2. Official per-question scoring / total split is not established in this source set.
3. FY24/FY25 omitted sections must be marked `source_missing`, not recreated as supplied past-paper questions.
4. Listening audio availability must be represented separately from correctness.
5. Rikkyo-specific question types must cover listening MC/short answer, completion, reorder, correction/rewrite, paraphrase, long reading, short-text MC, reading short answer and open writing.
6. Any newly authored practice must be labelled `authored_practice`, never past-paper source content.
7. Existing Rikkyo English analysis/problem data was searched in the accessible File Library; no confirmed English data pack was found. Re-check before authoring large practice banks.

## Namespace isolation

Initial safe namespace:
- local state: `rikkyo.uk.english.v1`
- migration recovery: `rikkyo.uk.english.pre-migration`
- import recovery: `rikkyo.uk.english.pre-import`
- IndexedDB: `rikkyo-uk-english-progress-sync`

Cloud progress stays disabled until a Rikkyo-specific endpoint/app identity exists.
AI writing stays disabled until the Rikkyo writing contract is verified.

## Implementation order

1. vendor locked Shared Engine
2. freeze six-paper registry
3. establish answer/scoring authority
4. create valid Rikkyo config/policy
5. import existing analysis/problem data if found
6. fill only missing metadata/coverage
7. implement past paper -> weakness -> practice -> next-day confirmation UX
8. Rikkyo browser/compatibility tests
9. two consecutive CLEAN loops
10. only then main/deploy
