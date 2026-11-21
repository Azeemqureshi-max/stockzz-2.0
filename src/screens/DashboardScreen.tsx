import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';
import { EnrichedHolding } from '../hooks/useMarketLensState';
import {
  AppTab,
  LiveMarketIndex,
  LiveUniverseStock,
  MarketAlert,
  WatchlistItem,
} from '../types/market';
import {
  formatCurrency,
  formatSignedCurrency,
  formatSignedPct,
} from '../utils/formatters';
import { describePriceSwings } from '../utils/recommendationEngine';
import { LiveIndexChart, MiniSparkline } from '../components/Charts';
import { DashboardSkeleton, ErrorBanner } from '../components/Skeletons';

interface DashboardScreenProps {
  isLoading: boolean;
  marketError: string | null;
  onRetryMarket: () => void;
  userName: string;
  portfolioSummary: {
    currency: string;
    hasMixedCurrencies: boolean;
    totalInvested: number;
    totalCurrent: number;
    totalGainLoss: number;
    totalGainLossPct: number;
    todayGainLoss: number;
    todayGainLossPct: number;
  };
  enrichedHoldings: EnrichedHolding[];
  indices: LiveMarketIndex[];
  stocks: LiveUniverseStock[];
  watchlist: WatchlistItem[];
  alerts: MarketAlert[];
  onNavigate: (tab: AppTab) => void;
  onSelectStock: (ticker: string) => void;
  onDismissAlert: (id: string) => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const LOGO_COLORS = [
  'bg-amber-700 text-white',
  'bg-sky-700 text-white',
  'bg-rose-700 text-white',
  'bg-emerald-700 text-white',
  'bg-indigo-700 text-white',
];

function computeLiveIdeaScore(stock: LiveUniverseStock): number {
  let score = 62;
  if (stock.technicals.above50Ma) score += 10;
  if (stock.technicals.above200Ma) score += 10;
  if (stock.oneYearReturnPct > 15) score += 8;
  else if (stock.oneYearReturnPct > 0) score += 4;
  if (stock.technicals.rsi14 >= 42 && stock.technicals.rsi14 <= 66) score += 5;
  if (stock.technicals.annualizedVolPct < 28) score += 3;
  return Math.max(45, Math.min(96, score));
}

function buildSimpleCardSummary(stock: LiveUniverseStock): {
  summary: string;
  good: string[];
  watchOut: string[];
} {
  const f = stock.fundamentals;
  const swing = describePriceSwings(stock.technicals.annualizedVolPct);

  const summary =
    stock.technicals.trendDirection === 'Bullish'
      ? `${stock.name} has been moving upward lately with ${swing.label.toLowerCase()} day-to-day price swings.`
      : stock.technicals.trendDirection === 'Bearish'
        ? `${stock.name} has pulled back recently and sits in a slower patch right now.`
        : `${stock.name} is holding fairly steady in the ${stock.sector.toLowerCase()} industry.`;

  const good: string[] = [];
  if (stock.oneYearReturnPct >= 5) {
    good.push(`Up +${stock.oneYearReturnPct}% over the past year`);
  }
  if (f?.dividendYieldPct !== null && f.dividendYieldPct >= 1.5) {
    good.push(`Pays a ${f.dividendYieldPct}% yearly dividend`);
  } else if (f?.debtToEquity !== null && f.debtToEquity <= 0.45) {
    good.push('Very little company debt');
  } else if (stock.technicals.above200Ma) {
    good.push('Price sits above its long-term trend');
  }
  if (good.length < 2) {
    good.push(`${swing.label} day-to-day price movement`);
  }

  const watchOut: string[] = [];
  if (stock.technicals.annualizedVolPct >= 28) {
    watchOut.push('Price can swing up and down quickly');
  } else if (f?.peRatio !== null && f.peRatio > 35) {
    watchOut.push('Shares cost a lot vs. yearly profit');
  } else if (!stock.technicals.above50Ma) {
    watchOut.push('Share price cooled off in recent weeks');
  } else {
    watchOut.push('Prices still move with the wider market');
  }

  return {
    summary,
    good: good.slice(0, 2),
    watchOut: watchOut.slice(0, 2),
  };
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  isLoading,
  marketError,
  onRetryMarket,
  userName,
  portfolioSummary,
  enrichedHoldings,
  indices,
  stocks,
  watchlist,
  alerts,
  onNavigate,
  onSelectStock,
  onDismissAlert,
}) => {
  const [selectedIndexSymbol, setSelectedIndexSymbol] = useState<string>('^GSPC');

  const topSuggestions = useMemo(() => {
    return [...stocks]
      .map((stock) => ({ stock, score: computeLiveIdeaScore(stock) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [stocks]);

  const activeIndex = useMemo(() => {
    return indices.find((i) => i.symbol === selectedIndexSymbol) || indices[0] || null;
  }, [indices, selectedIndexSymbol]);

  const indexChartPoints = useMemo(() => {
    if (!activeIndex || !activeIndex.sparkline.length) return [];
    const len = activeIndex.sparkline.length;
    return activeIndex.sparkline.map((val, idx) => ({
      date: idx === len - 1 ? 'Latest' : `-${len - 1 - idx}d`,
      close: val,
    }));
  }, [activeIndex]);

  if (isLoading && stocks.length === 0 && indices.length === 0) {
    return <DashboardSkeleton />;
  }

  const sp500 = indices.find((i) => i.symbol === '^GSPC');
  const nasdaq = indices.find((i) => i.symbol === '^IXIC');
  const marketsPositiveCount = indices.filter((i) => i.changePct >= 0).length;
  const marketMoodLabel =
    indices.length === 0
      ? 'Unavailable'
      : marketsPositiveCount >= Math.ceil(indices.length / 2)
        ? 'Mostly Up Today'
        : 'Mixed / Down';

  const totalPositive = portfolioSummary.totalGainLoss >= 0;
  const activeAlerts = alerts.filter((a) => !a.dismissed);
  const latestAlert = activeAlerts[0];

  return (
    <div className="space-y-6">
      {marketError && (
        <ErrorBanner
          message={marketError}
          retryLabel="Retry Live Feed"
          onRetry={onRetryMarket}
        />
      )}

      {/* Greeting + Personalized Finder Callout */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {getGreeting()}, {userName}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Today&apos;s markets and simple stock ideas worth checking out
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('requirements')}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-700" />
          <span>Find stocks that fit your goals</span>
        </button>
      </div>

      {/* 3 Simple Summary Cards */}
      <section aria-label="Account summary" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5">
          <p className="text-xs font-medium text-slate-500">Global Market Mood</p>
          <p
            className={`text-xl font-bold mt-1.5 ${
              marketsPositiveCount >= Math.ceil(Math.max(indices.length, 1) / 2)
                ? 'text-emerald-600'
                : 'text-amber-600'
            }`}
          >
            {marketMoodLabel}
          </p>
          <p className="text-xs text-slate-600 mt-1 font-mono tabular-nums truncate">
            {sp500 && nasdaq
              ? `S&P 500 ${formatSignedPct(sp500.changePct)} · NASDAQ ${formatSignedPct(nasdaq.changePct)}`
              : 'Loading live market indexes...'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('portfolio')}
          className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-5 text-left transition-colors cursor-pointer"
        >
          <p className="text-xs font-medium text-slate-500">Your Portfolio Worth</p>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {formatCurrency(portfolioSummary.totalCurrent, 2, portfolioSummary.currency)}
          </p>
          <p
            className={`text-xs font-medium mt-1 font-mono tabular-nums ${
              totalPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {formatSignedPct(portfolioSummary.totalGainLossPct, 2)} total ·{' '}
            {formatSignedCurrency(portfolioSummary.todayGainLoss, 2, portfolioSummary.currency)} today
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('watchlist')}
          className="bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-5 text-left transition-colors cursor-pointer"
        >
          <p className="text-xs font-medium text-slate-500">Saved Watchlist</p>
          <p className="text-xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {watchlist.length} {watchlist.length === 1 ? 'stock' : 'stocks'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Companies you&apos;re keeping an eye on ({enrichedHoldings.length} owned)
          </p>
        </button>
      </section>

      {/* Top Stock Suggestions for You (Plain-English Cards) */}
      <section aria-label="Top stock suggestions" className="space-y-3.5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-base font-bold text-slate-900">
            Companies Worth Researching Today
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('requirements')}
            className="text-xs font-semibold text-emerald-700 hover:underline transition-colors cursor-pointer whitespace-nowrap"
          >
            Personalize this list &rarr;
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {topSuggestions.map(({ stock, score }, idx) => {
            const up = stock.changePct >= 0;
            const monogram = stock.symbol.replace(/\..*$/, '').slice(0, 2);
            const simple = buildSimpleCardSummary(stock);

            return (
              <article
                key={stock.symbol}
                className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                          LOGO_COLORS[idx % LOGO_COLORS.length]
                        }`}
                      >
                        {monogram}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-slate-900 truncate">
                          {stock.name}
                        </h3>
                        <p className="text-xs text-slate-500 truncate">
                          {stock.symbol} · {stock.sector}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="block text-base font-bold font-mono tabular-nums text-emerald-700 leading-none">
                        {score}
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        Health Score
                      </span>
                    </div>
                  </div>

                  {/* Live Price */}
                  <div className="flex items-center justify-between gap-2 text-xs bg-[#fafaf9] border border-slate-200/80 rounded-xl px-3 py-2">
                    <span className="text-slate-500">Live share price</span>
                    <span className="font-mono font-semibold tabular-nums text-slate-900">
                      {formatCurrency(stock.price, 2, stock.currency)}{' '}
                      <span className={up ? 'text-emerald-600' : 'text-rose-600'}>
                        ({formatSignedPct(stock.changePct)})
                      </span>
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {simple.summary}
                  </p>

                  {/* Soft Green / Red Callout Boxes Matching Stockzz Reference */}
                  <div className="space-y-2 text-xs">
                    <div className="rounded-xl bg-emerald-500/10 p-3 space-y-1.5">
                      <p className="font-semibold text-emerald-950 text-[11px]">What looks good</p>
                      {simple.good.map((str, sIdx) => (
                        <p key={sIdx} className="flex items-start gap-1.5 text-emerald-950/90">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
                          <span>{str}</span>
                        </p>
                      ))}
                    </div>

                    <div className="rounded-xl bg-red-500/10 p-3 space-y-1.5">
                      <p className="font-semibold text-rose-950 text-[11px]">Things to watch</p>
                      {simple.watchOut.map((riskTitle, rIdx) => (
                        <p key={rIdx} className="flex items-start gap-1.5 text-rose-950/90">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 mt-0.5 shrink-0" aria-hidden="true" />
                          <span>{riskTitle}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectStock(stock.symbol)}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  Understand this stock
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {/* Live Index Chart + Global Markets + Recent Alert */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <section className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                How Major Stock Markets Performed (Past Month)
              </h2>
              <p className="text-xs text-slate-500">
                Live daily market closes across the US, UK, India, and Germany
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1">
              {indices.map((idx) => {
                const selected = (activeIndex?.symbol || '') === idx.symbol;
                return (
                  <button
                    key={idx.symbol}
                    type="button"
                    onClick={() => setSelectedIndexSymbol(idx.symbol)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                      selected
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {idx.displayName}
                  </button>
                );
              })}
            </div>
          </div>

          <LiveIndexChart
            symbolName={activeIndex?.displayName || 'Market Index'}
            currency="INDEX"
            points={indexChartPoints}
          />
        </section>

        <aside className="lg:col-span-4 space-y-4">
          <section className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-slate-900">World Markets Right Now</h2>
            {indices.length === 0 ? (
              <p className="text-xs text-slate-500">No live index data available right now.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {indices.map((idx) => {
                  const up = idx.changePct >= 0;
                  return (
                    <button
                      key={idx.symbol}
                      type="button"
                      onClick={() => setSelectedIndexSymbol(idx.symbol)}
                      className="w-full py-2.5 first:pt-1 last:pb-0 flex items-center justify-between gap-2 text-left hover:bg-slate-50/70 rounded cursor-pointer"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {idx.displayName}
                        </p>
                        <p className="text-[11px] font-mono tabular-nums text-slate-500">
                          {idx.price.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <MiniSparkline data={idx.sparkline} positive={up} width={56} height={20} />
                      <span
                        className={`text-xs font-mono font-semibold tabular-nums shrink-0 ${
                          up ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {formatSignedPct(idx.changePct)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {latestAlert && (
            <section className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  Heads Up · {latestAlert.ticker}
                </span>
                <button
                  type="button"
                  onClick={() => onDismissAlert(latestAlert.id)}
                  className="text-xs text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
              <button
                type="button"
                onClick={() => onSelectStock(latestAlert.ticker)}
                className="text-xs font-medium text-slate-800 hover:text-emerald-700 text-left flex items-center gap-1 cursor-pointer"
              >
                <span>{latestAlert.title}</span>
                <ArrowUpRight className="w-3 h-3 shrink-0" />
              </button>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {latestAlert.message}
              </p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
};
