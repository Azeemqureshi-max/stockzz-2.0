import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;

// Short TTL in-memory cache to keep quotes live without hammering upstream APIs
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCached<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}

const YAHOO_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'application/json,text/plain,*/*',
};

interface YahooChartBar {
  timestamp: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface LiveQuote {
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

function mapRangeToYahoo(range: string): { range: string; interval: string } {
  switch (range) {
    case '1D':
      return { range: '1d', interval: '5m' };
    case '1W':
      return { range: '5d', interval: '30m' };
    case '1M':
      return { range: '1mo', interval: '1d' };
    case '3M':
      return { range: '3mo', interval: '1d' };
    case '6M':
      return { range: '6mo', interval: '1d' };
    case '1Y':
      return { range: '1y', interval: '1d' };
    case '5Y':
      return { range: '5y', interval: '1wk' };
    default:
      return { range: '1y', interval: '1d' };
  }
}

async function fetchYahooChart(
  symbol: string,
  range = '1mo',
  interval = '1d',
  includeDiv = false
): Promise<{
  quote: LiveQuote;
  bars: YahooChartBar[];
  rawMeta: Record<string, unknown>;
  trailingDividendSum: number;
}> {
  const cleanSymbol = symbol.trim().toUpperCase();
  const cacheKey = `chart:${cleanSymbol}:${range}:${interval}:${includeDiv ? 'div' : 'nodiv'}`;
  const cached = getCached<{
    quote: LiveQuote;
    bars: YahooChartBar[];
    rawMeta: Record<string, unknown>;
    trailingDividendSum: number;
  }>(cacheKey);
  if (cached) return cached;

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    cleanSymbol
  )}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}${
    includeDiv ? '&events=div' : ''
  }`;

  const res = await fetch(url, { headers: YAHOO_HEADERS });
  if (!res.ok) {
    throw new Error(`Market data request failed for ${cleanSymbol} (${res.status})`);
  }

  const json = (await res.json()) as {
    chart?: {
      result?: Array<{
        meta: Record<string, unknown>;
        timestamp?: number[];
        indicators?: {
          quote?: Array<{
            open?: Array<number | null>;
            high?: Array<number | null>;
            low?: Array<number | null>;
            close?: Array<number | null>;
            volume?: Array<number | null>;
          }>;
        };
      }>;
      error?: { description?: string };
    };
  };

  const result = json.chart?.result?.[0];
  if (!result || !result.meta) {
    throw new Error(json.chart?.error?.description || `No market data found for ${cleanSymbol}`);
  }

  const meta = result.meta;
  const timestamps = result.timestamp || [];
  const q = result.indicators?.quote?.[0] || {};
  const closes = q.close || [];
  const opens = q.open || [];
  const highs = q.high || [];
  const lows = q.low || [];
  const volumes = q.volume || [];

  const bars: YahooChartBar[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    const c = closes[i];
    if (typeof c !== 'number' || !Number.isFinite(c)) continue;
    const tsMs = timestamps[i] * 1000;
    const d = new Date(tsMs);
    const label =
      interval.includes('m') || interval.includes('h')
        ? d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: range === '5y' ? '2-digit' : undefined });

    bars.push({
      timestamp: timestamps[i],
      date: label,
      open: typeof opens[i] === 'number' && Number.isFinite(opens[i]) ? (opens[i] as number) : c,
      high: typeof highs[i] === 'number' && Number.isFinite(highs[i]) ? (highs[i] as number) : c,
      low: typeof lows[i] === 'number' && Number.isFinite(lows[i]) ? (lows[i] as number) : c,
      close: Number(c.toFixed(2)),
      volume: typeof volumes[i] === 'number' && Number.isFinite(volumes[i]) ? (volumes[i] as number) : 0,
    });
  }

  const regularPrice =
    typeof meta.regularMarketPrice === 'number'
      ? meta.regularMarketPrice
      : bars[bars.length - 1]?.close ?? 0;

  const prevClose =
    typeof meta.chartPreviousClose === 'number' && meta.chartPreviousClose > 0
      ? meta.chartPreviousClose
      : typeof meta.previousClose === 'number' && meta.previousClose > 0
        ? meta.previousClose
        : bars.length > 1
          ? bars[bars.length - 2].close
          : regularPrice;

  let change = regularPrice - prevClose;
  let changePct = prevClose > 0 ? (change / prevClose) * 100 : 0;

  // Prefer Yahoo's explicit regularMarketChangePercent / fulldayChange when range is multi-day
  if (typeof meta.regularMarketChangePercent === 'number' && range !== '1d') {
    changePct = meta.regularMarketChangePercent;
    const impliedPrev = regularPrice / (1 + changePct / 100);
    change = regularPrice - impliedPrev;
  }

  const sparkline = bars.slice(-20).map((b) => b.close);

  const quote: LiveQuote = {
    symbol: String(meta.symbol || cleanSymbol),
    name: String(meta.longName || meta.shortName || cleanSymbol),
    exchange: String(meta.exchangeName || ''),
    fullExchangeName: String(meta.fullExchangeName || meta.exchangeName || ''),
    currency: String(meta.currency || 'USD'),
    price: Number(regularPrice.toFixed(2)),
    previousClose: Number((regularPrice - change).toFixed(2)),
    change: Number(change.toFixed(2)),
    changePct: Number(changePct.toFixed(2)),
    dayHigh: typeof meta.regularMarketDayHigh === 'number' ? Number(meta.regularMarketDayHigh.toFixed(2)) : null,
    dayLow: typeof meta.regularMarketDayLow === 'number' ? Number(meta.regularMarketDayLow.toFixed(2)) : null,
    fiftyTwoWeekHigh: typeof meta.fiftyTwoWeekHigh === 'number' ? Number(meta.fiftyTwoWeekHigh.toFixed(2)) : null,
    fiftyTwoWeekLow: typeof meta.fiftyTwoWeekLow === 'number' ? Number(meta.fiftyTwoWeekLow.toFixed(2)) : null,
    volume: typeof meta.regularMarketVolume === 'number' ? meta.regularMarketVolume : null,
    marketTime: typeof meta.regularMarketTime === 'number' ? meta.regularMarketTime : null,
    timezone: typeof meta.exchangeTimezoneName === 'string' ? meta.exchangeTimezoneName : null,
    instrumentType: typeof meta.instrumentType === 'string' ? meta.instrumentType : null,
    sparkline,
  };

  const rawJson = json as {
    chart?: {
      result?: Array<{
        events?: {
          dividends?: Record<string, { amount?: number }>;
        };
      }>;
    };
  };
  const divMap = rawJson.chart?.result?.[0]?.events?.dividends || {};
  const trailingDividendSum = Object.values(divMap).reduce(
    (sum, d) => sum + (typeof d?.amount === 'number' && Number.isFinite(d.amount) ? d.amount : 0),
    0
  );

  const payload = { quote, bars, rawMeta: meta, trailingDividendSum };
  setCached(cacheKey, payload, 30_000);
  return payload;
}

interface LiveFundamentals {
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

async function getYahooCrumbAuth(): Promise<{ cookie: string; crumb: string } | null> {
  const cacheKey = 'yahoo:crumb_auth';
  const cached = getCached<{ cookie: string; crumb: string }>(cacheKey);
  if (cached) return cached;

  try {
    const cRes = await fetch('https://fc.yahoo.com', {
      headers: { 'User-Agent': YAHOO_HEADERS['User-Agent'] },
      redirect: 'manual',
    });
    const setCookies =
      typeof cRes.headers.getSetCookie === 'function'
        ? cRes.headers.getSetCookie()
        : [cRes.headers.get('set-cookie')].filter((v): v is string => Boolean(v));
    const cookie = setCookies.map((c) => c.split(';')[0]).join('; ');
    if (!cookie) return null;

    const crRes = await fetch('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: { 'User-Agent': YAHOO_HEADERS['User-Agent'], Cookie: cookie },
    });
    if (!crRes.ok) return null;
    const crumb = (await crRes.text()).trim();
    if (!crumb) return null;

    const auth = { cookie, crumb };
    setCached(cacheKey, auth, 15 * 60_000);
    return auth;
  } catch {
    return null;
  }
}

function rawNum(obj: unknown): number | null {
  if (obj && typeof obj === 'object' && 'raw' in obj) {
    const val = (obj as { raw?: unknown }).raw;
    return typeof val === 'number' && Number.isFinite(val) ? val : null;
  }
  return typeof obj === 'number' && Number.isFinite(obj) ? obj : null;
}

async function fetchYahooFundamentals(
  symbol: string,
  currentPrice: number,
  trailingDividendSum: number
): Promise<LiveFundamentals> {
  const cleanSymbol = symbol.trim().toUpperCase();
  const cacheKey = `fundamentals:${cleanSymbol}`;
  const cached = getCached<LiveFundamentals>(cacheKey);
  if (cached) return cached;

  const fallbackDivYield =
    currentPrice > 0 && trailingDividendSum > 0
      ? Number(((trailingDividendSum / currentPrice) * 100).toFixed(2))
      : null;

  const empty: LiveFundamentals = {
    peRatio: null,
    forwardPe: null,
    roePct: null,
    revenueGrowthPct: null,
    profitMarginPct: null,
    debtToEquity: null,
    currentRatio: null,
    beta: null,
    dividendYieldPct: fallbackDivYield,
    marketCap: null,
  };

  try {
    const auth = await getYahooCrumbAuth();
    if (!auth) {
      setCached(cacheKey, empty, 60_000);
      return empty;
    }

    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
      cleanSymbol
    )}?modules=summaryDetail,defaultKeyStatistics,financialData&crumb=${encodeURIComponent(
      auth.crumb
    )}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': YAHOO_HEADERS['User-Agent'], Cookie: auth.cookie },
    });
    if (!res.ok) {
      setCached(cacheKey, empty, 60_000);
      return empty;
    }

    const json = (await res.json()) as {
      quoteSummary?: {
        result?: Array<{
          summaryDetail?: Record<string, unknown>;
          defaultKeyStatistics?: Record<string, unknown>;
          financialData?: Record<string, unknown>;
        }>;
      };
    };

    const r = json.quoteSummary?.result?.[0];
    if (!r) {
      setCached(cacheKey, empty, 60_000);
      return empty;
    }

    const sd = r.summaryDetail || {};
    const ks = r.defaultKeyStatistics || {};
    const fd = r.financialData || {};

    const pe = rawNum(sd.trailingPE);
    const fpe = rawNum(sd.forwardPE) ?? rawNum(ks.forwardPE);
    const roeRaw = rawNum(fd.returnOnEquity);
    const revRaw = rawNum(fd.revenueGrowth);
    const marginRaw = rawNum(fd.profitMargins);
    const dteRaw = rawNum(fd.debtToEquity);
    const crRaw = rawNum(fd.currentRatio);
    const betaRaw = rawNum(sd.beta) ?? rawNum(ks.beta);
    const divRaw = rawNum(sd.dividendYield);
    const mcapRaw = rawNum(sd.marketCap);

    const result: LiveFundamentals = {
      peRatio: pe !== null ? Number(pe.toFixed(2)) : null,
      forwardPe: fpe !== null ? Number(fpe.toFixed(2)) : null,
      roePct: roeRaw !== null ? Number((roeRaw * 100).toFixed(1)) : null,
      revenueGrowthPct: revRaw !== null ? Number((revRaw * 100).toFixed(1)) : null,
      profitMarginPct: marginRaw !== null ? Number((marginRaw * 100).toFixed(1)) : null,
      debtToEquity: dteRaw !== null ? Number((dteRaw / 100).toFixed(2)) : null,
      currentRatio: crRaw !== null ? Number(crRaw.toFixed(2)) : null,
      beta: betaRaw !== null ? Number(betaRaw.toFixed(2)) : null,
      dividendYieldPct:
        divRaw !== null ? Number((divRaw * 100).toFixed(2)) : fallbackDivYield,
      marketCap: mcapRaw,
    };

    setCached(cacheKey, result, 10 * 60_000);
    return result;
  } catch {
    setCached(cacheKey, empty, 60_000);
    return empty;
  }
}

function computeTechnicals(bars: YahooChartBar[], currentPrice: number) {
  const closes = bars.map((b) => b.close);
  const avg = (arr: number[]) =>
    arr.length ? Number((arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(2)) : currentPrice;

  const ma50 = avg(closes.slice(-50));
  const ma200 = avg(closes.slice(-200));

  // Real 14-period Wilder-style simple RSI on recent closes
  const rsiSlice = closes.slice(-15);
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < rsiSlice.length; i++) {
    const diff = rsiSlice[i] - rsiSlice[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / Math.max(1, rsiSlice.length - 1);
  const avgLoss = losses / Math.max(1, rsiSlice.length - 1);
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi14 = avgLoss === 0 && avgGain === 0 ? 50 : Number((100 - 100 / (1 + rs)).toFixed(2));

  // Recent 30-day support/resistance from actual high/low bars
  const recentBars = bars.slice(-30);
  const supportLevel = recentBars.length
    ? Number(Math.min(...recentBars.map((b) => b.low)).toFixed(2))
    : currentPrice;
  const resistanceLevel = recentBars.length
    ? Number(Math.max(...recentBars.map((b) => b.high)).toFixed(2))
    : currentPrice;

  // Annualized volatility (%) from daily returns
  const dailyReturns: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0) {
      dailyReturns.push((closes[i] - closes[i - 1]) / closes[i - 1]);
    }
  }
  const meanRet =
    dailyReturns.length > 0
      ? dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length
      : 0;
  const variance =
    dailyReturns.length > 1
      ? dailyReturns.reduce((s, r) => s + (r - meanRet) ** 2, 0) / (dailyReturns.length - 1)
      : 0;
  const annualizedVolPct = Number((Math.sqrt(variance) * Math.sqrt(252) * 100).toFixed(1));

  const above50Ma = currentPrice >= ma50;
  const above200Ma = currentPrice >= ma200;
  const trendDirection: 'Bullish' | 'Neutral' | 'Bearish' =
    above50Ma && above200Ma ? 'Bullish' : !above50Ma && !above200Ma ? 'Bearish' : 'Neutral';

  const explanation =
    trendDirection === 'Bullish'
      ? `Price is trading above both its 50-day (${ma50}) and 200-day (${ma200}) moving averages, indicating positive medium-to-long term momentum.`
      : trendDirection === 'Bearish'
        ? `Price is below both its 50-day (${ma50}) and 200-day (${ma200}) moving averages, indicating downward pressure.`
        : `Price sits between its 50-day (${ma50}) and 200-day (${ma200}) averages, reflecting consolidation.`;

  return {
    ma50,
    ma200,
    rsi14,
    supportLevel,
    resistanceLevel,
    above50Ma,
    above200Ma,
    trendDirection,
    annualizedVolPct,
    explanation,
  };
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

async function fetchYahooRssNews(symbol: string) {
  const cacheKey = `rss:${symbol}`;
  const cached = getCached<Array<{ title: string; link: string; pubDate: string; source: string }>>(cacheKey);
  if (cached) return cached;

  const url = `https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(
    symbol
  )}&region=US&lang=en-US`;
  const res = await fetch(url, { headers: YAHOO_HEADERS });
  if (!res.ok) return [];
  const xml = await res.text();

  const items: Array<{ title: string; link: string; pubDate: string; source: string }> = [];
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];
  for (const rawItem of itemMatches.slice(0, 6)) {
    const titleMatch = rawItem.match(/<title>([\s\S]*?)<\/title>/);
    const linkMatch = rawItem.match(/<link>([\s\S]*?)<\/link>/);
    const dateMatch = rawItem.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
    if (titleMatch) {
      const parsedDate = dateMatch ? new Date(decodeXmlEntities(dateMatch[1])) : null;
      const dateStr =
        parsedDate && !Number.isNaN(parsedDate.getTime())
          ? parsedDate.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })
          : 'Recent';

      items.push({
        title: decodeXmlEntities(titleMatch[1]),
        link: linkMatch ? decodeXmlEntities(linkMatch[1]) : '',
        pubDate: dateStr,
        source: 'Yahoo Finance',
      });
    }
  }

  setCached(cacheKey, items, 120_000);
  return items;
}

// Curated global universe of real public tickers across US, India, Europe & Asia
const GLOBAL_UNIVERSE: Array<{
  symbol: string;
  region: 'North America' | 'Europe' | 'Asia-Pacific';
  exchangeGroup: 'NASDAQ' | 'NYSE' | 'NSE' | 'LSE' | 'XETRA';
  sector: 'Technology' | 'Healthcare' | 'Clean Energy & Industrials' | 'Consumer Staples' | 'Financial Services';
  country: string;
}> = [
  { symbol: 'AAPL', region: 'North America', exchangeGroup: 'NASDAQ', sector: 'Technology', country: 'United States' },
  { symbol: 'MSFT', region: 'North America', exchangeGroup: 'NASDAQ', sector: 'Technology', country: 'United States' },
  { symbol: 'NVDA', region: 'North America', exchangeGroup: 'NASDAQ', sector: 'Technology', country: 'United States' },
  { symbol: 'ASML', region: 'Europe', exchangeGroup: 'NASDAQ', sector: 'Technology', country: 'Netherlands' },
  { symbol: 'JNJ', region: 'North America', exchangeGroup: 'NYSE', sector: 'Healthcare', country: 'United States' },
  { symbol: 'PG', region: 'North America', exchangeGroup: 'NYSE', sector: 'Consumer Staples', country: 'United States' },
  { symbol: 'JPM', region: 'North America', exchangeGroup: 'NYSE', sector: 'Financial Services', country: 'United States' },
  { symbol: 'NVO', region: 'Europe', exchangeGroup: 'NYSE', sector: 'Healthcare', country: 'Denmark' },
  { symbol: 'UL', region: 'Europe', exchangeGroup: 'NYSE', sector: 'Consumer Staples', country: 'United Kingdom' },
  { symbol: 'SONY', region: 'Asia-Pacific', exchangeGroup: 'NYSE', sector: 'Technology', country: 'Japan' },
  { symbol: 'RELIANCE.NS', region: 'Asia-Pacific', exchangeGroup: 'NSE', sector: 'Clean Energy & Industrials', country: 'India' },
  { symbol: 'TCS.NS', region: 'Asia-Pacific', exchangeGroup: 'NSE', sector: 'Technology', country: 'India' },
  { symbol: 'HDFCBANK.NS', region: 'Asia-Pacific', exchangeGroup: 'NSE', sector: 'Financial Services', country: 'India' },
  { symbol: 'INFY.NS', region: 'Asia-Pacific', exchangeGroup: 'NSE', sector: 'Technology', country: 'India' },
  { symbol: 'ICICIBANK.NS', region: 'Asia-Pacific', exchangeGroup: 'NSE', sector: 'Financial Services', country: 'India' },
  { symbol: 'SUNPHARMA.NS', region: 'Asia-Pacific', exchangeGroup: 'NSE', sector: 'Healthcare', country: 'India' },
  { symbol: 'SHEL.L', region: 'Europe', exchangeGroup: 'LSE', sector: 'Clean Energy & Industrials', country: 'United Kingdom' },
  { symbol: 'AZN.L', region: 'Europe', exchangeGroup: 'LSE', sector: 'Healthcare', country: 'United Kingdom' },
  { symbol: 'SAP.DE', region: 'Europe', exchangeGroup: 'XETRA', sector: 'Technology', country: 'Germany' },
  { symbol: 'SIE.DE', region: 'Europe', exchangeGroup: 'XETRA', sector: 'Clean Energy & Industrials', country: 'Germany' },
];

// 1. Live Global Market Indices
app.get('/api/market/indices', async (_req, res) => {
  try {
    const indexDefs = [
      { symbol: '^GSPC', name: 'S&P 500', region: 'United States' },
      { symbol: '^IXIC', name: 'NASDAQ', region: 'United States' },
      { symbol: '^FTSE', name: 'FTSE 100', region: 'United Kingdom' },
      { symbol: '^NSEI', name: 'NIFTY 50', region: 'India' },
    ];

    const settled = await Promise.all(
      indexDefs.map(async (idx) => {
        const { quote } = await fetchYahooChart(idx.symbol, '1mo', '1d');
        return {
          ...quote,
          displayName: idx.name,
          region: idx.region,
        };
      })
    );

    res.json({
      indices: settled,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Failed to fetch live global market indices.',
    });
  }
});

// 2. Live Quotes for Multiple Tickers
app.get('/api/market/quotes', async (req, res) => {
  try {
    const raw = String(req.query.symbols || '').trim();
    if (!raw) {
      res.status(400).json({ error: 'Query parameter "symbols" is required.' });
      return;
    }
    const symbols = Array.from(
      new Set(
        raw
          .split(',')
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean)
      )
    ).slice(0, 25);

    const results = await Promise.allSettled(
      symbols.map((sym) => fetchYahooChart(sym, '1mo', '1d'))
    );

    const quotes: Record<string, LiveQuote> = {};
    const errors: Record<string, string> = {};

    results.forEach((result, i) => {
      const sym = symbols[i];
      if (result.status === 'fulfilled') {
        quotes[sym] = result.value.quote;
      } else {
        errors[sym] = result.reason instanceof Error ? result.reason.message : 'Unavailable';
      }
    });

    res.json({
      quotes,
      errors,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Failed to fetch live stock quotes.',
    });
  }
});

// 3. Live Global Stock Search
app.get('/api/market/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) {
      res.json({ quotes: [], news: [] });
      return;
    }

    const cacheKey = `search:${q.toLowerCase()}`;
    const cached = getCached<{ quotes: unknown[]; news: unknown[] }>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(
      q
    )}&quotesCount=10&newsCount=6`;
    const response = await fetch(url, { headers: YAHOO_HEADERS });
    if (!response.ok) {
      throw new Error(`Search request failed (${response.status})`);
    }

    const json = (await response.json()) as {
      quotes?: Array<{
        symbol?: string;
        shortname?: string;
        longname?: string;
        exchDisp?: string;
        exchange?: string;
        quoteType?: string;
        sector?: string;
        industry?: string;
      }>;
      news?: Array<{
        uuid?: string;
        title?: string;
        publisher?: string;
        link?: string;
        providerPublishTime?: number;
      }>;
    };

    const quotes = (json.quotes || [])
      .filter((item) => item.symbol && (item.quoteType === 'EQUITY' || item.quoteType === 'ETF'))
      .map((item) => ({
        symbol: item.symbol!,
        name: item.longname || item.shortname || item.symbol!,
        exchange: item.exchDisp || item.exchange || '',
        quoteType: item.quoteType || 'EQUITY',
        sector: item.sector || '',
        industry: item.industry || '',
      }));

    const news = (json.news || []).map((n) => ({
      id: n.uuid || n.link || String(Math.random()),
      title: n.title || '',
      publisher: n.publisher || 'Financial News',
      link: n.link || '',
      pubDate: n.providerPublishTime
        ? new Date(n.providerPublishTime * 1000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
        : 'Recent',
    }));

    const payload = { quotes, news };
    setCached(cacheKey, payload, 60_000);
    res.json(payload);
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Failed to search live global stocks.',
    });
  }
});

