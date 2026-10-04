# Rikkyo UK English

立教英国学院 英語（FY24〜FY26 / A・B）の「過去問 → 弱点抽出 → 類題補強 → 翌日定着確認」アプリです。

## Release

- Version: `1.0.1`
- Shared English Engine: `1.1.0`
- Shared English UI: `1.3.1`
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

教材監査の候補 `79c744b8d9477e1eb17d4410ae71ea2cd6293f3c` で、[全検証](https://github.com/FYam8/rikkyo-uk-english/actions/runs/37208182759)の attempt 1・2 が連続成功。各回の追加修正事項は0件です。類題42問・実施可能な過去問122タスク・FY24〜FY26 A/Bの英語PDF6本を照合しました。main反映後も、同じコミットの verify 成功を条件にPagesへ公開します。

修正内容・原本との対応は [教材監査](docs/material-audit-20261004.md)、リリース内容は [変更履歴](CHANGELOG.md) を参照してください。
