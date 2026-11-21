export type AppTab =
  | 'suggestions'
  | 'requirements'
  | 'discover'
  | 'analysis'
  | 'analysis-detail'
  | 'portfolio'
  | 'watchlist'
  | 'notifications'
  | 'profile'
  | 'settings'
  | 'help';

export type MarketRegion = 'North America' | 'Europe' | 'Asia-Pacific';

export type MarketExchangeOption = 'NASDAQ' | 'NYSE' | 'NSE' | 'LSE' | 'XETRA';

export type Sector =
  | 'Technology'
  | 'Healthcare'
  | 'Clean Energy & Industrials'
  | 'Consumer Staples'
  | 'Financial Services';

export type RiskTolerance = 'Conservative' | 'Moderate' | 'Growth-Oriented';

export type RiskLevel = 'low' | 'medium' | 'high';

export type HorizonTerm = 'short' | 'medium' | 'long';

export type OptionalPreference = 'dividend' | 'growth' | 'stable' | 'value';

export type TimeHorizon = '1-3 Years' | '3-5 Years' | '5+ Years';

export interface LiveQuote {
  symbol: string;
  name: string;
  exchange: string;
  fullExchangeName: string;
  currency: string;
  price: number;
  previousClose: number;
  change: number;
  changePct: number;
  dayHigh: number | null;
  dayLow: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  volume: number | null;
  marketTime: number | null;
  timezone: string | null;
  instrumentType: string | null;
  sparkline: number[];
}

export interface LiveMarketIndex extends LiveQuote {
  displayName: string;
  region: string;
}

export interface LiveTechnicals {
  ma50: number;
  ma200: number;
  rsi14: number;
  supportLevel: number;
  resistanceLevel: number;
  above50Ma: boolean;
  above200Ma: boolean;
  trendDirection: 'Bullish' | 'Neutral' | 'Bearish';
  annualizedVolPct: number;
  explanation: string;
}

export interface LiveFundamentals {
  peRatio: number | null;
  forwardPe: number | null;
  roePct: number | null;
  revenueGrowthPct: number | null;
  profitMarginPct: number | null;
  debtToEquity: number | null;
  currentRatio: number | null;
  beta: number | null;
  dividendYieldPct: number | null;
  marketCap: number | null;
}

export interface LiveUniverseStock extends LiveQuote {
  region: MarketRegion;
  exchangeGroup: MarketExchangeOption;
  sector: Sector;
  country: string;
  technicals: LiveTechnicals;
  fundamentals: LiveFundamentals;
  oneYearReturnPct: number;
  riskProfile: RiskTolerance;
  recentNewsCount: number;
  latestHeadlines: string[];
  industryAvg1YReturnPct?: number;
  industryBullishPct?: number;
  isDemoFallback?: boolean;
}

export interface LiveHistoryBar {
  timestamp: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma50: number;
  ma200: number;
}

export interface LiveNewsItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
}

export interface LiveStockDetail {
  quote: LiveQuote;
  meta: {
    symbol: string;
    region: MarketRegion;
    sector: Sector;
    country: string;
  } | null;
  history: LiveHistoryBar[];
  technicals: LiveTechnicals;
  news: LiveNewsItem[];
  fetchedAt: string;
}

export interface GroundedSource {
  title: string;
  uri: string;
}

export interface LiveAiInsights {
  overview: string;
  ceo: string;
  founded: string;
  headquarters: string;
  employees: string;
  website: string;
  sector: string;
  marketCap: string;
  peRatio: string;
  revenue: string;
  netIncome: string;
  eps: string;
  roe: string;
  debtToEquity: string;
  plainSummary: string;
  strengths: string[];
  risks: string[];
}

export interface SearchQuoteItem {
  symbol: string;
  name: string;
  exchange: string;
  quoteType: string;
  sector: string;
  industry: string;
}

export interface PortfolioHolding {
  id: string;
  ticker: string;
  companyName: string;
  exchange: string;
  purchaseDate: string;
  quantity: number;
  purchasePrice: number;
  sector?: Sector;
}

export interface WatchlistItem {
  ticker: string;
  addedAt: string;
  note: string;
}

export type AlertCategory = 'Price Movement' | 'Company News' | 'Risk';

export interface MarketAlert {
  id: string;
  ticker: string;
  companyName: string;
  category: AlertCategory;
  title: string;
  message: string;
  beginnerGuidance: string;
  dateLabel: string;
  severity: 'Info' | 'Attention' | 'Risk';
  read: boolean;
  dismissed: boolean;
  isCustom?: boolean;
  triggerRule?: string;
}

export interface NotificationSettings {
  emailNotificationsEnabled: boolean;
  notificationEmail: string;
  priceMovementEnabled: boolean;
  priceThresholdPct: 3 | 5 | 10;
  companyNewsEnabled: boolean;
  riskAlertsEnabled: boolean;
  digestFrequency: 'Immediate' | 'Daily Digest' | 'Weekly Summary';
}

export interface DiscoverCriteria {
  market: 'All' | MarketRegion;
  sector: 'All' | Sector;
  riskTolerance: RiskTolerance;
  timeHorizon: TimeHorizon;
  query: string;
}

export interface InvestmentRequirements {
  markets: MarketExchangeOption[];
  sectors: Sector[];
  riskTolerance: RiskLevel;
  investmentHorizon: HorizonTerm;
  preferences: OptionalPreference[];
  query: string;
}

export interface FactorWeights {
  fundamentals: number;
  technicals: number;
  industryTrend: number;
  news: number;
  riskAlignment: number;
}

export interface FactorScores {
  fundamentals: number;
  technicals: number;
  industryTrend: number;
  news: number;
  riskAlignment: number;
}

export interface PersonalizedRecommendation {
  stock: LiveUniverseStock;
  overallScore: number;
  matchLabel: 'Strong Match' | 'Good Match' | 'Partial Match';
  plainLanguageExplanation: string;
  matchedRequirements: string[];
  strengths: string[];
  risks: string[];
  missingDataFields: string[];
  factorScores: FactorScores;
  appliedWeights: FactorWeights;
  isDemoFallback: boolean;
}

export interface SavedRecommendationSession {
  submittedAt: string;
  requirements: InvestmentRequirements;
  results: PersonalizedRecommendation[];
  usedDemoFallback: boolean;
  incompleteDataMessage: string | null;
}

export interface RankedStockResult {
  stock: LiveUniverseStock;
  score: number;
  matchLabel: 'Strong Match' | 'Good Match' | 'Partial Match';
  reasons: string[];
}
