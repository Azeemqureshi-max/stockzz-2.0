import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  Check,
  Copy,
  Loader2,
  Mail,
  Newspaper,
  Plus,
  RotateCcw,
  Send,
  TrendingUp,
} from 'lucide-react';
import {
  AlertCategory,
  LiveUniverseStock,
  MarketAlert,
  NotificationSettings,
} from '../types/market';
import { EmptyStateCard } from '../components/Skeletons';

interface EmailDeliveryState {
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
}

interface AlertsScreenProps {
  alerts: MarketAlert[];
  stocks: LiveUniverseStock[];
  userEmail: string;
  notificationSettings: NotificationSettings;
  onUpdateSettings: (settings: NotificationSettings) => void;
  onSendEmailNow: (overrideEmail?: string) => void;
  emailDeliveryState: EmailDeliveryState;
  onDismissAlert: (id: string) => void;
  onRestoreAlert: (id: string) => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onRestoreAllAlerts: () => void;
  onCreateCustomAlert: (input: {
    ticker: string;
    category: AlertCategory;
    triggerRule: string;
    title: string;
    message: string;
  }) => void;
  onSelectStock: (ticker: string) => void;
}

const CATEGORIES: ('All' | AlertCategory)[] = [
  'All',
  'Price Movement',
  'Company News',
  'Risk',
];

