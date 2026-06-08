# WebSocket自動切り替えの確認記録

| Item | Value |
|---|---|
| Status | Resolved |
| Date | 2026-05-17 |
| Project | crypto-realtime-dashboard |
| Area | WebSocket連携 / Market Watch / fallback behavior |

## 概要

WebSocket連携中にMarket Watchの表示asset数が増減する挙動を確認した。
原因は、最新WebSocket payloadに含まれる銘柄だけで表示行を再構成していたこと。
修正後はBTC / ETH / SOL / XRPの4行を固定し、届いたtickだけをlast-known stateへ反映するようにした。

## 影響

- 利用者への影響: Market Watchの行数が揺れ、UIが不安定に見える
- データ欠損: なし
- 取引への影響: なし
- セキュリティへの影響: なし
- 対象: 公開UIのWebSocket fallback確認

## 原因

WebSocket連携のMarket Watch行生成が、前回値を保持せず、最新payloadのupdatesだけに依存していた。
WebSocket payloadは常に全銘柄を含むとは限らないため、表示行数が変動した。

## 修正内容

- last-known tickを保持するように変更
- Market WatchをBTC / ETH / SOL / XRPの固定4行に変更
- 主要4銘柄を同じ順序で比較できる監視UIにし、WebSocket payloadの揺れで表示行数が変わらないようにした
- Binance WS失敗時のCoinbase fallback E2Eを追加

## 確認結果

- Unit tests: 通過
- Playwright E2E: 通過
- GitHub Actions CI: 通過
- Production PagesでWebSocket連携中のMarket Watchが4行維持されることを確認
- Production PagesでBinance正常時のBFF WebSocket接続を確認
- Binance疑似失敗時にCoinbase fallbackへ切り替わることをPlaywright E2Eで確認

## 関連コミット

- Code fix commit: `5da4023`
- Fallback E2E commit: `e535389`
- CI run for code fix: `25983570264`
- CI run for E2E: `25983875116`
- Production URL: `https://crypto-realtime-dashboard.pages.dev`

## この記録に含めない範囲

- Binance本体の実障害を発生させた確認ではない
- 長時間運用保証ではない
- 負荷テストではない
