import React, { useEffect, useState } from 'react';
import {
  Bell,
  Briefcase,
  HelpCircle,
  LayoutGrid,
  LineChart,
  Loader2,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  Settings,
  SlidersHorizontal,
  Sprout,
  Star,
  User,
  X,
} from 'lucide-react';
import { AppTab, SearchQuoteItem } from '../types/market';

interface LayoutShellProps {
  activeTab: AppTab;
  onNavigate: (tab: AppTab) => void;
  activeAlertsCount: number;
  onSelectStock: (ticker: string) => void;
  onRefreshLive: () => void;
  isRefreshing: boolean;
  lastUpdatedAt: string | null;
  onLogout: () => void;
  userName: string;
  children: React.ReactNode;
}

const PRIMARY_NAV: {
  id: AppTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'suggestions', label: 'Suggestions', icon: LayoutGrid },
  { id: 'requirements', label: 'Requirements', icon: SlidersHorizontal },
  { id: 'analysis', label: 'Analysis', icon: LineChart },
  { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
  { id: 'watchlist', label: 'Watchlist', icon: Star },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

const SECONDARY_NAV: {
  id: AppTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'help', label: 'Help', icon: HelpCircle },
];

export const LayoutShell: React.FC<LayoutShellProps> = ({
  activeTab,
  onNavigate,
  activeAlertsCount,
  onSelectStock,
  onRefreshLive,
  isRefreshing,
  lastUpdatedAt,
  onLogout,
  userName,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickQuery, setQuickQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchQuoteItem[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const q = quickQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearching(false);
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
          setSearchResults(data.quotes || []);
        }
      } catch {
        // Ignore aborted requests
      } finally {
        setSearching(false);
      }
    }, 260);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [quickQuery]);

  const handleNavClick = (id: AppTab) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  const initials = userName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const isDetailView = activeTab === 'analysis-detail';

  const updatedLabel = lastUpdatedAt
    ? new Date(lastUpdatedAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Syncing...';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200/90">
      <div className="px-5 h-16 flex items-center justify-between shrink-0">
        <button
          type="button"
          onClick={() => handleNavClick('suggestions')}
          className="flex items-center gap-2.5 text-left cursor-pointer"
        >
          <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <Sprout className="w-4 h-4" />
          </span>
          <span className="font-display font-bold text-lg tracking-tight text-slate-900 whitespace-nowrap">
            Stockzz
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav aria-label="Primary navigation" className="flex-1 px-3 py-3 flex flex-col justify-between overflow-y-auto">
        <div className="space-y-1">
          {PRIMARY_NAV.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.id ||
              (item.id === 'analysis' && activeTab === 'analysis-detail');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.id === 'notifications' && activeAlertsCount > 0 && (
                  <span className="text-xs font-mono tabular-nums font-semibold text-emerald-700 shrink-0">
                    {activeAlertsCount}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-4 mt-4 border-t border-slate-100 space-y-1">
            {SECONDARY_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Log out</span>
          </button>
        </div>
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafaf9] text-slate-900 flex">
      <aside className="hidden lg:block w-56 shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-64 max-w-[85vw] h-full z-10">{sidebarContent}</div>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {!isDetailView && (
          <header className="sticky top-0 z-20 bg-[#fafaf9]/95 backdrop-blur-xs border-b border-slate-200/70">
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Open navigation menu"
                  className="lg:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-200/60 cursor-pointer"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                  <span className="font-medium text-emerald-700">Live Market Data</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">Updated {updatedLabel}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-1 justify-end">
                {/* Live Global Ticker Search */}
                <div className="relative w-full max-w-xs">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={quickQuery}
                    onChange={(e) => setQuickQuery(e.target.value)}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => window.setTimeout(() => setSearchFocused(false), 200)}
                    placeholder="Look up any company (Apple, TCS)..."
                    aria-label="Search live global stocks"
                    className="w-full pl-9 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
                  />

                  {searchFocused && quickQuery.trim() !== '' && (
                    <div className="absolute right-0 mt-1.5 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden z-40">
                      {searching ? (
                        <div className="px-4 py-3 flex items-center gap-2 text-xs text-slate-500">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Searching global exchanges...</span>
                        </div>
                      ) : searchResults.length > 0 ? (
                        <ul className="divide-y divide-slate-100">
                          {searchResults.map((s) => (
                            <li key={s.symbol}>
                              <button
                                type="button"
                                onMouseDown={() => {
                                  onSelectStock(s.symbol);
                                  setQuickQuery('');
                                }}
                                className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between gap-3 cursor-pointer"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-900 truncate">
                                    {s.name}
                                  </p>
                                  <p className="text-xs text-slate-500 truncate">
                                    <span className="font-mono font-semibold text-slate-700">
                                      {s.symbol}
                                    </span>
                                    <span className="mx-1.5">·</span>
                                    <span>{s.exchange}</span>
                                    {s.sector ? ` · ${s.sector}` : ''}
                                  </p>
                                </div>
                                <span className="text-[11px] font-medium text-emerald-700 shrink-0">
                                  Open
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="px-4 py-3 text-xs text-slate-500">
                          No companies found for &quot;{quickQuery}&quot;.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onRefreshLive}
                  disabled={isRefreshing}
                  title="Refresh live market prices"
                  aria-label="Refresh live market prices"
                  className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('notifications')}
                  aria-label="Open notifications"
                  className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-200 transition-colors cursor-pointer shrink-0"
                >
                  <Bell className="w-4 h-4" />
                  {activeAlertsCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleNavClick('profile')}
                  aria-label="Open profile"
                  className="cursor-pointer shrink-0"
                >
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white text-xs font-semibold flex items-center justify-center">
                    {initials || 'AX'}
                  </div>
                </button>
              </div>
            </div>
          </header>
        )}

        <main
          className={
            isDetailView
              ? 'flex-1 w-full bg-[#0B111A]'
              : 'flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-7'
          }
        >
          {children}
        </main>

        {!isDetailView && (
          <footer className="max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 pb-6 mt-auto">
            <div className="bg-white border border-slate-200/90 rounded-2xl px-4 py-3 text-center text-xs text-slate-600">
              Stockzz provides research and information, not financial advice. It does not execute trades or guarantee returns.
            </div>
          </footer>
        )}
      </div>
    </div>
  );
};