// 4. Live Global Universe & Screener Data (Charts + Fundamentals + RSS News + Industry Trends)
app.get('/api/market/universe', async (_req, res) => {
  try {
    const cacheKey = 'universe:v2';
    const cached = getCached<{ stocks: unknown[]; fetchedAt: string }>(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const settled = await Promise.allSettled(
      GLOBAL_UNIVERSE.map(async (meta) => {
        const [{ quote, bars, trailingDividendSum }, rssNews] = await Promise.all([
          fetchYahooChart(meta.symbol, '1y', '1d', true),
          fetchYahooRssNews(meta.symbol).catch(() => []),
        ]);
        const fundamentals = await fetchYahooFundamentals(
          meta.symbol,
          quote.price,
          trailingDividendSum
        );
        const technicals = computeTechnicals(bars, quote.price);
        const firstClose = bars[0]?.close || quote.price;
        const oneYearReturnPct =
          firstClose > 0 ? Number((((quote.price - firstClose) / firstClose) * 100).toFixed(1)) : 0;

        const riskProfile: 'Conservative' | 'Moderate' | 'Growth-Oriented' =
          technicals.annualizedVolPct < 22
            ? 'Conservative'
            : technicals.annualizedVolPct < 34
              ? 'Moderate'
              : 'Growth-Oriented';

        return {
          ...quote,
          region: meta.region,
          exchangeGroup: meta.exchangeGroup,
          sector: meta.sector,
          country: meta.country,
          technicals,
          fundamentals,
          oneYearReturnPct,
          riskProfile,
          recentNewsCount: rssNews.length,
          latestHeadlines: rssNews.slice(0, 2).map((n) => n.title),
        };
      })
    );

    const rawStocks = settled.flatMap((r) => (r.status === 'fulfilled' ? [r.value] : []));

    if (rawStocks.length === 0) {
      throw new Error('Could not reach live market data upstream.');
    }

    // Compute live industry/sector trend benchmarks across the returned universe
    const sectorBuckets = new Map<string, { returns: number[]; bullish: number; count: number }>();
    rawStocks.forEach((s) => {
      const bucket = sectorBuckets.get(s.sector) || { returns: [], bullish: 0, count: 0 };
      bucket.returns.push(s.oneYearReturnPct);
      if (s.technicals.above200Ma) bucket.bullish += 1;
      bucket.count += 1;
      sectorBuckets.set(s.sector, bucket);
    });

    const stocks = rawStocks.map((s) => {
      const b = sectorBuckets.get(s.sector);
      const avgRet =
        b && b.returns.length > 0
          ? Number((b.returns.reduce((sum, x) => sum + x, 0) / b.returns.length).toFixed(1))
          : 0;
      const bullPct = b && b.count > 0 ? Math.round((b.bullish / b.count) * 100) : 0;
      return {
        ...s,
        industryAvg1YReturnPct: avgRet,
        industryBullishPct: bullPct,
      };
    });

    const payload = { stocks, fetchedAt: new Date().toISOString() };
    setCached(cacheKey, payload, 45_000);
    res.json(payload);
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Failed to load live stock directory.',
    });
  }
});

