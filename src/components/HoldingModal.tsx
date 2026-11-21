import React, { useEffect, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import {
  LiveUniverseStock,
  PortfolioHolding,
  SearchQuoteItem,
  Sector,
} from '../types/market';
import { formatCurrency } from '../utils/formatters';

interface HoldingModalProps {
  isOpen: boolean;
  onClose: () => void;
  stocks: LiveUniverseStock[];
  initialHolding?: PortfolioHolding | null;
  preselectedTicker?: string;
  onSave: (data: Omit<PortfolioHolding, 'id'>, existingId?: string) => void;
}

const SECTORS: Sector[] = [
  'Technology',
  'Healthcare',
  'Clean Energy & Industrials',
  'Consumer Staples',
  'Financial Services',
];

export const HoldingModal: React.FC<HoldingModalProps> = ({
  isOpen,
  onClose,
  stocks,
  initialHolding,
  preselectedTicker,
  onSave,
}) => {
  const [ticker, setTicker] = useState('AAPL');
  const [companyName, setCompanyName] = useState('Apple Inc.');
  const [exchange, setExchange] = useState('NASDAQ');
  const [sector, setSector] = useState<Sector>('Technology');
  const [currency, setCurrency] = useState('USD');
  const [purchaseDate, setPurchaseDate] = useState('2026-06-15');
  const [quantity, setQuantity] = useState('10');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchMatches, setSearchMatches] = useState<SearchQuoteItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [fetchingPrice, setFetchingPrice] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    setSearchTerm('');
    setSearchMatches([]);

    if (initialHolding) {
      setTicker(initialHolding.ticker);
      setCompanyName(initialHolding.companyName);
      setExchange(initialHolding.exchange);
      setSector(initialHolding.sector || 'Technology');
      setPurchaseDate(initialHolding.purchaseDate);
      setQuantity(String(initialHolding.quantity));
      setPurchasePrice(String(initialHolding.purchasePrice));
      const matched = stocks.find(
        (s) => s.symbol.toUpperCase() === initialHolding.ticker.toUpperCase()
      );
      setCurrency(matched?.currency || 'USD');
      return;
    }

    const targetTicker = (preselectedTicker || stocks[0]?.symbol || 'AAPL').toUpperCase();
    const matched = stocks.find((s) => s.symbol.toUpperCase() === targetTicker);
    setTicker(targetTicker);
    setCompanyName(matched?.name || targetTicker);
    setExchange(matched?.fullExchangeName || matched?.exchange || 'NASDAQ');
    setSector(matched?.sector || 'Technology');
    setCurrency(matched?.currency || 'USD');
    setPurchaseDate(new Date().toISOString().slice(0, 10));
    setQuantity('10');

    if (matched) {
      setPurchasePrice(String(matched.price));
    } else {
      setFetchingPrice(true);
      fetch(`/api/market/quotes?symbols=${encodeURIComponent(targetTicker)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { quotes?: Record<string, { name: string; fullExchangeName: string; price: number; currency: string }> } | null) => {
          const q = d?.quotes?.[targetTicker];
          if (q) {
            setCompanyName(q.name);
            setExchange(q.fullExchangeName);
            setCurrency(q.currency || 'USD');
            setPurchasePrice(String(q.price));
          }
        })
        .catch(() => {})
        .finally(() => setFetchingPrice(false));
    }
  }, [isOpen, initialHolding, preselectedTicker, stocks]);

  useEffect(() => {
    const q = searchTerm.trim();
    if (!q || initialHolding) {
      setSearchMatches([]);
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/market/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as { quotes?: SearchQuoteItem[] };
          setSearchMatches(data.quotes || []);
        }
      } catch {
        // Ignore abort
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchTerm, initialHolding]);

  if (!isOpen) return null;

  const handlePickLiveResult = async (item: SearchQuoteItem) => {
    setTicker(item.symbol);
    setCompanyName(item.name);
    setExchange(item.exchange);
    setSearchTerm('');
    setSearchMatches([]);
    setFetchingPrice(true);
    try {
      const res = await fetch(`/api/market/quotes?symbols=${encodeURIComponent(item.symbol)}`);
      if (res.ok) {
        const data = (await res.json()) as {
          quotes?: Record<string, { price: number; currency: string; fullExchangeName: string }>;
        };
        const q = data.quotes?.[item.symbol.toUpperCase()];
        if (q) {
          setPurchasePrice(String(q.price));
          setCurrency(q.currency || 'USD');
          if (q.fullExchangeName) setExchange(q.fullExchangeName);
        }
      }
    } finally {
      setFetchingPrice(false);
    }
  };

  const qtyNum = Number(quantity);
  const priceNum = Number(purchasePrice);
  const previewInvested =
    Number.isFinite(qtyNum) && Number.isFinite(priceNum) && qtyNum > 0 && priceNum > 0
      ? qtyNum * priceNum
      : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTicker = ticker.trim().toUpperCase();
    const cleanName = companyName.trim();
    const cleanExchange = exchange.trim();

    if (!cleanTicker) {
      setErrorMsg('Please select or search a valid stock ticker.');
      return;
    }
    if (!cleanName) {
      setErrorMsg('Please enter a company name.');
      return;
    }
    if (!purchaseDate) {
      setErrorMsg('Please select a purchase date.');
      return;
    }
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      setErrorMsg('Quantity must be greater than 0.');
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setErrorMsg('Purchase price must be greater than 0.');
      return;
    }

    onSave(
      {
        ticker: cleanTicker,
        companyName: cleanName,
        exchange: cleanExchange || 'NASDAQ',
        purchaseDate,
        quantity: qtyNum,
        purchasePrice: priceNum,
        sector,
      },
      initialHolding?.id
    );
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-[1px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="holding-modal-title"
    >
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 id="holding-modal-title" className="text-base font-semibold text-slate-900">
              {initialHolding ? `Edit Holding · ${initialHolding.ticker}` : 'Add Portfolio Holding'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Valued against live exchange quotes. Manual tracking only—no broker execution.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!initialHolding && (
            <div className="relative">
              <label
                htmlFor="holding-live-search"
                className="block text-xs font-medium text-slate-700 mb-1.5"
              >
                Search Any Global Stock (e.g. AAPL, NVDA, RELIANCE.NS)
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="holding-live-search"
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Type symbol or company name..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              {searchTerm.trim() !== '' && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto z-30">
                  {searching ? (
                    <div className="px-3 py-2.5 flex items-center gap-2 text-xs text-slate-500">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Searching live tickers...</span>
                    </div>
                  ) : searchMatches.length > 0 ? (
                    <ul className="divide-y divide-slate-100">
                      {searchMatches.map((m) => (
                        <li key={m.symbol}>
                          <button
                            type="button"
                            onClick={() => handlePickLiveResult(m)}
                            className="w-full px-3 py-2 text-left hover:bg-slate-50 cursor-pointer flex items-center justify-between gap-2"
                          >
                            <span className="text-xs font-medium text-slate-900 truncate">
                              <span className="font-mono font-bold mr-1.5">{m.symbol}</span>
                              {m.name}
                            </span>
                            <span className="text-[11px] text-slate-500 shrink-0">{m.exchange}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-3 py-2 text-xs text-slate-500">No matches found.</p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="holding-ticker" className="block text-xs font-medium text-slate-700 mb-1.5">
                Selected Ticker
              </label>
              <input
                id="holding-ticker"
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                disabled={Boolean(initialHolding)}
                className="w-full px-3 py-2 text-sm font-mono font-semibold bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
              />
            </div>

            <div>
              <label htmlFor="holding-exchange" className="block text-xs font-medium text-slate-700 mb-1.5">
                Exchange
              </label>
              <input
                id="holding-exchange"
                type="text"
                value={exchange}
                onChange={(e) => setExchange(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="holding-name" className="block text-xs font-medium text-slate-700 mb-1.5">
                Company Name
              </label>
              <input
                id="holding-name"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label htmlFor="holding-sector" className="block text-xs font-medium text-slate-700 mb-1.5">
                Sector
              </label>
              <select
                id="holding-sector"
                value={sector}
                onChange={(e) => setSector(e.target.value as Sector)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-600"
              >
                {SECTORS.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="holding-date" className="block text-xs font-medium text-slate-700 mb-1.5">
                Purchase Date
              </label>
              <input
                id="holding-date"
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label htmlFor="holding-qty" className="block text-xs font-medium text-slate-700 mb-1.5">
                Quantity
              </label>
              <input
                id="holding-qty"
                type="number"
                step="any"
                min="0.0001"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label htmlFor="holding-price" className="block text-xs font-medium text-slate-700 mb-1.5">
                Buy Price ({currency})
              </label>
              <input
                id="holding-price"
                type="number"
                step="0.01"
                min="0.01"
                value={purchasePrice}
                onChange={(e) => setPurchasePrice(e.target.value)}
                placeholder={fetchingPrice ? 'Loading...' : '0.00'}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 flex items-center justify-between">
            <span className="text-xs text-slate-600">Invested Cost Basis</span>
            <span className="text-sm font-mono font-semibold tabular-nums text-slate-900">
              {formatCurrency(previewInvested, 2, currency)}
            </span>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              {initialHolding ? 'Save Changes' : 'Add Holding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
