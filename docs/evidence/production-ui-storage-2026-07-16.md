# 公開UI・保存制限の確認記録

> この文書は、2026-07-16の単一ページUIを対象にした時点記録です。現行の3画面UIの検証結果は[検証記録の一覧](INDEX.md)を参照してください。

## 対象

- 公開URLの仮想ポートフォリオ操作
- localStorageを利用できないブラウザでの操作継続
- 375px、390px、768pxの表示
- WebSocket検査の判定ロジック

## 確認方法と結果

### ローカルPlaywright E2E

- 方法: `pnpm e2e`
- 対象: Chromiumでの主要操作、localStorageアクセス拒否、Coinbase疑似失敗時のBinance切り替え、レスポンシブ表示
- 結果: 13件すべて通過

localStorageのgetterが`SecurityError`を返す条件でも、画面を表示し、初期数量`0.1`の仮想保有を追加できることを確認した。この条件では再読み込み後の保存は行わない。

### 公開環境Playwright E2E

- 方法: `pnpm e2e:production`
- 対象: `https://crypto-realtime-dashboard.pages.dev/`
- 結果: 5件すべて通過

クリックによる追加、数量入力でのEnter、減らす選択時の保有不足表示、再読み込み後の保存、操作選択状態、390px幅で横スクロールが発生しないことを確認した。各テストで`console error`と`page error`がないことも確認した。

### 品質検査

- 方法: `pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm build`
- 結果: すべて通過
- テスト件数: Node.jsスクリプト8件、shared-types 7件、BFF 72件、Web 109件

WebSocket継続検査の判定ロジックは4件の単体テストで、正常受信、途中切断、無受信、WebSocketエラーを確認した。

### 公開WebSocketの15分観測

- 方法: PlaywrightのChromiumで公開Pagesを開き、公開BFFのCoinbase/Binance WebSocketへ同時接続して900,000ms観測
- 対象: `/api/ws/coinbase/ticker`、`/api/ws/binance/ticker`
- 結果: Coinbase 630件、Binance 901件を受信。観測終了前の`close`イベントと`error`イベントは両方0件

この結果は2026-07-16の15分間に対する確認であり、継続稼働やSLAを保証するものではない。

## 未確認範囲

- CoinbaseまたはBinance本体の実障害時の切り替え
- モバイル実機での長時間操作
- スクリーンリーダー実機での読み上げ順序と操作感

実障害時の切り替えは、外部サービスを停止させず、Playwrightの疑似接続で同じ条件を再現して確認している。モバイルについては画面幅ごとのE2E、アクセシビリティについては`role`、`name`、`pressed`状態のE2Eを代替確認としている。
