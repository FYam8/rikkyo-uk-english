# Additional independent-solving audit

Base English main: `59ae2e217aa35be50b878b52bd39fbd97547513c`.

The request was to solve additional problems and find missing context or instructions. Review covered all 66 English authored-practice prompts, the FY24/FY25 core grammar prompts, and the runtime reading passage/question relationships. This is not a claim of a fresh independent solution of every question in every subject.

Five concrete false negatives were identified and repaired:

| Practice ID | Independently supplied valid response | Prior accepted response |
| --- | --- | --- |
| rrd02 | seeing | meeting |
| rwo02-3 | He is the teacher that I talked with yesterday. | talked to |
| rwo05-3 | We heard a song performed by a famous singer. | sung |
| rwo05-5 | I like the picture drawn by my sister. | painted |
| rec01 | I have known her since three years ago. | for three years |

The prompts remain answerable. Their open lexical wording permits alternatives that the old exact-match lists rejected. Existing preferred answers are retained, explanations clarify the alternatives, and content versions advance for unfinished-session refresh. Completed saved answers and shared engine/UI files are unchanged.

Validation: independently specified answers and wrong-answer controls through the production grading functions; all five alternatives entered through actual text/reorder widgets at 390px and 1280px; 122 runtime and 66 practice registered-answer checks; complete shared-exam-session browser suite including resume, backup, review and scheduling; 28 static regression commands. Release hashes describe this candidate, not an already deployed release. Exact-head remote CI is still required before publication.

Cross-subject investigation: 22 independently solved mathematics practice responses across 11 families plus 7 FY26A original-paper questions (Q3(6)-(10), Q4(1)-(2)) agreed with the production grader. This included reading the original star-pentagon and cuboid diagrams. It is not a full re-solution of all mathematics questions.

Kokugo: source replay and result review expose only one question-page image, even when required passage evidence and annotations are on earlier pages. A complete-booklet viewer prototype built and passed desktop/mobile training, image navigation, scoring, backup/restore and retention tests. The full downstream release audit correctly rejected direct edits to pinned shared files. The prototype was moved to shared upstream PR https://github.com/FYam8/waseshibu-source/pull/44; downstream generated files and historical release evidence were restored. It is not published, and full upstream verification plus downstream regeneration remains required.

No learner's production storage or cloud answers were changed. Safari/WebKit and physical devices were not tested in this audit.
