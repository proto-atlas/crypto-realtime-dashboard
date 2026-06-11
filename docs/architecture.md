# アーキテクチャ概要

この文書は、Crypto Real-time Dashboardの実装範囲、データフロー、境界を短時間で確認できるように整理したものです。

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

- `apps/web`: React + ViteのブラウザUIです。Dashboard、Market Watch、ローソク足チャート、取引履歴ラボ、仮想ポートフォリオ、dark/light theme切替を表示します。
- `apps/bff`: Hono + Cloudflare WorkersのBFFです。外部API keyをブラウザへ渡さず、REST proxy、Rate Limiting、WebSocket relayを担当します。
- `packages/shared-types`: Web/BFFで共有する型定義です。
- Cloudflare Pages: Web UIの静的配信を担当します。
- Cloudflare Workers: BFFのREST endpointとWebSocket relayを担当します。
- Workers KV: CoinGecko RESTとBinance Klinesのresponse cacheに使います。
- Durable Objects: Binance/Coinbase WebSocket relayの接続管理に使います。

## データフロー

### デモモード

初期表示はデモモードです。ブラウザ内の決定的なfixture generatorでMarket Watch、ローソク足チャート、取引履歴ラボ、仮想ポートフォリオを表示します。初期表示では外部APIを呼びません。

### REST連携

REST連携では、ブラウザがBFFの `/api/coingecko/*` と `/api/binance/klines` を呼びます。BFFはCoinGecko Demo API keyをWorker側だけで使い、ブラウザには渡しません。

- CoinGecko market data: `/api/coingecko/coins/markets`
- CoinGecko market chart: `/api/coingecko/coins/:id/market_chart`
- Binance Klines: `/api/binance/klines`

CoinGecko cacheのTTLは300秒、Binance Klines cacheのTTLは30秒です。CoinGecko RESTにはCloudflare WorkersのRate Limiting bindingを設定しています。本番Cloudflare経路では`cf-connecting-ip`を使い、`x-forwarded-for`はlocal/dev fallbackとして扱います。ただしCloudflareのRate Limitingはpermissive / eventually consistentな仕様であり、短時間バーストでは429発火を観測できない場合があります。本実装では決定的なIP単位上限としては主張せず、公開URLでの過剰呼び出し抑制を狙う境界として扱います。Binance Klinesは、対応ペアと足種をshared-types側の許可リストで制限します。

CoinGeckoの価格・マーケットデータは、UIとREADMEで `Data provided by CoinGecko` と明示します。

### WebSocket連携

WebSocket連携では、ブラウザがBFFのWebSocket relayへ接続します。UIはBinance relayを優先し、接続断またはerror時にCoinbase relayへfallbackします。Coinbase tickerには24h quote volumeがないため、fallback時のVolumeは `volume_24h * 直近price` の表示用近似値です。

- Binance relay: `/api/ws/binance/ticker`
- Coinbase relay: `/api/ws/coinbase/ticker`

relayは受信したmarket payloadをUI更新に使います。raw payloadを永続保存する設計ではありません。
WebSocket relayで確認できるのは、公開URLからの基本的な接続と表示更新です。ユーザー別上限、IP単位のWebSocket接続数制限、長時間接続の継続性は検証対象外です。

### 取引履歴ラボ

取引履歴ラボは、10万件の仮想取引履歴をブラウザ内で生成して表示します。外部APIやサーバー保存には依存しません。TanStack TableとTanStack Virtualで、検索、フィルタ、ソート、列固定、列幅リサイズ、仮想スクロールを扱います。列幅リサイズはマウス/タッチ操作のみです。

### 仮想ポートフォリオ

仮想ポートフォリオは、仮想ポジションの追加・減算、仮想現金、保有評価額、含み損益、保有比率を表示します。Zustand persistでlocalStorageへ保存し、サーバー側には保存しません。保存内容は同一ブラウザ・同一プロファイル内で共有されます。実取引、送金、ウォレット接続、取引所アカウント連携は扱いません。

### Theme

dark/light themeは、Tailwind CSSのdark variantとブラウザのlocalStorageを使って切り替えます。初期描画時のちらつきを抑えるため、HTML側の小さな初期化scriptで保存済みthemeを先に`html.dark`へ反映します。チャートはDOMのtheme class変更を監視し、背景色・grid・ローソク足色を再適用します。

## 主要ファイル

- `apps/web/src/pages/dashboard.tsx`: ダッシュボード画面の状態接続とレイアウト。
- `apps/web/src/components/dashboard/*`: ダッシュボード内の主要表示部品。
- `apps/web/src/hooks/useThemePreference.ts`: theme設定のlocalStorage永続化。
- `apps/web/src/lib/theme.ts`: theme設定の読み書きとDOM反映。
- `apps/web/src/stores/virtualPortfolioStore.ts`: 仮想ポートフォリオのlocalStorage永続化。
- `apps/web/src/lib/virtualPortfolio.ts`: 仮想注文、保有、損益計算のドメインロジック。
- `apps/bff/src/app.ts`: BFF route定義とCORS境界。
- `apps/bff/src/rate-limit.ts`: CoinGecko RESTのRate Limiting境界。
- `apps/bff/src/coingecko/*`: CoinGecko REST proxy、正規化、cache。
- `apps/bff/src/binance/*`: Binance Klines proxyとWebSocket relay。
- `apps/bff/src/coinbase/*`: Coinbase WebSocket relay fallback。
- `packages/shared-types/src/*`: Web/BFF共有のマーケットデータ型と許可リスト。

## 境界と未主張範囲

- 投資助言、売買推奨、収益性は主張しません。
- 実取引、送金、ウォレット接続、取引所アカウント連携はありません。
- ユーザーアカウント、ログイン、サーバー側のポートフォリオ保存はありません。
- BFF WorkerはCORSでブラウザ側の許可originを制限し、CoinGecko RESTにはRate Limiting bindingを設定します。ただし、本番認証、ユーザー別quota、公開URLへの直接アクセス制限は含みません。
- CoinGecko RESTのRate Limiting bindingはpermissive / eventually consistentなCloudflare仕様に依存しており、短時間バーストでの429発火は保証しません。strictなper-IP quotaが必要な場合は、Durable Objectなどのapplication-level実装が必要です。
- WebSocket relayには、per-user quotaやIP単位の接続数制限はありません。
- 外部API、WebSocket relay、Cloudflare runtimeの長時間稼働保証やSLAは主張しません。
- Lighthouse Accessibilityは自動検査範囲の結果です。スクリーンリーダー実機確認は未実施です。
- mobile viewportのE2Eと画面確認は実施していますが、実機端末での長時間操作確認は未実施です。
- 取引履歴ラボの列幅リサイズは、キーボード操作には対応していません。
- localStorageに保存するtheme設定と仮想ポートフォリオは、同一ブラウザ・同一プロファイル内のデモ状態です。端末共有やプライベートブラウジングでの永続性は主張しません。

## 検証の位置づけ

`pnpm check` でlint、typecheck、Vitest、buildをまとめて確認します。Playwright E2Eはデモモード中心の主要操作を確認し、REST連携 / WebSocket連携は外部APIの揺らぎを避けるため、本番URLでの時点確認に寄せています。2026-05-08時点の本番URLでは、CORS header、REST連携、WebSocket連携を確認しています。Rate Limiting bindingの429発火は短時間バーストでは観測できていないため、deterministicな制限としては未主張範囲です。

この検証は特定時点の確認です。外部API側の仕様変更、rate limit、ネットワーク状態まで継続保証するものではありません。