// 5. Detailed Live Stock Chart, Technicals & News
app.get('/api/market/stock/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.trim().toUpperCase();
    const uiRange = String(req.query.range || '1Y').toUpperCase();
    const mapped = mapRangeToYahoo(uiRange);

    const [chartRes, daily1YRes, news] = await Promise.all([
      fetchYahooChart(symbol, mapped.range, mapped.interval),
      mapped.range === '1y' && mapped.interval === '1d'
        ? Promise.resolve(null)
        : fetchYahooChart(symbol, '1y', '1d'),
      fetchYahooRssNews(symbol),
    ]);

    const techBars = daily1YRes ? daily1YRes.bars : chartRes.bars;
    const technicals = computeTechnicals(techBars, chartRes.quote.price);

    // Enrich bars with rolling 50D / 200D averages on daily views
    const history = chartRes.bars.map((b, idx, arr) => {
      const w50 = arr.slice(Math.max(0, idx - 49), idx + 1);
      const w200 = arr.slice(Math.max(0, idx - 199), idx + 1);
      const ma50 = Number((w50.reduce((s, x) => s + x.close, 0) / w50.length).toFixed(2));
      const ma200 = Number((w200.reduce((s, x) => s + x.close, 0) / w200.length).toFixed(2));
      return {
        ...b,
        ma50,
        ma200,
      };
    });

    const universeMeta = GLOBAL_UNIVERSE.find((u) => u.symbol === symbol);

    res.json({
      quote: chartRes.quote,
      meta: universeMeta || null,
      history,
      technicals,
      news,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(502).json({
      error: err instanceof Error ? err.message : 'Failed to fetch live stock details.',
    });
  }
});

