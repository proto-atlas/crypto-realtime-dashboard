# 検証記録の一覧

Crypto Real-time Dashboardの検証記録をまとめます。各記録は、その時点の構成、外部APIの状態、対象データに対する確認結果です。外部API、WebSocket中継、Cloudflare runtimeの継続稼働を保証するものではありません。

## 公開URL

- [WebSocket自動切り替えの確認記録](websocket-fallback-stability-2026-05-17.md): Binance疑似失敗時にCoinbaseへ切り替わることをPlaywright E2Eで確認。
- [信頼性改善ログ](../reliability-log.md): WebSocket自動切り替えまわりの改善履歴。

## READMEで参照している結果

| 対象 | 結果 | 補足 |
|---|---|---|
| `pnpm check` | 通過 | lint、typecheck、test、build |
| Vitest | 通過 | shared-types、BFF、Webの単体・統合テスト |
| Playwright E2E | 8 tests通過 | デモモード中心の主要操作 |
| 本番URL確認 | 通過 | REST連携、WebSocket連携、仮想ポートフォリオのポジション更新とリロード後復元 |
| WebSocket自動切り替え | 通過 | Binance疑似失敗時にCoinbaseへ切り替え |
| Lighthouse | 参考値 | 2026-05-07時点の手元計測 |

## 壊れやすいケースと扱い

| ケース | 実装上の扱い | 見える結果 |
|---|---|---|
| 外部APIを呼ばずに見たい | 初期表示をデモモードにする | 固定データで主要UIを確認できる |
| CoinGecko RESTが失敗する | BFFでエラーを整形し、cacheを補助として使う | UI全体を止めず、状態表示で分かる |
| Binance WebSocketが閉じる | Coinbase WebSocketへ切り替える | 接続状態に切り替え先が出る |
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
