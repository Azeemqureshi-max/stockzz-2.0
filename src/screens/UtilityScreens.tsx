import React, { useEffect, useState } from 'react';
import { BookOpen, Mail, RotateCcw, ShieldCheck, Sliders, User } from 'lucide-react';
import { BEGINNER_GLOSSARY } from '../data/liveDefaults';
import { AppTab, NotificationSettings } from '../types/market';

interface ProfileScreenProps {
  userName: string;
  userEmail: string;
  holdingsCount: number;
  watchlistCount: number;
  onUpdateUserEmail: (email: string) => void;
  onResetWorkspace: () => void;
  onLogout: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  userName,
  userEmail,
  holdingsCount,
  watchlistCount,
  onUpdateUserEmail,
  onResetWorkspace,
  onLogout,
}) => {
  const [emailDraft, setEmailDraft] = useState(userEmail);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    setEmailDraft(userEmail);
  }, [userEmail]);

  const handleSaveProfileEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = emailDraft.trim();
    if (!cleaned || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailError(null);
    onUpdateUserEmail(cleaned);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          Your Stockzz account email and personal workspace controls.
        </p>
      </div>

      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-bold text-base flex items-center justify-center shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">{userName}</h2>
            <p className="text-xs text-slate-500">{userEmail}</p>
          </div>
        </div>

        <form onSubmit={handleSaveProfileEmail} className="pt-4 border-t border-slate-200 space-y-2">
          <label htmlFor="profile-email-input" className="block text-xs font-medium text-slate-700">
            Account &amp; Alert Notification Email
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="profile-email-input"
                type="email"
                value={emailDraft}
                onChange={(e) => {
                  setEmailDraft(e.target.value);
                  setEmailError(null);
                }}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer whitespace-nowrap"
            >
              Update Email
            </button>
          </div>
          {emailError && <p className="text-xs text-rose-700">{emailError}</p>}
        </form>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200 text-sm">
          <div>
            <span className="text-xs text-slate-500 block">Data Feed</span>
            <span className="font-semibold text-emerald-700">Live Global Quotes</span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Logged Holdings</span>
            <span className="font-mono font-semibold tabular-nums text-slate-900">
              {holdingsCount}
            </span>
          </div>
          <div>
            <span className="text-xs text-slate-500 block">Tracked Watchlist</span>
            <span className="font-mono font-semibold tabular-nums text-slate-900">
              {watchlistCount}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-200">
          <button
            type="button"
            onClick={onResetWorkspace}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Portfolio &amp; Watchlist
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-xl cursor-pointer"
          >
            Log out
          </button>
        </div>
      </section>
    </div>
  );
};

interface SettingsScreenProps {
  notificationSettings: NotificationSettings;
  onUpdateSettings: (settings: NotificationSettings) => void;
  onNavigate: (tab: AppTab) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  notificationSettings,
  onUpdateSettings,
  onNavigate,
}) => {
  const [emailDraft, setEmailDraft] = useState(notificationSettings.notificationEmail);
  const [emailError, setEmailError] = useState<string | null>(null);

  useEffect(() => {
    setEmailDraft(notificationSettings.notificationEmail);
  }, [notificationSettings.notificationEmail]);

  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = emailDraft.trim();
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

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Configure which email receives alerts and what signals you want to track.
        </p>
      </div>

      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-emerald-600" />
            <h2 className="text-base font-semibold text-slate-900">Alert Preferences</h2>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('notifications')}
            className="text-xs font-medium text-emerald-700 hover:underline cursor-pointer"
          >
            Open Notifications Feed
          </button>
        </div>

        <form onSubmit={handleSaveEmail} className="rounded-xl border border-slate-200 bg-[#fafaf9] p-4 space-y-2.5">
          <label htmlFor="settings-alert-email" className="block text-xs font-semibold text-slate-800">
            Email Address for Alert Notifications
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="settings-alert-email"
                type="email"
                value={emailDraft}
                onChange={(e) => {
                  setEmailDraft(e.target.value);
                  setEmailError(null);
                }}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl cursor-pointer whitespace-nowrap"
            >
              Save Alert Email
            </button>
          </div>
          {emailError && <p className="text-xs text-rose-700">{emailError}</p>}
        </form>

        <div className="divide-y divide-slate-200">
          <label className="py-3.5 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-slate-900">Email Alert Notifications</p>
              <p className="text-xs text-slate-500">
                Send alert updates to {notificationSettings.notificationEmail || 'your email'}
              </p>
            </div>
            <input
              type="checkbox"
              checked={notificationSettings.emailNotificationsEnabled}
              onChange={(e) =>
                onUpdateSettings({
                  ...notificationSettings,
                  emailNotificationsEnabled: e.target.checked,
                })
              }
              className="h-4 w-4 rounded border-slate-300 text-emerald-600"
            />
          </label>

          <label className="py-3.5 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-slate-900">Big Price Moves</p>
              <p className="text-xs text-slate-500">
                Flag daily price swings beyond ±{notificationSettings.priceThresholdPct}%
              </p>
            </div>
            <input
              type="checkbox"
              checked={notificationSettings.priceMovementEnabled}
              onChange={(e) =>
                onUpdateSettings({
                  ...notificationSettings,
                  priceMovementEnabled: e.target.checked,
                })
              }
              className="h-4 w-4 rounded border-slate-300 text-emerald-600"
            />
          </label>

          <label className="py-3.5 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-slate-900">Company News Updates</p>
              <p className="text-xs text-slate-500">
                Include recent news headlines for stocks you track
              </p>
            </div>
            <input
              type="checkbox"
              checked={notificationSettings.companyNewsEnabled}
              onChange={(e) =>
                onUpdateSettings({
                  ...notificationSettings,
                  companyNewsEnabled: e.target.checked,
                })
              }
              className="h-4 w-4 rounded border-slate-300 text-emerald-600"
            />
          </label>

          <label className="py-3.5 flex items-center justify-between gap-4 cursor-pointer">
            <div>
              <p className="text-sm font-medium text-slate-900">Price Trend &amp; Risk Flags</p>
              <p className="text-xs text-slate-500">
                Highlight when stock prices cool below averages or heat up quickly
              </p>
            </div>
            <input
              type="checkbox"
              checked={notificationSettings.riskAlertsEnabled}
              onChange={(e) =>
                onUpdateSettings({
                  ...notificationSettings,
                  riskAlertsEnabled: e.target.checked,
                })
              }
              className="h-4 w-4 rounded border-slate-300 text-emerald-600"
            />
          </label>
        </div>
      </section>
    </div>
  );
};

export const HelpScreen: React.FC = () => (
  <div className="space-y-6 max-w-4xl">
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">
        Beginner Investing Guide &amp; Glossary
      </h1>
      <p className="text-sm text-slate-500 mt-1">
        Plain-language explanations of the financial numbers used across Stockzz.
      </p>
    </div>

    <div className="bg-emerald-500/10 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-slate-700">
      <ShieldCheck className="w-4 h-4 text-emerald-700 mt-0.5 shrink-0" />
      <p>
        <strong>Educational Research Only:</strong> Stockzz helps beginners read live financial health and company risks clearly. It never executes trades, connects to brokers, or promises returns.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Object.values(BEGINNER_GLOSSARY).map((entry) => (
        <article
          key={entry.title}
          className="bg-white border border-slate-200/90 rounded-2xl p-5 space-y-2"
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" />
            <h2 className="text-sm font-bold text-slate-900">{entry.title}</h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">{entry.plainEnglish}</p>
        </article>
      ))}
    </div>
  </div>
);
