# 設計判断

この文書は、Crypto Real-time Dashboardの主要な設計判断と、その理由をまとめます。
実装構成の全体像は [architecture.md](architecture.md)、公開URL観察後の信頼性改善は [reliability-log.md](reliability-log.md) を参照してください。

## 1. 初期表示をデモモードにする

初期表示では外部APIを呼ばず、ブラウザ内の決定的なデモデータで画面を表示します。

公開URLは検索クローラや偶発的なアクセスも受けるため、初期表示で外部APIへ接続すると、利用者が意図しない時点で外部API呼び出しとWebSocket接続が発生します。そのため、REST連携 / WebSocket連携は明示的な操作で有効化する設計にしています。

これにより、キーなしで主要UIを確認できる一方、外部providerのrate limitや一時障害に依存しない入口を維持できます。

## 2. API keyはBFF Worker側だけで扱う

CoinGecko Demo API keyはCloudflare Workers BFF側だけで使い、ブラウザへ渡しません。

ブラウザ側はBFFのREST endpointとWebSocket relayへ接続し、外部API keyやprovider固有の認証情報を直接持たない構成にしています。これにより、UIの公開性とsecretの保護範囲を分けています。

ただし、BFFは本番認証の代替ではありません。CORSとRate Limiting bindingは公開URLでの過剰呼び出しを抑える境界であり、ユーザー別認証、権限管理、ユーザー別上限は検証対象外です。

## 3. REST連携とWebSocket連携を分ける

REST連携はCoinGecko RESTとBinance Klinesから、一覧系データとローソク足の初期データを取得します。

WebSocket連携はBFFのWebSocket relayからtick更新を受け取り、最後のローソク足とMarket Watchを更新します。WebSocket連携でも、ローソク足の初期表示にはBinance Klinesを使います。

RESTとWebSocketを分けた理由は、初期表示、履歴足、tick更新で必要なデータの性質が違うためです。WebSocketだけで全状態を作ろうとすると、初期同期や欠落時の扱いが複雑になります。RESTで初期状態を作り、WebSocketで直近だけ更新する方針にしています。

## 4. Binanceを主、Coinbaseを自動切り替え先にする

WebSocket連携ではBinance relayを優先し、Binance WebSocketがcloseまたはerrorになった場合だけCoinbase relayへ切り替えます。

単一の外部データ提供元だけに依存すると、接続断や一時障害でリアルタイムUI全体が止まります。一方で、常時複数の外部データ提供元を同時購読すると、公開URLでは接続数と実装複雑性が増えます。そのため、通常時はBinance、失敗時だけCoinbaseへ切り替える方針にしています。

Coinbase tickerには24h quote volumeがないため、切り替え時のVolumeは `volume_24h * 直近price` の表示用近似値として扱います。外部データ提供元ごとのデータ差分を完全に揃えることは主張しません。

## 5. Market Watchは4資産固定表示にする

Market WatchはBTC / ETH / SOL / XRPの4行を固定し、届いたtickだけをlast-known stateへ反映します。

WebSocket payloadは常に全銘柄を含むとは限らないため、最新payloadに含まれる銘柄だけで行を作ると、WebSocket連携中に表示行数が増減します。監視UIとしては、同じ銘柄を同じ順番で見続けられる方が状態変化を読み取りやすいため、主要4資産の固定表示にしました。

この判断と修正の詳細は [WebSocket Fallback Stability Record](evidence/websocket-fallback-stability-2026-05-17.md) に記録しています。

## 6. Cacheはfail-openにする

Workers KVのcache read/writeが失敗しても、BFFは可能な限り上流API取得へ進みます。

このダッシュボードでは、cacheは表示継続と外部API呼び出し削減のための補助です。cache障害を理由にUI全体を止めるより、上流取得できる場合は表示を続ける方が体験として自然です。

ただし、外部API自体のrate limitや障害までは吸収できません。REST連携 / WebSocket連携が使えない場合でも、デモモードで主要UIを確認できるようにしています。

## 7. Rate Limiting bindingは過剰呼び出し抑制として扱う

CoinGecko RESTにはCloudflare WorkersのRate Limiting bindingを設定しています。現在の設定は `20 requests / 60 seconds` です。

これは公開URLでの過剰呼び出し抑制であり、本番認証や決定的なIP単位上限ではありません。CloudflareのRate Limitingはpermissive / eventually consistentな挙動を持つため、短時間バーストで必ず429になるとは主張しません。

本番サービスとして厳密なquotaが必要な場合は、Durable ObjectやDBを使ったapplication-levelのtoken bucketを別途設計する前提です。

## 8. 10万件テーブルはブラウザ内の決定的データで扱う

取引履歴ラボは、10万件の仮想取引履歴をブラウザ内で生成し、TanStack TableとTanStack Virtualで表示します。

大量テーブルの操作性を見せるために、実APIやDBへ依存させる必要はありません。データを決定的に生成することで、検索、フィルタ、ソート、列固定、列幅リサイズ、仮想スクロールのUI挙動を外部状態なしで確認できます。

これは取引履歴の実データや監査ログではなく、フロントエンド性能と操作性を示すためのデモデータです。

## 9. 仮想ポートフォリオはlocalStorageに限定する

仮想ポートフォリオは、Zustand persistでlocalStorageへ保存します。サーバー側保存、ユーザーアカウント、ログイン、取引所アカウント連携は扱いません。

このデモで見せたいのは、実取引ではなく、価格データを使ったUI状態管理、入力検証、損益計算、リロード後復元です。そのため、保存範囲を同一ブラウザ・同一プロファイル内に限定しています。

端末共有、プライベートブラウジング、ブラウザstorage制限下での永続性は主張しません。

## 10. Theme設定は補助機能として扱う

dark/light themeはlocalStorageへ保存し、初期描画前に小さなscriptで `html.dark` へ反映します。

React読み込み後にthemeを適用すると、初期表示で一瞬だけ別themeが見える可能性があります。そのため、HTML側の初期化scriptとReact hookで同じstorage keyを使います。

storageの読み書きに失敗した場合でも、描画自体は止めません。theme永続化は補助機能であり、マーケットデータ表示や操作を止める理由にしない判断です。

## 11. テストは層ごとに役割を分ける

BFF、lib、hooksは外部データの正規化、fallback、状態遷移を単体テストで確認します。

UIはdashboard統合テストと主要component testで、壊れたら気付ける範囲に絞ります。Playwright E2Eはデモモード中心にし、外部APIの揺らぎで不安定になりやすいREST連携 / WebSocket連携は本番URLでの時点確認に寄せています。

この方針は、外部providerの可用性をテスト成功条件にしないためです。Live経路の存在は確認しますが、長時間稼働、外部providerのSLA、Rate Limitingの429発火までは主張しません。

## 12. 主張範囲をUIと境界設計に置く

このリポジトリで主張するのは、リアルタイムUI、BFF境界、WebSocket fallback、大量テーブル、localStorage状態管理、テストと検証証跡を設計・実装できることです。

この文書で扱わない範囲:

- 実取引機能
- 投資助言、売買推奨、収益性
- 取引所アカウント連携、ウォレット接続、送金
- 本番認証、ユーザー別quota、per-user WebSocket接続制限
- 外部providerの品質、SLA、長時間稼働保証
- Rate Limiting bindingによるdeterministicな429発火保証
- localStorageデータの端末間同期や永続保証
