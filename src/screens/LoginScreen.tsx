import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  BookOpenCheck,
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  LineChart,
  Lock,
  Mail,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  X,
} from 'lucide-react';

interface LoginScreenProps {
  onLogin: (email: string, name?: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [nameInput, setNameInput] = useState('Alex');
  const [email, setEmail] = useState('alex.morgan@stockzz.app');
  const [password, setPassword] = useState('stockzz-research');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setErrorMsg(null);
    setAuthModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }
    if (password.trim().length < 6) {
      setErrorMsg('Password must be at least 6 characters.');
      return;
    }
    setErrorMsg(null);
    const derivedName =
      authMode === 'signup' && nameInput.trim()
        ? nameInput.trim()
        : trimmedEmail.split('@')[0].split(/[._-]/)[0] || 'Alex';
    onLogin(trimmedEmail, derivedName);
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] text-slate-900 flex flex-col">
      {/* Top Navigation Matching Stockzz Reference */}
      <header className="border-b border-slate-200/80 bg-[#fafaf9]/95 backdrop-blur-xs sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-8">
          <a href="#top" className="flex items-center gap-2 font-display font-bold tracking-tight text-lg text-slate-900">
            <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white grid place-items-center shrink-0">
              <Sprout className="w-4 h-4" />
            </span>
            <span>Stockzz</span>
          </a>

          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-500">
            <a href="#how" className="hover:text-slate-900 transition-colors">
              How it works
            </a>
            <a href="#features" className="hover:text-slate-900 transition-colors">
              Features
            </a>
            <a href="#trust" className="hover:text-slate-900 transition-colors">
              Our data promise
            </a>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => openAuth('login')}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => openAuth('signup')}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              Get started
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Hero Section */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 pb-20 lg:pt-16 grid lg:grid-cols-[1.05fr_1fr] gap-12 items-center">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Stock research for first-time investors</span>
            </p>

            <h1 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] tracking-tight text-slate-900">
              Understand a stock before you invest in it.
            </h1>

            <p className="mt-5 max-w-xl text-base sm:text-lg text-slate-600 leading-relaxed">
              Stockzz finds companies worth researching, explains their financial health in plain English, and keeps an eye on the investments you already own.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onLogin('alex.morgan@stockzz.app', 'Alex')}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>Open live workspace</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => openAuth('login')}
                className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                Log in with email
              </button>
            </div>

            <p className="mt-5 text-sm text-slate-500">
              Research and monitoring only. Stockzz is not a broker and doesn&apos;t give financial advice.
            </p>
          </div>

          {/* Right Dark Preview Card Matching Stockzz Reference */}
          <div className="relative" aria-label="Sample preview of a Stockzz stock card">
            <div className="rounded-3xl border border-slate-800 bg-[#0B111A] p-6 text-slate-100 shadow-2xl shadow-emerald-950/15">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 rounded-xl bg-sky-600 grid place-items-center font-bold text-white shrink-0">
                    IN
                  </span>
                  <div>
                    <p className="font-semibold text-white">Infosys Limited</p>
                    <p className="text-xs text-slate-400">INFY · NSE · Technology</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300 border border-amber-400/50 bg-amber-400/15 px-2 py-0.5 rounded-md">
                  Sample preview
                </span>
              </div>

              <svg viewBox="0 0 300 100" className="mt-6 h-32 w-full" aria-hidden="true">
                <defs>
                  <linearGradient id="landing-hero-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <polygon
                  points="0,100 0,67 22,60 43,63 64,53 86,55 107,46 129,48 150,38 171,42 193,31 214,25 236,29 257,17 279,19 300,10 300,100"
                  fill="url(#landing-hero-fill)"
                />
                <polyline
                  points="0,67 22,60 43,63 64,53 86,55 107,46 129,48 150,38 171,42 193,31 214,25 236,29 257,17 279,19 300,10"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                />
              </svg>

              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-xl border border-slate-800 bg-[#121A26] p-2.5">
                  <p className="text-slate-400">P/E ratio</p>
                  <p className="mt-0.5 text-sm font-semibold font-mono text-white">26.3</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-[#121A26] p-2.5">
                  <p className="text-slate-400">Debt level</p>
                  <p className="mt-0.5 text-sm font-semibold text-white">Very low</p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-[#121A26] p-2.5">
                  <p className="text-slate-400">Price trend</p>
                  <p className="mt-0.5 text-sm font-semibold text-emerald-400">Upward</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <p className="flex items-start gap-1.5 rounded-xl bg-emerald-500/15 text-emerald-100 p-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                  <span>Almost no debt</span>
                </p>
                <p className="flex items-start gap-1.5 rounded-xl bg-red-500/15 text-red-100 p-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                  <span>Depends on client tech budgets</span>
                </p>
              </div>
            </div>

            <div className="hidden sm:block sm:absolute sm:-bottom-5 sm:-left-6 max-w-xs rounded-2xl border border-slate-200 bg-white p-3.5 shadow-lg text-xs">
              <p className="font-semibold text-slate-900">What&apos;s a P/E ratio?</p>
              <p className="mt-0.5 text-slate-600 leading-relaxed">
                How many dollars investors pay for every $1 of yearly profit.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how" className="border-t border-slate-200/80 bg-white py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
                Simple by design
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                Three simple places to go
              </h2>
              <p className="mt-2 text-slate-600">
                No crowded trading terminals. Start with ideas, answer a few questions about your goals, or look up any company you&apos;ve heard of.
              </p>
            </div>

            <div className="mt-10 grid md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-slate-200 bg-[#fafaf9] p-6">
                <span className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 grid place-items-center">
                  <Sparkles className="w-5 h-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">Suggestions</h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                  See live market mood, your portfolio value, and top companies worth researching today in plain English.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-[#fafaf9] p-6">
                <span className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 grid place-items-center">
                  <SlidersHorizontal className="w-5 h-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">Requirements</h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                  Pick your preferred countries, industries, comfort with risk, and time horizon to get a personalized shortlist.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-[#fafaf9] p-6">
                <span className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 grid place-items-center">
                  <LineChart className="w-5 h-5" />
                </span>
                <h3 className="mt-4 text-lg font-semibold text-slate-900">Analysis</h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                  Look up any global stock for live prices, recent news headlines, simple financial health checks, and key risks.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-slate-200/80 py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900">
              Detailed when you choose a stock
            </h2>
            <p className="mt-2 max-w-2xl text-slate-600">
              Every number is explained so you know what it means—not just thrown onto a chart.
            </p>

            <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <span className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 grid place-items-center">
                  <BookOpenCheck className="w-5 h-5" />
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">Plain-English financials</h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                  Sales, profit, debt, and P/E ratio — each paired with a short explanation of what it means.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <span className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 grid place-items-center">
                  <ClipboardList className="w-5 h-5" />
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">Personal shortlist</h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                  Filter stocks by your own risk comfort and timeframe, with clear reasons why each stock fits.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <span className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 grid place-items-center">
                  <BriefcaseBusiness className="w-5 h-5" />
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">Portfolio tracking</h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                  Record shares you bought elsewhere and see what you invested versus what they&apos;re worth live.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <span className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-700 grid place-items-center">
                  <BellRing className="w-5 h-5" />
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">Useful alerts</h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">
                  Notice big price moves and key risk signals on companies you follow without noisy spam.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Dark Trust Section Matching Stockzz Reference */}
        <section id="trust" className="bg-[#0B111A] text-slate-100 py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-10 items-start">
            <div>
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
              <h2 className="mt-4 text-3xl font-bold tracking-tight text-white">
                Our data promise
              </h2>
              <p className="mt-3 text-slate-400 leading-relaxed max-w-md">
                Investing decisions deserve honest information. Stockzz is built around a few simple rules it never breaks.
              </p>
            </div>

            <ul className="grid gap-4 text-sm">
              <li className="flex gap-3 rounded-xl border border-slate-800 bg-[#121A26] p-4">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                <span>Every figure comes from live market feeds and shows when it was updated.</span>
              </li>
              <li className="flex gap-3 rounded-xl border border-slate-800 bg-[#121A26] p-4">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                <span>Live data and unavailable figures are always clearly labelled—nothing is guessed.</span>
              </li>
              <li className="flex gap-3 rounded-xl border border-slate-800 bg-[#121A26] p-4">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                <span>Exchange facts, personal match scores, and web-grounded AI notes are separated.</span>
              </li>
              <li className="flex gap-3 rounded-xl border border-slate-800 bg-[#121A26] p-4">
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                <span>Zero fake prices or made-up news. Sample fallback data is always marked DEMO DATA.</span>
              </li>
            </ul>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900">
            Start researching with confidence
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            Free to use. Your saved stocks, portfolio, and preferences stay right in your browser.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => onLogin('alex.morgan@stockzz.app', 'Alex')}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              <span>Enter workspace as Alex</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => openAuth('signup')}
              className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              Create your account
            </button>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-2 font-display font-bold tracking-tight text-base text-slate-900">
            <span className="w-7 h-7 rounded-lg bg-emerald-600 text-white grid place-items-center">
              <Sprout className="w-4 h-4" />
            </span>
            Stockzz
          </span>
          <p className="max-w-2xl">
            Stockzz provides research and information, not financial advice. It does not execute trades or guarantee returns. Investments are subject to market risks.
          </p>
        </div>
      </footer>

      {/* Sign In / Create Account Modal */}
      {authModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xl space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="auth-modal-title" className="text-xl font-bold text-slate-900">
                  {authMode === 'login' ? 'Log in to Stockzz' : 'Create your Stockzz account'}
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Access live global market quotes, plain-English research, and your saved portfolio.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAuthModalOpen(false)}
                aria-label="Close modal"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <div>
                  <label htmlFor="auth-name" className="block text-xs font-medium text-slate-700 mb-1.5">
                    Your first name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Alex"
                    className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              )}

              <div>
                <label htmlFor="login-email" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Your stock alert notifications will be set to this email.
                </p>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-medium text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              {errorMsg && (
                <p
                  role="alert"
                  className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2"
                >
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>{authMode === 'login' ? 'Log in' : 'Create account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-2.5 text-slate-400">or</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onLogin('alex.morgan@stockzz.app', 'Alex')}
              className="w-full px-4 py-2.5 text-sm font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
            >
              Continue as Alex (Quick Access)
            </button>

            <p className="text-center text-xs text-slate-500">
              {authMode === 'login' ? (
                <>
                  New to Stockzz?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('signup')}
                    className="font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Create a free account
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="font-semibold text-emerald-700 hover:underline cursor-pointer"
                  >
                    Log in
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
