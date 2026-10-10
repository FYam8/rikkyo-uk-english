# 自由英作文AI添削 v1.0.2 — 検証記録

原本で確認できた自由英作文4問だけに、非公式の学習用AI添削を追加しました。自由英作文以外の問題・得点・正誤履歴は変更していません。

## 対応範囲

| 年度・日程 | 設問 | 原本・条件 | 公開条件 |
|---|---|---|---|
| FY25A | 大問9 | 原本3枚の絵・指定の書き出し・80〜100語 | 通常の作文練習 |
| FY25B | 大問9 | 原本3枚の絵・指定の書き出し・80〜100語 | 通常の作文練習 |
| FY26A | 大問8 | 原本の新しい能力についての物語・80〜100語 | 通常の作文練習 |
| FY26B | 大問8 | 原本の物語条件・80〜100語 | 最終試験の完了記録後だけ |

FY24A/Bは提供原本で作文を含むQ7〜Q9が省略されています。自由英作文の条件を確認できないため復元・AI採点の登録はしていません。FY25画像は原本PDFからの切り出しで、代替の生成画像は使っていません。

## 変更元・変更先

- 早稲田の変更前main: `e3ba4fe556d03419eeedeb2b2943a58ce04b1f47`
- 立教の変更前main: `2161f227743b5de537fcb4ca349f924a8e64f1cd`
- 共通UI/Worker検証候補: `4bc96bec8ed1190fe2dbb4ee17850007469ad72a`
- 立教のブラウザ検証候補: `29fae010d9649c05ebb222ea35edcccd6372e73b`
- マージ後のmain SHAは各PR・Actionsに記録されます。本記録は未実行の本番確認を成功とは記載しません。

## 共通機能と学校別Adapter

`ui/writing-feedback.js`で通信・タイムアウト・利用上限／APIエラー処理・JSON検証・添削コメント／改善例の表示を共通化しました。早稲田もこのモジュールに委譲し、立教は同一ファイルをSHA256と元commitで固定しています。既存の共有Engine・バックアップ機構を使用します。

Workerは早稲田の既存8過去問・45類題の契約を維持し、立教の登録4問だけを学校Adapterで解決します。クライアントが送った問題文・配点・語数制限で学校Adapterを上書きできません。立教固有の問題文・原本画像・絵の確認済み内容・7項目の学習用28点評価・80〜100語条件・holdoutは学校側に分離しています。

入力は自動保存し、答案変更で現評価を無効化します。再提出・提出履歴・以前の評価との比較・端末保存・Export/Importを用意しました。入試の得点には加算しません。FY26Bの紙試験完了は学習者の申告です。サーバで認証された試験完了記録ではありません。

## 実行した検証

| 検証 | 結果・証拠 |
|---|---|
| 実モデル採点品質 | 最終Workerで全8ケース×連続2回CLEAN。accepted passes 3/4。詳細はwriting-ai-quality-20261010.json |
| 良い作文 | 28/28・誤り指摘なし・不要な書き換えなし |
| 文法誤り | 実在する2箇所を修正し、物語の過去形を保持 |
| 語数不足 | 9語を検出。正しい文法・語彙を減点しない |
| 語数超過 | 113語を検出して語数項目を減点 |
| 課題外の作文 | 課題達成0。元のサッカーという題材を改善例に保持 |
| FY25A/B・FY26B | 原本条件に対応した実モデル応答を取得 |
| 早稲田回帰 | 共有Engine/UI、既存AI契約、履歴／Import、8過去問・45類題テスト成功。旧反論APIの実モデル応答も200・24点満点を確認 |
| 立教回帰 | 122 runtime問題・42類題、Today/Resume、弱点学習、既存採点・バックアップ・holdoutを確認 |
| ブラウザQA | Desktop Chromium・Pixel 7 Android Chromium相当・iPhone 13 WebKit相当で2回連続。入力・再読込・Back・長文・通信エラー・quota・不正JSON・二重送信・答案変更中の応答・再提出・Export/Import・holdout・横幅を確認 |
| セキュリティ | 学校／設問allowlist、Origin、不正JSON、1200文字制限、原本条件の固定、レート制限、引用データとしてのprompt、HTMLエスケープを確認 |
| タイムアウト | Worker 90秒以内、画面95秒。模擬タイムアウトが安全な再試行可能エラーになることを確認 |

[立教2回CLEAN・回帰ログ](https://github.com/FYam8/rikkyo-uk-english/actions/runs/38086623495)

[早稲田回帰・2回の作文関連テスト](https://github.com/FYam8/waseshibu-english/actions/runs/38086462431)

Android/iPhoneはエミュレーションで、実機検証ではありません。採点品質は上記の管理されたケースによる確認で、学校公式採点の再現ではありません。

## 公開確認

本番Workerへ同じモジュールとAI／rate-limit bindingをデプロイします。立教Pagesは成功したverifyの**同じmain commit**を公開し、公開後のproduction-writingジョブが本番URLで英文を入力し、本番Workerの応答・添削表示・履歴保存・再読込・入試得点に加算しないことを実際のブラウザで検証します。最終のデプロイID・main SHA・Actions結果は完了報告とマージ後のActionsで確認できます。

[公開URL](https://fyam8.github.io/rikkyo-uk-english/)

## 変更ファイル

### FYam8/waseshibu-english

- `.github/workflows/verify.yml`
- `app.js`
- `index.html`
- `tests/shared-ui-final-readiness.test.mjs`
- `tests/story-writing-grader.test.mjs`
- `tests/story-writing-live-quality.mjs`
- `tests/waseda-ai-writing-integration-characterization.test.mjs`
- `ui/writing-feedback.js`
- `workers/writing-grader/src/adapters/rikkyo.mjs`
- `workers/writing-grader/src/index.mjs`
- `workers/writing-grader/wrangler.jsonc`
- `ui/manifest.json`

### FYam8/rikkyo-uk-english

- `.github/workflows/pages.yml`
- `.github/workflows/verify.yml`
- `app.js`
- `assets/writing/FY25A-Q9.png`
- `assets/writing/FY25B-Q9.png`
- `data/writing-holdout-task.json`
- `data/writing-runtime-policy.json`
- `docs/writing-self-review.md`
- `index.html`
- `release-gate.json`
- `release.json`
- `schools/rikkyo/config.js`
- `schools/rikkyo/writingPractice.js`
- `schools/rikkyo/writingTasks.js`
- `tests/bootstrap-integrity.test.mjs`
- `tests/final-release-readiness.test.mjs`
- `tests/rikkyo-adapter-contract.test.mjs`
- `tests/story-writing-browser.test.mjs`
- `tests/story-writing-production.test.mjs`
- `tests/writing-practice.test.mjs`
- `tests/writing-runtime-policy.test.mjs`
- `tests/writing-shared.test.mjs`
- `ui/writing-feedback.css`
- `ui/writing-feedback.js`
- `writing-shared.lock.json`
- `docs/writing-ai-quality-20261010.json`
- `docs/writing-ai-release-20261010.md`

