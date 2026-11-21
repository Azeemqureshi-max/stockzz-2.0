import {
  DiscoverCriteria,
  InvestmentRequirements,
  NotificationSettings,
  PortfolioHolding,
  WatchlistItem,
} from '../types/market';

// Starter portfolio uses real public equities; current market prices are always fetched live from /api/market/quotes.
export const INITIAL_HOLDINGS: PortfolioHolding[] = [
  {
    id: 'h-aapl-1',
    ticker: 'AAPL',
    companyName: 'Apple Inc.',
    exchange: 'NASDAQ',
    purchaseDate: '2025-10-15',
    quantity: 20,
    purchasePrice: 232.0,
    sector: 'Technology',
  },
  {
    id: 'h-msft-1',
    ticker: 'MSFT',
    companyName: 'Microsoft Corporation',
    exchange: 'NASDAQ',
    purchaseDate: '2025-11-12',
    quantity: 12,
    purchasePrice: 418.0,
    sector: 'Technology',
  },
  {
    id: 'h-jnj-1',
    ticker: 'JNJ',
    companyName: 'Johnson & Johnson',
    exchange: 'NYSE',
    purchaseDate: '2026-01-20',
    quantity: 25,
    purchasePrice: 154.0,
    sector: 'Healthcare',
  },
  {
    id: 'h-pg-1',
    ticker: 'PG',
    companyName: 'Procter & Gamble Co.',
    exchange: 'NYSE',
    purchaseDate: '2026-02-10',
    quantity: 24,
    purchasePrice: 162.5,
    sector: 'Consumer Staples',
  },
];

export const INITIAL_WATCHLIST: WatchlistItem[] = [
  {
    ticker: 'NVDA',
    addedAt: '2026-10-12',
    note: 'Tracking AI data-center demand and 50-day moving average support.',
  },
  {
    ticker: 'RELIANCE.NS',
    addedAt: '2026-10-24',
    note: 'India large-cap energy, telecom, and retail conglomerate.',
  },
  {
    ticker: 'TCS.NS',
    addedAt: '2026-11-01',
    note: 'Global IT services leader listed on NSE.',
  },
  {
    ticker: 'ASML',
    addedAt: '2026-11-05',
    note: 'Key semiconductor lithography supplier in Europe.',
  },
  {
    ticker: 'JPM',
    addedAt: '2026-11-12',
    note: 'US diversified banking benchmark.',
  },
];

export const INITIAL_NOTIFICATION_SETTINGS: NotificationSettings = {
  emailNotificationsEnabled: true,
  notificationEmail: '',
  priceMovementEnabled: true,
  priceThresholdPct: 3,
  companyNewsEnabled: true,
  riskAlertsEnabled: true,
  digestFrequency: 'Immediate',
};

export const INITIAL_DISCOVER_CRITERIA: DiscoverCriteria = {
  market: 'All',
  sector: 'All',
  riskTolerance: 'Moderate',
  timeHorizon: '3-5 Years',
  query: '',
};

export const INITIAL_INVESTMENT_REQUIREMENTS: InvestmentRequirements = {
  markets: ['NASDAQ', 'NYSE', 'NSE', 'LSE', 'XETRA'],
  sectors: [
    'Technology',
    'Healthcare',
    'Clean Energy & Industrials',
    'Consumer Staples',
    'Financial Services',
  ],
  riskTolerance: 'medium',
  investmentHorizon: 'medium',
  preferences: [],
  query: '',
};

export const BEGINNER_GLOSSARY: Record<string, { title: string; plainEnglish: string }> = {
  peRatio: {
    title: 'P/E Ratio (Price-to-Earnings)',
    plainEnglish:
      'Shows how many dollars you pay per $1 of annual company earnings. Lower can signal cheaper valuation, while higher often reflects stronger growth expectations.',
  },
  debtToEquity: {
    title: 'Debt-to-Equity Ratio',
    plainEnglish:
      'Compares total borrowed debt to shareholders’ equity. Under 0.5 is generally conservative; higher ratios are common in capital-heavy utilities and banks.',
  },
  currentRatio: {
    title: 'Current Ratio',
    plainEnglish:
      'Measures short-term assets divided by bills due within 12 months. Above 1.5 suggests comfortable near-term financial cushion.',
  },
  freeCashFlow: {
    title: 'Free Cash Flow',
    plainEnglish:
      'Cash remaining after operating expenses and capital investments. Healthy free cash flow funds dividends, R&D, and debt reduction.',
  },
  movingAverage: {
    title: '50-Day & 200-Day Moving Averages',
    plainEnglish:
      'Smoothed average closing prices over the past 50 or 200 trading days. Trading above both averages generally points to a healthier uptrend.',
  },
  rsi14: {
    title: 'RSI (14-Day Relative Strength Index)',
    plainEnglish:
      'A 0–100 momentum oscillator computed from recent up vs. down days. Between 40 and 70 is balanced; above 70 may be stretched, below 30 heavily sold.',
  },
  roe: {
    title: 'ROE (Return on Equity)',
    plainEnglish:
      'Measures how efficiently a company turns shareholders’ equity into net profit.',
  },
};
