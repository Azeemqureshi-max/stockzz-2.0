import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Compass,
  Info,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { INITIAL_INVESTMENT_REQUIREMENTS } from '../data/liveDefaults';
import {
  describePriceSwings,
  EXCHANGE_LABELS,
  getFactorWeights,
  HORIZON_LABELS,
  PREFERENCE_LABELS,
  RISK_LABELS,
} from '../utils/recommendationEngine';
import {
  HorizonTerm,
  InvestmentRequirements,
  LiveUniverseStock,
  MarketExchangeOption,
  OptionalPreference,
  RiskLevel,
  SavedRecommendationSession,
  Sector,
} from '../types/market';
import { formatCurrency, formatSignedPct } from '../utils/formatters';
import { EmptyStateCard, ListSkeleton } from '../components/Skeletons';

interface DiscoverScreenProps {
  isLoadingMarket: boolean;
  isCalculating: boolean;
  stocks: LiveUniverseStock[];
  savedRequirements: InvestmentRequirements;
  savedSession: SavedRecommendationSession | null;
  onSubmitRequirements: (requirements: InvestmentRequirements) => void;
  onResetRequirements: () => void;
  watchlistTickers: Set<string>;
  onToggleWatchlist: (ticker: string) => void;
  onSelectStock: (ticker: string) => void;
  onLogHolding: (ticker: string) => void;
}

const ALL_MARKETS: MarketExchangeOption[] = ['NASDAQ', 'NYSE', 'NSE', 'LSE', 'XETRA'];
const ALL_SECTORS: Sector[] = [
  'Technology',
  'Healthcare',
  'Clean Energy & Industrials',
  'Consumer Staples',
  'Financial Services',
];
const RISK_LEVELS: RiskLevel[] = ['low', 'medium', 'high'];
const HORIZONS: HorizonTerm[] = ['short', 'medium', 'long'];
const OPTIONAL_PREFERENCES: OptionalPreference[] = [
  'dividend',
  'growth',
  'stable',
  'value',
];

