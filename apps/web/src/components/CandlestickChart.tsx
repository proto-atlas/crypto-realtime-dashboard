import type { CandlestickPoint } from "@crypto-realtime-dashboard/shared-types";
import { CandlestickSeries, ColorType, createChart, type IChartApi } from "lightweight-charts";
import { useEffect, useRef } from "react";
import { toLightweightCandles } from "@/lib/candlestick";

type CandlestickChartProps = {
  candles: readonly CandlestickPoint[];
};

const chartHeight = 300;
type CandlestickSeriesApi = ReturnType<IChartApi["addSeries"]>;
type CandleTimeRange = {
  first: number;
  last: number;
};

export function resolveCandlestickChartTheme(isDark: boolean) {
  return isDark
    ? {
        background: "#0f172a",
        text: "#cbd5e1",
        grid: "#1e293b",
        border: "#334155",
      }
    : {
        background: "#ffffff",
        text: "#475569",
        grid: "#f1f5f9",
        border: "#e2e8f0",
      };
}

export function CandlestickChart({ candles }: CandlestickChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<CandlestickSeriesApi | null>(null);
  const lastFitRangeRef = useRef<CandleTimeRange | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (container === null) {
      return;
    }

    const chart = createChart(container, {
      height: chartHeight,
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#475569",
      },
      grid: {
        vertLines: { color: "#f1f5f9" },
        horzLines: { color: "#f1f5f9" },
      },
      rightPriceScale: {
        borderColor: "#e2e8f0",
      },
      timeScale: {
        borderColor: "#e2e8f0",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
      },
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#059669",
      downColor: "#dc2626",
      borderVisible: false,
      wickUpColor: "#059669",
      wickDownColor: "#dc2626",
    });
    const observer = new ResizeObserver(([entry]) => {
      chart.applyOptions({
        width: Math.floor(entry.contentRect.width),
      });
    });
    const applyCurrentTheme = () => {
      const theme = resolveCandlestickChartTheme(
        document.documentElement.classList.contains("dark"),
      );

      chart.applyOptions({
        layout: {
          background: { type: ColorType.Solid, color: theme.background },
          textColor: theme.text,
        },
        grid: {
          vertLines: { color: theme.grid },
          horzLines: { color: theme.grid },
        },
        rightPriceScale: {
          borderColor: theme.border,
        },
        timeScale: {
          borderColor: theme.border,
          timeVisible: true,
          secondsVisible: false,
        },
      });
    };
    const themeObserver = new MutationObserver(applyCurrentTheme);

    chartRef.current = chart;
    seriesRef.current = series;
    applyCurrentTheme();
    observer.observe(container);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      themeObserver.disconnect();
      seriesRef.current = null;
      chartRef.current = null;
      lastFitRangeRef.current = null;
      chart.remove();
    };
  }, []);

  useEffect(() => {
    const chart = chartRef.current;
    const series = seriesRef.current;

    if (chart === null || series === null) {
      return;
    }

    series.setData(toLightweightCandles(candles));

    const nextRange = resolveCandleTimeRange(candles);
    const previousRange = lastFitRangeRef.current;

    if (nextRange !== null && !isSameCandleTimeRange(previousRange, nextRange)) {
      chart.timeScale().fitContent();
      lastFitRangeRef.current = nextRange;
    }
  }, [candles]);

  return (
    <div
      ref={containerRef}
      className="h-[300px] w-full overflow-hidden rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
      data-testid="candlestick-chart"
    />
  );
}

export function resolveCandleTimeRange(
  candles: readonly CandlestickPoint[],
): CandleTimeRange | null {
  const firstCandle = candles[0];
  const lastCandle = candles[candles.length - 1];

  return firstCandle !== undefined && lastCandle !== undefined
    ? {
        first: firstCandle.timestamp,
        last: lastCandle.timestamp,
      }
    : null;
}

export function isSameCandleTimeRange(
  previousRange: CandleTimeRange | null,
  nextRange: CandleTimeRange,
) {
  return previousRange?.first === nextRange.first && previousRange.last === nextRange.last;
}
