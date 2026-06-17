import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, className = '', ...props }, ref) => {
  return (
    <div className="group w-full">
      {label && (
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ml-1">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`w-full bg-slate-50 border border-transparent rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-200 transition-all outline-none ${error ? 'ring-2 ring-rose-500/20 border-rose-200' : ''} ${className}`}
        {...props}
      />
      {error && <p className="mt-1 text-xs text-rose-500 font-medium ml-1">{error}</p>}
    </div>
  );
});

Input.displayName = 'Input';