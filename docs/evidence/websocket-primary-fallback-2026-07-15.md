# WebSocket主経路・予備経路の確認記録

> この文書は、対象commitの単一ページUIを確認した時点記録です。WebSocketの主経路・予備経路は現行の3画面UIでも維持しています。現行構成の検証結果は[検証記録の一覧](INDEX.md)を参照してください。

| 項目 | 内容 |
|---|---|
| 日付 | 2026-07-15 |
| 対象commit | `a5e870383b1c5ce7b7396665663f496dce0bfb3d` |
| 対象 | Coinbase主経路 / Binance予備経路 / Coinbase復旧 |

## 対象commit時点の仕様

- WebSocket連携開始時はCoinbase relayへ接続する
- Coinbase接続が閉じた場合またはerrorになった場合はBinance relayへ切り替える
- Binance表示中は30秒ごとにCoinbaseへ復旧接続する
- Coinbaseから有効なtickerを受信した後にだけ主経路へ戻す
- Binance由来の価格はCoinbaseローソク足へ反映しない
- Market WatchはBTC / ETH / SOL / XRPの4行を維持する

## 確認方法と結果

### 単体・統合テスト

- 方法: `pnpm check`
- 対象: Biome、typecheck、Node.jsスクリプトテスト、shared-types、BFF、Web、production build
- 結果: Node.jsスクリプト4件、shared-types 7件、BFF 72件、Web 109件の計192件が通過し、Biome、typecheck、buildも通過
- WebSocket固有の対象: Coinbaseへの初回接続、Coinbase error後のBinance切り替え、30秒後のCoinbase復旧接続、有効ticker受信後の復帰、last-known state保持

### Playwright E2E

- 方法: `pnpm e2e`
- 対象: デモ操作、ローソク足canvas、仮想ポートフォリオ、Coinbase疑似失敗時のBinance切り替え、375px・390px・768px表示
- 結果: 10件すべて通過
- WebSocket固有の結果: Coinbase接続失敗を疑似発生させ、Binance表示へ切り替わること、Market Watchが4行を維持すること、console errorとpage errorがないことを確認

### GitHub Actionsと公開環境

- 方法: [CI run 29382939459](https://github.com/proto-atlas/crypto-realtime-dashboard/actions/runs/29382939459)
- 対象: commit `a5e870383b1c5ce7b7396665663f496dce0bfb3d`のlint、typecheck、test、build、Playwright E2E、Worker / Pages反映
- 結果: すべて成功
- 方法: [公開環境確認 run 29383084698](https://github.com/proto-atlas/crypto-realtime-dashboard/actions/runs/29383084698)
- 対象: トップ画面とCoinbaseローソク足の`1m`、`5m`、`15m`、`1h`、`1d`
- 結果: トップ画面はHTTP 200。各時間足は120本で、OHLCV、時刻順序、足間隔の検査を通過

公開環境確認workflowは外部WebSocketの切り替えを自動発生させません。WebSocketの切り替え結果は単体テストとPlaywright E2Eによる疑似接続の確認です。

## 確認していないこと

- Coinbase本体の実障害発生時の切り替え
- Binance本体の実障害発生時の表示継続
- WebSocketの長時間接続
- 負荷試験
- CoinbaseとBinanceの価格差が一定範囲に収まること
