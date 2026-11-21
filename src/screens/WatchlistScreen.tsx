import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bookmark,
  Loader2,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  AppTab,
  LiveQuote,
  LiveUniverseStock,
  SearchQuoteItem,
  WatchlistItem,
} from '../types/market';
import { formatCurrency, formatSignedPct } from '../utils/formatters';
import { MiniSparkline } from '../components/Charts';
import { EmptyStateCard } from '../components/Skeletons';

interface WatchlistScreenProps {
  watchlist: WatchlistItem[];
  stocks: LiveUniverseStock[];
  liveQuotes: Record<string, LiveQuote>;
  universeMap: Map<string, LiveUniverseStock>;
  onToggleWatchlist: (ticker: string) => void;
  onUpdateNote: (ticker: string, note: string) => void;
  onLoadStarterWatchlist: () => void;
  onSelectStock: (ticker: string) => void;
  onLogHolding: (ticker: string) => void;
  onNavigate: (tab: AppTab) => void;
}

export const WatchlistScreen: React.FC<WatchlistScreenProps> = ({
  watchlist,
  stocks,
  liveQuotes,
  universeMap,
  onToggleWatchlist,
  onUpdateNote,
  onLoadStarterWatchlist,
  onSelectStock,
  onLogHolding,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [addQuery, setAddQuery] = useState('');
  const [addResults, setAddResults] = useState<SearchQuoteItem[]>([]);
  const [searchingAdd, setSearchingAdd] = useState(false);

  const watchedSet = useMemo(
    () => new Set(watchlist.map((w) => w.ticker.toUpperCase())),
    [watchlist]
  );

  useEffect(() => {
    const q = addQuery.trim();
    if (!q) {
      setAddResults([]);
      setSearchingAdd(false);
      return;
    }
    const controller = new AbortController();
    setSearchingAdd(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as { quotes?: SearchQuoteItem[] };
          setAddResults(data.quotes || []);
        }
      } catch {
        // Ignore aborted
      } finally {
        setSearchingAdd(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [addQuery]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return watchlist
      .map((item) => {
        const upper = item.ticker.toUpperCase();
        return {
          item,
          quote: liveQuotes[upper] || universeMap.get(upper) || null,
          uni: universeMap.get(upper) || null,
        };
      })
      .filter((entry) => {
        if (!q) return true;
        const name = entry.quote?.name || '';
        const exchange = entry.quote?.fullExchangeName || entry.quote?.exchange || '';
        const hay = `${entry.item.ticker} ${name} ${exchange} ${entry.item.note}`.toLowerCase();
        return hay.includes(q);
      });
  }, [watchlist, liveQuotes, universeMap, searchQuery]);

  const quickUnwatched = useMemo(
    () => stocks.filter((s) => !watchedSet.has(s.symbol.toUpperCase())).slice(0, 6),
    [stocks, watchedSet]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-emerald-700 mb-1">
            Live Watchlist · Real Exchange Quotes
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Tracked Stocks &amp; Research Notes
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Follow any global stock live, monitor daily moves, and save personal research notes locally.
          </p>
        </div>

        {/* Live Search to Add Any Ticker */}
        <div className="relative w-full lg:w-80 shrink-0">
          <Plus className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={addQuery}
            onChange={(e) => setAddQuery(e.target.value)}
            placeholder="Add any global stock (e.g. TSLA, INFY.NS)..."
            aria-label="Search stock to add to watchlist"
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
          />

          {addQuery.trim() !== '' && (
            <div className="absolute right-0 left-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-30">
              {searchingAdd ? (
                <div className="px-3.5 py-2.5 flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Searching global tickers...</span>
                </div>
              ) : addResults.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {addResults.map((r) => {
                    const already = watchedSet.has(r.symbol.toUpperCase());
                    return (
                      <li key={r.symbol}>
                        <button
                          type="button"
                          onClick={() => {
                            if (!already) onToggleWatchlist(r.symbol);
                            setAddQuery('');
                          }}
                          className="w-full px-3.5 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between gap-2 cursor-pointer"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {r.name}
                            </p>
                            <p className="text-[11px] font-mono text-slate-500">
                              {r.symbol} · {r.exchange}
                            </p>
                          </div>
                          <span className="text-[11px] font-medium text-emerald-700 shrink-0">
                            {already ? 'In Watchlist' : '+ Add'}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="px-3.5 py-2.5 text-xs text-slate-500">
                  No matches found for &quot;{addQuery}&quot;.
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {quickUnwatched.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500">Quick add:</span>
          {quickUnwatched.map((s) => (
            <button
              key={s.symbol}
              type="button"
              onClick={() => onToggleWatchlist(s.symbol)}
              className="px-2.5 py-1 bg-white border border-slate-200 hover:border-emerald-500 rounded-md font-mono text-slate-700 hover:text-emerald-700 cursor-pointer"
            >
              + {s.symbol}
            </button>
          ))}
        </div>
      )}

      {watchlist.length === 0 ? (
        <EmptyStateCard
          icon={<Bookmark className="w-5 h-5" />}
          title="Your watchlist is empty"
          description="Search any global stock above or open the Requirements tab to find live companies matching your goals."
          primaryAction={{
            label: 'Match by Requirements',
            onClick: () => onNavigate('requirements'),
          }}
          secondaryAction={{
            label: 'Restore Starter Watchlist',
            onClick: onLoadStarterWatchlist,
          }}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tracked stocks or notes..."
                aria-label="Search watchlist"
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600"
              />
            </div>
            <span className="text-xs text-slate-500 font-mono tabular-nums">
              {filteredItems.length} tracked
            </span>
          </div>

          {filteredItems.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-600">
              No watched stocks match your filter.{' '}
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-emerald-700 hover:underline font-medium cursor-pointer"
              >
                Clear filter
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredItems.map(({ item, quote, uni }) => {
                const up = (quote?.changePct ?? 0) >= 0;

                return (
                  <div
                    key={item.ticker}
                    className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 hover:bg-slate-50/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                        <button
                          type="button"
                          onClick={() => onSelectStock(item.ticker)}
                          className="text-base font-bold text-slate-900 hover:text-emerald-700 text-left cursor-pointer transition-colors"
                        >
                          <span className="font-mono mr-2">{item.ticker}</span>
                          {quote?.name || item.ticker}
                        </button>
                        {quote && (
                          <span className="text-xs text-slate-500">
                            {quote.fullExchangeName || quote.exchange}
                            {uni ? ` · ${uni.sector} · ${uni.riskProfile} Risk` : ''}
                          </span>
                        )}
                      </div>

                      <div className="max-w-xl">
                        <label htmlFor={`note-${item.ticker}`} className="sr-only">
                          Personal research note for {item.ticker}
                        </label>
                        <input
                          id={`note-${item.ticker}`}
                          type="text"
                          value={item.note}
                          onChange={(e) => onUpdateNote(item.ticker, e.target.value)}
                          placeholder="Add a personal beginner research note..."
                          className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-between lg:justify-end gap-5 shrink-0">
                      {quote?.sparkline && quote.sparkline.length >= 2 && (
                        <MiniSparkline data={quote.sparkline} positive={up} width={72} height={26} />
                      )}

                      <div className="text-right min-w-[96px]">
                        <p className="text-sm font-mono font-bold tabular-nums text-slate-900">
                          {quote ? formatCurrency(quote.price, 2, quote.currency) : 'Loading...'}
                        </p>
                        {quote && (
                          <p
                            className={`inline-flex items-center gap-0.5 text-xs font-mono tabular-nums font-medium ${
                              up ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {up ? (
                              <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                            ) : (
                              <ArrowDownRight className="w-3 h-3" aria-hidden="true" />
                            )}
                            {formatSignedPct(quote.changePct)}
                          </p>
                        )}
                      </div>

                      {quote && quote.fiftyTwoWeekLow !== null && quote.fiftyTwoWeekHigh !== null && (
                        <div className="hidden sm:block text-right text-xs text-slate-500 min-w-[116px]">
                          <p className="text-[11px] text-slate-400">52W Range</p>
                          <p className="font-mono tabular-nums text-slate-800">
                            {formatCurrency(quote.fiftyTwoWeekLow, 0, quote.currency)} –{' '}
                            {formatCurrency(quote.fiftyTwoWeekHigh, 0, quote.currency)}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectStock(item.ticker)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Analyze
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onLogHolding(item.ticker)}
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Log Holding
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleWatchlist(item.ticker)}
                          aria-label={`Remove ${item.ticker} from watchlist`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
