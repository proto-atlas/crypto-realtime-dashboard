# 検証記録の一覧

Crypto Real-time Dashboardの検証記録をまとめます。各記録は、その時点の構成、外部APIの状態、対象データに対する確認結果です。外部API、WebSocket中継、Cloudflare runtimeの継続稼働を保証するものではありません。

## 個別記録

- [2026-07-16の公開UI・保存制限確認](production-ui-storage-2026-07-16.md): 公開UIの主要操作、localStorage制限時の操作継続、レスポンシブ表示を確認。
- [現在のWebSocket経路の確認記録](websocket-primary-fallback-2026-07-15.md): Coinbaseを主経路、Binanceを予備経路とする切り替えを単体テストとPlaywright E2Eで確認。
- [仮想ポートフォリオ操作の確認記録](virtual-portfolio-operation-2026-07-15.md): 操作選択、動的な実行ボタン、クリック・Enter操作を確認。
- [2026-05-17の表示安定化記録](websocket-fallback-stability-2026-05-17.md): Market Watchを4資産固定表示へ変更した当時の記録。現在のプロバイダー順序の根拠には使用しない。
- [信頼性改善ログ](../reliability-log.md): WebSocket自動切り替えまわりの改善履歴。

## 2026-07-13のPages反映

- Pagesへ反映したcommit: `6d2454f`
- 方法: `wrangler pages deploy apps/web/dist --project-name crypto-realtime-dashboard --branch main`
- 結果: preview URLとproduction URLがHTTP 200。productionの`index-yTwuubDq.js`はローカルbuildと368,391 bytes、SHA-256 `AB37822A40B8AA880E9959BC163B31F984152E59CAEC184CE20ACC1B538E6520`で一致。

## 2026-07-15の総合確認

- 方法: `pnpm check`を実行し、Biome、TypeScript、Node.jsスクリプトテスト、Vitest、production buildを確認。
- 対象: shared-types、BFF、Web、ローソク足取得スクリプト。
- 結果: Biomeはshared-types 4ファイル、BFF 32ファイル、Web 71ファイルを通過。Node.jsスクリプトテスト4件、shared-types 7件、BFF 72件、Web 109件の計192件が通過し、typecheckとbuildも通過。
- 方法: `pnpm e2e`を実行し、デモ操作、ローソク足canvas、WebSocket予備接続、375px・390px・768px、desktop表示後の390pxリサイズを確認。
- 対象: Playwright E2E 10件。
- 結果: 10件すべて通過。
- 方法: OSV-Scanner 2.4.0で`pnpm-lock.yaml`を検査。
- 対象: lockfile内の339 packages。
- 結果: 既知の脆弱性は検出されず。
- 方法: `wrangler deploy --dry-run`を実行。
- 対象: BFF Worker、Durable Objects 2件、KV、Rate Limiting binding。
- 結果: bundle作成とbinding解決が通過。圧縮後サイズは22.61 KiB。

## 2026-07-15のGitHub Actions反映

- 対象commit: `a5e870383b1c5ce7b7396665663f496dce0bfb3d`
- 方法: [CI run 29382939459](https://github.com/proto-atlas/crypto-realtime-dashboard/actions/runs/29382939459)でlint、typecheck、test、build、Playwright E2Eを実行し、成功後にWorkerとPagesを反映。
- 結果: CI、Worker反映、Pages反映が成功。Worker Version IDは`aa2fc23d-3724-4040-ad48-7b81728dd114`。
- 方法: [公開環境確認 run 29383084698](https://github.com/proto-atlas/crypto-realtime-dashboard/actions/runs/29383084698)でトップ画面とCoinbaseローソク足5種類を確認。
- 結果: トップ画面はHTTP 200。`1m`、`5m`、`15m`、`1h`、`1d`は各120本で、OHLCV、時刻順序、足間隔の検査を通過。

## READMEで参照している結果

| 対象 | 結果 | 補足 |
|---|---|---|
| `pnpm check` | 通過 | lint、typecheck、test、build |
| Vitest | 通過 | shared-types、BFF、Webの単体・統合テスト |
| Playwright E2E | 13件通過 | デモ操作、ローソク足canvas、仮想ポートフォリオのクリック・Enter操作、localStorage制限時の操作、Coinbase疑似失敗時のBinance切り替え、レスポンシブ表示 |
| 公開環境E2E | 5件通過 | クリック・Enter・減少・再読み込み保持、操作状態、390px表示 |
| 公開環境確認 | 通過 | トップ画面のHTTP 200、Coinbaseローソク足5種類の各120本、OHLCV、時刻順序、足間隔 |
| WebSocket自動切り替え | 通過 | 疑似接続でCoinbaseからBinanceへ切り替え、30秒後のCoinbase有効ticker受信後に復帰 |
| Lighthouse | 参考値 | 2026-05-07時点の手元計測 |

## 壊れやすいケースと扱い

| ケース | 実装上の扱い | 見える結果 |
|---|---|---|
| 外部APIを呼ばずに見たい | 初期表示をデモモードにする | 固定データで主要UIを確認できる |
| CoinGecko RESTが失敗する | BFFでエラーを整形し、cacheを補助として使う | UI全体を止めず、状態表示で分かる |
| Coinbase WebSocketが閉じる | Binance WebSocketへ切り替える | 接続状態に予備経路が出る |
| API keyを扱う | BFF Worker側だけで保持する | ブラウザにはkeyを渡さない |
| 実取引と誤解される | 実取引、送金、ウォレット接続、投資助言は扱わないと明記する | 学習用のマーケットデータ表示として読める |

## この記録で確認していないこと

- 投資助言や収益性
- 外部APIの長時間稼働
- WebSocket中継の長時間稼働
- Rate Limiting bindingによる短時間バースト時の429発火
- 本番認証やユーザー別quota
- mobile実機での長時間操作感
- スクリーンリーダー実機確認
