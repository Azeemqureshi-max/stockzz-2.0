import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  INITIAL_DISCOVER_CRITERIA,
  INITIAL_HOLDINGS,
  INITIAL_INVESTMENT_REQUIREMENTS,
  INITIAL_NOTIFICATION_SETTINGS,
  INITIAL_WATCHLIST,
} from '../data/liveDefaults';
import { DEMO_FALLBACK_UNIVERSE } from '../data/demoFallbackUniverse';
import { calculatePersonalizedRecommendations } from '../utils/recommendationEngine';
import {
  AppTab,
  DiscoverCriteria,
  InvestmentRequirements,
  LiveMarketIndex,
  LiveQuote,
  LiveUniverseStock,
  MarketAlert,
  NotificationSettings,
  PortfolioHolding,
  RankedStockResult,
  SavedRecommendationSession,
  WatchlistItem,
} from '../types/market';

const STORAGE_KEY = 'stockzz_live_state_v1';
const SESSION_KEY = 'stockzz_session_v1';

interface SessionState {
  isAuthenticated: boolean;
  userName: string;
  userEmail: string;
}

interface PersistedState {
  holdings: PortfolioHolding[];
  watchlist: WatchlistItem[];
  customAlerts: MarketAlert[];
  dismissedAlertIds: string[];
  readAlertIds: string[];
  notificationSettings: NotificationSettings;
  discoverCriteria: DiscoverCriteria;
  investmentRequirements: InvestmentRequirements;
  recommendationSession: SavedRecommendationSession | null;
  selectedStockTicker: string;
}

export interface EnrichedHolding extends PortfolioHolding {
  liveQuote?: LiveQuote;
  currency: string;
  currentPrice: number | null;
  dayChangePct: number;
  investedValue: number;
  currentValue: number | null;
  gainLoss: number | null;
  gainLossPct: number | null;
}

function getDefaultPersistedState(): PersistedState {
  return {
    holdings: INITIAL_HOLDINGS,
    watchlist: INITIAL_WATCHLIST,
    customAlerts: [],
    dismissedAlertIds: [],
    readAlertIds: [],
    notificationSettings: INITIAL_NOTIFICATION_SETTINGS,
    discoverCriteria: INITIAL_DISCOVER_CRITERIA,
    investmentRequirements: INITIAL_INVESTMENT_REQUIREMENTS,
    recommendationSession: null,
    selectedStockTicker: 'AAPL',
  };
}

function readFromStorage(): { state: PersistedState; error: string | null } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { state: getDefaultPersistedState(), error: null };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    const defaults = getDefaultPersistedState();
    return {
      state: {
        holdings: Array.isArray(parsed.holdings) ? parsed.holdings : defaults.holdings,
        watchlist: Array.isArray(parsed.watchlist) ? parsed.watchlist : defaults.watchlist,
        customAlerts: Array.isArray(parsed.customAlerts) ? parsed.customAlerts : [],
        dismissedAlertIds: Array.isArray(parsed.dismissedAlertIds)
          ? parsed.dismissedAlertIds
          : [],
        readAlertIds: Array.isArray(parsed.readAlertIds) ? parsed.readAlertIds : [],
        notificationSettings:
          parsed.notificationSettings && typeof parsed.notificationSettings === 'object'
            ? {
                ...defaults.notificationSettings,
                ...parsed.notificationSettings,
                notificationEmail:
                  typeof parsed.notificationSettings.notificationEmail === 'string'
                    ? parsed.notificationSettings.notificationEmail
                    : '',
              }
            : defaults.notificationSettings,
        discoverCriteria:
          parsed.discoverCriteria && typeof parsed.discoverCriteria === 'object'
            ? { ...defaults.discoverCriteria, ...parsed.discoverCriteria }
            : defaults.discoverCriteria,
        investmentRequirements:
          parsed.investmentRequirements && typeof parsed.investmentRequirements === 'object'
            ? {
                ...defaults.investmentRequirements,
                ...parsed.investmentRequirements,
                markets: Array.isArray(parsed.investmentRequirements.markets)
                  ? parsed.investmentRequirements.markets
                  : defaults.investmentRequirements.markets,
                sectors: Array.isArray(parsed.investmentRequirements.sectors)
                  ? parsed.investmentRequirements.sectors
                  : defaults.investmentRequirements.sectors,
                preferences: Array.isArray(parsed.investmentRequirements.preferences)
                  ? parsed.investmentRequirements.preferences
                  : [],
              }
            : defaults.investmentRequirements,
        recommendationSession:
          parsed.recommendationSession &&
          typeof parsed.recommendationSession === 'object' &&
          Array.isArray(parsed.recommendationSession.results)
            ? parsed.recommendationSession
            : null,
        selectedStockTicker:
          typeof parsed.selectedStockTicker === 'string' && parsed.selectedStockTicker.trim()
            ? parsed.selectedStockTicker.toUpperCase()
            : defaults.selectedStockTicker,
      },
      error: null,
    };
  } catch {
    return {
      state: getDefaultPersistedState(),
      error: 'Could not read saved browser preferences. Restored starter portfolio & watchlist.',
    };
  }
}

