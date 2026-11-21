import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpDown,
  ArrowUpRight,
  Briefcase,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { EnrichedHolding } from '../hooks/useMarketLensState';
import { PortfolioHolding } from '../types/market';
import {
  formatCurrency,
  formatSignedCurrency,
  formatSignedPct,
} from '../utils/formatters';
import { EmptyStateCard } from '../components/Skeletons';

interface PortfolioScreenProps {
  enrichedHoldings: EnrichedHolding[];
  portfolioSummary: {
    currency: string;
    hasMixedCurrencies: boolean;
    totalInvested: number;
    totalCurrent: number;
    totalGainLoss: number;
    totalGainLossPct: number;
  };
  onOpenAdd: () => void;
  onOpenEdit: (holding: PortfolioHolding) => void;
  onRemoveHolding: (id: string) => void;
  onLoadStarterHoldings: () => void;
  onSelectStock: (ticker: string) => void;
}

type SortField = 'value' | 'gainLoss' | 'ticker' | 'date';

export const PortfolioScreen: React.FC<PortfolioScreenProps> = ({
  enrichedHoldings,
  portfolioSummary,
  onOpenAdd,
  onOpenEdit,
  onRemoveHolding,
  onLoadStarterHoldings,
  onSelectStock,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [exchangeFilter, setExchangeFilter] = useState('All');
  const [sortBy, setSortBy] = useState<SortField>('value');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const exchanges = useMemo(() => {
    const set = new Set<string>(enrichedHoldings.map((h) => h.exchange));
    return ['All', ...Array.from(set)];
  }, [enrichedHoldings]);

  const filteredHoldings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return enrichedHoldings
      .filter((h) => {
        if (exchangeFilter !== 'All' && h.exchange !== exchangeFilter) return false;
        if (q) {
          const hay = `${h.ticker} ${h.companyName} ${h.exchange}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'value') {
          return (b.currentValue ?? b.investedValue) - (a.currentValue ?? a.investedValue);
        }
        if (sortBy === 'gainLoss') return (b.gainLoss ?? 0) - (a.gainLoss ?? 0);
        if (sortBy === 'ticker') return a.ticker.localeCompare(b.ticker);
        return b.purchaseDate.localeCompare(a.purchaseDate);
      });
  }, [enrichedHoldings, searchQuery, exchangeFilter, sortBy]);

  const isPositive = portfolioSummary.totalGainLoss >= 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-emerald-700 mb-1">
            Personal Portfolio Tracker · Live Market Valuations
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Personal Portfolio Holdings
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Add, edit, or remove positions manually to track cost basis, live exchange value, and unrealized gain/loss. No broker execution.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAdd}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Add Holding
        </button>
      </div>

      {/* Portfolio Totals Strip */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">
            Total Invested Value ({portfolioSummary.currency})
          </p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {formatCurrency(portfolioSummary.totalInvested, 2, portfolioSummary.currency)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {portfolioSummary.hasMixedCurrencies
              ? `Primary ${portfolioSummary.currency} positions`
              : 'Sum of quantity × purchase price'}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Current Live Value</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1.5">
            {formatCurrency(portfolioSummary.totalCurrent, 2, portfolioSummary.currency)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Valued at live exchange prices</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-xs font-medium text-slate-500">Unrealized Gain / Loss</p>
          <p
            className={`text-2xl font-bold font-mono tabular-nums mt-1.5 ${
              isPositive ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {formatSignedCurrency(portfolioSummary.totalGainLoss, 2, portfolioSummary.currency)}
          </p>
          <p
            className={`inline-flex items-center gap-1 text-xs font-medium mt-1 tabular-nums ${
              isPositive ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {isPositive ? (
              <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
            ) : (
              <ArrowDownRight className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            {formatSignedPct(portfolioSummary.totalGainLossPct)} overall
          </p>
        </div>
      </section>

      {enrichedHoldings.length === 0 ? (
        <EmptyStateCard
          icon={<Briefcase className="w-5 h-5" />}
          title="Your portfolio is empty"
          description="Log your first holding with ticker, exchange, purchase date, quantity, and purchase price—or restore the starter positions."
          primaryAction={{
            label: 'Add First Holding',
            onClick: onOpenAdd,
          }}
          secondaryAction={{
            label: 'Restore Starter Positions',
            onClick: onLoadStarterHoldings,
          }}
        />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter ticker or company..."
                  aria-label="Filter holdings"
                  className="w-full pl-9 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-600"
                />
              </div>

              <select
                value={exchangeFilter}
                onChange={(e) => setExchangeFilter(e.target.value)}
                aria-label="Filter by exchange"
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-emerald-600"
              >
                {exchanges.map((ex) => (
                  <option key={ex} value={ex}>
                    {ex === 'All' ? 'All Exchanges' : ex}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <label htmlFor="portfolio-sort" className="text-xs text-slate-500">
                Sort:
              </label>
              <select
                id="portfolio-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortField)}
                className="px-2.5 py-1.5 text-xs font-medium bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-emerald-600"
              >
                <option value="value">Current Value</option>
                <option value="gainLoss">Gain / Loss</option>
                <option value="date">Purchase Date</option>
                <option value="ticker">Ticker (A–Z)</option>
              </select>
            </div>
          </div>

          {filteredHoldings.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-600">
              No holdings match your current filter.{' '}
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setExchangeFilter('All');
                }}
                className="text-emerald-700 hover:underline font-medium cursor-pointer"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-xs text-slate-500">
                    <th className="py-3 px-4 text-left font-medium">Stock / Exchange</th>
                    <th className="py-3 px-4 text-left font-medium">Purchase Date</th>
                    <th className="py-3 px-4 text-right font-medium">Qty</th>
                    <th className="py-3 px-4 text-right font-medium">Avg Cost</th>
                    <th className="py-3 px-4 text-right font-medium">Live Price</th>
                    <th className="py-3 px-4 text-right font-medium">Invested</th>
                    <th className="py-3 px-4 text-right font-medium">Current Value</th>
                    <th className="py-3 px-4 text-right font-medium">Gain / Loss</th>
                    <th className="py-3 px-4 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredHoldings.map((h) => {
                    const rowUp = (h.gainLoss ?? 0) >= 0;
                    return (
                      <tr key={h.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => onSelectStock(h.ticker)}
                            className="text-left group cursor-pointer"
                          >
                            <span className="block font-medium text-slate-900 group-hover:text-emerald-700">
                              <span className="font-mono font-semibold mr-2">{h.ticker}</span>
                              {h.liveQuote?.name || h.companyName}
                            </span>
                            <span className="block text-xs text-slate-500">
                              {h.liveQuote?.fullExchangeName || h.exchange}
                            </span>
                          </button>
                        </td>
                        <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-slate-600 whitespace-nowrap">
                          {h.purchaseDate}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-900">
                          {h.quantity}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                          {formatCurrency(h.purchasePrice, 2, h.currency)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-900">
                          {h.currentPrice !== null
                            ? formatCurrency(h.currentPrice, 2, h.currency)
                            : 'Loading...'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-700">
                          {formatCurrency(h.investedValue, 2, h.currency)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-semibold tabular-nums text-slate-900">
                          {h.currentValue !== null
                            ? formatCurrency(h.currentValue, 2, h.currency)
                            : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                          {h.gainLoss !== null && h.gainLossPct !== null ? (
                            <>
                              <span
                                className={`block font-semibold ${
                                  rowUp ? 'text-emerald-700' : 'text-rose-700'
                                }`}
                              >
                                {formatSignedCurrency(h.gainLoss, 2, h.currency)}
                              </span>
                              <span
                                className={`inline-flex items-center gap-0.5 text-xs ${
                                  rowUp ? 'text-emerald-700' : 'text-rose-700'
                                }`}
                              >
                                {rowUp ? (
                                  <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                                ) : (
                                  <ArrowDownRight className="w-3 h-3" aria-hidden="true" />
                                )}
                                {formatSignedPct(h.gainLossPct)}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {confirmDeleteId === h.id ? (
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  onRemoveHolding(h.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2 py-1 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded cursor-pointer"
                              >
                                Remove
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => onOpenEdit(h)}
                                aria-label={`Edit ${h.ticker} holding`}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(h.id)}
                                aria-label={`Remove ${h.ticker} holding`}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