export const AlertsScreen: React.FC<AlertsScreenProps> = ({
  alerts,
  stocks,
  userEmail,
  notificationSettings,
  onUpdateSettings,
  onSendEmailNow,
  emailDeliveryState,
  onDismissAlert,
  onRestoreAlert,
  onMarkRead,
  onMarkAllRead,
  onRestoreAllAlerts,
  onCreateCustomAlert,
  onSelectStock,
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'All' | AlertCategory>('All');
  const [viewMode, setViewMode] = useState<'active' | 'dismissed'>('active');
  const [emailInput, setEmailInput] = useState(
    notificationSettings.notificationEmail || userEmail
  );
  const [emailError, setEmailError] = useState<string | null>(null);
  const [copiedEmailText, setCopiedEmailText] = useState(false);

  const [customTicker, setCustomTicker] = useState(stocks[0]?.symbol || 'AAPL');
  const [customCategory, setCustomCategory] = useState<AlertCategory>('Price Movement');
  const [customThreshold, setCustomThreshold] = useState('Moves ±5% in live session');
  const [customError, setCustomError] = useState<string | null>(null);

  useEffect(() => {
    setEmailInput(notificationSettings.notificationEmail || userEmail);
  }, [notificationSettings.notificationEmail, userEmail]);

  const visibleAlerts = useMemo(() => {
    return alerts.filter((a) => {
      if (viewMode === 'active' && a.dismissed) return false;
      if (viewMode === 'dismissed' && !a.dismissed) return false;
      if (categoryFilter !== 'All' && a.category !== categoryFilter) return false;
      return true;
    });
  }, [alerts, viewMode, categoryFilter]);

  const unreadActiveCount = alerts.filter((a) => !a.dismissed && !a.read).length;
  const dismissedCount = alerts.filter((a) => a.dismissed).length;

  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = emailInput.trim();
    if (!cleaned || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError(null);
    onUpdateSettings({
      ...notificationSettings,
      emailNotificationsEnabled: true,
      notificationEmail: cleaned,
    });
  };

  const handleCopyDigest = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedEmailText(true);
      window.setTimeout(() => setCopiedEmailText(false), 2000);
    } catch {
      // Clipboard blocked
    }
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const rule = customThreshold.trim();
    const tickerClean = customTicker.trim().toUpperCase();
    if (!tickerClean) {
      setCustomError('Please enter or select a ticker symbol.');
      return;
    }
    if (!rule) {
      setCustomError('Please enter a short alert trigger description.');
      return;
    }
    setCustomError(null);
    const stock = stocks.find((s) => s.symbol.toUpperCase() === tickerClean);
    onCreateCustomAlert({
      ticker: tickerClean,
      category: customCategory,
      triggerRule: rule,
      title: `${tickerClean} custom watch: ${rule}`,
      message: `Custom watch rule active for ${stock?.name || tickerClean} (${customCategory}).`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-emerald-700 mb-1">
            Live Monitoring &amp; Email Alerts
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Notifications &amp; Alert Settings
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Flags notable live price moves and price-trend risks on your tracked stocks, and sends updates to your chosen email.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {unreadActiveCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              <Check className="w-3.5 h-3.5" />
              Mark All Read
            </button>
          )}
          {dismissedCount > 0 && (
            <button
              type="button"
              onClick={onRestoreAllAlerts}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Restore Dismissed ({dismissedCount})
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Alert Feed */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-xl">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    categoryFilter === cat
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('active')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  viewMode === 'active'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setViewMode('dismissed')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                  viewMode === 'dismissed'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Dismissed ({dismissedCount})
              </button>
            </div>
          </div>

          {visibleAlerts.length === 0 ? (
            <EmptyStateCard
              icon={<Bell className="w-5 h-5" />}
              title={
                viewMode === 'dismissed'
                  ? 'No dismissed alerts'
                  : 'No active alerts in this category'
              }
              description={
                viewMode === 'dismissed'
                  ? 'Alerts you dismiss from your active feed will appear here so you can restore them anytime.'
                  : 'No tracked stocks breached your active threshold in this category.'
              }
              primaryAction={
                dismissedCount > 0 && viewMode === 'active'
                  ? {
                      label: 'Restore Dismissed Alerts',
                      onClick: onRestoreAllAlerts,
                    }
                  : {
                      label: 'Show All Categories',
                      onClick: () => {
                        setCategoryFilter('All');
                        setViewMode('active');
                      },
                    }
              }
            />
          ) : (
            <div className="bg-white border border-slate-200/90 rounded-2xl divide-y divide-slate-200 overflow-hidden">
              {visibleAlerts.map((alert) => {
                const Icon =
                  alert.category === 'Price Movement'
                    ? TrendingUp
                    : alert.category === 'Company News'
                      ? Newspaper
                      : AlertTriangle;

                return (
                  <div
                    key={alert.id}
                    className={`p-5 space-y-2.5 transition-colors ${
                      !alert.read && !alert.dismissed ? 'bg-emerald-500/5' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span
                            className={`inline-flex items-center gap-1 font-semibold ${
                              alert.category === 'Risk'
                                ? 'text-rose-700'
                                : alert.category === 'Price Movement'
                                  ? 'text-emerald-700'
                                  : 'text-sky-700'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                            {alert.category}
                          </span>
                          <span aria-hidden="true">·</span>
                          <button
                            type="button"
                            onClick={() => onSelectStock(alert.ticker)}
                            className="font-mono font-semibold text-slate-700 hover:text-emerald-700 cursor-pointer"
                          >
                            {alert.ticker}
                          </button>
                          <span aria-hidden="true">·</span>
                          <span>{alert.dateLabel}</span>
                          {!alert.read && !alert.dismissed && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-semibold text-emerald-700">New</span>
                            </>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => onSelectStock(alert.ticker)}
                          className="text-base font-semibold text-slate-900 hover:text-emerald-700 text-left cursor-pointer transition-colors"
                        >
                          {alert.title}
                        </button>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!alert.read && !alert.dismissed && (
                          <button
                            type="button"
                            onClick={() => onMarkRead(alert.id)}
                            className="px-2.5 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Mark Read
                          </button>
                        )}
                        {!alert.dismissed ? (
                          <button
                            type="button"
                            onClick={() => onDismissAlert(alert.id)}
                            className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Dismiss
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onRestoreAlert(alert.id)}
                            className="px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Restore
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-slate-700 leading-relaxed">{alert.message}</p>

                    <div className="bg-[#fafaf9] border border-slate-200/80 rounded-xl px-3.5 py-2.5 text-xs text-slate-600 leading-relaxed">
                      <strong className="font-semibold text-slate-900">In plain English: </strong>
                      {alert.beginnerGuidance}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Col: Email Alert Delivery + Notification Settings + Custom Rule */}
        <aside className="space-y-6">
          {/* Email Notification Destination Card */}
          <section className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Email Alert Delivery</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automatically uses the email you signed in with. You can update it anytime.
                </p>
              </div>
              <input
                type="checkbox"
                aria-label="Enable email notifications"
                checked={notificationSettings.emailNotificationsEnabled}
                onChange={(e) =>
                  onUpdateSettings({
                    ...notificationSettings,
                    emailNotificationsEnabled: e.target.checked,
                  })
                }
                className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
              />
            </div>

            <form onSubmit={handleSaveEmail} className="space-y-2.5">
              <label
                htmlFor="alert-email-input"
                className="block text-xs font-medium text-slate-700"
              >
                Send notifications to
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1 min-w-0">
                  <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="alert-email-input"
                    type="email"
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      setEmailError(null);
                    }}
                    placeholder="you@example.com"
                    className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  Save
                </button>
              </div>

              {userEmail &&
                emailInput.trim().toLowerCase() !== userEmail.trim().toLowerCase() && (
                  <button
                    type="button"
                    onClick={() => {
                      setEmailInput(userEmail);
                      setEmailError(null);
                      onUpdateSettings({
                        ...notificationSettings,
                        emailNotificationsEnabled: true,
                        notificationEmail: userEmail,
                      });
                    }}
                    className="text-[11px] text-emerald-700 hover:underline cursor-pointer"
                  >
                    Use my login email ({userEmail})
                  </button>
                )}

              {emailError && <p className="text-xs text-rose-700">{emailError}</p>}
            </form>

            <button
              type="button"
              disabled={emailDeliveryState.sending}
              onClick={() => onSendEmailNow(emailInput.trim())}
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              {emailDeliveryState.sending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>Send Alerts to Email Now</span>
            </button>

            {emailDeliveryState.error && (
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">
                {emailDeliveryState.error}
              </p>
            )}

            {emailDeliveryState.result && (
              <div className="rounded-xl border border-slate-200 bg-[#fafaf9] p-3 space-y-2 text-xs">
                {emailDeliveryState.result.sent ? (
                  <p className="text-emerald-800 font-medium">
                    Sent alert email to <span className="font-mono">{emailDeliveryState.result.toEmail}</span>.
                  </p>
                ) : (
                  <>
                    <p className="text-slate-700 leading-relaxed">
                      Saved <strong className="font-mono text-slate-900">{emailDeliveryState.result.toEmail}</strong> for your alerts. Automatic background emails require SMTP secrets on the server — you can send this alert summary right now using your email app:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={emailDeliveryState.result.mailtoUrl}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg whitespace-nowrap"
                      >
                        <Mail className="w-3 h-3" />
                        Open in Email App
                      </a>
                      <button
                        type="button"
                        onClick={() => handleCopyDigest(emailDeliveryState.result!.bodyText)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg cursor-pointer whitespace-nowrap"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedEmailText ? 'Copied' : 'Copy Text'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>

          <section className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-5">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Alert Rules</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose which signals create an alert for you.
              </p>
            </div>

            <div className="divide-y divide-slate-200 space-y-4">
              <div className="pb-4 space-y-3">
                <label className="flex items-start justify-between gap-3 cursor-pointer">
                  <span>
                    <span className="block text-sm font-medium text-slate-900">
                      Big Price Moves
                    </span>
                    <span className="block text-xs text-slate-500">
                      Flag stocks that jump or drop noticeably in a day
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={notificationSettings.priceMovementEnabled}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...notificationSettings,
                        priceMovementEnabled: e.target.checked,
                      })
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                  />
                </label>

                {notificationSettings.priceMovementEnabled && (
                  <div>
                    <span className="block text-xs text-slate-600 mb-1.5">
                      Trigger when price moves at least
                    </span>
                    <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                      {([3, 5, 10] as const).map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() =>
                            onUpdateSettings({
                              ...notificationSettings,
                              priceThresholdPct: pct,
                            })
                          }
                          className={`flex-1 py-1 text-xs font-mono font-medium rounded-lg transition-colors cursor-pointer ${
                            notificationSettings.priceThresholdPct === pct
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          ±{pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pb-4">
                <label className="flex items-start justify-between gap-3 cursor-pointer">
                  <span>
                    <span className="block text-sm font-medium text-slate-900">
                      Company News Updates
                    </span>
                    <span className="block text-xs text-slate-500">
                      Include fresh headlines for stocks you follow
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={notificationSettings.companyNewsEnabled}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...notificationSettings,
                        companyNewsEnabled: e.target.checked,
                      })
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                  />
                </label>
              </div>

              <div className="pb-4">
                <label className="flex items-start justify-between gap-3 cursor-pointer">
                  <span>
                    <span className="block text-sm font-medium text-slate-900">
                      Price Trend &amp; Risk Flags
                    </span>
                    <span className="block text-xs text-slate-500">
                      Notice when a stock cools below averages or heats up fast
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={notificationSettings.riskAlertsEnabled}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...notificationSettings,
                        riskAlertsEnabled: e.target.checked,
                      })
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600"
                  />
                </label>
              </div>

              <div>
                <label
                  htmlFor="digest-freq"
                  className="block text-xs font-medium text-slate-700 mb-1.5"
                >
                  Email Frequency
                </label>
                <select
                  id="digest-freq"
                  value={notificationSettings.digestFrequency}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...notificationSettings,
                      digestFrequency: e.target.value as NotificationSettings['digestFrequency'],
                    })
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-600"
                >
                  <option value="Immediate">Immediate</option>
                  <option value="Daily Digest">Daily Summary</option>
                  <option value="Weekly Summary">Weekly Summary</option>
                </select>
              </div>
            </div>
          </section>

          {/* Create Custom Watch Alert */}
          <section className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold text-slate-900">Add Custom Watch Reminder</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Save your own reminder note for any stock.
              </p>
            </div>

            <form onSubmit={handleCreateCustom} className="space-y-3">
              <div>
                <label htmlFor="custom-alert-stock" className="block text-xs font-medium text-slate-700 mb-1">
                  Stock Ticker
                </label>
                <input
                  id="custom-alert-stock"
                  type="text"
                  list="alert-universe-tickers"
                  value={customTicker}
                  onChange={(e) => setCustomTicker(e.target.value.toUpperCase())}
                  placeholder="e.g. AAPL, NVDA, TCS.NS"
                  className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-600"
                />
                <datalist id="alert-universe-tickers">
                  {stocks.map((s) => (
                    <option key={s.symbol} value={s.symbol}>
                      {s.name}
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <label htmlFor="custom-alert-cat" className="block text-xs font-medium text-slate-700 mb-1">
                  Category
                </label>
                <select
                  id="custom-alert-cat"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value as AlertCategory)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-600"
                >
                  <option value="Price Movement">Price Movement</option>
                  <option value="Company News">Company News</option>
                  <option value="Risk">Risk</option>
                </select>
              </div>

              <div>
                <label htmlFor="custom-alert-rule" className="block text-xs font-medium text-slate-700 mb-1">
                  Reminder Note
                </label>
                <input
                  id="custom-alert-rule"
                  type="text"
                  value={customThreshold}
                  onChange={(e) => setCustomThreshold(e.target.value)}
                  placeholder="e.g. Check quarterly results"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-600"
                />
              </div>

              {customError && <p className="text-xs text-rose-700">{customError}</p>}

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Save Reminder
              </button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
};
