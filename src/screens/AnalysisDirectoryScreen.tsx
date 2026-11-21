import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, LineChart, Loader2, Search, Star } from 'lucide-react';
import { LiveUniverseStock, SearchQuoteItem } from '../types/market';
import { formatCurrency, formatSignedPct } from '../utils/formatters';
import { EmptyStateCard, ListSkeleton } from '../components/Skeletons';

interface AnalysisDirectoryScreenProps {
  isLoading: boolean;
  stocks: LiveUniverseStock[];
  watchlistTickers: Set<string>;
  onSelectStock: (ticker: string) => void;
  onToggleWatchlist: (ticker: string) => void;
}

const EXCHANGES = ['All', 'NASDAQ', 'NYSE', 'NSE', 'LSE', 'XETRA'];

const MONOGRAM_STYLES = [
  'bg-amber-700 text-white',
  'bg-sky-700 text-white',
  'bg-slate-900 text-white',
  'bg-emerald-700 text-white',
  'bg-indigo-700 text-white',
  'bg-rose-700 text-white',
];

function matchesExchange(stock: LiveUniverseStock, filter: string): boolean {
  if (filter === 'All') return true;
  const ex = `${stock.exchange} ${stock.fullExchangeName} ${stock.symbol}`.toUpperCase();
  if (filter === 'NASDAQ') return ex.includes('NMS') || ex.includes('NASDAQ');
  if (filter === 'NYSE') return ex.includes('NYQ') || ex.includes('NYSE');
  if (filter === 'NSE') return ex.includes('NSI') || ex.includes('NSE') || ex.endsWith('.NS');
  if (filter === 'LSE') return ex.includes('LSE') || ex.endsWith('.L');
  if (filter === 'XETRA') return ex.includes('GER') || ex.includes('XETRA') || ex.endsWith('.DE');
  return ex.includes(filter);
}

