# Rikkyo UK English

立教英国学院 英語（FY24〜FY26 / A・B）の「過去問 → 弱点抽出 → 類題補強 → 翌日定着確認」アプリ用リポジトリです。

## Shared Engine

- Source: `FYam8/waseshibu-english`
- Pinned source commit: `786d743978a4a498595ee90686ada07f3fddbf4a`
- Shared English Engine: `1.1.0`
- Consumer model: pinned vendor only
- Waseda Pages の JavaScriptをhotlinkしない
- Wasedaの問題データ・保存namespace・Cloud identityをコピーしない

## Rikkyo identity

6回の試験を別々の `examId` として保持します。

`FY24A / FY24B / FY25A / FY25B / FY26A / FY26B`

- 初回診断: `FY26A`
- 最終holdout: `FY26B`
- FY26B由来の答え・直接類題・強い構造模倣は最終判定前の学習対象に混ぜない

公式配点が確認できていないため、現段階では得点・100点換算を作りません。学習目標は点数ではなく「全範囲」のstageとして管理します。

## Isolation

- local state: `rikkyo.uk.english.v1`
- recovery: `rikkyo.uk.english.pre-migration`
- import recovery: `rikkyo.uk.english.pre-import`
- IndexedDB: `rikkyo-uk-english-progress-sync`
- Cloud Sync: disabled until a Rikkyo-specific endpoint/identity exists
- AI Writing: disabled until the Rikkyo-specific writing contract is verified

## Current state

Shared Engine + Rikkyo adapter + six-paper structure registry are being validated on `feat/shared-engine-v1-bootstrap`.

This branch is not deployable yet. Past-paper answer authority, canonical question data, practice bank, persistence/browser shell and full browser QA are still required before production.
