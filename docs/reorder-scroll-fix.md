# UI 1.3.1: preserve position while arranging words

The Rikkyo exam adapter called render() for every token/add/undo/clear operation. This replaced the entire app, including the independently scrolled mobile answer sheet. The same pattern existed in Waseda's legacy reorder drill adapter.

The shared answer widget now exposes additive contract-1 refreshReorder(container,state,tokens,options). It updates existing token disabled states, missing-word control and the assembled preview in place. Both school adapters save the same response/session state and call this updater, without rendering the app. Text is escaped and the missing-word input is not assigned when unchanged, preserving its cursor. No Engine, data, schema, storage namespace or scoring change.

The common P1 browser harness now checks scrolling-container identity, document scroll and nested scroll offsets around each operation, after Playwright has positioned the tapped control. At 390px it uses a touch-enabled mobile context and taps; 1280px uses mouse clicks. The exact FY26A Q3(1) wallet token is included. It covers token selection, undo, missing-word addition/edit, clear, reload and Backup replace/merge, and Waseda legacy reorder. The regression fails on the previous main adapter (scrolling container replaced) and passes with this fix.

Manual device access is not available: mobile QA uses Chromium touch emulation. Main verification and deployed-site checks follow the usual two-CLEAN release gate.
