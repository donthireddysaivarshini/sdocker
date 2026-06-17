import React from 'react';
import { TicketStatus } from '../types';
import { STATUS_COLORS, STATUS_DOT_COLORS } from '../constants';

interface StatusBadgeProps {
  status: TicketStatus;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const colorClasses = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  const dotColor = STATUS_DOT_COLORS[status] || 'bg-gray-500';

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${colorClasses} whitespace-nowrap shadow-sm`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-2 ${dotColor}`}></span>
      {status}
    </span>
  );
};