# 信頼性改善ログ

この文書は、公開URLの観察後に行った信頼性・表示安定性の改善を時系列でまとめるためのindexです。
各項目の詳細は、個別のevidenceに分けて記録します。

## 2026-05-17 WebSocket自動切り替えの安定化

WebSocket連携中にMarket Watchのasset数が揺れる挙動を、4資産固定表示とlast-known stateで安定化した。

- 詳細: [WebSocket Fallback Stability Record](evidence/websocket-fallback-stability-2026-05-17.md)
- 修正commit: `5da4023`
- E2E追加commit: `e535389`
- 検証: unit test、Playwright E2E、GitHub Actions CI、本番Pagesでの表示確認
- 未主張範囲: Binance本体の実障害発生、長時間運用保証、負荷テスト
