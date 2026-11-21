import React, { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Check,
  ChevronRight,
  ExternalLink,
  Info,
  LineChart,
  Loader2,
  Newspaper,
  PieChart,
  RefreshCw,
  Sparkles,
  Star,
  X,
} from 'lucide-react';
import {
  GroundedSource,
  LiveAiInsights,
  LiveStockDetail,
  LiveUniverseStock,
} from '../types/market';
import { formatCurrency, formatSignedCurrency, formatSignedPct } from '../utils/formatters';
import { describePriceSwings } from '../utils/recommendationEngine';

interface StockAnalysisScreenProps {
  symbol: string;
  allStocks: LiveUniverseStock[];
  isWatched: boolean;
  onBackToDirectory: () => void;
  onSelectStock: (ticker: string) => void;
  onToggleWatchlist: (ticker: string) => void;
  onLogHolding: (ticker: string) => void;
}

type DetailSection =
  | 'overview'
  | 'financials'
  | 'chart'
  | 'news'
  | 'technical'
  | 'insights'
  | 'company';

type ChartTimeframe = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '5Y';

const TIMEFRAMES: ChartTimeframe[] = ['1D', '1W', '1M', '3M', '6M', '1Y', '5Y'];

const SECTION_LINKS: {
  id: DetailSection;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'overview', label: 'Overview', icon: LineChart },
  { id: 'financials', label: 'Company Numbers', icon: PieChart },
  { id: 'chart', label: 'Price History', icon: Activity },
  { id: 'news', label: 'Recent News', icon: Newspaper },
  { id: 'technical', label: 'Price Trend', icon: LineChart },
  { id: 'insights', label: 'Plain Summary', icon: Sparkles },
  { id: 'company', label: 'About Company', icon: Building2 },
];

