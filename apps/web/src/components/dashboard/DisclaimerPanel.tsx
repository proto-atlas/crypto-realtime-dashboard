export function DisclaimerPanel() {
  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
      <h2 className="font-semibold">利用上の注意</h2>
      <p className="mt-2">
        この画面は学習用のマーケットデータ表示です。実際の取引や送金は行わず、投資助言や売買推奨ではありません。
      </p>
      <p className="mt-2 text-xs">
        マーケットデータは{" "}
        <a
          className="font-semibold underline underline-offset-2"
          href="https://www.coingecko.com/"
          target="_blank"
          rel="noreferrer"
        >
          CoinGecko
        </a>
        の公開データを利用します (Data provided by CoinGecko)。WebSocket連携では、利用可能な範囲で
        BinanceとCoinbaseの公開マーケットストリームを使います。
      </p>
    </section>
  );
}
