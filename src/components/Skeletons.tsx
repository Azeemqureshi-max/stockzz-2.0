import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6" aria-busy="true" aria-label="Loading dashboard">
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
        >
          <div className="h-3.5 w-28 bg-slate-200 rounded" />
          <div className="h-7 w-36 bg-slate-200 rounded" />
          <div className="h-3 w-24 bg-slate-100 rounded" />
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 h-80 flex flex-col justify-between">
        <div className="h-5 w-48 bg-slate-200 rounded" />
        <div className="h-52 w-full bg-slate-100 rounded-lg" />
      </div>
      <div className="bg-white border border-slate-200 rounded-xl p-6 h-80 space-y-4">
        <div className="h-5 w-40 bg-slate-200 rounded" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-11 w-full bg-slate-100 rounded-lg" />
        ))}
      </div>
    </div>
  </div>
);

export const ListSkeleton: React.FC<{ rows?: number }> = ({ rows = 4 }) => (
  <div className="space-y-4" aria-busy="true" aria-label="Loading content">
    {Array.from({ length: rows }).map((_, i) => (
      <div
        key={i}
        className="bg-white border border-slate-200 rounded-xl p-5 space-y-3"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="h-5 w-52 bg-slate-200 rounded" />
          <div className="h-5 w-24 bg-slate-100 rounded" />
        </div>
        <div className="h-4 w-3/4 bg-slate-100 rounded" />
        <div className="h-4 w-1/2 bg-slate-100 rounded" />
      </div>
    ))}
  </div>
);

interface EmptyStateCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
}) => (
  <div className="bg-white border border-slate-200 rounded-xl px-6 py-12 text-center">
    <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-4">
      {icon}
    </div>
    <h3 className="text-base font-semibold text-slate-900 mb-1.5">{title}</h3>
    <p className="text-sm text-slate-600 max-w-md mx-auto mb-6 leading-relaxed">
      {description}
    </p>
    {(primaryAction || secondaryAction) && (
      <div className="flex flex-wrap items-center justify-center gap-3">
        {primaryAction && (
          <button
            type="button"
            onClick={primaryAction.onClick}
            className="px-4 py-2 text-sm font-medium text-white bg-sky-700 hover:bg-sky-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {primaryAction.label}
          </button>
        )}
        {secondaryAction && (
          <button
            type="button"
            onClick={secondaryAction.onClick}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {secondaryAction.label}
          </button>
        )}
      </div>
    )}
  </div>
);

interface ErrorBannerProps {
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  retryLabel = 'Retry',
  onRetry,
  onDismiss,
}) => (
  <div
    role="alert"
    className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3"
  >
    <div className="flex items-center gap-2.5 text-sm text-rose-900">
      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
      <span>{message}</span>
    </div>
    <div className="flex items-center gap-2">
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-900 bg-white border border-rose-200 rounded-lg hover:bg-rose-100/60 transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {retryLabel}
        </button>
      )}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:text-rose-900 cursor-pointer whitespace-nowrap shrink-0"
        >
          Dismiss
        </button>
      )}
    </div>
  </div>
);