function currencySymbolFor(code: string): string {
  const c = (code || 'USD').toUpperCase();
  if (c === 'USD') return '$';
  if (c === 'INR') return '₹';
  if (c === 'GBP') return '£';
  if (c === 'EUR') return '€';
  if (c === 'JPY') return '¥';
  return `${c} `;
}

function formatCompactMoney(val: number | null, currency: string): string {
  if (val === null || !Number.isFinite(val)) return 'N/A';
  const sign = val < 0 ? '-' : '';
  const abs = Math.abs(val);
  const sym = currencySymbolFor(currency);
  if (abs >= 1e12) return `${sign}${sym}${(abs / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${sign}${sym}${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}${sym}${(abs / 1e6).toFixed(2)}M`;
  return `${sign}${sym}${abs.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function firstTwoSentences(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return 'Company overview is available from live exchange filings.';
  const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  return sentences.slice(0, 2).join(' ').trim();
}

interface LiveInsightPayload {
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

async function fetchYahooCompanyInsights(symbol: string, nameHint: string): Promise<{
  insights: LiveInsightPayload;
  sources: Array<{ title: string; uri: string }>;
}> {
  const cleanSymbol = symbol.trim().toUpperCase();
  const universeMeta = GLOBAL_UNIVERSE.find((u) => u.symbol === cleanSymbol);

  const [chartRes, rssNews, auth] = await Promise.all([
    fetchYahooChart(cleanSymbol, '1y', '1d', true),
    fetchYahooRssNews(cleanSymbol).catch(() => []),
    getYahooCrumbAuth(),
  ]);

  let ap: Record<string, unknown> = {};
  let fd: Record<string, unknown> = {};
  let ks: Record<string, unknown> = {};
  let sd: Record<string, unknown> = {};
  let pr: Record<string, unknown> = {};

  if (auth) {
    try {
      const qUrl = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(
        cleanSymbol
      )}?modules=assetProfile,financialData,defaultKeyStatistics,summaryDetail,price&crumb=${encodeURIComponent(
        auth.crumb
      )}`;
      const qRes = await fetch(qUrl, {
        headers: { 'User-Agent': YAHOO_HEADERS['User-Agent'], Cookie: auth.cookie },
      });
      if (qRes.ok) {
        const qJson = (await qRes.json()) as {
          quoteSummary?: {
            result?: Array<{
              assetProfile?: Record<string, unknown>;
              financialData?: Record<string, unknown>;
              defaultKeyStatistics?: Record<string, unknown>;
              summaryDetail?: Record<string, unknown>;
              price?: Record<string, unknown>;
            }>;
          };
        };
        const r = qJson.quoteSummary?.result?.[0];
        if (r) {
          ap = r.assetProfile || {};
          fd = r.financialData || {};
          ks = r.defaultKeyStatistics || {};
          sd = r.summaryDetail || {};
          pr = r.price || {};
        }
      }
    } catch {
      // Fall back to chart/technical data if quoteSummary temporarily fails
    }
  }

  const priceCurrency = String(pr.currency || chartRes.quote.currency || 'USD');
  const finCurrency = String(fd.financialCurrency || priceCurrency);
  const companyTitle = String(chartRes.quote.name || nameHint || cleanSymbol);

  const revRaw = rawNum(fd.totalRevenue);
  const netIncRaw = rawNum(ks.netIncomeToCommon);
  const epsRaw = rawNum(ks.trailingEps);
  const peRaw = rawNum(sd.trailingPE);
  const roeRaw = rawNum(fd.returnOnEquity);
  const dteRaw = rawNum(fd.debtToEquity);
  const mcapRaw = rawNum(sd.marketCap) ?? rawNum(pr.marketCap);
  const revGrowthRaw = rawNum(fd.revenueGrowth);
  const marginRaw = rawNum(fd.profitMargins);
  const divYieldRaw = rawNum(sd.dividendYield);
  const currentRatioRaw = rawNum(fd.currentRatio);

  const revenueStr = formatCompactMoney(revRaw, finCurrency);
  const netIncomeStr = formatCompactMoney(netIncRaw, finCurrency);
  const epsStr =
    epsRaw !== null ? `${currencySymbolFor(finCurrency)}${epsRaw.toFixed(2)}` : 'N/A';
  const peStr = peRaw !== null ? `${peRaw.toFixed(2)}x` : 'N/A';
  const roeStr = roeRaw !== null ? `${(roeRaw * 100).toFixed(1)}%` : 'N/A';
  const dteRatio = dteRaw !== null ? Number((dteRaw / 100).toFixed(2)) : null;
  const dteStr = dteRatio !== null ? `${dteRatio.toFixed(2)}x` : 'N/A';
  const mcapStr = formatCompactMoney(mcapRaw, priceCurrency);

  const officers = Array.isArray(ap.companyOfficers)
    ? (ap.companyOfficers as Array<{ name?: string; title?: string }>)
    : [];
  const ceoOfficer =
    officers.find((o) => /\bceo\b|chief executive/i.test(String(o?.title || ''))) ||
    officers.find((o) => /managing director/i.test(String(o?.title || '')));
  const ceoStr = ceoOfficer?.name ? String(ceoOfficer.name).replace(/\s+/g, ' ').trim() : 'N/A';

  const city = typeof ap.city === 'string' ? ap.city.trim() : '';
  const country = typeof ap.country === 'string' ? ap.country.trim() : universeMeta?.country || '';
  const headquartersStr = [city, country].filter(Boolean).join(', ') || 'N/A';

  const employeesNum =
    typeof ap.fullTimeEmployees === 'number' && Number.isFinite(ap.fullTimeEmployees)
      ? ap.fullTimeEmployees
      : null;
  const employeesStr = employeesNum !== null ? employeesNum.toLocaleString('en-US') : 'N/A';

  const rawWebsite = typeof ap.website === 'string' ? ap.website.trim() : '';
  const websiteStr = rawWebsite
    ? rawWebsite.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '')
    : 'N/A';

  const sectorStr =
    (typeof ap.sector === 'string' && ap.sector.trim()) || universeMeta?.sector || 'Public Equity';
  const industryStr = typeof ap.industry === 'string' && ap.industry.trim() ? ap.industry.trim() : '';

  const longSummary = typeof ap.longBusinessSummary === 'string' ? ap.longBusinessSummary : '';
  const overviewStr = longSummary
    ? firstTwoSentences(longSummary)
    : `${companyTitle} (${cleanSymbol}) is a publicly traded ${sectorStr.toLowerCase()} company listed on ${chartRes.quote.fullExchangeName || chartRes.quote.exchange}.`;

  const technicals = computeTechnicals(chartRes.bars, chartRes.quote.price);

  // Build plain-English summary strictly from real live figures
  const sizeSentence =
    mcapRaw !== null
      ? `${companyTitle} is a ${sectorStr.toLowerCase()} business${industryStr ? ` (${industryStr})` : ''} valued at ${mcapStr} with ${revenueStr !== 'N/A' ? `${revenueStr} in annual sales` : 'live exchange pricing'}.`
      : `${companyTitle} (${cleanSymbol}) is a publicly listed ${sectorStr.toLowerCase()} company on ${chartRes.quote.fullExchangeName || chartRes.quote.exchange}.`;

  let healthSentence = '';
  if (netIncRaw !== null && netIncRaw > 0) {
    const roeNote = roeRaw !== null ? ` and earns a ${(roeRaw * 100).toFixed(1)}% return on shareholder equity` : '';
    const peNote =
      peRaw !== null
        ? peRaw > 35
          ? ` Its stock trades at a relatively high ${peRaw.toFixed(1)}x earnings.`
          : peRaw < 18
            ? ` Its stock trades at a modest ${peRaw.toFixed(1)}x earnings.`
            : ` Its stock trades at ${peRaw.toFixed(1)}x earnings.`
        : '';
    healthSentence = `The company is profitable (${netIncomeStr} kept in profit)${roeNote}.${peNote}`;
  } else if (netIncRaw !== null && netIncRaw <= 0) {
    healthSentence = `The company reported a net loss (${netIncomeStr}) over the past 12 months, so steady profit growth is something to watch closely.`;
  } else {
    healthSentence = `Recent trading shows a ${technicals.trendDirection === 'Bullish' ? 'steady upward' : technicals.trendDirection === 'Bearish' ? 'softer downward' : 'mixed'} trend compared with its 50-day and 200-day averages.`;
  }

  const guidanceSentence = `Price swings have averaged ${technicals.annualizedVolPct}% a year, so this fits ${technicals.annualizedVolPct > 32 ? 'investors comfortable with bigger ups and downs' : 'everyday long-term research'}; as always, past performance never guarantees future returns.`;

  const plainSummary = `${sizeSentence} ${healthSentence} ${guidanceSentence}`.replace(/\s+/g, ' ').trim();

  // Plain-English strengths based strictly on live metrics
  const strengths: string[] = [];
  if (netIncRaw !== null && netIncRaw > 0 && marginRaw !== null && marginRaw >= 0.12) {
    strengths.push(`Strong profitability: keeps ${(marginRaw * 100).toFixed(1)}% of sales as profit (${netIncomeStr}).`);
  } else if (netIncRaw !== null && netIncRaw > 0) {
    strengths.push(`Profitable business generating ${netIncomeStr} in net income.`);
  }
  if (roeRaw !== null && roeRaw >= 0.15) {
    strengths.push(`Efficient use of investor money (${(roeRaw * 100).toFixed(1)}% return on equity).`);
  }
  if (revGrowthRaw !== null && revGrowthRaw > 0.05) {
    strengths.push(`Sales are growing (+${(revGrowthRaw * 100).toFixed(1)}% year-over-year).`);
  }
  if (dteRatio !== null && dteRatio < 0.7) {
    strengths.push(`Conservative debt load (${dteRatio.toFixed(2)}x debt-to-equity), giving balance-sheet flexibility.`);
  } else if (currentRatioRaw !== null && currentRatioRaw >= 1.2) {
    strengths.push(`Healthy short-term cash buffer (${currentRatioRaw.toFixed(2)}x current ratio).`);
  }
  if (technicals.above50Ma && technicals.above200Ma) {
    strengths.push('Positive recent price trend—trading above both its 50-day and 200-day averages.');
  }
  if (divYieldRaw !== null && divYieldRaw > 0.01) {
    strengths.push(`Pays a regular cash dividend (${(divYieldRaw * 100).toFixed(2)}% annual yield).`);
  }
  while (strengths.length < 3) {
    if (strengths.length === 0) {
      strengths.push(`Established public company listed on ${chartRes.quote.fullExchangeName || chartRes.quote.exchange}.`);
    } else if (strengths.length === 1) {
      strengths.push(
        mcapStr !== 'N/A'
          ? `Large market presence with a total value of ${mcapStr}.`
          : `Transparent live pricing and regular exchange reporting (${chartRes.quote.currency}).`
      );
    } else {
      strengths.push(
        rssNews.length > 0
          ? `Active market coverage with recent updates from ${rssNews[0].source}.`
          : `Live historical chart shows clear support near ${currencySymbolFor(priceCurrency)}${technicals.supportLevel}.`
      );
    }
  }

  // Plain-English risks based strictly on live metrics
  const risks: string[] = [];
  if (peRaw !== null && peRaw > 30) {
    risks.push(`Higher price tag (${peRaw.toFixed(1)}x P/E), meaning investors already expect strong future growth.`);
  }
  if (dteRatio !== null && dteRatio >= 1.2) {
    risks.push(`Carries noticeable debt (${dteRatio.toFixed(2)}x debt-to-equity), which adds interest-rate sensitivity.`);
  }
  if (technicals.annualizedVolPct >= 28) {
    risks.push(`Stock price can swing noticeably (${technicals.annualizedVolPct}% yearly price movement).`);
  }
  if (!technicals.above50Ma || !technicals.above200Ma) {
    risks.push('Price has recently cooled below key moving averages, showing softer short-term momentum.');
  }
  if (revGrowthRaw !== null && revGrowthRaw < 0) {
    risks.push(`Sales slipped ${(revGrowthRaw * 100).toFixed(1)}% recently, so watch upcoming earnings reports.`);
  }
  if (netIncRaw !== null && netIncRaw <= 0) {
    risks.push('Currently unprofitable over the last 12 months, increasing execution risk.');
  }
  while (risks.length < 3) {
    if (risks.length === 0) {
      risks.push(`General ${sectorStr.toLowerCase()} competition and overall market ups and downs.`);
    } else if (risks.length === 1) {
      risks.push('Quarterly earnings surprises or wider economic slowdowns can move the share price.');
    } else {
      risks.push('Past stock performance never guarantees future gains—diversifying across companies helps manage risk.');
    }
  }

  const insights: LiveInsightPayload = {
    overview: overviewStr,
    ceo: ceoStr,
    founded: 'N/A',
    headquarters: headquartersStr,
    employees: employeesStr,
    website: websiteStr,
    sector: sectorStr,
    marketCap: mcapStr,
    peRatio: peStr,
    revenue: revenueStr,
    netIncome: netIncomeStr,
    eps: epsStr,
    roe: roeStr,
    debtToEquity: dteStr,
    plainSummary,
    strengths: strengths.slice(0, 3),
    risks: risks.slice(0, 3),
  };

  const sources = [
    {
      title: `Yahoo Finance · ${cleanSymbol}`,
      uri: `https://finance.yahoo.com/quote/${encodeURIComponent(cleanSymbol)}`,
    },
  ];

  return { insights, sources };
}

