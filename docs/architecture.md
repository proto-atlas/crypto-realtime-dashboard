# アーキテクチャ概要

この文書は、Crypto Real-time Dashboardの実装範囲、データフロー、各機能の役割をまとめたものです。

## 全体構成

```text
Browser
  |
  | Static assets
  v
Cloudflare Pages
  |
  | REST / WebSocket
  v
Cloudflare Workers BFF
  |        |             |
  |        |             +-- Durable Objects: WebSocket relay
  |        +-- Workers KV: market data cache
  +-- Public market data APIs
```

- `apps/web`: ReactとViteで作ったブラウザUIです。マーケット、仮想ポートフォリオ、取引履歴ラボの3画面と、テーマ切替、データモード切替を表示します。
- `apps/bff`: HonoとCloudflare Workersで作ったBFFです。外部APIキーをブラウザへ渡さず、REST API中継、Rate Limiting binding、WebSocket中継を担当します。
- `packages/shared-types`: WebとBFFで共有する型定義です。
- Cloudflare Pages: Web UIの静的配信を担当します。
- Cloudflare Workers: BFFのREST APIとWebSocket中継を担当します。
- Workers KV: CoinGecko RESTとCoinbaseローソク足の応答キャッシュに使います。
- Durable Objects: BinanceとCoinbaseのWebSocket中継接続を管理します。

## データフロー

### デモモード

初期表示はデモモードです。ブラウザ内の再現可能な固定データ生成処理で、マーケット一覧、ローソク足チャート、取引履歴ラボ、仮想ポートフォリオを表示します。初期表示では外部APIを呼びません。

ブラウザUIは`/market`、`/portfolio`、`/history`へ分けています。共通の`MarketDataProvider`がデータモードと4銘柄の市場データを保持するため、画面を移動しても選択したデータモードを維持します。`/market`では選択銘柄と時間足をURLのクエリーパラメーターへ保存します。不正または未対応の値はBTCと1分足へ戻します。

### REST連携

REST連携では、ブラウザがBFFの`/api/coingecko/*`と`/api/market/candles`を呼びます。BFFはCoinGecko Demo APIキーをWorker側だけで使い、ブラウザには渡しません。

- CoinGecko market data: `/api/coingecko/coins/markets`
- CoinGecko market chart: `/api/coingecko/coins/:id/market_chart`
- Coinbase candles: `/api/market/candles`

CoinGeckoのキャッシュ有効期間は300秒、Coinbaseローソク足のキャッシュ有効期間は30秒です。CoinGecko RESTにはCloudflare WorkersのRate Limiting bindingを設定しています。本番Cloudflare経路では`cf-connecting-ip`を使い、`x-forwarded-for`はローカル開発時の予備値として扱います。

