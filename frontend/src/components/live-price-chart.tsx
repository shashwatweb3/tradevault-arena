import { useEffect, useMemo, useRef } from "react";
import {
  ColorType,
  createChart,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { formatChainUsdPrice, formatUsd, fromContractPrice } from "@/lib/format";
import type { LivePricePoint } from "@/lib/live-price";

type LivePriceChartProps = {
  priceHistory: LivePricePoint[];
  tournamentPrice?: bigint;
  entryPrice?: bigint | null;
};

type SeriesPoint = {
  time: UTCTimestamp;
  value: number;
};

export function LivePriceChart({
  priceHistory,
  tournamentPrice,
  entryPrice,
}: LivePriceChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const tournamentLineRef = useRef<IPriceLine | null>(null);
  const entryLineRef = useRef<IPriceLine | null>(null);
  const seededRef = useRef(false);
  const lastTimeRef = useRef<number | null>(null);
  const firstTimeRef = useRef<number | null>(null);
  const lastLengthRef = useRef(0);

  const data = useMemo<SeriesPoint[]>(
    () =>
      priceHistory.map((point) => ({
        time: Math.floor(point.timestamp / 1000) as UTCTimestamp,
        value: point.price,
      })),
    [priceHistory],
  );

  const cleanedData = useMemo<SeriesPoint[]>(() => {
    const sorted = [...data].sort((left, right) => Number(left.time) - Number(right.time));
    return sorted.filter((item, index, arr) => index === 0 || item.time > arr[index - 1].time);
  }, [data]);

  const cleanedHistory = useMemo(
    () =>
      [...priceHistory]
        .sort((left, right) => left.timestamp - right.timestamp)
        .filter((point, index, arr) => index === 0 || point.timestamp > arr[index - 1].timestamp),
    [priceHistory],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      autoSize: false,
      width: container.clientWidth,
      height: 300,
      layout: {
        background: { type: ColorType.Solid, color: "#0B1628" },
        textColor: "#94A3B8",
      },
      grid: {
        vertLines: { color: "rgba(57,255,136,0.08)" },
        horzLines: { color: "rgba(57,255,136,0.08)" },
      },
      rightPriceScale: {
        borderVisible: false,
      },
      leftPriceScale: {
        visible: false,
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        vertLine: { color: "rgba(57,255,136,0.45)", width: 1 },
        horzLine: { color: "rgba(57,255,136,0.2)", width: 1 },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    const series = chart.addAreaSeries({
      lineColor: "#39FF88",
      lineWidth: 2,
      topColor: "rgba(57,255,136,0.24)",
      bottomColor: "rgba(57,255,136,0.02)",
      priceLineColor: "#39FF88",
      crosshairMarkerBackgroundColor: "#39FF88",
      lastValueVisible: true,
      priceLineVisible: true,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth, height: 300 });
      chart.timeScale().fitContent();
    });

    resizeObserver.observe(container);
    chart.timeScale().fitContent();

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      seededRef.current = false;
      lastTimeRef.current = null;
      firstTimeRef.current = null;
      lastLengthRef.current = 0;
    };
  }, []);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series || !cleanedData.length) return;

    const latest = cleanedData[cleanedData.length - 1];
    const first = cleanedData[0];
    const shouldReset =
      !seededRef.current ||
      firstTimeRef.current == null ||
      lastTimeRef.current == null ||
      first.time !== firstTimeRef.current ||
      cleanedData.length < lastLengthRef.current;

    if (shouldReset) {
      series.setData(cleanedData);
      chartRef.current?.timeScale().fitContent();
      seededRef.current = true;
      firstTimeRef.current = Number(first.time);
      lastTimeRef.current = Number(latest.time);
      lastLengthRef.current = cleanedData.length;
      return;
    }

    if (Number(latest.time) <= (lastTimeRef.current ?? 0)) {
      return;
    }

    series.update(latest);
    lastTimeRef.current = Number(latest.time);
    lastLengthRef.current = cleanedData.length;
  }, [cleanedData]);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    if (tournamentLineRef.current) {
      series.removePriceLine(tournamentLineRef.current);
      tournamentLineRef.current = null;
    }

    if (entryLineRef.current) {
      series.removePriceLine(entryLineRef.current);
      entryLineRef.current = null;
    }

    if (tournamentPrice && tournamentPrice > 0n) {
      tournamentLineRef.current = series.createPriceLine({
        price: fromContractPrice(tournamentPrice),
        color: "#A3FFCC",
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "Tournament",
      });
    }

    if (entryPrice && entryPrice > 0n) {
      entryLineRef.current = series.createPriceLine({
        price: fromContractPrice(entryPrice),
        color: "#FBBF24",
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "Entry",
      });
    }
  }, [entryPrice, tournamentPrice]);

  if (!cleanedHistory.length) {
    return (
      <div className="tv-panel-soft flex h-[280px] items-center justify-center text-sm text-[var(--muted)]">
        Waiting for BTC/USD market data...
      </div>
    );
  }

  const high = Math.max(...cleanedHistory.map((point) => point.high ?? point.price));
  const low = Math.min(...cleanedHistory.map((point) => point.low ?? point.price));
  const latest = cleanedHistory[cleanedHistory.length - 1];

  return (
    <div className="tv-panel-soft p-3">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--label)]">
            Live BTC/USD Chart
          </p>
          <p className="mt-2 text-[18px] font-semibold text-[var(--text)]">
            {formatUsd(latest.price)}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2 text-right text-xs sm:text-sm">
          <ChartLegend label="Live BTC" color="#39FF88" />
          {tournamentPrice && tournamentPrice > 0n ? (
            <ChartLegend label={`Tournament ${formatChainUsdPrice(tournamentPrice)}`} color="#A3FFCC" />
          ) : null}
          {entryPrice && entryPrice > 0n ? (
            <ChartLegend label={`Entry ${formatChainUsdPrice(entryPrice)}`} color="#FBBF24" />
          ) : null}
        </div>
        <div className="grid grid-cols-3 gap-2 text-right text-xs sm:text-sm">
          <ChartStat label="High" value={formatUsd(high)} />
          <ChartStat label="Low" value={formatUsd(low)} />
          <ChartStat
            label="Updated"
            value={new Intl.DateTimeFormat(undefined, { timeStyle: "short" }).format(latest.timestamp)}
          />
        </div>
      </div>
      <div ref={containerRef} className="h-[280px] w-full" />
    </div>
  );
}

function ChartStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="tv-stat-card px-3 py-2">
      <p className="tv-label">
        {label}
      </p>
      <p className="mt-1 font-mono text-[12px] font-medium tabular-nums text-[var(--text)]">{value}</p>
    </div>
  );
}

function ChartLegend({ label, color }: { label: string; color: string }) {
  return (
    <div className="tv-pill px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </div>
  );
}
