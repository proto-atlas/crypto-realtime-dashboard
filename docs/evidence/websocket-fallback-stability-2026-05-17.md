# Market Watch表示安定化の確認記録（2026-05-17）

| 項目 | 内容 |
|---|---|
| 状態 | 対応済み |
| 日付 | 2026-05-17 |
| 対象 | WebSocket連携 / Market Watchの表示行 |

> この文書は単一ページUIへ4資産固定表示を導入した当時の記録です。現在の画面では「Market Watch」を「マーケット一覧」と表示しています。Coinbase主経路・Binance予備経路については、[2026-07-15の確認記録](websocket-primary-fallback-2026-07-15.md)を参照してください。

## 概要

WebSocket連携中にMarket Watchの表示asset数が増減する挙動を確認した。
原因は、最新WebSocket payloadに含まれる銘柄だけで表示行を再構成していたこと。
修正後はBTC / ETH / SOL / XRPの4行を固定し、届いたtickだけをlast-known stateへ反映するようにした。

## 影響

- 利用者への影響: Market Watchの行数が揺れ、UIが不安定に見える
- 対象: WebSocket payload受信時のMarket Watch表示

## 原因

WebSocket連携のMarket Watch行生成が、前回値を保持せず、最新payloadのupdatesだけに依存していた。
WebSocket payloadは常に全銘柄を含むとは限らないため、表示行数が変動した。

## 修正内容

- last-known tickを保持するように変更
- Market WatchをBTC / ETH / SOL / XRPの固定4行に変更
- 主要4銘柄を同じ順序で比較できる監視UIにし、WebSocket payloadの揺れで表示行数が変わらないようにした

## 確認結果

- 当時の単体テストとPlaywright E2Eで、Market Watchが4行を維持することを確認
- 当時の公開Pagesで、WebSocket連携中のMarket Watchが4行を維持することを確認

## 現在との関係

- 4資産固定表示とlast-known stateは現在の実装でも継続している
- 当時のプロバイダー順序と現在の主経路・予備経路は異なるため、この文書を現在の切り替え順序の根拠には使用しない
- 現在の検証方法と結果は[2026-07-15の確認記録](websocket-primary-fallback-2026-07-15.md)に分ける

## この記録に含めない範囲

- 外部WebSocket本体の実障害
- 長時間接続
- 負荷試験