export const DiscoverScreen: React.FC<DiscoverScreenProps> = ({
  isLoadingMarket,
  isCalculating,
  stocks,
  savedRequirements,
  savedSession,
  onSubmitRequirements,
  onResetRequirements,
  watchlistTickers,
  onToggleWatchlist,
  onSelectStock,
  onLogHolding,
}) => {
  const [draft, setDraft] = useState<InvestmentRequirements>(savedRequirements);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showScoringInfo, setShowScoringInfo] = useState(false);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setDraft(savedRequirements);
  }, [savedRequirements]);

  const toggleMarket = (mkt: MarketExchangeOption) => {
    setValidationError(null);
    setDraft((prev) => ({
      ...prev,
      markets: prev.markets.includes(mkt)
        ? prev.markets.filter((m) => m !== mkt)
        : [...prev.markets, mkt],
    }));
  };

  const toggleSector = (sec: Sector) => {
    setValidationError(null);
    setDraft((prev) => ({
      ...prev,
      sectors: prev.sectors.includes(sec)
        ? prev.sectors.filter((s) => s !== sec)
        : [...prev.sectors, sec],
    }));
  };

  const togglePreference = (pref: OptionalPreference) => {
    setDraft((prev) => ({
      ...prev,
      preferences: prev.preferences.includes(pref)
        ? prev.preferences.filter((p) => p !== pref)
        : [...prev.preferences, pref],
    }));
  };

  const toggleDetails = (symbol: string) => {
    setExpandedCards((prev) => ({ ...prev, [symbol]: !prev[symbol] }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (draft.markets.length === 0) {
      setValidationError('Pick at least one country or market to search in.');
      return;
    }
    if (draft.sectors.length === 0) {
      setValidationError('Pick at least one industry you are interested in.');
      return;
    }
    setValidationError(null);
    onSubmitRequirements(draft);
  };

  const handleReset = () => {
    setValidationError(null);
    setDraft(INITIAL_INVESTMENT_REQUIREMENTS);
    onResetRequirements();
  };

  const previewWeights = getFactorWeights(draft.riskTolerance, draft.investmentHorizon);
  const activeResults = savedSession?.results || [];
  const showBusy = isCalculating || (isLoadingMarket && stocks.length === 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold text-emerald-700 mb-1">
          Personalized Stock Finder
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Find Stocks That Fit You
        </h1>
        <p className="text-sm text-slate-600 mt-1 max-w-2xl">
          Answer a few simple questions about your goals. Stockzz filters live companies and explains in plain English why each stock fits you.
        </p>
      </div>

      {/* Investment Requirements Form */}
      <form
        onSubmit={handleSubmit}
        noValidate
        className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6"
      >
        {/* Step 1: Markets */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-semibold text-slate-900">
              1. Where do you want to look?
            </label>
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => {
                  setValidationError(null);
                  setDraft((prev) => ({ ...prev, markets: [...ALL_MARKETS] }));
                }}
                className="text-emerald-700 hover:underline font-medium cursor-pointer"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, markets: [] }))}
                className="text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_MARKETS.map((mkt) => {
              const selected = draft.markets.includes(mkt);
              return (
                <button
                  key={mkt}
                  type="button"
                  onClick={() => toggleMarket(mkt)}
                  aria-pressed={selected}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl border transition-colors cursor-pointer whitespace-nowrap ${
                    selected
                      ? 'bg-emerald-500/10 border-emerald-600 text-emerald-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {selected && <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
                  <span>{EXCHANGE_LABELS[mkt]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Sectors */}
        <div className="space-y-2.5 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-semibold text-slate-900">
              2. Which industries interest you?
            </label>
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => {
                  setValidationError(null);
                  setDraft((prev) => ({ ...prev, sectors: [...ALL_SECTORS] }));
                }}
                className="text-emerald-700 hover:underline font-medium cursor-pointer"
              >
                Select all
              </button>
              <button
                type="button"
                onClick={() => setDraft((prev) => ({ ...prev, sectors: [] }))}
                className="text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_SECTORS.map((sec) => {
              const selected = draft.sectors.includes(sec);
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => toggleSector(sec)}
                  aria-pressed={selected}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl border transition-colors cursor-pointer whitespace-nowrap ${
                    selected
                      ? 'bg-emerald-500/10 border-emerald-600 text-emerald-900'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {selected && <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />}
                  <span>{sec}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3 & 4: Risk Comfort + Time Horizon */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
          <div className="space-y-2.5">
            <span className="block text-sm font-semibold text-slate-900">
              3. How much ups &amp; downs are you okay with?
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {RISK_LEVELS.map((lvl) => {
                const selected = draft.riskTolerance === lvl;
                return (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, riskTolerance: lvl }))}
                    aria-pressed={selected}
                    className={`p-3.5 text-left rounded-xl border transition-colors cursor-pointer ${
                      selected
                        ? 'border-emerald-600 bg-emerald-500/10 text-emerald-950'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-xs font-semibold">{RISK_LABELS[lvl].title}</span>
                    <span className="block text-[11px] text-slate-600 mt-1 leading-snug">
                      {RISK_LABELS[lvl].subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2.5">
            <span className="block text-sm font-semibold text-slate-900">
              4. How long do you plan to hold?
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {HORIZONS.map((term) => {
                const selected = draft.investmentHorizon === term;
                return (
                  <button
                    key={term}
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, investmentHorizon: term }))}
                    aria-pressed={selected}
                    className={`p-3.5 text-left rounded-xl border transition-colors cursor-pointer ${
                      selected
                        ? 'border-emerald-600 bg-emerald-500/10 text-emerald-950'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="block text-xs font-semibold">{HORIZON_LABELS[term].title}</span>
                    <span className="block text-[11px] text-slate-600 mt-1 leading-snug">
                      {HORIZON_LABELS[term].subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step 5: Optional Extras + Search + Submit */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-6 space-y-2">
            <span className="block text-sm font-semibold text-slate-900">
              5. Anything extra you care about? <span className="font-normal text-slate-500">(Optional)</span>
            </span>
            <div className="flex flex-wrap gap-2">
              {OPTIONAL_PREFERENCES.map((pref) => {
                const selected = draft.preferences.includes(pref);
                return (
                  <button
                    key={pref}
                    type="button"
                    onClick={() => togglePreference(pref)}
                    aria-pressed={selected}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors cursor-pointer whitespace-nowrap ${
                      selected
                        ? 'bg-slate-900 border-slate-900 text-white'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {selected && <Check className="w-3 h-3 shrink-0" />}
                    <span>{PREFERENCE_LABELS[pref]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-3">
            <label htmlFor="req-query" className="block text-xs font-medium text-slate-700 mb-1.5">
              Specific company (Optional)
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="req-query"
                type="search"
                value={draft.query}
                onChange={(e) => setDraft((prev) => ({ ...prev, query: e.target.value }))}
                placeholder="e.g. Apple, India..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="lg:col-span-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>

            <button
              type="submit"
              disabled={isCalculating}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              {isCalculating ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Compass className="w-3.5 h-3.5" />
              )}
              Find My Matches
            </button>
          </div>
        </div>

        {/* Optional How It Works Disclosure */}
        <div className="pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowScoringInfo((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-700" />
            <span>How we rank stocks for your answers</span>
            {showScoringInfo ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showScoringInfo && (
            <p className="mt-2 text-xs text-slate-600 bg-slate-50 border border-slate-200/80 rounded-xl p-3 leading-relaxed">
              Based on <strong className="text-slate-900">{RISK_LABELS[draft.riskTolerance].title}</strong> and{' '}
              <strong className="text-slate-900">{HORIZON_LABELS[draft.investmentHorizon].title}</strong>, Stockzz weights{' '}
              <span className="font-mono tabular-nums">
                Company Health {previewWeights.fundamentals}% · Risk Fit {previewWeights.riskAlignment}% ·
                Price Trend {previewWeights.technicals}% · Industry {previewWeights.industryTrend}% ·
                News {previewWeights.news}%
              </span>.
            </p>
          )}
        </div>

        {validationError && (
          <div
            role="alert"
            className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-2.5 flex items-center gap-2 text-xs text-rose-800"
          >
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}
      </form>

      {/* Personalized Recommendation Results */}
      <section aria-label="Personalized stock recommendations" className="space-y-4">
        {showBusy ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-emerald-700">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Finding live companies that match your preferences...</span>
            </div>
            <ListSkeleton rows={3} />
          </div>
        ) : !savedSession ? (
          <EmptyStateCard
            icon={<Compass className="w-5 h-5" />}
            title="Ready when you are"
            description="Pick your options above and click Find My Matches to see plain-English stock suggestions tailored to you."
            primaryAction={{
              label: 'Find My Matches',
              onClick: () => {
                if (draft.markets.length === 0 || draft.sectors.length === 0) {
                  setValidationError('Pick at least one country/market and one industry.');
                  return;
                }
                onSubmitRequirements(draft);
              },
            }}
          />
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Your Top Matches ({activeResults.length}{' '}
                  {activeResults.length === 1 ? 'company' : 'companies'})
                </h2>
                <p className="text-xs text-slate-500">
                  Matched for {RISK_LABELS[savedSession.requirements.riskTolerance].title} ·{' '}
                  {HORIZON_LABELS[savedSession.requirements.investmentHorizon].title} · Saved automatically
                </p>
              </div>
              {savedSession.usedDemoFallback && (
                <span className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5">
                  Demo data—not live market data.
                </span>
              )}
            </div>

            {savedSession.incompleteDataMessage && (
              <div
                role="status"
                className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 flex items-start gap-2.5 text-xs text-amber-900"
              >
                <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                <p className="font-medium">{savedSession.incompleteDataMessage}</p>
              </div>
            )}

            {activeResults.length === 0 ? (
              <EmptyStateCard
                icon={<Compass className="w-5 h-5" />}
                title="No companies match all of those boxes"
                description="Try picking more countries or industries above, then click Find My Matches again."
                primaryAction={{
                  label: 'Reset Options',
                  onClick: handleReset,
                }}
              />
            ) : (
              <div className="space-y-4">
                {activeResults.map((rec, idx) => {
                  const { stock } = rec;
                  const inWatchlist = watchlistTickers.has(stock.symbol.toUpperCase());
                  const up = stock.changePct >= 0;
                  const f = stock.fundamentals;
                  const swing = describePriceSwings(stock.technicals.annualizedVolPct);
                  const isExpanded = Boolean(expandedCards[stock.symbol]);

                  return (
                    <article
                      key={stock.symbol}
                      className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-5"
                    >
                      {/* Clean Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="font-mono font-bold text-emerald-700">
                              #{idx + 1}
                            </span>
                            <span>{stock.country}</span>
                            <span aria-hidden="true">·</span>
                            <span>{stock.sector}</span>
                            {rec.isDemoFallback && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-amber-700">
                                  Demo data—not live market data.
                                </span>
                              </>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => onSelectStock(stock.symbol)}
                            className="text-xl font-bold text-slate-900 hover:text-emerald-700 text-left transition-colors cursor-pointer"
                          >
                            {stock.name}{' '}
                            <span className="text-sm font-mono font-normal text-slate-500 ml-1">
                              {stock.symbol}
                            </span>
                          </button>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`inline-flex items-center gap-1.5 text-sm font-bold font-mono tabular-nums px-3 py-1.5 rounded-xl border ${
                              rec.matchLabel === 'Strong Match'
                                ? 'bg-emerald-500/10 border-emerald-200 text-emerald-800'
                                : rec.matchLabel === 'Good Match'
                                  ? 'bg-sky-50 border-sky-200 text-sky-800'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                            {rec.overallScore}/100 Match
                          </span>
                        </div>
                      </div>

                      {/* Plain-English Why It Fits */}
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {rec.plainLanguageExplanation}
                      </p>

                      {/* 3 Simple Metric Boxes (Matching Stockzz Reference Site) */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="rounded-xl border border-slate-200 bg-[#fafaf9] p-3.5">
                          <p className="text-slate-500">
                            {rec.isDemoFallback ? 'Sample price' : 'Current share price'}
                          </p>
                          <div className="mt-1 flex items-baseline gap-2">
                            <span className="text-base font-bold font-mono tabular-nums text-slate-900">
                              {formatCurrency(stock.price, 2, stock.currency)}
                            </span>
                            <span
                              className={`font-mono font-semibold tabular-nums ${
                                up ? 'text-emerald-700' : 'text-rose-700'
                              }`}
                            >
                              {formatSignedPct(stock.changePct)} today
                            </span>
                          </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-[#fafaf9] p-3.5">
                          <p className="text-slate-500">Day-to-day price swings</p>
                          <p className="mt-1 text-base font-bold text-slate-900">
                            {swing.label}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">{swing.hint}</p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-[#fafaf9] p-3.5">
                          <p className="text-slate-500">Past 1 year</p>
                          <p
                            className={`mt-1 text-base font-bold font-mono tabular-nums ${
                              stock.oneYearReturnPct >= 0 ? 'text-emerald-700' : 'text-rose-700'
                            }`}
                          >
                            {formatSignedPct(stock.oneYearReturnPct, 1)}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {stock.oneYearReturnPct >= 0 ? 'Up over 12 months' : 'Down over 12 months'}
                          </p>
                        </div>
                      </div>

                      {/* Soft Emerald / Red Callout Boxes Matching Stockzz Reference */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl bg-emerald-500/10 p-3.5 space-y-2">
                          <p className="font-semibold text-emerald-950">What looks good</p>
                          <ul className="space-y-1.5 text-emerald-950/90">
                            {rec.strengths.map((str, sIdx) => (
                              <li key={sIdx} className="flex items-start gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                                <span>{str}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="rounded-xl bg-red-500/10 p-3.5 space-y-2">
                          <p className="font-semibold text-rose-950">Things to watch out for</p>
                          <ul className="space-y-1.5 text-rose-950/90">
                            {rec.risks.map((r, rIdx) => (
                              <li key={rIdx} className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                                <span>{r}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Actions + Optional Detailed Numbers */}
                      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => toggleDetails(stock.symbol)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 cursor-pointer"
                        >
                          <span>{isExpanded ? 'Hide detailed numbers' : 'See detailed numbers'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onToggleWatchlist(stock.symbol)}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition-colors cursor-pointer whitespace-nowrap ${
                              inWatchlist
                                ? 'border-emerald-200 bg-emerald-500/10 text-emerald-800'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {inWatchlist ? (
                              <>
                                <BookmarkCheck className="w-3.5 h-3.5" />
                                Saved
                              </>
                            ) : (
                              <>
                                <Bookmark className="w-3.5 h-3.5" />
                                Watchlist
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => onLogHolding(stock.symbol)}
                            className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Log Holding
                          </button>

                          <button
                            type="button"
                            onClick={() => onSelectStock(stock.symbol)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Full Analysis
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="rounded-xl border border-slate-200 bg-[#fafaf9] p-4 space-y-3 text-xs">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                              <span className="text-slate-500 block">P/E Ratio (Price vs Profit)</span>
                              <span className="font-mono font-semibold text-slate-900">
                                {f?.peRatio !== null ? `${f.peRatio}x` : 'Not reported'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Profit on Money (ROE)</span>
                              <span className="font-mono font-semibold text-slate-900">
                                {f?.roePct !== null ? `${f.roePct}%` : 'Not reported'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Yearly Dividend</span>
                              <span className="font-mono font-semibold text-slate-900">
                                {f?.dividendYieldPct !== null ? `${f.dividendYieldPct}%` : 'None / N/A'}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Yearly Volatility</span>
                              <span className="font-mono font-semibold text-slate-900">
                                {stock.technicals.annualizedVolPct}%
                              </span>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 flex flex-wrap gap-x-4 gap-y-1 font-mono tabular-nums">
                            <span>Company Health: {rec.factorScores.fundamentals}/100 ({rec.appliedWeights.fundamentals}% weight)</span>
                            <span>Risk Fit: {rec.factorScores.riskAlignment}/100 ({rec.appliedWeights.riskAlignment}% weight)</span>
                            <span>Price Trend: {rec.factorScores.technicals}/100 ({rec.appliedWeights.technicals}% weight)</span>
                            <span>Industry: {rec.factorScores.industryTrend}/100 ({rec.appliedWeights.industryTrend}% weight)</span>
                            <span>News: {rec.factorScores.news}/100 ({rec.appliedWeights.news}% weight)</span>
                          </div>

                          <p className="text-[11px] text-slate-500">
                            Matches: {rec.matchedRequirements.join(' · ')}
                          </p>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}

            <p className="inline-flex items-center gap-1.5 text-xs text-slate-500 pt-1">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>
                Research information only, not financial advice. Stockzz does not execute trades or connect to brokers.
              </span>
            </p>
          </>
        )}
      </section>
    </div>
  );
};
