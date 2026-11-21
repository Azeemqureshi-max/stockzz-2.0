export function formatCurrency(
  value: number,
  decimals = 2,
  currency = 'USD'
): string {
  const abs = Math.abs(value);
  let formatted: string;
  try {
    formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'GBp' ? 'GBP' : currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(abs);
  } catch {
    formatted = `${currency} ${abs.toFixed(decimals)}`;
  }
  return value < 0 ? `-${formatted}` : formatted;
}

export function formatSignedCurrency(
  value: number,
  decimals = 2,
  currency = 'USD'
): string {
  if (value > 0) return `+${formatCurrency(value, decimals, currency)}`;
  if (value < 0) return formatCurrency(value, decimals, currency);
  return formatCurrency(0, decimals, currency);
}

export function formatSignedPct(value: number, decimals = 2): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
