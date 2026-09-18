# Rikkyo English — Shared UX parity v1

This change closes the remaining reusable UX gap between Waseda English and Rikkyo English without importing Waseda-specific scoring, cloud, AI, or school data.

## Commonized runtime

Rikkyo now consumes the same Shared Engine decisions for:

- daily remediation plan construction
- daily answered/remaining/target-reached counts
- prioritized Today action selection
- resume/confirmation/new weakness/next paper ordering
- practice pool/ranking/rotation
- 3-correct remediation mastery
- next-day 2-correct confirmation
- day rollover
- backup/import merge

Rikkyo now consumes the same Shared UI components for:

- application shell/navigation
- Today card and status cards
- route cards
- attempt bar
- paper page
- desktop/sticky and mobile/bottom-sheet answer panel
- answer sheet expand/collapse
- weakness cards
- drill card/progress
- backup/import panel

The timed/untimed attempt controls use the same Shared UI timer/attempt presentation as Waseda. Rikkyo never invents an official time: timed mode requires the learner to enter a time they have verified from an official source.

## Intentionally school-specific

These remain different by design:

- six Rikkyo exam IDs (FY24A/B, FY25A/B, FY26A/B)
- FY26A diagnostic and FY26B holdout policy
- no official score conversion
- Rikkyo question renderers and source-coverage limitations
- listening unavailable where audio/transcript was not supplied
- picture/open writing non-runtime until a Rikkyo-specific marking authority exists
- Rikkyo storage namespace
- Cloud Sync disabled until a Rikkyo-specific endpoint exists
- AI Writing disabled until a Rikkyo-specific grading contract exists

This is the intended boundary: shared learning engine + shared interaction shell, with school data/policy isolated.
