import React from 'react';
import { Loader2 } from 'lucide-react';

export const LoadingSpinner: React.FC<{ message?: string; className?: string }> = ({
  message = 'Loading data...',
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
      <div className="relative">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        <div className="absolute inset-0 blur-lg bg-blue-500/30 rounded-full animate-pulse" />
      </div>
      {message && <p className="mt-4 text-sm font-medium text-slate-400">{message}</p>}
    </div>
  );
};