// 6. Live Company Numbers, Profile & Plain-English Summary (Yahoo Finance primary + optional Gemini enrichment)
app.get('/api/market/ai-insights/:symbol', async (req, res) => {
  const symbol = req.params.symbol.trim().toUpperCase();
  const companyName = String(req.query.name || symbol);

  const cacheKey = `ai-insights:${symbol}`;
  const cached = getCached<unknown>(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  try {
    const yahooData = await fetchYahooCompanyInsights(symbol, companyName);
    let finalInsights: LiveInsightPayload = yahooData.insights;
    let finalSources = yahooData.sources;
    let sourceLabel = 'Live Exchange Data';

    // Optional Gemini web-grounded enrichment (skipped during cooldown after 429 quota error)
    const apiKey = process.env.GEMINI_API_KEY;
    const geminiCoolingDown = Boolean(getCached<boolean>('gemini:cooldown'));
    if (apiKey && apiKey !== 'MY_GEMINI_API_KEY' && !geminiCoolingDown) {
      try {
        const ai = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });

        const prompt = `Use Google Search to retrieve verified public company summary facts for ${companyName} (ticker: ${symbol}).
Return ONLY a raw valid JSON object (no markdown fences) with keys:
{
  "overview": "2-sentence plain-English description of what the company does.",
  "ceo": "Current CEO full name or N/A",
  "founded": "Year founded or N/A",
  "plainSummary": "3-sentence beginner-friendly summary of the business and valuation. Never guarantee returns.",
  "strengths": ["Simple strength 1", "Simple strength 2", "Simple strength 3"],
  "risks": ["Simple risk 1", "Simple risk 2", "Simple risk 3"]
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        const rawText = (response.text || '').trim();
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as Partial<LiveInsightPayload>;
          finalInsights = {
            ...yahooData.insights,
            overview:
              typeof parsed.overview === 'string' && parsed.overview && parsed.overview !== 'N/A'
                ? parsed.overview
                : yahooData.insights.overview,
            ceo:
              typeof parsed.ceo === 'string' && parsed.ceo && parsed.ceo !== 'N/A'
                ? parsed.ceo
                : yahooData.insights.ceo,
            founded:
              typeof parsed.founded === 'string' && parsed.founded && parsed.founded !== 'N/A'
                ? parsed.founded
                : yahooData.insights.founded,
            plainSummary:
              typeof parsed.plainSummary === 'string' && parsed.plainSummary
                ? parsed.plainSummary
                : yahooData.insights.plainSummary,
            strengths:
              Array.isArray(parsed.strengths) && parsed.strengths.length > 0
                ? parsed.strengths.slice(0, 3)
                : yahooData.insights.strengths,
            risks:
              Array.isArray(parsed.risks) && parsed.risks.length > 0
                ? parsed.risks.slice(0, 3)
                : yahooData.insights.risks,
          };

          const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
          const webSources = chunks
            .map((c) => c.web)
            .filter((w): w is { uri?: string; title?: string } => Boolean(w && w.uri))
            .slice(0, 4)
            .map((w) => ({
              title: w.title || w.uri || 'Source',
              uri: w.uri || '',
            }));
          if (webSources.length > 0) {
            finalSources = [...yahooData.sources, ...webSources];
            sourceLabel = 'Web-grounded';
          }
        }
      } catch {
        // Put Gemini into a 10-minute cooldown so subsequent stocks load instantly from Yahoo Finance
        setCached('gemini:cooldown', true, 10 * 60_000);
      }
    }

    const payload = {
      symbol,
      insights: finalInsights,
      sources: finalSources,
      sourceLabel,
      fetchedAt: new Date().toISOString(),
    };

    setCached(cacheKey, payload, 15 * 60_000);
    res.json(payload);
  } catch (err) {
    res.status(502).json({
      error:
        err instanceof Error
          ? err.message
          : 'Failed to retrieve live company fundamentals.',
    });
  }
});

interface EmailAlertPayload {
  ticker?: string;
  companyName?: string;
  category?: string;
  title?: string;
  message?: string;
  beginnerGuidance?: string;
}

app.post('/api/alerts/send-email', async (req, res) => {
  try {
    const body = (req.body || {}) as {
      toEmail?: string;
      userName?: string;
      digestFrequency?: string;
      alerts?: EmailAlertPayload[];
    };

    const toEmail = String(body.toEmail || '').trim();
    if (!toEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(toEmail)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    const alertsList = Array.isArray(body.alerts) ? body.alerts.slice(0, 12) : [];
    const userName = String(body.userName || 'Investor').trim();
    const subject =
      alertsList.length > 0
        ? `Stockzz Alert Update: ${alertsList.length} ${
            alertsList.length === 1 ? 'stock alert' : 'stock alerts'
          }`
        : 'Stockzz Alert Settings Confirmation';

    const lines: string[] = [
      `Hi ${userName},`,
      '',
      alertsList.length > 0
        ? `Here is your latest Stockzz market alert summary (${body.digestFrequency || 'Immediate'}):`
        : 'Your Stockzz alert email address is saved and ready. No tracked stocks triggered a new alert right now.',
      '',
    ];

    alertsList.forEach((a, idx) => {
      lines.push(`${idx + 1}. [${a.category || 'Alert'}] ${a.title || a.ticker || 'Stock Update'}`);
      if (a.message) lines.push(`   ${a.message}`);
      if (a.beginnerGuidance) lines.push(`   What this means: ${a.beginnerGuidance}`);
      lines.push('');
    });

    lines.push('---');
    lines.push('Stockzz provides research and information only, not financial advice. No trading or order execution.');

    const bodyText = lines.join('\n');
    const mailtoUrl = `mailto:${encodeURIComponent(toEmail)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(bodyText)}`;

    const smtpHost = process.env.SMTP_HOST?.trim();
    const smtpUser = process.env.SMTP_USER?.trim();
    const smtpPass = process.env.SMTP_PASS?.trim();
    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    const smtpFrom = process.env.SMTP_FROM?.trim() || smtpUser || 'alerts@stockzz.app';

    if (!smtpHost || !smtpUser || !smtpPass) {
      res.json({
        sent: false,
        configured: false,
        toEmail,
        subject,
        bodyText,
        mailtoUrl,
      });
      return;
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const escapeHtml = (val: string) =>
      val
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const htmlAlerts = alertsList
      .map(
        (a) => `
          <div style="border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:12px;background:#ffffff;">
            <p style="margin:0 0 4px;font-size:12px;color:#047857;font-weight:600;">${escapeHtml(
              a.category || 'Alert'
            )} · ${escapeHtml(a.ticker || '')}</p>
            <p style="margin:0 0 6px;font-size:15px;color:#0f172a;font-weight:700;">${escapeHtml(
              a.title || ''
            )}</p>
            <p style="margin:0 0 8px;font-size:13px;color:#334155;">${escapeHtml(a.message || '')}</p>
            ${
              a.beginnerGuidance
                ? `<p style="margin:0;font-size:12px;color:#475569;background:#f8fafc;padding:8px 10px;border-radius:8px;">${escapeHtml(
                    a.beginnerGuidance
                  )}</p>`
                : ''
            }
          </div>
        `
      )
      .join('');

    const html = `
      <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#fafaf9;color:#0f172a;">
        <h2 style="margin:0 0 8px;color:#059669;">Stockzz Alert Update</h2>
        <p style="margin:0 0 16px;font-size:14px;color:#475569;">Hi ${escapeHtml(userName)}, here are your latest alerts for ${escapeHtml(toEmail)}.</p>
        ${htmlAlerts || '<p style="font-size:14px;color:#334155;">Your email alerts are active. No tracked stocks crossed your thresholds today.</p>'}
        <p style="margin-top:20px;font-size:11px;color:#64748b;">Research and information only, not financial advice. Stockzz does not execute trades.</p>
      </div>
    `;

    const info = await transporter.sendMail({
      from: smtpFrom,
      to: toEmail,
      subject,
      text: bodyText,
      html,
    });

    res.json({
      sent: true,
      configured: true,
      toEmail,
      messageId: info.messageId,
      sentAt: new Date().toISOString(),
      subject,
      bodyText,
      mailtoUrl,
    });
  } catch (err) {
    res.status(500).json({
      error: err instanceof Error ? err.message : 'Failed to send alert email.',
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Stockzz server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
