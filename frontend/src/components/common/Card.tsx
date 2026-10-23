import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverable = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl bg-slate-900/70 border border-slate-800/80 backdrop-blur-xl transition-all duration-200 ${
        hoverable ? 'hover:border-slate-700 hover:bg-slate-850/80 hover:shadow-xl hover:shadow-black/20 cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