export const StockAnalysisScreen: React.FC<StockAnalysisScreenProps> = ({
  symbol,
  allStocks,
  isWatched,
  onBackToDirectory,
  onSelectStock,
  onToggleWatchlist,
  onLogHolding,
}) => {
  const [activeSection, setActiveSection] = useState<DetailSection>('overview');
  const [timeframe, setTimeframe] = useState<ChartTimeframe>('1M');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const [detail, setDetail] = useState<LiveStockDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [insights, setInsights] = useState<LiveAiInsights | null>(null);
  const [sources, setSources] = useState<GroundedSource[]>([]);
  const [insightsSourceLabel, setInsightsSourceLabel] = useState<string>('Live Exchange Data');
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  const fetchMarketDetail = useCallback(async () => {
    setDetailLoading(true);
    setDetailError(null);
    setHoverIdx(null);
    try {
      const res = await fetch(
        `/api/market/stock/${encodeURIComponent(symbol)}?range=${encodeURIComponent(timeframe)}`
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || `Failed to load live market data for ${symbol}`);
      }
      const data = (await res.json()) as LiveStockDetail;
      setDetail(data);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Unable to fetch live stock details.');
    } finally {
      setDetailLoading(false);
    }
  }, [symbol, timeframe]);

  const fetchAiInsights = useCallback(async (companyNameHint?: string) => {
    setInsightsLoading(true);
    setInsightsError(null);
    try {
      const nameParam = companyNameHint ? `?name=${encodeURIComponent(companyNameHint)}` : '';
      const res = await fetch(`/api/market/ai-insights/${encodeURIComponent(symbol)}${nameParam}`);
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || 'Unable to load live fundamental insights.');
      }
      const data = (await res.json()) as {
        insights: LiveAiInsights;
        sources?: GroundedSource[];
        sourceLabel?: string;
      };
      setInsights(data.insights);
      setSources(data.sources || []);
      setInsightsSourceLabel(data.sourceLabel || 'Live Exchange Data');
    } catch (err) {
      setInsightsError(
        err instanceof Error ? err.message : 'Unable to retrieve grounded company fundamentals.'
      );
    } finally {
      setInsightsLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchMarketDetail();
  }, [fetchMarketDetail]);

  useEffect(() => {
    const known = allStocks.find((s) => s.symbol.toUpperCase() === symbol.toUpperCase());
    setInsights(null);
    setSources([]);
    fetchAiInsights(known?.name);
  }, [symbol, fetchAiInsights, allStocks]);

  const scrollToSection = (id: DetailSection) => {
    setActiveSection(id);
    const el = document.getElementById(`stock-sec-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (detailLoading && !detail) {
    return (
      <div className="min-h-full bg-[#0B111A] text-slate-100 p-8">
        <div className="max-w-[1200px] mx-auto space-y-6">
          <button
            type="button"
            onClick={onBackToDirectory}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Analysis Directory
          </button>
          <div className="bg-[#121A26] border border-slate-800 rounded-xl p-10 flex items-center justify-center gap-3 text-sm text-slate-300">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <span>Loading live market feed for {symbol}...</span>
          </div>
        </div>
      </div>
    );
  }

  if (detailError && !detail) {
    return (
      <div className="min-h-full bg-[#0B111A] text-slate-100 p-8">
        <div className="max-w-[760px] mx-auto space-y-5">
          <button
            type="button"
            onClick={onBackToDirectory}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Analysis Directory
          </button>
          <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-6 space-y-3">
            <div className="flex items-center gap-2 text-rose-300 text-sm font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Could not load live market data for {symbol}</span>
            </div>
            <p className="text-xs text-rose-200/80">{detailError}</p>
            <button
              type="button"
              onClick={fetchMarketDetail}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-rose-700 hover:bg-rose-600 rounded-lg cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Live Feed
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const { quote, history, technicals, news, meta, fetchedAt } = detail;
  const currency = quote.currency || 'USD';
  const up = quote.changePct >= 0;

  const activeIdx =
    hoverIdx !== null && hoverIdx < history.length ? hoverIdx : Math.max(0, history.length - 1);
  const inspected = history[activeIdx];
  const latestBar = history[history.length - 1];
  const firstBar = history[0];

  // SVG Chart dimensions
  const width = 560;
  const height = 215;
  const padL = 52;
  const padR = 12;
  const padT = 16;
  const padB = 26;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const closes = history.map((h) => h.close);
  const minP = closes.length ? Math.min(...closes) : quote.price;
  const maxP = closes.length ? Math.max(...closes) : quote.price;
  const padP = (maxP - minP || 5) * 0.12;
  const minVal = Math.max(0, minP - padP);
  const maxVal = maxP + padP;
  const range = maxVal - minVal || 1;

  const getX = (i: number) =>
    history.length <= 1 ? padL : padL + (i / (history.length - 1)) * innerW;
  const getY = (val: number) =>
    padT + innerH - ((val - minVal) / range) * innerH;

  const linePath = history
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.close).toFixed(1)}`)
    .join(' ');
  const areaPath =
    history.length > 0
      ? `${linePath} L ${getX(history.length - 1).toFixed(1)} ${(padT + innerH).toFixed(1)} L ${getX(0).toFixed(1)} ${(padT + innerH).toFixed(1)} Z`
      : '';

  const yTicks = [0, 0.33, 0.66, 1].map((r) => ({
    val: minVal + r * range,
    y: getY(minVal + r * range),
  }));

  const chartPositive =
    history.length >= 2 ? history[history.length - 1].close >= history[0].close : up;
  const chartColor = chartPositive ? '#10B981' : '#F43F5E';

  const updatedTimeStr = quote.marketTime
    ? new Date(quote.marketTime * 1000).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date(fetchedAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

  return (
    <div className="min-h-full bg-[#0B111A] text-slate-100">
      <div className="max-w-[1320px] mx-auto flex flex-col lg:flex-row">
        {/* Left Analytical Sub-Navigation */}
        <aside className="lg:w-56 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800/90 px-4 py-5 space-y-6">
          <button
            type="button"
            onClick={onBackToDirectory}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Analysis</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-slate-200 font-medium truncate">{quote.name}</span>
          </button>

          <nav aria-label="Stock analysis sections" className="flex lg:flex-col gap-1 overflow-x-auto pb-1 lg:pb-0">
            {SECTION_LINKS.map((sec) => {
              const Icon = sec.icon;
              const isAct = activeSection === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => scrollToSection(sec.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    isAct
                      ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/60'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{sec.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="hidden lg:block pt-4 border-t border-slate-800/80 space-y-2">
            <label htmlFor="detail-switch" className="block text-[11px] text-slate-400">
              Quick Switch
            </label>
            <select
              id="detail-switch"
              value={allStocks.some((s) => s.symbol.toUpperCase() === quote.symbol.toUpperCase()) ? quote.symbol : ''}
              onChange={(e) => {
                if (e.target.value) onSelectStock(e.target.value);
              }}
              className="w-full px-2.5 py-1.5 text-xs bg-[#111926] border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              {!allStocks.some((s) => s.symbol.toUpperCase() === quote.symbol.toUpperCase()) && (
                <option value="">{quote.symbol} — {quote.name}</option>
              )}
              {allStocks.map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol} — {s.name}
                </option>
              ))}
            </select>
          </div>
        </aside>

        {/* Main Dark Analytical Content */}
        <div className="flex-1 min-w-0 p-5 sm:p-7 space-y-5">
          {/* Top Stock Header */}
          <section
            id="stock-sec-overview"
            className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 pb-5 border-b border-slate-800/90"
          >
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-base text-white shrink-0">
                {quote.symbol.replace(/\..*$/, '').slice(0, 2)}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold tracking-tight text-white">
                    {quote.name}
                  </h1>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleWatchlist(quote.symbol)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                        isWatched
                          ? 'bg-amber-950/50 border-amber-700/60 text-amber-300'
                          : 'bg-[#131B26] border-slate-700 text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          isWatched ? 'fill-amber-400 text-amber-400' : 'text-amber-400'
                        }`}
                      />
                      {isWatched ? 'In Watchlist' : 'Add to Watchlist'}
                    </button>

                    <button
                      type="button"
                      onClick={() => onLogHolding(quote.symbol)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Add to Portfolio
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-400">
                  <span className="font-mono text-slate-300">{quote.symbol}</span> ·{' '}
                  {quote.fullExchangeName || quote.exchange}
                  {meta?.sector || insights?.sector ? ` · ${meta?.sector || insights?.sector}` : ''}
                  {meta?.country ? ` · ${meta.country}` : ''}
                </p>
              </div>
            </div>

            <div className="xl:text-right">
              <p className="text-2xl sm:text-3xl font-bold font-mono tabular-nums text-white">
                {formatCurrency(quote.price, 2, currency)}
              </p>
              <p
                className={`text-xs font-mono font-medium tabular-nums mt-0.5 ${
                  up ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {formatSignedCurrency(quote.change, 2, currency)} ({formatSignedPct(quote.changePct)}) Today
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Last exchange update: {updatedTimeStr} · {currency}
              </p>
            </div>
          </section>

          {/* Top 3-Panel Row: Price Chart | Key Financials | About Company */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Price Chart Card */}
            <section
              id="stock-sec-chart"
              className="xl:col-span-5 bg-[#121A26] border border-slate-800 rounded-xl p-5 space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-white">Price Chart</h2>
                  {detailLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />}
                </div>
                <div className="flex items-center gap-1">
                  {TIMEFRAMES.map((tf) => (
                    <button
                      key={tf}
                      type="button"
                      onClick={() => setTimeframe(tf)}
                      className={`px-2 py-1 text-[11px] font-mono rounded-md transition-colors cursor-pointer ${
                        timeframe === tf
                          ? 'bg-emerald-900/70 text-emerald-300 border border-emerald-700/70'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              {inspected && (
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{inspected.date}</span>
                  <span className="font-mono tabular-nums text-white font-semibold">
                    {formatCurrency(inspected.close, 2, currency)}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                <div className="sm:col-span-8">
                  <svg
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-auto block select-none"
                    onMouseLeave={() => setHoverIdx(null)}
                    role="img"
                    aria-label={`${quote.symbol} live price chart`}
                  >
                    <defs>
                      <linearGradient id="darkStockGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={chartColor} stopOpacity="0.28" />
                        <stop offset="100%" stopColor={chartColor} stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {yTicks.map((t, i) => (
                      <g key={i}>
                        <line
                          x1={padL}
                          x2={width - padR}
                          y1={t.y}
                          y2={t.y}
                          stroke="#1E293B"
                          strokeWidth="1"
                        />
                        <text
                          x={padL - 8}
                          y={t.y + 3}
                          textAnchor="end"
                          className="fill-slate-500 text-[10px] font-mono tabular-nums"
                        >
                          {t.val >= 1000 ? `${(t.val / 1000).toFixed(1)}k` : t.val.toFixed(0)}
                        </text>
                      </g>
                    ))}

                    {areaPath && <path d={areaPath} fill="url(#darkStockGrad)" />}

                    {linePath && (
                      <path
                        d={linePath}
                        fill="none"
                        stroke={chartColor}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {history.map((p, idx) => {
                      const x = getX(idx);
                      const showLabel =
                        idx === 0 ||
                        idx === history.length - 1 ||
                        idx === Math.floor(history.length / 2);
                      return (
                        <g key={`${p.timestamp}-${idx}`}>
                          {showLabel && (
                            <text
                              x={x}
                              y={height - 6}
                              textAnchor={
                                idx === 0
                                  ? 'start'
                                  : idx === history.length - 1
                                    ? 'end'
                                    : 'middle'
                              }
                              className="fill-slate-500 text-[10px] font-mono"
                            >
                              {p.date}
                            </text>
                          )}
                          <rect
                            x={x - innerW / Math.max(history.length * 2, 2)}
                            y={padT}
                            width={innerW / Math.max(history.length, 1)}
                            height={innerH}
                            fill="transparent"
                            className="cursor-crosshair"
                            onMouseEnter={() => setHoverIdx(idx)}
                          />
                        </g>
                      );
                    })}

                    {inspected && (
                      <g pointerEvents="none">
                        <line
                          x1={getX(activeIdx)}
                          x2={getX(activeIdx)}
                          y1={padT}
                          y2={padT + innerH}
                          stroke="#334155"
                          strokeWidth="1"
                        />
                        <circle
                          cx={getX(activeIdx)}
                          cy={getY(inspected.close)}
                          r="4"
                          fill={chartColor}
                          stroke="#0B111A"
                          strokeWidth="2"
                        />
                      </g>
                    )}
                  </svg>
                </div>

                {/* Real Exchange OHLC & Range Column */}
                <div className="sm:col-span-4 space-y-2 text-xs border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-4">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Open</span>
                    <span className="font-mono tabular-nums text-slate-200">
                      {latestBar ? formatCurrency(latestBar.open, 2, currency) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Day High</span>
                    <span className="font-mono tabular-nums text-slate-200">
                      {quote.dayHigh !== null ? formatCurrency(quote.dayHigh, 2, currency) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Day Low</span>
                    <span className="font-mono tabular-nums text-slate-200">
                      {quote.dayLow !== null ? formatCurrency(quote.dayLow, 2, currency) : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Prev Close</span>
                    <span className="font-mono tabular-nums text-slate-200">
                      {formatCurrency(quote.previousClose, 2, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">Volume</span>
                    <span className="font-mono tabular-nums text-slate-200">
                      {quote.volume !== null
                        ? quote.volume >= 1_000_000
                          ? `${(quote.volume / 1_000_000).toFixed(2)}M`
                          : quote.volume.toLocaleString('en-US')
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">52W High</span>
                    <span className="font-mono tabular-nums text-slate-200">
                      {quote.fiftyTwoWeekHigh !== null
                        ? formatCurrency(quote.fiftyTwoWeekHigh, 2, currency)
                        : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-400">52W Low</span>
                    <span className="font-mono tabular-nums text-slate-200">
                      {quote.fiftyTwoWeekLow !== null
                        ? formatCurrency(quote.fiftyTwoWeekLow, 2, currency)
                        : '—'}
                    </span>
                  </div>
                  {firstBar && latestBar && (
                    <div className="flex justify-between gap-2 pt-1 border-t border-slate-800/80">
                      <span className="text-slate-400">{timeframe} Change</span>
                      <span
                        className={`font-mono tabular-nums ${
                          latestBar.close >= firstBar.close ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {firstBar.close > 0
                          ? formatSignedPct(((latestBar.close - firstBar.close) / firstBar.close) * 100)
                          : '—'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Key Financials Card (Live Grounded with Plain-English Helpers) */}
            <section
              id="stock-sec-financials"
              className="xl:col-span-4 bg-[#121A26] border border-slate-800 rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-white">Company Numbers</h2>
                  <p className="text-[11px] text-slate-400">Latest 12 months in plain English</p>
                </div>
                <span className="text-[11px] text-emerald-400">Verified live</span>
              </div>

              {insightsLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                  <span>Looking up company financials...</span>
                </div>
              ) : insightsError ? (
                <div className="bg-[#0E1520] border border-rose-900/60 rounded-xl p-4 space-y-2.5 text-xs">
                  <p className="text-rose-300 font-medium">{insightsError}</p>
                  <button
                    type="button"
                    onClick={() => fetchAiInsights(quote.name)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Try Again
                  </button>
                </div>
              ) : insights ? (
                <>
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="bg-[#0E1520] border border-slate-800 rounded-xl p-3">
                      <span className="block text-[11px] text-slate-300">Total Sales</span>
                      <span className="block text-sm font-bold font-mono tabular-nums text-white mt-1 truncate">
                        {insights.revenue}
                      </span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">Revenue</span>
                    </div>
                    <div className="bg-[#0E1520] border border-slate-800 rounded-xl p-3">
                      <span className="block text-[11px] text-slate-300">Profit Kept</span>
                      <span className="block text-sm font-bold font-mono tabular-nums text-white mt-1 truncate">
                        {insights.netIncome}
                      </span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">Net income</span>
                    </div>
                    <div className="bg-[#0E1520] border border-slate-800 rounded-xl p-3">
                      <span className="block text-[11px] text-slate-300">Per Share</span>
                      <span className="block text-sm font-bold font-mono tabular-nums text-white mt-1 truncate">
                        {insights.eps}
                      </span>
                      <span className="block text-[10px] text-slate-500 mt-0.5">Profit / share</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-2 border-t border-slate-800 text-xs">
                    <div>
                      <span className="block text-slate-300">P/E Ratio</span>
                      <span className="font-mono font-bold text-sm tabular-nums text-white mt-0.5 block">
                        {insights.peRatio}
                      </span>
                      <span className="block text-[10px] text-slate-500">Price vs. profit</span>
                    </div>
                    <div>
                      <span className="block text-slate-300">Profit Return</span>
                      <span className="font-mono font-bold text-sm tabular-nums text-white mt-0.5 block">
                        {insights.roe}
                      </span>
                      <span className="block text-[10px] text-slate-500">ROE efficiency</span>
                    </div>
                    <div>
                      <span className="block text-slate-300">Debt Level</span>
                      <span className="font-mono font-bold text-sm tabular-nums text-white mt-0.5 block">
                        {insights.debtToEquity}
                      </span>
                      <span className="block text-[10px] text-slate-500">Debt vs. equity</span>
                    </div>
                  </div>

                  <div className="bg-[#0E1520] border border-slate-800 rounded-xl p-3 text-xs flex items-center justify-between">
                    <span className="text-slate-400">Company Total Value (Market Cap)</span>
                    <span className="font-mono font-semibold text-slate-100">{insights.marketCap}</span>
                  </div>
                </>
              ) : null}
            </section>

            {/* About Company Card */}
            <section
              id="stock-sec-company"
              className="xl:col-span-3 bg-[#121A26] border border-slate-800 rounded-xl p-5 space-y-3"
            >
              <h2 className="text-sm font-semibold text-white">About {quote.name}</h2>
              {insightsLoading ? (
                <div className="py-8 flex items-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Loading company profile...</span>
                </div>
              ) : insights ? (
                <>
                  <p className="text-xs text-slate-300 leading-relaxed">{insights.overview}</p>
                  <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400">Sector</span>
                      <span className="text-slate-200 text-right">{insights.sector}</span>
                    </div>
                    {insights.ceo && insights.ceo !== 'N/A' && (
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-400">CEO</span>
                        <span className="text-slate-200 text-right">{insights.ceo}</span>
                      </div>
                    )}
                    {insights.founded && insights.founded !== 'N/A' && (
                      <div className="flex justify-between gap-2">
                        <span className="text-slate-400">Founded</span>
                        <span className="text-slate-200 font-mono">{insights.founded}</span>
                      </div>
                    )}
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400">Headquarters</span>
                      <span className="text-slate-200 text-right">{insights.headquarters}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400">Employees</span>
                      <span className="text-slate-200 font-mono">{insights.employees}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400">Website</span>
                      <span className="text-emerald-400 font-mono truncate">{insights.website}</span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400">
                  Company profile details require verified grounded research above.
                </p>
              )}
            </section>
          </div>

          {/* Bottom 3-Panel Row: Recent News | AI Insight Summary | Technical Analysis */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Live Recent News */}
            <section
              id="stock-sec-news"
              className="xl:col-span-4 bg-[#121A26] border border-slate-800 rounded-xl p-5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Recent News (Live)</h2>
                <span className="text-[11px] text-slate-400">Yahoo Finance RSS</span>
              </div>
              {news.length === 0 ? (
                <p className="text-xs text-slate-400 py-4">
                  No recent RSS headlines returned for {quote.symbol}.
                </p>
              ) : (
                <div className="divide-y divide-slate-800">
                  {news.map((item, nIdx) => (
                    <a
                      key={`${item.link}-${nIdx}`}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block py-3 first:pt-0 last:pb-0 space-y-1 group"
                    >
                      <p className="text-[11px] text-slate-400">
                        <span>{item.pubDate}</span>
                        <span className="mx-1.5" aria-hidden="true">·</span>
                        <span>{item.source}</span>
                      </p>
                      <h3 className="text-xs font-semibold text-slate-100 group-hover:text-emerald-400 leading-snug flex items-start justify-between gap-2">
                        <span>{item.title}</span>
                        <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 text-slate-500 group-hover:text-emerald-400" />
                      </h3>
                    </a>
                  ))}
                </div>
              )}
            </section>

            {/* Grounded AI Insight Summary */}
            <section
              id="stock-sec-insights"
              className="xl:col-span-5 bg-[#121A26] border border-slate-800 rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">Plain-English Summary</h2>
                  <p className="text-[11px] text-slate-400">What the business does &amp; key pros/cons</p>
                </div>
                <span className="text-[11px] text-emerald-400">{insightsSourceLabel}</span>
              </div>

              {insightsLoading ? (
                <div className="py-10 flex items-center justify-center gap-2 text-xs text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Writing plain-English summary from verified sources...</span>
                </div>
              ) : insights ? (
                <>
                  <p className="text-xs text-slate-200 leading-relaxed">{insights.plainSummary}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 space-y-2">
                      <p className="text-xs font-semibold text-emerald-300">What looks good</p>
                      <ul className="space-y-1.5 text-xs text-slate-200">
                        {(insights.strengths || []).slice(0, 3).map((str, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 space-y-2">
                      <p className="text-xs font-semibold text-rose-300">Things to watch</p>
                      <ul className="space-y-1.5 text-xs text-slate-200">
                        {(insights.risks || []).slice(0, 3).map((r, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <X className="w-3.5 h-3.5 text-rose-400 mt-0.5 shrink-0" />
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {sources.length > 0 && (
                    <div className="pt-2 border-t border-slate-800 space-y-1.5">
                      <p className="text-[11px] font-medium text-slate-400">Sources checked</p>
                      <div className="flex flex-wrap gap-2">
                        {sources.map((src, sIdx) => (
                          <a
                            key={sIdx}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:underline bg-[#0E1520] border border-slate-800 rounded-lg px-2 py-1"
                          >
                            <span className="truncate max-w-[160px]">{src.title}</span>
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-slate-400">
                  {insightsError || 'Summary is currently unavailable.'}
                </p>
              )}

              <p className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Research &amp; education only—not financial advice.</span>
              </p>
            </section>

            {/* Real Computed Price Trend & Safety Check */}
            <section
              id="stock-sec-technical"
              className="xl:col-span-3 bg-[#121A26] border border-slate-800 rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-white">Price Trend Check</h2>
                  <p className="text-[11px] text-slate-400">Simple view of price movement</p>
                </div>
                <span
                  className={`text-xs font-semibold ${
                    technicals.trendDirection === 'Bullish'
                      ? 'text-emerald-400'
                      : technicals.trendDirection === 'Bearish'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                  }`}
                >
                  {technicals.trendDirection === 'Bullish'
                    ? 'Moving Up'
                    : technicals.trendDirection === 'Bearish'
                      ? 'Cooling Off'
                      : 'Steady'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="block text-slate-300">Recent Floor</span>
                  <span className="font-mono font-bold text-slate-100 tabular-nums">
                    {formatCurrency(technicals.supportLevel, 2, currency)}
                  </span>
                  <span className="block text-[10px] text-slate-500">30-day low</span>
                </div>
                <div>
                  <span className="block text-slate-300">Recent Ceiling</span>
                  <span className="font-mono font-bold text-slate-100 tabular-nums">
                    {formatCurrency(technicals.resistanceLevel, 2, currency)}
                  </span>
                  <span className="block text-[10px] text-slate-500">30-day high</span>
                </div>
                <div>
                  <span className="block text-slate-300">50-Day Avg</span>
                  <span className="font-mono font-bold text-slate-100 tabular-nums">
                    {formatCurrency(technicals.ma50, 2, currency)}
                  </span>
                  <span className="block text-[10px] text-slate-500">Short-term price</span>
                </div>
                <div>
                  <span className="block text-slate-300">200-Day Avg</span>
                  <span className="font-mono font-bold text-slate-100 tabular-nums">
                    {formatCurrency(technicals.ma200, 2, currency)}
                  </span>
                  <span className="block text-[10px] text-slate-500">Long-term price</span>
                </div>
                <div>
                  <span className="block text-slate-300">Momentum (RSI)</span>
                  <span className="font-mono font-bold text-slate-100 tabular-nums">
                    {technicals.rsi14}
                  </span>
                  <span className="block text-[10px] text-slate-500">70+ means heated</span>
                </div>
                <div>
                  <span className="block text-slate-300">Price Swings</span>
                  <span className="font-bold text-slate-100">
                    {describePriceSwings(technicals.annualizedVolPct).label}{' '}
                    <span className="font-mono text-slate-400 font-normal">
                      ({technicals.annualizedVolPct}%)
                    </span>
                  </span>
                  <span className="block text-[10px] text-slate-500">1-year bumpiness</span>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed pt-2 border-t border-slate-800">
                {technicals.above50Ma && technicals.above200Ma
                  ? `${quote.name} is trading above both its recent and long-term average prices, showing steady upward demand.`
                  : technicals.above200Ma
                    ? `${quote.name} is holding above its long-term average price, even with some shorter-term ups and downs.`
                    : `${quote.name} is trading below its recent average prices right now, which often signals a cooler or cautious period.`}
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
