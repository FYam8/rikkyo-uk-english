# Rikkyo UK English

立教英国学院 英語（FY24〜FY26 / A・B）の「過去問 → 弱点抽出 → 類題補強 → 翌日定着確認」アプリです。

## Release

- Version: `1.0.0`
- Shared English Engine: `1.1.0`
- Shared English UI: `1.0.0`
- Learning flow: 過去問 → 弱点 → 類題3連続正解 → 翌日2連続正解 → 克服
- FY26A: 診断
- FY26B: 最終holdout

早稲渋英語と同じShared Engine / Shared UI/UXを使い、立教固有の問題・試験構造・保存領域だけをAdapter/Dataとして分離しています。

## Runtime coverage

- FY26A: Q2〜Q7（29タスク）
- FY24A: supplied Q2〜Q6 subset（24タスク）
- FY24B: supplied Q2〜Q6 subset（23タスク）
- FY25A: supplied Q2〜Q6 subset（23タスク）
- FY25B: supplied Q2〜Q6 subset（23タスク）
- FY26B: source audited / final holdout / runtime locked

## Source limitations

このアプリは、提供された過去問PDFが根拠です。

- 学校公式解答は提供されていないため、表示する解答は独立に検討した**非公式アプリ解答**です。
- 学校公式配点が確認できないため、100点換算・合格点換算は作っていません。
- 入手できていないListening音源／transcriptは採点しません。未利用を誤答扱いしません。
- PDFで省略されているFY24/FY25の問題は、推測で過去問として復元しません。
- FY25のpicture writing、FY26のopen writingは原本情報を保持しますが、立教専用の採点authorityがないため現ランタイムでは自動採点しません。

## Isolation

- local state: `rikkyo.uk.english.v1`
- recovery: `rikkyo.uk.english.pre-migration`
- import recovery: `rikkyo.uk.english.pre-import`
- IndexedDB namespace: `rikkyo-uk-english-progress-sync`
- Cloud Sync: disabled until a Rikkyo-specific endpoint/identity exists
- AI Writing: disabled until a Rikkyo-specific writing contract exists

Wasedaの保存キー、Cloud identity、問題データは使用しません。

## Release QA

Release candidate `4d4a6a36aa4359f638c3b012db89285cbb56c9f8` で完全な検証を2回連続CLEAN。main merge後の完全検証もSUCCESSです。