export const AnalysisDirectoryScreen: React.FC<AnalysisDirectoryScreenProps> = ({
  isLoading,
  stocks,
  watchlistTickers,
  onSelectStock,
  onToggleWatchlist,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState('All');
  const [remoteResults, setRemoteResults] = useState<SearchQuoteItem[]>([]);
  const [searchingRemote, setSearchingRemote] = useState(false);

  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setRemoteResults([]);
      setSearchingRemote(false);
      return;
    }

    const controller = new AbortController();
    setSearchingRemote(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as { quotes?: SearchQuoteItem[] };
          setRemoteResults(data.quotes || []);
        }
      } catch {
        // Ignore aborted
      } finally {
        setSearchingRemote(false);
      }
    }, 280);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery]);

  const filteredStocks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return stocks.filter((s) => {
      if (!matchesExchange(s, exchangeFilter)) return false;
      if (q) {
        const hay = `${s.symbol} ${s.name} ${s.exchange} ${s.fullExchangeName} ${s.sector} ${s.country}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [stocks, searchQuery, exchangeFilter]);

  const curSet = useMemo(() => new Set(stocks.map((s) => s.symbol.toUpperCase())), [stocks]);
  const extraRemote = useMemo(
    () => remoteResults.filter((r) => !curSet.has(r.symbol.toUpperCase())),
    [remoteResults, curSet]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Analysis</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Search and analyse any global stock with live market quotes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search global tickers (TSLA, TATASTEEL.NS)..."
              aria-label="Search stocks or companies"
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
            />
          </div>

          <select
            value={exchangeFilter}
            onChange={(e) => setExchangeFilter(e.target.value)}
            aria-label="Filter by exchange"
            className="px-3 py-2 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-emerald-600"
          >
            {EXCHANGES.map((ex) => (
              <option key={ex} value={ex}>
                {ex === 'All' ? 'All Exchanges' : ex}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Exchange Filter Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {EXCHANGES.map((ex) => {
          const active = exchangeFilter === ex;
          return (
            <button
              key={ex}
              type="button"
              onClick={() => setExchangeFilter(ex)}
              className={`px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {ex}
            </button>
          );
        })}
      </div>

      {isLoading && stocks.length === 0 ? (
        <ListSkeleton rows={5} />
      ) : (
        <>
          {filteredStocks.length > 0 && (
            <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs text-slate-500 bg-[#fafaf9]">
                      <th className="py-3.5 px-5 text-left font-medium">Company</th>
                      <th className="py-3.5 px-4 text-right font-medium">Share Price</th>
                      <th className="py-3.5 px-4 text-right font-medium">Today</th>
                      <th className="py-3.5 px-4 text-right font-medium">1-Year Low – High</th>
                      <th className="py-3.5 px-5 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredStocks.map((stock, idx) => {
                      const up = stock.changePct >= 0;
                      const isWatched = watchlistTickers.has(stock.symbol.toUpperCase());

                      return (
                        <tr
                          key={stock.symbol}
                          onClick={() => onSelectStock(stock.symbol)}
                          className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 px-5">
                            <div className="flex items-center gap-3.5">
                              <span
                                className={`w-9 h-9 rounded-full flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                                  MONOGRAM_STYLES[idx % MONOGRAM_STYLES.length]
                                }`}
                              >
                                {stock.symbol.replace(/\..*$/, '').slice(0, 2)}
                              </span>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 truncate">
                                  {stock.name}
                                </p>
                                <p className="text-xs font-mono text-slate-500">
                                  {stock.symbol} · {stock.fullExchangeName || stock.exchange}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-semibold tabular-nums text-slate-900 whitespace-nowrap">
                            {formatCurrency(stock.price, 2, stock.currency)}
                          </td>
                          <td
                            className={`py-3.5 px-4 text-right font-mono font-medium tabular-nums whitespace-nowrap ${
                              up ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            {formatSignedPct(stock.changePct)}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono text-xs tabular-nums text-slate-600 whitespace-nowrap">
                            {stock.fiftyTwoWeekLow !== null && stock.fiftyTwoWeekHigh !== null
                              ? `${formatCurrency(stock.fiftyTwoWeekLow, 0, stock.currency)} – ${formatCurrency(stock.fiftyTwoWeekHigh, 0, stock.currency)}`
                              : '—'}
                          </td>
                          <td
                            className="py-3.5 px-5 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => onSelectStock(stock.symbol)}
                                title={`Analyse ${stock.symbol}`}
                                aria-label={`Analyse ${stock.symbol}`}
                                className="p-2 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                              >
                                <LineChart className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onToggleWatchlist(stock.symbol)}
                                title={
                                  isWatched
                                    ? `Remove ${stock.symbol} from watchlist`
                                    : `Add ${stock.symbol} to watchlist`
                                }
                                aria-label={
                                  isWatched
                                    ? `Remove ${stock.symbol} from watchlist`
                                    : `Add ${stock.symbol} to watchlist`
                                }
                                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                                  isWatched
                                    ? 'text-amber-500 hover:bg-amber-50'
                                    : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100'
                                }`}
                              >
                                <Star
                                  className={`w-4 h-4 ${isWatched ? 'fill-amber-400' : ''}`}
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Global Exchange Live Search Results */}
          {searchQuery.trim().length >= 2 && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
                <h2 className="text-xs font-semibold text-slate-700">
                  Live Exchange Lookup for &quot;{searchQuery.trim()}&quot;
                </h2>
                {searchingRemote && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Searching...
                  </span>
                )}
              </div>

              {extraRemote.length > 0 ? (
                <div className="divide-y divide-slate-200">
                  {extraRemote.map((item) => (
                    <div
                      key={item.symbol}
                      className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          {item.symbol} · {item.exchange}
                          {item.sector ? ` · ${item.sector}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectStock(item.symbol)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer whitespace-nowrap shrink-0"
                      >
                        Open Live Analysis
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : !searchingRemote && filteredStocks.length === 0 ? (
                <EmptyStateCard
                  icon={<Search className="w-5 h-5" />}
                  title="No matching global stocks found"
                  description="Try searching by official ticker symbol (e.g. TSLA, GOOGL, AMZN, INFY.NS) or reset your filters."
                  primaryAction={{
                    label: 'Reset Filters',
                    onClick: () => {
                      setSearchQuery('');
                      setExchangeFilter('All');
                    },
                  }}
                />
              ) : null}
            </div>
          )}

          {searchQuery.trim().length < 2 && filteredStocks.length === 0 && (
            <EmptyStateCard
              icon={<Search className="w-5 h-5" />}
              title="No curated stocks on this exchange filter"
              description="Type a ticker or company name in the search box to query any global exchange live, or select All Exchanges."
              primaryAction={{
                label: 'Show All Exchanges',
                onClick: () => setExchangeFilter('All'),
              }}
            />
          )}
        </>
      )}
    </div>
  );
};
