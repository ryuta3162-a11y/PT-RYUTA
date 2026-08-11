# PT RYUTA

パーソナルトレーニング向けの記録・メニュー共有アプリです。  
**AI（Cursor Agent）が設計から実装までほぼ全自動で作成**しています。

## できること

- **トレーナー**: セッション中にスマホで種目・重量・回数を記録
- **お客さま**: 4桁コードでログインし、自トレを自由入力で記録
- **メニュー共有**: 作成したメニューをURLでお客さまに共有
- **データ保存**: Google スプレッドシート（未接続時は端末ローカル保存）

## 技術構成

| 層 | 技術 |
|---|---|
| 画面 | Next.js 15（スマホ最適化） |
| API | Google Apps Script Web App |
| DB | Google スプレッドシート |
| 種目候補 | JOYFIT24経堂マシンラインナップ由来 |

スプレッドシート ID:

`1jBDb9MmwoACaEkTYEzo4mGchsDSiyTJT1q5P9TT1p08`

## ローカル起動

```bash
npm install
npm run dev
```

http://localhost:3000

初期トレーナーPIN: `2468`

## スプレッドシート接続（Apps Script）

1. `gas/` を push

```bash
npm run gas:push
```

2. `npm run gas:open` でスクリプトを開き、**デプロイ → 新しいデプロイ → 種類: ウェブアプリ**
   - 実行ユーザー: 自分
   - アクセスできるユーザー: **全員**
3. 発行された URL をアプリTOPの「データ接続」に貼る
4. 「保存して初期化」でシート（Config / Clients / Workouts / Menus / Exercises）が自動生成

> スクリプト実行アカウントが、上記スプレッドシートを編集できる必要があります。

## シート構成

- **Config** … trainerPin など
- **Clients** … 顧客リスト（共有コード付き）
- **Workouts** … PT / 自トレの全記録
- **Menus** … メニューと共有トークン
- **Exercises** … 種目マスタ（自由入力で増える）

## Vercel デプロイ

```bash
npx vercel
```

任意で環境変数:

`NEXT_PUBLIC_GAS_URL=https://script.google.com/macros/s/xxxx/exec`

## 操作の流れ

1. トレーナーで入り、顧客を追加（自動で4桁コード発行）
2. セッション画面で記録を保存
3. メニューを作成し、共有リンクをお客さまへ送付
4. お客さまはコードで入り、自トレを記録
