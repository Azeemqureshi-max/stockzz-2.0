import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { BEGINNER_GLOSSARY } from '../data/liveDefaults';

interface MetricHelpProps {
  termKey: keyof typeof BEGINNER_GLOSSARY;
  label?: string;
}

export const MetricHelp: React.FC<MetricHelpProps> = ({ termKey, label }) => {
  const [open, setOpen] = useState(false);
  const entry = BEGINNER_GLOSSARY[termKey];
  if (!entry) return null;

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Explain ${label || entry.title}`}
        aria-expanded={open}
        className="inline-flex items-center justify-center w-5 h-5 rounded text-slate-400 hover:text-sky-700 hover:bg-sky-50 focus-visible:outline-2 focus-visible:outline-sky-600 transition-colors cursor-pointer"
      >
        <HelpCircle className="w-3.5 h-3.5" />
      </button>

      {open && (
        <span
          role="dialog"
          aria-label={entry.title}
          className="absolute left-0 top-6 z-30 w-72 p-3.5 bg-white border border-slate-200 rounded-xl shadow-lg text-left"
        >
          <span className="flex items-start justify-between gap-2 mb-1">
            <span className="text-xs font-semibold text-slate-900">{entry.title}</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close explanation"
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </span>
          <span className="block text-xs leading-relaxed text-slate-600">
            {entry.plainEnglish}
          </span>
        </span>
      )}
    </span>
  );
};
