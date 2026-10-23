import React from 'react';
import { PriorityLevel, WorkOrderStatus } from '../../types';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'status' | 'priority' | 'role' | 'default';
  status?: WorkOrderStatus;
  priority?: PriorityLevel;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  status,
  priority,
  className = '',
}) => {
  let badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';

  if (variant === 'priority' && priority) {
    switch (priority) {
      case 'Emergency':
        badgeStyle = 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse';
        break;
      case 'High':
        badgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
        break;
      case 'Normal':
        badgeStyle = 'bg-blue-500/20 text-blue-300 border-blue-500/40';
        break;
      case 'Low':
        badgeStyle = 'bg-slate-500/20 text-slate-300 border-slate-600';
        break;
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeStyle} ${className}`}>
        {priority}
      </span>
    );
  }

  if (variant === 'status' && status) {
    switch (status) {
      case 'Submitted':
        badgeStyle = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';
        break;
      case 'Under Review':
        badgeStyle = 'bg-purple-500/20 text-purple-300 border-purple-500/40';
        break;
      case 'Assigned':
      case 'Scheduled':
        badgeStyle = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
        break;
      case 'In Progress':
        badgeStyle = 'bg-amber-500/20 text-amber-300 border-amber-500/40';
        break;
      case 'Awaiting Estimate':
      case 'Awaiting Approval':
        badgeStyle = 'bg-orange-500/20 text-orange-300 border-orange-500/40';
        break;
      case 'Work Completed — Awaiting Review':
        badgeStyle = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
        break;
      case 'Resolved':
        badgeStyle = 'bg-teal-500/20 text-teal-300 border-teal-500/40';
        break;
      case 'Reopened':
        badgeStyle = 'bg-rose-500/20 text-rose-300 border-rose-500/40';
        break;
      case 'Cancelled':
      case 'Rejected':
        badgeStyle = 'bg-slate-700/40 text-slate-400 border-slate-700';
        break;
      default:
        badgeStyle = 'bg-slate-800 text-slate-300 border-slate-700';
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeStyle} ${className}`}>
        {status}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeStyle} ${className}`}>
      {children}
    </span>
  );
};
