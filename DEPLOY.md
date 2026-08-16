# 接続先メモ（自動生成）

## 公開アプリ
- Production: https://pt-ryuta.vercel.app
- 会員アプリ: `/`（workout-log / WL）ホーム画面追加はトップから
- 管理アプリ: `/ops`（work-admin / WA）ホーム画面追加は `/ops` から
- PT管理アプリ: `/pta`（PT）回数セッション管理。ホーム画面追加は **必ず** https://pt-ryuta.vercel.app/pta を開いてから
- 会員: `/`（会員番号10桁 → ニックネーム設定）
- 管理: `/ops`（PINなし・URL分離のみ）
- PT管理: `/pta`（メモが PT の会員のみ・1回目/2回目…）

※ WL / WA / PT は別PWAです。ホーム画面の古いショートカットは削除して、各URLから入れ直してください。

## Apps Script（承認済み・稼働中）
- Script editor: https://script.google.com/d/1cHN9eFmwCGSGuBHPjvaFSn_J7wjS5MuOcn0-rJDHXN69Biou7hX8CFi2/edit
- Web App: https://script.google.com/macros/s/AKfycbwgrI8lgA7vFyib3X1BXjxh5OReGsaB3WjkHIukVADv2XsBgllzb1qQF-YroV-H2zU/exec

## Spreadsheet
- https://docs.google.com/spreadsheets/d/1jBDb9MmwoACaEkTYEzo4mGchsDSiyTJT1q5P9TT1p08/edit
- 会員マスタ「ニックネーム」列 = アプリ表示名（本人が設定）
- 認証は会員番号（10桁）のみ

## 初期PIN
- （廃止）スタッフは `/ops` のURLだけで入れます
