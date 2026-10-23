import React from 'react';
import { Card } from './Card';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  color?: 'blue' | 'purple' | 'amber' | 'emerald' | 'rose' | 'cyan';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'blue',
}) => {
  const colorMap = {
    blue: 'from-blue-500/20 to-indigo-500/10 text-blue-400 border-blue-500/20',
    purple: 'from-purple-500/20 to-pink-500/10 text-purple-400 border-purple-500/20',
    amber: 'from-amber-500/20 to-orange-500/10 text-amber-400 border-amber-500/20',
    emerald: 'from-emerald-500/20 to-teal-500/10 text-emerald-400 border-emerald-500/20',
    rose: 'from-rose-500/20 to-red-500/10 text-rose-400 border-rose-500/20',
    cyan: 'from-cyan-500/20 to-sky-500/10 text-cyan-400 border-cyan-500/20',
  };

  return (
    <Card className="p-5 flex flex-col justify-between relative overflow-hidden group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 tracking-wider uppercase">{title}</p>
          <h3 className="text-2xl font-bold text-white mt-1.5 tracking-tight group-hover:text-blue-200 transition-colors">
            {value}
          </h3>
        </div>
        <div className={`p-3 rounded-xl border bg-gradient-to-br ${colorMap[color]}`}>
          {icon}
        </div>
      </div>
      {(subtitle || trend) && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          {subtitle && <span>{subtitle}</span>}
          {trend && (
            <span
              className={`font-medium ${
                trend.isPositive ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {trend.value}
            </span>
          )}
        </div>
      )}
    </Card>
  );
};