function readSession(): SessionState {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) {
      return { isAuthenticated: false, userName: 'Alex', userEmail: 'alex.morgan@stockzz.app' };
    }
    const parsed = JSON.parse(raw) as Partial<SessionState>;
    return {
      isAuthenticated: Boolean(parsed.isAuthenticated),
      userName: parsed.userName || 'Alex',
      userEmail: parsed.userEmail || 'alex.morgan@stockzz.app',
    };
  } catch {
    return { isAuthenticated: false, userName: 'Alex', userEmail: 'alex.morgan@stockzz.app' };
  }
}

export function rankStocksForCriteria(
  stocks: LiveUniverseStock[],
  criteria: DiscoverCriteria
): RankedStockResult[] {
  const queryLower = criteria.query.trim().toLowerCase();

  const candidates = stocks.filter((stock) => {
    if (criteria.market !== 'All' && stock.region !== criteria.market) {
      return false;
    }
    if (criteria.sector !== 'All' && stock.sector !== criteria.sector) {
      return false;
    }
    if (queryLower) {
      const hay = `${stock.symbol} ${stock.name} ${stock.sector} ${stock.country} ${stock.exchange}`.toLowerCase();
      if (!hay.includes(queryLower)) {
        return false;
      }
    }
    return true;
  });

  const scored: RankedStockResult[] = candidates.map((stock) => {
    let score = 52;
    const reasons: string[] = [];

    if (criteria.market !== 'All') {
      score += 10;
      reasons.push(`Listed in ${stock.region} (${stock.symbol} · ${stock.fullExchangeName}).`);
    } else {
      reasons.push(`Global equity on ${stock.fullExchangeName} (${stock.country}) in ${stock.sector}.`);
    }

    if (stock.riskProfile === criteria.riskTolerance) {
      score += 22;
      reasons.push(
        `Matches ${criteria.riskTolerance} profile with ${stock.technicals.annualizedVolPct}% annualized 1Y volatility.`
      );
    } else if (
      (criteria.riskTolerance === 'Moderate' && stock.riskProfile === 'Conservative') ||
      (criteria.riskTolerance === 'Growth-Oriented' && stock.riskProfile === 'Moderate')
    ) {
      score += 10;
      reasons.push(
        `Lower ${stock.technicals.annualizedVolPct}% annualized volatility (${stock.riskProfile}) than your upper limit.`
      );
    } else if (
      criteria.riskTolerance === 'Conservative' &&
      stock.riskProfile === 'Growth-Oriented'
    ) {
      score -= 16;
      reasons.push(
        `Caution: Higher ${stock.technicals.annualizedVolPct}% 1Y volatility exceeds Conservative preference.`
      );
    } else {
      reasons.push(
        `Live 1Y annualized volatility is ${stock.technicals.annualizedVolPct}% (${stock.riskProfile}).`
      );
    }

    if (stock.technicals.above50Ma && stock.technicals.above200Ma) {
      score += 12;
      reasons.push(
        `Trading above 50-day (${stock.technicals.ma50}) and 200-day (${stock.technicals.ma200}) moving averages; 1Y return ${stock.oneYearReturnPct >= 0 ? '+' : ''}${stock.oneYearReturnPct}%.`
      );
    } else if (stock.technicals.above200Ma) {
      score += 6;
      reasons.push(
        `Holding above long-term 200-day MA (${stock.technicals.ma200}) with RSI(14) at ${stock.technicals.rsi14}.`
      );
    } else {
      reasons.push(
        `Currently consolidating below 50D/200D averages; RSI(14) at ${stock.technicals.rsi14} (${stock.oneYearReturnPct >= 0 ? '+' : ''}${stock.oneYearReturnPct}% 1Y).`
      );
    }

    if (criteria.timeHorizon === '5+ Years' && stock.oneYearReturnPct > 10) {
      score += 5;
    } else if (criteria.timeHorizon === '1-3 Years' && stock.technicals.annualizedVolPct < 24) {
      score += 6;
    }

    const clamped = Math.max(30, Math.min(97, score));
    const matchLabel: RankedStockResult['matchLabel'] =
      clamped >= 82 ? 'Strong Match' : clamped >= 66 ? 'Good Match' : 'Partial Match';

    return {
      stock,
      score: clamped,
      matchLabel,
      reasons: reasons.slice(0, 3),
    };
  });

  return scored.sort((a, b) => b.score - a.score);
}

