import {
  FactorScores,
  FactorWeights,
  HorizonTerm,
  InvestmentRequirements,
  LiveUniverseStock,
  MarketExchangeOption,
  OptionalPreference,
  PersonalizedRecommendation,
  RiskLevel,
} from '../types/market';

export const EXCHANGE_LABELS: Record<MarketExchangeOption, string> = {
  NASDAQ: 'US Tech & Growth (NASDAQ)',
  NYSE: 'US Large Companies (NYSE)',
  NSE: 'India (NSE)',
  LSE: 'UK (London)',
  XETRA: 'Germany (XETRA)',
};

export const RISK_LABELS: Record<RiskLevel, { title: string; subtitle: string }> = {
  low: {
    title: 'Low Risk',
    subtitle: 'Calmer prices, smaller daily drops, and steady businesses',
  },
  medium: {
    title: 'Balanced',
    subtitle: 'A healthy mix of stability and room to grow over time',
  },
  high: {
    title: 'High Growth',
    subtitle: 'Faster-growing companies whose prices can swing more',
  },
};

export const HORIZON_LABELS: Record<HorizonTerm, { title: string; subtitle: string }> = {
  short: {
    title: '1–2 Years',
    subtitle: 'Looks closer at recent price trend and current news',
  },
  medium: {
    title: '3–5 Years',
    subtitle: 'Balances steady profits with healthy price momentum',
  },
  long: {
    title: '5+ Years',
    subtitle: 'Focuses on strong business health and long-term growth',
  },
};

export const PREFERENCE_LABELS: Record<OptionalPreference, string> = {
  dividend: 'Pays regular dividends',
  growth: 'Fast-growing sales',
  stable: 'Calm & steady price',
  value: 'Fair price vs. profit',
};

export function describePriceSwings(annualizedVolPct: number): {
  label: 'Calm' | 'Moderate' | 'Bumpy';
  hint: string;
} {
  if (annualizedVolPct < 22) {
    return { label: 'Calm', hint: 'Smaller day-to-day ups & downs' };
  }
  if (annualizedVolPct < 31) {
    return { label: 'Moderate', hint: 'Normal ups & downs for a stock' };
  }
  return { label: 'Bumpy', hint: 'Bigger day-to-day price swings' };
}

/**
 * Dynamically computes factor weights (summing to 100%) based on Risk Tolerance + Horizon.
 */