[Cloudflareの公式資料](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/#accuracy)では、Rate Limiting APIは許可寄りで、結果が直ちに全体へ反映される仕組みではなく、正確な回数集計には使わないよう説明されています。そのため、本実装は確実なIP単位上限を主張せず、公開URLへの過剰な呼び出しを抑える目的に限定します。Coinbaseローソク足は、対応ペアと足種を`shared-types`側の許可リストで制限し、重複する時刻を拒否して時刻昇順の最新120本を返します。

CoinGeckoの価格・マーケットデータは、UIとREADMEで `Data provided by CoinGecko` と明示します。

### WebSocket連携

WebSocket連携では、ブラウザがBFFのWebSocket中継へ接続します。UIはCoinbase中継を優先し、接続断またはエラー時にBinance中継へ切り替えます。Binance表示中も30秒ごとにCoinbaseへの復旧接続を試し、有効なtickerを受信してからCoinbaseへ戻します。Coinbase tickerには24時間のquote volumeがないため、Volumeは`volume_24h * 直近price`で求めた表示用の近似値です。Binance予備経路の価格はCoinbaseローソク足へ反映しません。

- Binance中継: `/api/ws/binance/ticker`
- Coinbase中継: `/api/ws/coinbase/ticker`

中継は受信した市場データをUI更新に使います。受信データをそのまま永続保存する設計ではありません。
WebSocket中継で確認できるのは、公開URLからの基本的な接続と表示更新です。ユーザー別上限、IP単位のWebSocket接続数制限、長時間接続の継続性は検証対象外です。

### 取引履歴ラボ

取引履歴ラボは、10万件の仮想取引履歴をブラウザ内で生成して表示します。外部APIやサーバー保存には依存しません。TanStack TableとTanStack Virtualで、検索、絞り込み、並べ替え、列固定、列幅リサイズ、仮想スクロールを扱います。列幅リサイズはマウスとタッチ操作に対応しています。

### 仮想ポートフォリオ

仮想ポートフォリオは、仮想ポジションの追加・減算、仮想現金、保有評価額、含み損益、保有比率を表示します。追加・減らす操作を選ぶと、銘柄、数量、操作を含む実行ボタンへ表示内容を反映します。Zustand persistでlocalStorageへ保存し、サーバー側には保存しません。localStorageを利用できない場合も操作は継続できますが、再読み込み後には保持されません。保存内容は同一ブラウザ・同一プロファイル内で共有されます。実取引、送金、ウォレット接続、取引所アカウント連携は扱いません。

### テーマ

ダークテーマとライトテーマは、Tailwind CSSの`dark`バリアントとブラウザのlocalStorageを使って切り替えます。初期描画時のちらつきを抑えるため、HTML側の小さな初期化スクリプトで保存済みテーマを先に`html.dark`へ反映します。チャートはDOMのテーマクラス変更を監視し、背景色、グリッド、ローソク足色を再適用します。

## 主要ファイル

- `apps/web/src/router.tsx`: 3画面のルート定義と遅延読み込み。
- `apps/web/src/contexts/MarketDataContext.tsx`: 3画面で共有するデータモードと市場データ。
- `apps/web/src/pages/dashboard.tsx`: マーケット画面の選択銘柄、チャート、市場詳細の接続。
- `apps/web/src/pages/portfolio.tsx`: 仮想ポートフォリオ画面。
- `apps/web/src/pages/history.tsx`: 取引履歴ラボ画面。
- `apps/web/src/components/dashboard/*`: マーケット、チャート、仮想ポートフォリオの表示部品。
- `apps/web/src/hooks/useThemePreference.ts`: テーマ設定のlocalStorage保存。
- `apps/web/src/lib/theme.ts`: テーマ設定の読み書きとDOM反映。
- `apps/web/src/stores/virtualPortfolioStore.ts`: 仮想ポートフォリオのlocalStorage永続化。
- `apps/web/src/lib/virtualPortfolio.ts`: 仮想注文、保有、損益計算のドメインロジック。
- `apps/bff/src/app.ts`: BFF route定義とCORS設定。
- `apps/bff/src/rate-limit.ts`: CoinGecko RESTのRate Limiting処理。
- `apps/bff/src/coingecko/*`: CoinGecko REST中継、正規化、キャッシュ。
- `apps/bff/src/binance/*`: Binance WebSocketの予備中継。
- `apps/bff/src/coinbase/*`: Coinbaseローソク足取得とWebSocketの主中継。
- `apps/bff/src/market/*`: ローソク足の公開APIとデモ切り替え。
- `packages/shared-types/src/*`: Web/BFF共有のマーケットデータ型と許可リスト。

## 実装範囲と対象外

- 投資助言、売買推奨、収益性は主張しません。
- 実取引、送金、ウォレット接続、取引所アカウント連携はありません。
- ユーザーアカウント、ログイン、サーバー側のポートフォリオ保存はありません。
- BFF WorkerはCORSでブラウザ側の許可オリジンを制限し、CoinGecko RESTにはRate Limiting bindingを設定します。ただし、本番認証、ユーザー別上限、公開URLへの直接アクセス制限は含みません。
- CoinGecko RESTのRate Limiting bindingは、短時間の呼び出し回数を正確に集計する仕組みではないため、429応答の発生を保証しません。厳密なIP単位上限が必要な場合は、Durable Objectなどで別に実装する必要があります。
- WebSocket中継には、ユーザー別上限やIP単位の接続数制限はありません。
- 外部API、WebSocket中継、Cloudflare実行環境の長時間稼働保証やSLAは主張しません。
- Lighthouse Accessibilityは自動検査範囲の結果です。スクリーンリーダー実機確認は未実施です。
- モバイル表示幅のE2Eと画面確認は実施していますが、実機端末での長時間操作確認は未実施です。
- 取引履歴ラボの列幅リサイズは、キーボード操作には対応していません。
- localStorageに保存するテーマ設定と仮想ポートフォリオは、同一ブラウザ、同一プロファイル内のデモ状態です。端末共有やプライベートブラウジングでの永続性は主張しません。

## 検証の位置づけ

`pnpm check`でBiome、typecheck、Node.jsスクリプトテスト、Vitest、buildをまとめて確認します。`pnpm e2e`は3画面の移動、銘柄のクリック・キーボード操作、ローソク足canvas、仮想ポートフォリオ、10万件テーブル、Coinbase疑似失敗時のBinance切り替え、レスポンシブ表示を確認します。

公開環境確認ワークフローは、トップ画面のHTTP 200、Coinbaseローソク足5種類、CoinbaseとBinanceのWebSocket初回データ受信、公開UIのクリック、Enter、減少、再読み込み保持、390px表示を確認します。外部WebSocketの実障害や長時間接続、Rate Limiting bindingの短時間バースト時の429発火は自動確認の対象外です。

この検証は特定時点の確認です。外部API側の仕様変更、呼び出し制限、ネットワーク状態まで継続保証するものではありません。

## CI/CD

`.github/workflows/ci.yml`は、`main`へのpushとpull requestでlint、typecheck、test、build、Playwright E2Eを実行します。`main`へのpushでは、検証成功後に同じcommitのBFF WorkerとWebをCloudflare WorkersとPagesへ反映します。

ワークフローとGit refの組み合わせで同時実行を制御し、新しい実行が始まった場合は古い実行を中止します。`.github/workflows/production-smoke.yml`は、手動または日次で公開環境確認を実行します。