export function useMarketLensState() {
  const initialLoad = useMemo(() => readFromStorage(), []);
  const [session, setSession] = useState<SessionState>(() => readSession());
  const [persisted, setPersisted] = useState<PersistedState>(initialLoad.state);
  const [storageError, setStorageError] = useState<string | null>(initialLoad.error);
  const [activeTab, setActiveTab] = useState<AppTab>('suggestions');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live Market State from Express Backend
  const [indices, setIndices] = useState<LiveMarketIndex[]>([]);
  const [universeStocks, setUniverseStocks] = useState<LiveUniverseStock[]>([]);
  const [liveQuotes, setLiveQuotes] = useState<Record<string, LiveQuote>>({});
  const [marketLoading, setMarketLoading] = useState<boolean>(true);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);
  const [recommendationLoading, setRecommendationLoading] = useState<boolean>(false);
  const [emailDeliveryState, setEmailDeliveryState] = useState<{
    sending: boolean;
    error: string | null;
    result: {
      sent: boolean;
      configured: boolean;
      toEmail: string;
      sentAt?: string;
      subject: string;
      bodyText: string;
      mailtoUrl: string;
    } | null;
  }>({ sending: false, error: null, result: null });
  const autoDispatchedSigRef = useRef<string>('');

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      setStorageError('Unable to save changes to browser storage. Changes apply to this session.');
    }
  }, [persisted]);

  useEffect(() => {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // Ignore session quota errors
    }
  }, [session]);

  const trackedSymbolsKey = useMemo(() => {
    const syms = new Set<string>();
    persisted.holdings.forEach((h) => syms.add(h.ticker.toUpperCase()));
    persisted.watchlist.forEach((w) => syms.add(w.ticker.toUpperCase()));
    return Array.from(syms).sort().join(',');
  }, [persisted.holdings, persisted.watchlist]);

  const fetchAllLiveMarketData = useCallback(
    async (silent = false) => {
      if (!silent) setMarketLoading(true);
      setMarketError(null);
      try {
        const requests: Promise<Response>[] = [
          fetch('/api/market/indices'),
          fetch('/api/market/universe'),
        ];
        if (trackedSymbolsKey) {
          requests.push(
            fetch(`/api/market/quotes?symbols=${encodeURIComponent(trackedSymbolsKey)}`)
          );
        }

        const [idxRes, uniRes, quotesRes] = await Promise.all(requests);

        if (!idxRes.ok) {
          const errJson = (await idxRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(errJson.error || 'Failed to fetch live global indices.');
        }
        if (!uniRes.ok) {
          const errJson = (await uniRes.json().catch(() => ({}))) as { error?: string };
          throw new Error(errJson.error || 'Failed to fetch live stock universe.');
        }

        const idxData = (await idxRes.json()) as {
          indices: LiveMarketIndex[];
          fetchedAt: string;
        };
        const uniData = (await uniRes.json()) as {
          stocks: LiveUniverseStock[];
          fetchedAt: string;
        };

        const mergedQuotes: Record<string, LiveQuote> = {};
        uniData.stocks.forEach((s) => {
          mergedQuotes[s.symbol.toUpperCase()] = s;
        });

        if (quotesRes && quotesRes.ok) {
          const qData = (await quotesRes.json()) as { quotes: Record<string, LiveQuote> };
          Object.entries(qData.quotes || {}).forEach(([sym, q]) => {
            mergedQuotes[sym.toUpperCase()] = q;
          });
        }

        setIndices(idxData.indices || []);
        setUniverseStocks(uniData.stocks || []);
        setLiveQuotes((prev) => ({ ...prev, ...mergedQuotes }));
        setLastUpdatedAt(idxData.fetchedAt || new Date().toISOString());
      } catch (err) {
        setMarketError(
          err instanceof Error
            ? err.message
            : 'Unable to reach live market data endpoints.'
        );
      } finally {
        setMarketLoading(false);
      }
    },
    [trackedSymbolsKey]
  );

  useEffect(() => {
    if (!session.isAuthenticated) return;
    fetchAllLiveMarketData(false);
  }, [session.isAuthenticated, fetchAllLiveMarketData]);

  // Refresh quotes if user adds a brand new custom ticker to holdings/watchlist
  useEffect(() => {
    if (!session.isAuthenticated || !trackedSymbolsKey) return;
    const missing = trackedSymbolsKey
      .split(',')
      .filter((s) => s && !liveQuotes[s]);
    if (missing.length === 0) return;

    fetch(`/api/market/quotes?symbols=${encodeURIComponent(missing.join(','))}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { quotes?: Record<string, LiveQuote> } | null) => {
        if (data?.quotes) {
          setLiveQuotes((prev) => ({ ...prev, ...data.quotes }));
        }
      })
      .catch(() => {
        // Handled per-row as unavailable
      });
  }, [session.isAuthenticated, trackedSymbolsKey, liveQuotes]);

  const login = useCallback((email: string, name?: string) => {
    const cleanEmail = email.trim();
    const cleanName = (name || 'Alex').trim();
    const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
    setSession({
      isAuthenticated: true,
      userName: formattedName,
      userEmail: cleanEmail,
    });
    setPersisted((prev) => ({
      ...prev,
      notificationSettings: {
        ...prev.notificationSettings,
        emailNotificationsEnabled: true,
        notificationEmail: cleanEmail,
      },
    }));
    setActiveTab('suggestions');
  }, []);

  const updateUserEmail = useCallback(
    (newEmail: string) => {
      const cleanEmail = newEmail.trim();
      setSession((prev) => ({ ...prev, userEmail: cleanEmail }));
      setPersisted((prev) => ({
        ...prev,
        notificationSettings: {
          ...prev.notificationSettings,
          notificationEmail: cleanEmail,
        },
      }));
      showToast(`Alert notifications will use ${cleanEmail}.`);
    },
    [showToast]
  );

  const logout = useCallback(() => {
    setSession((prev) => ({ ...prev, isAuthenticated: false }));
  }, []);

  const universeMap = useMemo(() => {
    const map = new Map<string, LiveUniverseStock>();
    universeStocks.forEach((s) => map.set(s.symbol.toUpperCase(), s));
    return map;
  }, [universeStocks]);

  const enrichedHoldings: EnrichedHolding[] = useMemo(() => {
    return persisted.holdings.map((h) => {
      const upper = h.ticker.toUpperCase();
      const liveQuote = liveQuotes[upper] || universeMap.get(upper);
      const currentPrice = liveQuote ? liveQuote.price : null;
      const investedValue = Number((h.quantity * h.purchasePrice).toFixed(2));
      const currentValue =
        currentPrice !== null ? Number((h.quantity * currentPrice).toFixed(2)) : null;
      const gainLoss =
        currentValue !== null ? Number((currentValue - investedValue).toFixed(2)) : null;
      const gainLossPct =
        gainLoss !== null && investedValue > 0 ? (gainLoss / investedValue) * 100 : null;

      return {
        ...h,
        liveQuote,
        currency: liveQuote?.currency || 'USD',
        currentPrice,
        dayChangePct: liveQuote?.changePct ?? 0,
        investedValue,
        currentValue,
        gainLoss,
        gainLossPct,
      };
    });
  }, [persisted.holdings, liveQuotes, universeMap]);

  const portfolioSummary = useMemo(() => {
    // Primary USD summary + track non-USD count if user adds foreign-currency holdings
    const usdHoldings = enrichedHoldings.filter((h) => h.currency === 'USD');
    const targetList = usdHoldings.length > 0 ? usdHoldings : enrichedHoldings;

    const totalInvested = targetList.reduce((sum, h) => sum + h.investedValue, 0);
    const totalCurrent = targetList.reduce(
      (sum, h) => sum + (h.currentValue ?? h.investedValue),
      0
    );
    const totalGainLoss = totalCurrent - totalInvested;
    const totalGainLossPct = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

    const todayGainLoss = targetList.reduce((sum, h) => {
      const val = h.currentValue ?? 0;
      return sum + (val * h.dayChangePct) / 100;
    }, 0);
    const prevDayVal = totalCurrent - todayGainLoss;
    const todayGainLossPct = prevDayVal > 0 ? (todayGainLoss / prevDayVal) * 100 : 0;

    const sectorMap = new Map<string, number>();
    targetList.forEach((h) => {
      const matchedUni = universeMap.get(h.ticker.toUpperCase());
      const sec = matchedUni?.sector || h.sector || 'Equities';
      sectorMap.set(sec, (sectorMap.get(sec) || 0) + (h.currentValue ?? h.investedValue));
    });

    const sectorAllocation = Array.from(sectorMap.entries())
      .map(([sector, value]) => ({
        sector,
        value,
        pct: totalCurrent > 0 ? (value / totalCurrent) * 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);

    return {
      currency: targetList[0]?.currency || 'USD',
      hasMixedCurrencies:
        new Set(enrichedHoldings.map((h) => h.currency)).size > 1,
      totalInvested,
      totalCurrent,
      totalGainLoss,
      totalGainLossPct,
      todayGainLoss,
      todayGainLossPct,
      sectorAllocation,
    };
  }, [enrichedHoldings, universeMap]);

  // Live Alerts derived from real market quotes + technicals + custom rules
  const alerts: MarketAlert[] = useMemo(() => {
    const threshold = persisted.notificationSettings.priceThresholdPct;
    const generated: MarketAlert[] = [];
    const tracked = new Set<string>([
      ...persisted.holdings.map((h) => h.ticker.toUpperCase()),
      ...persisted.watchlist.map((w) => w.ticker.toUpperCase()),
    ]);

    tracked.forEach((sym) => {
      const quote = liveQuotes[sym];
      const uni = universeMap.get(sym);
      if (!quote) return;

      if (
        persisted.notificationSettings.priceMovementEnabled &&
        Math.abs(quote.changePct) >= threshold
      ) {
        const up = quote.changePct >= 0;
        const id = `live-move-${sym}-${up ? 'up' : 'dn'}`;
        generated.push({
          id,
          ticker: sym,
          companyName: quote.name,
          category: 'Price Movement',
          title: `${sym} moved ${up ? '+' : ''}${quote.changePct.toFixed(2)}% in live session`,
          message: `${quote.name} is trading at ${quote.price.toFixed(2)} ${quote.currency}, beyond your ±${threshold}% movement threshold.`,
          beginnerGuidance: up
            ? 'Sharp single-session gains can reverse quickly. Review valuation and 52-week range before chasing momentum.'
            : 'Single-day drops happen routinely. Check recent company news and long-term fundamentals before reacting.',
          dateLabel: 'Live Session',
          severity: Math.abs(quote.changePct) >= 5 ? 'Attention' : 'Info',
          read: persisted.readAlertIds.includes(id),
          dismissed: persisted.dismissedAlertIds.includes(id),
        });
      }

      if (persisted.notificationSettings.riskAlertsEnabled && uni) {
        if (!uni.technicals.above50Ma && !uni.technicals.above200Ma) {
          const id = `live-tech-below-${sym}`;
          generated.push({
            id,
            ticker: sym,
            companyName: quote.name,
            category: 'Risk',
            title: `${sym} trading below 50-day and 200-day moving averages`,
            message: `Current live price (${quote.price.toFixed(2)}) sits below both its 50D MA (${uni.technicals.ma50}) and 200D MA (${uni.technicals.ma200}).`,
            beginnerGuidance:
              'Trading below both moving averages signals downward momentum. Review support levels and risk tolerance.',
            dateLabel: 'Live Technical Scan',
            severity: 'Risk',
            read: persisted.readAlertIds.includes(id),
            dismissed: persisted.dismissedAlertIds.includes(id),
          });
        } else if (uni.technicals.rsi14 >= 68) {
          const id = `live-rsi-high-${sym}`;
          generated.push({
            id,
            ticker: sym,
            companyName: quote.name,
            category: 'Risk',
            title: `${sym} approaching overbought RSI (${uni.technicals.rsi14})`,
            message: `14-day RSI on ${quote.name} reached ${uni.technicals.rsi14}, near the 70 zone after recent gains.`,
            beginnerGuidance:
              'High RSI suggests strong recent buying pressure, which can sometimes precede short-term cooling.',
            dateLabel: 'Live Technical Scan',
            severity: 'Attention',
            read: persisted.readAlertIds.includes(id),
            dismissed: persisted.dismissedAlertIds.includes(id),
          });
        }
      }
    });

    // If no threshold breached today on tracked symbols, surface top live movers from universe so feed isn't blank unless dismissed
    if (generated.length === 0 && universeStocks.length > 0) {
      const topMover = [...universeStocks].sort(
        (a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)
      )[0];
      if (topMover) {
        const id = `live-highlight-${topMover.symbol}`;
        generated.push({
          id,
          ticker: topMover.symbol,
          companyName: topMover.name,
          category: 'Price Movement',
          title: `${topMover.symbol} leads live session move (${topMover.changePct >= 0 ? '+' : ''}${topMover.changePct.toFixed(2)}%)`,
          message: `Current price is ${topMover.price.toFixed(2)} ${topMover.currency} on ${topMover.fullExchangeName}.`,
          beginnerGuidance:
            'None of your holdings breached your threshold today; highlighting the largest live move in the global directory.',
          dateLabel: 'Live Market',
          severity: 'Info',
          read: persisted.readAlertIds.includes(id),
          dismissed: persisted.dismissedAlertIds.includes(id),
        });
      }
    }

    const customMerged = persisted.customAlerts.map((a) => ({
      ...a,
      read: persisted.readAlertIds.includes(a.id) || a.read,
      dismissed: persisted.dismissedAlertIds.includes(a.id) || a.dismissed,
    }));

    return [...customMerged, ...generated];
  }, [
    persisted.holdings,
    persisted.watchlist,
    persisted.notificationSettings,
    persisted.readAlertIds,
    persisted.dismissedAlertIds,
    persisted.customAlerts,
    liveQuotes,
    universeMap,
    universeStocks,
  ]);

  const watchlistTickers = useMemo(
    () => new Set(persisted.watchlist.map((w) => w.ticker.toUpperCase())),
    [persisted.watchlist]
  );

  const activeAlertsCount = useMemo(
    () => alerts.filter((a) => !a.dismissed && !a.read).length,
    [alerts]
  );

  const navigateTo = useCallback((tab: AppTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const openStockAnalysis = useCallback((ticker: string) => {
    const upper = ticker.trim().toUpperCase();
    setPersisted((prev) => ({ ...prev, selectedStockTicker: upper }));
    setActiveTab('analysis-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const addHolding = useCallback(
    (holding: Omit<PortfolioHolding, 'id'>) => {
      const newHolding: PortfolioHolding = {
        ...holding,
        ticker: holding.ticker.trim().toUpperCase(),
        id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      };
      setPersisted((prev) => ({
        ...prev,
        holdings: [newHolding, ...prev.holdings],
      }));
      showToast(`Added ${newHolding.ticker} to your portfolio.`);
    },
    [showToast]
  );

  const updateHolding = useCallback(
    (updated: PortfolioHolding) => {
      setPersisted((prev) => ({
        ...prev,
        holdings: prev.holdings.map((h) =>
          h.id === updated.id
            ? { ...updated, ticker: updated.ticker.trim().toUpperCase() }
            : h
        ),
      }));
      showToast(`Updated ${updated.ticker.toUpperCase()} holding.`);
    },
    [showToast]
  );

  const removeHolding = useCallback(
    (id: string) => {
      const target = persisted.holdings.find((h) => h.id === id);
      setPersisted((prev) => ({
        ...prev,
        holdings: prev.holdings.filter((h) => h.id !== id),
      }));
      if (target) showToast(`Removed ${target.ticker} from portfolio.`);
    },
    [persisted.holdings, showToast]
  );

  const loadStarterHoldings = useCallback(() => {
    setPersisted((prev) => ({ ...prev, holdings: INITIAL_HOLDINGS }));
    showToast('Loaded starter holdings.');
  }, [showToast]);

  const toggleWatchlist = useCallback(
    (ticker: string) => {
      const upper = ticker.trim().toUpperCase();
      setPersisted((prev) => {
        const exists = prev.watchlist.some((w) => w.ticker.toUpperCase() === upper);
        if (exists) {
          return {
            ...prev,
            watchlist: prev.watchlist.filter((w) => w.ticker.toUpperCase() !== upper),
          };
        }
        return {
          ...prev,
          watchlist: [
            {
              ticker: upper,
              addedAt: new Date().toISOString().slice(0, 10),
              note: '',
            },
            ...prev.watchlist,
          ],
        };
      });
      const wasIn = watchlistTickers.has(upper);
      showToast(wasIn ? `Removed ${upper} from watchlist.` : `Added ${upper} to watchlist.`);
    },
    [watchlistTickers, showToast]
  );

  const updateWatchlistNote = useCallback((ticker: string, note: string) => {
    const upper = ticker.toUpperCase();
    setPersisted((prev) => ({
      ...prev,
      watchlist: prev.watchlist.map((w) =>
        w.ticker.toUpperCase() === upper ? { ...w, note } : w
      ),
    }));
  }, []);

  const loadStarterWatchlist = useCallback(() => {
    setPersisted((prev) => ({ ...prev, watchlist: INITIAL_WATCHLIST }));
    showToast('Restored starter watchlist.');
  }, [showToast]);

  const dismissAlert = useCallback(
    (id: string) => {
      setPersisted((prev) => ({
        ...prev,
        dismissedAlertIds: Array.from(new Set([...prev.dismissedAlertIds, id])),
        readAlertIds: Array.from(new Set([...prev.readAlertIds, id])),
      }));
      showToast('Alert dismissed.');
    },
    [showToast]
  );

  const restoreAlert = useCallback((id: string) => {
    setPersisted((prev) => ({
      ...prev,
      dismissedAlertIds: prev.dismissedAlertIds.filter((x) => x !== id),
    }));
  }, []);

  const markAlertRead = useCallback((id: string) => {
    setPersisted((prev) => ({
      ...prev,
      readAlertIds: Array.from(new Set([...prev.readAlertIds, id])),
    }));
  }, []);

  const markAllAlertsRead = useCallback(() => {
    const allIds = alerts.map((a) => a.id);
    setPersisted((prev) => ({
      ...prev,
      readAlertIds: Array.from(new Set([...prev.readAlertIds, ...allIds])),
    }));
    showToast('Marked all alerts as read.');
  }, [alerts, showToast]);

  const restoreAllAlerts = useCallback(() => {
    setPersisted((prev) => ({ ...prev, dismissedAlertIds: [] }));
    showToast('Restored dismissed alerts.');
  }, [showToast]);

  const createCustomAlert = useCallback(
    (input: {
      ticker: string;
      category: MarketAlert['category'];
      triggerRule: string;
      title: string;
      message: string;
    }) => {
      const upper = input.ticker.toUpperCase();
      const q = liveQuotes[upper];
      const newAlert: MarketAlert = {
        id: `al-custom-${Date.now()}`,
        ticker: upper,
        companyName: q?.name || upper,
        category: input.category,
        title: input.title,
        message: input.message,
        beginnerGuidance:
          'Custom watch alert created against live market quotes. Always check fundamentals and risk notes before acting.',
        dateLabel: 'Created Today',
        severity: input.category === 'Risk' ? 'Attention' : 'Info',
        read: false,
        dismissed: false,
        isCustom: true,
        triggerRule: input.triggerRule,
      };
      setPersisted((prev) => ({
        ...prev,
        customAlerts: [newAlert, ...prev.customAlerts],
      }));
      showToast(`Created alert rule for ${upper}.`);
    },
    [liveQuotes, showToast]
  );

  const effectiveNotificationSettings: NotificationSettings = useMemo(
    () => ({
      ...persisted.notificationSettings,
      notificationEmail:
        persisted.notificationSettings.notificationEmail.trim() || session.userEmail,
    }),
    [persisted.notificationSettings, session.userEmail]
  );

  const updateNotificationSettings = useCallback(
    (settings: NotificationSettings) => {
      setPersisted((prev) => ({ ...prev, notificationSettings: settings }));
      showToast('Alert notification preferences saved.');
    },
    [showToast]
  );

  const sendAlertEmailNow = useCallback(
    async (overrideEmail?: string) => {
      const targetEmail = (
        overrideEmail ?? effectiveNotificationSettings.notificationEmail
      ).trim();
      if (!targetEmail || !targetEmail.includes('@')) {
        setEmailDeliveryState({
          sending: false,
          error: 'Please enter a valid email address first.',
          result: null,
        });
        return;
      }

      setEmailDeliveryState((prev) => ({ ...prev, sending: true, error: null }));
      try {
        const activeList = alerts.filter((a) => !a.dismissed);
        const res = await fetch('/api/alerts/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toEmail: targetEmail,
            userName: session.userName,
            digestFrequency: effectiveNotificationSettings.digestFrequency,
            alerts: activeList,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Could not prepare alert email.');
        }
        setEmailDeliveryState({
          sending: false,
          error: null,
          result: data,
        });
        showToast(
          data.sent
            ? `Alert email sent to ${targetEmail}.`
            : `Alert email prepared for ${targetEmail}.`
        );
      } catch (err) {
        setEmailDeliveryState({
          sending: false,
          error: err instanceof Error ? err.message : 'Failed to send alert email.',
          result: null,
        });
      }
    },
    [alerts, effectiveNotificationSettings, session.userName, showToast]
  );

  // If SMTP is configured on server and user has email notifications on, silently send once when active alerts change
  useEffect(() => {
    if (!session.isAuthenticated || !effectiveNotificationSettings.emailNotificationsEnabled) {
      return;
    }
    const targetEmail = effectiveNotificationSettings.notificationEmail.trim();
    const activeAlerts = alerts.filter((a) => !a.dismissed);
    if (!targetEmail || activeAlerts.length === 0) return;

    const sig = `${targetEmail}:${activeAlerts.map((a) => a.id).sort().join(',')}`;
    if (autoDispatchedSigRef.current === sig) return;
    autoDispatchedSigRef.current = sig;

    fetch('/api/alerts/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        toEmail: targetEmail,
        userName: session.userName,
        digestFrequency: effectiveNotificationSettings.digestFrequency,
        alerts: activeAlerts,
      }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.sent) {
          setEmailDeliveryState({ sending: false, error: null, result: data });
        }
      })
      .catch(() => {
        // Silent background check
      });
  }, [
    session.isAuthenticated,
    session.userName,
    effectiveNotificationSettings.emailNotificationsEnabled,
    effectiveNotificationSettings.notificationEmail,
    effectiveNotificationSettings.digestFrequency,
    alerts,
  ]);

  const updateDiscoverCriteria = useCallback((criteria: DiscoverCriteria) => {
    setPersisted((prev) => ({ ...prev, discoverCriteria: criteria }));
  }, []);

  const submitInvestmentRequirements = useCallback(
    (requirements: InvestmentRequirements) => {
      setRecommendationLoading(true);
      window.setTimeout(() => {
        const hasLiveUniverse = universeStocks.length > 0;
        const sourceUniverse = hasLiveUniverse ? universeStocks : DEMO_FALLBACK_UNIVERSE;
        const usedDemoFallback = !hasLiveUniverse;

        const results = calculatePersonalizedRecommendations(sourceUniverse, requirements);

        const missingFundamentalsCount = results.filter(
          (r) => r.missingDataFields.length >= 3
        ).length;

        let incompleteDataMessage: string | null = null;
        if (usedDemoFallback) {
          incompleteDataMessage =
            'Live market data is currently unavailable. Showing clearly labeled sample matches (Demo data—not live market data).';
        } else if (missingFundamentalsCount > 0) {
          incompleteDataMessage = `${missingFundamentalsCount} matching stock${
            missingFundamentalsCount === 1 ? ' is' : 's are'
          } missing some fundamental ratios from the live feed; scores reflect available verified metrics only.`;
        }

        const sessionRecord: SavedRecommendationSession = {
          submittedAt: new Date().toISOString(),
          requirements,
          results,
          usedDemoFallback,
          incompleteDataMessage,
        };

        setPersisted((prev) => ({
          ...prev,
          investmentRequirements: requirements,
          recommendationSession: sessionRecord,
        }));
        setRecommendationLoading(false);
        showToast(
          `Updated personalized shortlist (${results.length} ${
            results.length === 1 ? 'match' : 'matches'
          }).`
        );
      }, 320);
    },
    [universeStocks, showToast]
  );

  const resetInvestmentRequirements = useCallback(() => {
    setPersisted((prev) => ({
      ...prev,
      investmentRequirements: INITIAL_INVESTMENT_REQUIREMENTS,
      recommendationSession: null,
    }));
    showToast('Reset investment requirements.');
  }, [showToast]);

  const resetAllData = useCallback(() => {
    setPersisted(getDefaultPersistedState());
    setStorageError(null);
    showToast('Reset portfolio and watchlist to defaults.');
  }, [showToast]);

  const dismissStorageError = useCallback(() => {
    setStorageError(null);
  }, []);

  return {
    isAuthenticated: session.isAuthenticated,
    userName: session.userName,
    userEmail: session.userEmail,
    login,
    updateUserEmail,
    logout,
    activeTab,
    navigateTo,
    marketLoading,
    marketError,
    lastUpdatedAt,
    refreshLiveData: () => fetchAllLiveMarketData(false),
    storageError,
    dismissStorageError,
    toastMessage,
    indices,
    universeStocks,
    universeMap,
    liveQuotes,
    selectedStockTicker: persisted.selectedStockTicker,
    openStockAnalysis,
    holdings: persisted.holdings,
    enrichedHoldings,
    portfolioSummary,
    addHolding,
    updateHolding,
    removeHolding,
    loadStarterHoldings,
    watchlist: persisted.watchlist,
    watchlistTickers,
    toggleWatchlist,
    updateWatchlistNote,
    loadStarterWatchlist,
    alerts,
    activeAlertsCount,
    dismissAlert,
    restoreAlert,
    markAlertRead,
    markAllAlertsRead,
    restoreAllAlerts,
    createCustomAlert,
    notificationSettings: effectiveNotificationSettings,
    updateNotificationSettings,
    sendAlertEmailNow,
    emailDeliveryState,
    discoverCriteria: persisted.discoverCriteria,
    updateDiscoverCriteria,
    investmentRequirements: persisted.investmentRequirements,
    recommendationSession: persisted.recommendationSession,
    recommendationLoading,
    submitInvestmentRequirements,
    resetInvestmentRequirements,
    resetAllData,
  };
}