export function getFactorWeights(
  risk: RiskLevel,
  horizon: HorizonTerm
): FactorWeights {
  let fundamentals = risk === 'low' ? 30 : risk === 'medium' ? 32 : 30;
  let technicals = risk === 'low' ? 12 : risk === 'medium' ? 20 : 28;
  let industryTrend = risk === 'low' ? 10 : risk === 'medium' ? 14 : 18;
  let news = risk === 'low' ? 8 : risk === 'medium' ? 10 : 12;
  let riskAlignment = risk === 'low' ? 40 : risk === 'medium' ? 24 : 12;

  if (horizon === 'short') {
    technicals += 12;
    news += 4;
    fundamentals -= 10;
    riskAlignment -= 6;
  } else if (horizon === 'long') {
    fundamentals += 12;
    industryTrend += 4;
    technicals -= 10;
    news -= 6;
  }

  const total = fundamentals + technicals + industryTrend + news + riskAlignment;
  const f = Math.round((fundamentals / total) * 100);
  const t = Math.round((technicals / total) * 100);
  const i = Math.round((industryTrend / total) * 100);
  const n = Math.round((news / total) * 100);
  const r = Math.max(0, 100 - (f + t + i + n));

  return {
    fundamentals: f,
    technicals: t,
    industryTrend: i,
    news: n,
    riskAlignment: r,
  };
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function inspectMissingFields(stock: LiveUniverseStock): string[] {
  const missing: string[] = [];
  const f = stock.fundamentals;
  if (!f) {
    return ['P/E Ratio', 'Profitability', 'Sales Growth', 'Debt Level', 'Market Sensitivity'];
  }
  if (f.peRatio === null) missing.push('P/E Ratio');
  if (f.roePct === null) missing.push('Profitability');
  if (f.revenueGrowthPct === null) missing.push('Sales Growth');
  if (f.debtToEquity === null) missing.push('Debt Level');
  if (f.beta === null) missing.push('Market Sensitivity');
  if (f.dividendYieldPct === null) missing.push('Dividend Yield');
  return missing;
}

function scoreFundamentals(
  stock: LiveUniverseStock,
  risk: RiskLevel,
  horizon: HorizonTerm,
  prefs: OptionalPreference[]
): number {
  const f = stock.fundamentals;
  if (!f) return 48;

  let score = 55;
  let availableCount = 0;

  if (f.roePct !== null) {
    availableCount++;
    if (f.roePct >= 25) score += 16;
    else if (f.roePct >= 14) score += 10;
    else if (f.roePct >= 8) score += 4;
    else if (f.roePct < 0) score -= 12;
  }

  if (f.profitMarginPct !== null) {
    availableCount++;
    if (f.profitMarginPct >= 20) score += 10;
    else if (f.profitMarginPct >= 10) score += 6;
    else if (f.profitMarginPct < 3) score -= 8;
  }

  if (f.revenueGrowthPct !== null) {
    availableCount++;
    const growthMult = risk === 'high' || prefs.includes('growth') || horizon === 'long' ? 1.4 : 0.85;
    if (f.revenueGrowthPct >= 15) score += Math.round(14 * growthMult);
    else if (f.revenueGrowthPct >= 6) score += Math.round(7 * growthMult);
    else if (f.revenueGrowthPct < 0) score -= Math.round(10 * growthMult);
  }

  if (f.peRatio !== null) {
    availableCount++;
    const valueSensitive = prefs.includes('value') || risk === 'low' || horizon === 'long';
    if (f.peRatio > 0 && f.peRatio <= 20) score += valueSensitive ? 14 : 8;
    else if (f.peRatio > 20 && f.peRatio <= 32) score += 5;
    else if (f.peRatio > 45) score -= valueSensitive ? 14 : 4;
  }

  if (f.dividendYieldPct !== null && (prefs.includes('dividend') || risk === 'low')) {
    if (f.dividendYieldPct >= 2.5) score += 14;
    else if (f.dividendYieldPct >= 1.2) score += 7;
    else if (prefs.includes('dividend')) score -= 10;
  }

  if (availableCount === 0) return 45;
  return clampScore(score);
}

function scoreTechnicals(
  stock: LiveUniverseStock,
  risk: RiskLevel,
  horizon: HorizonTerm
): number {
  const t = stock.technicals;
  let score = 50;

  if (t.above50Ma && t.above200Ma) score += 24;
  else if (t.above200Ma) score += 12;
  else if (t.above50Ma) score += 8;
  else score -= 14;

  if (horizon === 'short') {
    if (t.rsi14 >= 52 && t.rsi14 <= 68) score += 16;
    else if (t.rsi14 > 72) score -= 10;
    else if (t.rsi14 < 38) score -= 8;
  } else {
    if (t.rsi14 >= 40 && t.rsi14 <= 66) score += 10;
    else if (t.rsi14 > 75) score -= 6;
  }

  if (risk === 'high') {
    if (stock.oneYearReturnPct >= 25) score += 14;
    else if (stock.oneYearReturnPct >= 10) score += 8;
    else if (stock.oneYearReturnPct < 0) score -= 10;
  } else {
    if (stock.oneYearReturnPct >= 5 && stock.oneYearReturnPct <= 35) score += 10;
    else if (stock.oneYearReturnPct < -10) score -= 10;
  }

  return clampScore(score);
}

function scoreIndustryTrend(stock: LiveUniverseStock): number {
  const avgRet = stock.industryAvg1YReturnPct ?? stock.oneYearReturnPct;
  const bullPct = stock.industryBullishPct ?? (stock.technicals.above200Ma ? 65 : 35);

  let score = 50;
  if (avgRet >= 15) score += 20;
  else if (avgRet >= 5) score += 12;
  else if (avgRet < 0) score -= 10;

  if (bullPct >= 70) score += 18;
  else if (bullPct >= 50) score += 10;
  else score -= 8;

  if (stock.oneYearReturnPct >= avgRet) score += 8;

  return clampScore(score);
}

function scoreNewsActivity(stock: LiveUniverseStock, horizon: HorizonTerm): number {
  let score = 50;
  const cnt = stock.recentNewsCount ?? 0;
  if (cnt >= 4) score += 24;
  else if (cnt >= 2) score += 16;
  else if (cnt === 1) score += 8;
  else score -= 8;

  if (horizon === 'short' && stock.changePct > 0 && cnt >= 2) {
    score += 12;
  }
  return clampScore(score);
}

function scoreRiskAlignment(
  stock: LiveUniverseStock,
  risk: RiskLevel,
  prefs: OptionalPreference[]
): number {
  const vol = stock.technicals.annualizedVolPct;
  const beta = stock.fundamentals?.beta;
  const dte = stock.fundamentals?.debtToEquity;
  let score = 58;

  if (risk === 'low') {
    if (vol < 20) score += 26;
    else if (vol < 26) score += 12;
    else if (vol >= 32) score -= 28;
    else score -= 8;

    if (beta !== null) {
      if (beta <= 0.85) score += 12;
      else if (beta > 1.25) score -= 16;
    }
    if (dte !== null) {
      if (dte <= 0.6) score += 8;
      else if (dte > 1.5) score -= 12;
    }
  } else if (risk === 'medium') {
    if (vol >= 16 && vol <= 33) score += 22;
    else if (vol < 16) score += 14;
    else score -= 12;

    if (beta !== null && beta >= 0.7 && beta <= 1.35) score += 10;
    if (dte !== null && dte <= 1.2) score += 6;
  } else {
    if (vol >= 24 && stock.oneYearReturnPct > 5) score += 24;
    else if (vol >= 20) score += 12;
    else score -= 8;

    if (beta !== null && beta >= 1.05) score += 12;
  }

  if (prefs.includes('stable')) {
    if (vol < 23) score += 12;
    else if (vol > 32) score -= 14;
  }

  return clampScore(score);
}

function buildStrengthsAndRisks(
  stock: LiveUniverseStock,
  requirements: InvestmentRequirements,
  missingFields: string[]
): { strengths: string[]; risks: string[] } {
  const f = stock.fundamentals;
  const t = stock.technicals;
  const strengths: string[] = [];
  const risks: string[] = [];

  if (f?.debtToEquity !== null && f.debtToEquity <= 0.45) {
    strengths.push('Very little debt compared to company size');
  }
  if (f?.roePct !== null && f.roePct >= 15) {
    strengths.push('Earns strong profit on the money it uses');
  }
  if (f?.revenueGrowthPct !== null && f.revenueGrowthPct >= 8) {
    strengths.push(`Company sales grew +${f.revenueGrowthPct}% over the past year`);
  }
  if (f?.dividendYieldPct !== null && f.dividendYieldPct >= 1.5) {
    strengths.push(`Pays a steady ${f.dividendYieldPct}% yearly dividend`);
  }
  if (t.above50Ma && t.above200Ma) {
    strengths.push('Share price has been moving steadily upward');
  } else if (t.above200Ma) {
    strengths.push('Share price sits above its long-term average');
  }
  if (t.annualizedVolPct < 22) {
    strengths.push('Price stays calmer than most stocks');
  }
  if (strengths.length === 0) {
    strengths.push(`Well-known ${stock.sector.toLowerCase()} company on ${stock.exchangeGroup}`);
  }

  // Plain-English Risks
  if (t.annualizedVolPct >= 30) {
    risks.push('Share price can swing up and down sharply');
  } else if (requirements.riskTolerance === 'low' && t.annualizedVolPct >= 23) {
    risks.push('Price moves a bit more than very conservative stocks');
  }
  if (f?.peRatio !== null && f.peRatio > 35) {
    risks.push('Shares cost a lot compared to current yearly profit');
  }
  if (f?.debtToEquity !== null && f.debtToEquity > 1.2) {
    risks.push('Carries noticeable debt on its balance sheet');
  }
  if (!t.above50Ma) {
    risks.push('Share price has cooled off in recent weeks');
  }
  if (t.rsi14 >= 69) {
    risks.push('Price rose fast recently, so it could pause or dip');
  }
  if (missingFields.length >= 2) {
    risks.push('Some company financial ratios were not reported');
  }
  if (risks.length === 0) {
    risks.push('Like any stock, prices still move with the wider market');
  }

  return {
    strengths: strengths.slice(0, 2),
    risks: risks.slice(0, 2),
  };
}

function buildPlainExplanation(
  stock: LiveUniverseStock,
  req: InvestmentRequirements,
  _weights: FactorWeights,
  missingFields: string[]
): string {
  const f = stock.fundamentals;
  const swing = describePriceSwings(stock.technicals.annualizedVolPct);

  const sentence1 =
    req.riskTolerance === 'low'
      ? `${stock.name} fits a low-risk approach because its share price has been ${swing.label.toLowerCase()}${
          f?.dividendYieldPct !== null && f.dividendYieldPct >= 1.2
            ? ` and it pays a ${f.dividendYieldPct}% yearly dividend`
            : ''
        }.`
      : req.riskTolerance === 'high'
        ? `${stock.name} fits a growth-oriented approach, gaining ${
            stock.oneYearReturnPct >= 0 ? '+' : ''
          }${stock.oneYearReturnPct}% over the past year${
            f?.revenueGrowthPct !== null && f.revenueGrowthPct > 0
              ? ` as company sales grew +${f.revenueGrowthPct}%`
              : ''
          }.`
        : `${stock.name} offers a balanced profile with ${swing.label.toLowerCase()} day-to-day price moves and ${
            stock.technicals.trendDirection === 'Bullish'
              ? 'an upward price trend'
              : stock.technicals.trendDirection === 'Bearish'
                ? 'a softer recent price trend'
                : 'a steady price trend'
          }.`;

  let sentence2 = '';
  if (req.investmentHorizon === 'short') {
    sentence2 = `For a 1–2 year window, its price is currently ${
      stock.technicals.above50Ma ? 'above' : 'below'
    } its recent average with ${
      stock.recentNewsCount > 0 ? `${stock.recentNewsCount} recent news stories` : 'light recent news'
    }.`;
  } else if (req.investmentHorizon === 'long') {
    sentence2 = `For a 5+ year hold, ${
      f?.roePct !== null && f.roePct >= 14
        ? 'the business turns a healthy profit on its money'
        : 'it operates in a major global industry'
    }${
      f?.peRatio !== null
        ? f.peRatio <= 25
          ? ' and trades at a reasonable price compared to earnings.'
          : ' though investors pay a higher price for its future growth.'
        : '.'
    }`;
  } else {
    sentence2 = `Over a 3–5 year window, it holds ${
      stock.technicals.above200Ma ? 'above' : 'near'
    } its long-term trend in the ${stock.sector} industry.`;
  }

  const missingNote =
    missingFields.length >= 3
      ? ' Note: Some financial ratios were unavailable from the live feed.'
      : '';

  return `${sentence1} ${sentence2}${missingNote}`;
}

/**
 * Primary personalized stock recommendation engine.
 * Filters by markets/exchanges and sectors, applies dynamic weights by riskTolerance and
 * investmentHorizon, incorporates optional preferences, scores fundamentals + technicals +
 * industry trend + news + risk alignment, and returns ranked results with beginner-friendly copy.
 */
export function calculatePersonalizedRecommendations(
  universe: LiveUniverseStock[],
  requirements: InvestmentRequirements
): PersonalizedRecommendation[] {
  const queryLower = requirements.query.trim().toLowerCase();
  const marketSet = new Set(requirements.markets);
  const sectorSet = new Set(requirements.sectors);

  // 1. Strict filtering against user's selected Markets/Exchanges & Sectors
  const filtered = universe.filter((stock) => {
    if (marketSet.size > 0 && !marketSet.has(stock.exchangeGroup)) {
      return false;
    }
    if (sectorSet.size > 0 && !sectorSet.has(stock.sector)) {
      return false;
    }
    if (queryLower) {
      const hay = `${stock.symbol} ${stock.name} ${stock.sector} ${stock.exchangeGroup} ${stock.country}`.toLowerCase();
      if (!hay.includes(queryLower)) return false;
    }
    return true;
  });

  const weights = getFactorWeights(
    requirements.riskTolerance,
    requirements.investmentHorizon
  );

  // 2. Score each matching equity across all 5 weighted pillars
  const scored: PersonalizedRecommendation[] = filtered.map((stock) => {
    const missingDataFields = inspectMissingFields(stock);
    const factorScores: FactorScores = {
      fundamentals: scoreFundamentals(
        stock,
        requirements.riskTolerance,
        requirements.investmentHorizon,
        requirements.preferences
      ),
      technicals: scoreTechnicals(
        stock,
        requirements.riskTolerance,
        requirements.investmentHorizon
      ),
      industryTrend: scoreIndustryTrend(stock),
      news: scoreNewsActivity(stock, requirements.investmentHorizon),
      riskAlignment: scoreRiskAlignment(
        stock,
        requirements.riskTolerance,
        requirements.preferences
      ),
    };

    let weightedSum =
      (factorScores.fundamentals * weights.fundamentals +
        factorScores.technicals * weights.technicals +
        factorScores.industryTrend * weights.industryTrend +
        factorScores.news * weights.news +
        factorScores.riskAlignment * weights.riskAlignment) /
      100;

    const prefs = requirements.preferences;
    const f = stock.fundamentals;
    const swing = describePriceSwings(stock.technicals.annualizedVolPct);

    const matchedRequirements: string[] = [
      EXCHANGE_LABELS[stock.exchangeGroup] || stock.exchangeGroup,
      stock.sector,
    ];

    if (
      (requirements.riskTolerance === 'low' && stock.technicals.annualizedVolPct < 24) ||
      (requirements.riskTolerance === 'medium' &&
        stock.technicals.annualizedVolPct >= 15 &&
        stock.technicals.annualizedVolPct <= 34) ||
      (requirements.riskTolerance === 'high' && stock.technicals.annualizedVolPct >= 22)
    ) {
      matchedRequirements.push(`${swing.label} price swings`);
    }

    if (requirements.investmentHorizon === 'short' && stock.technicals.above50Ma) {
      matchedRequirements.push('Upward short-term price');
    } else if (requirements.investmentHorizon === 'medium' && stock.technicals.above200Ma) {
      matchedRequirements.push('Steady multi-year trend');
    } else if (
      requirements.investmentHorizon === 'long' &&
      ((f?.roePct !== null && f.roePct >= 14) || stock.technicals.above200Ma)
    ) {
      matchedRequirements.push('Strong long-term business');
    }

    if (prefs.includes('dividend')) {
      if (f?.dividendYieldPct !== null && f.dividendYieldPct >= 1.5) {
        weightedSum += 6;
        matchedRequirements.push(`Pays ${f.dividendYieldPct}% dividend`);
      } else {
        weightedSum -= 8;
      }
    }
    if (prefs.includes('growth')) {
      if ((f?.revenueGrowthPct !== null && f.revenueGrowthPct >= 8) || stock.oneYearReturnPct >= 15) {
        weightedSum += 6;
        matchedRequirements.push('Growing sales');
      } else {
        weightedSum -= 6;
      }
    }
    if (prefs.includes('stable')) {
      if (stock.technicals.annualizedVolPct < 23) {
        weightedSum += 6;
        matchedRequirements.push('Calm price history');
      } else {
        weightedSum -= 7;
      }
    }
    if (prefs.includes('value')) {
      if (f?.peRatio !== null && f.peRatio > 0 && f.peRatio <= 24) {
        weightedSum += 6;
        matchedRequirements.push('Fair price vs. profit');
      } else if (f?.peRatio !== null && f.peRatio > 38) {
        weightedSum -= 6;
      }
    }

    if (missingDataFields.length >= 3) {
      weightedSum -= 5;
    }

    const overallScore = Math.max(25, Math.min(98, Math.round(weightedSum)));
    const matchLabel: PersonalizedRecommendation['matchLabel'] =
      overallScore >= 76 ? 'Strong Match' : overallScore >= 60 ? 'Good Match' : 'Partial Match';

    const { strengths, risks } = buildStrengthsAndRisks(
      stock,
      requirements,
      missingDataFields
    );

    const plainLanguageExplanation = buildPlainExplanation(
      stock,
      requirements,
      weights,
      missingDataFields
    );

    return {
      stock,
      overallScore,
      matchLabel,
      plainLanguageExplanation,
      matchedRequirements,
      strengths,
      risks,
      missingDataFields,
      factorScores,
      appliedWeights: weights,
      isDemoFallback: Boolean(stock.isDemoFallback),
    };
  });

  return scored.sort((a, b) => b.overallScore - a.overallScore);
}
