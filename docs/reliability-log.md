# 信頼性改善ログ

この文書は、公開URLの観察後に行った信頼性・表示安定性の改善を時系列でまとめる一覧です。
各項目の詳細は、個別の検証記録に分けています。

## 2026-07-15 仮想ポートフォリオの操作を明確化

追加・減らすの選択と実行の役割を分け、実行ボタンに銘柄、数量、操作を表示するようにした。初期数量`0.1`のままクリックした場合と、数量入力でEnterを押した場合の両方をPlaywright E2Eで確認した。

- 詳細: [仮想ポートフォリオ操作の確認記録](evidence/virtual-portfolio-operation-2026-07-15.md)
- 検証: `pnpm check`、Playwright E2E 11件
- 未確認範囲: スクリーンリーダー実機、mobile実機での長時間操作

## 2026-07-15 WebSocketの主経路と予備経路を整理

ローソク足と通常時のtickをCoinbaseへ揃え、Coinbase接続断またはerror時だけBinanceへ切り替える構成にした。Binance表示中は30秒ごとにCoinbaseを再確認し、有効なtickerを受信した後に主経路へ戻す。

- 詳細: [WebSocket主経路・予備経路の確認記録](evidence/websocket-primary-fallback-2026-07-15.md)
- 検証: 単体テスト、Playwright E2E 10件、GitHub Actions CI
- 公開環境確認: トップ画面とCoinbaseローソク足5種類。外部WebSocketの実障害は対象外
- 未確認範囲: Coinbase本体の実障害、Binance本体の実障害、長時間接続、負荷試験

## 2026-05-17 Market Watchの表示安定化

WebSocket連携中にMarket Watchのasset数が揺れる挙動を、4資産固定表示とlast-known stateで安定化した。

- 詳細: [2026-05-17の表示安定化記録](evidence/websocket-fallback-stability-2026-05-17.md)
- 現在との関係: 4資産固定表示とlast-known stateは継続。プロバイダー順序は現在の記録を参照
- 未確認範囲: 外部WebSocketの実障害、長時間接続、負荷試験
