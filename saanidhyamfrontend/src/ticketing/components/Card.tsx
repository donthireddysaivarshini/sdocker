import React from 'react';

// We extend React.HTMLAttributes to allow onClick, style, and other standard div props
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ 
  children, 
  className = '', 
  title, 
  action, 
  ...props // This collects onClick, style, etc.
}) => {
  return (
    <div 
      {...props} // This applies onClick and style to the actual HTML element
      className={`bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden ${className}`}
    >
      {(title || action) && (
        <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center">
          {title && <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wide">{title}</h3>}
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};