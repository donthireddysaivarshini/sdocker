import { TicketStatus } from './types';

export const CLIENT_CONDITIONS = [
  'Need assistance for daily activities',
  "Doesn't need any assistance for daily activities",
  'Bedridden', 
  'Dementia', 
  'Wheelchair-bound', 
  'Post-surgery Recovery', 
  "Alzheimer's", 
  "Parkinson's", 
  'Other'
];

export const SERVICE_TYPES = [
  'Old Age Home', 
  'Elder Care', 
  'Palliative Care', 
  'Residential Care', 
  'Day Care', 
  'Senior living'
];

// UPDATED COLORS TO MATCH DASHBOARD EXACTLY
// Using arbitrary values (e.g. text-[#4F46E5]) to match your Chart Hex Codes perfectly
export const STATUS_COLORS: Record<string, string> = {
  [TicketStatus.NEW]: 'bg-[#EEF2FF] text-[#4F46E5] border-[#C7D2FE]',              // Indigo
  [TicketStatus.CALLBACK_REQUIRED]: 'bg-[#FFF1F2] text-[#E11D48] border-[#FECDD3]', // Rose
  [TicketStatus.IN_PROGRESS]: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',      // Amber
  [TicketStatus.PAYMENT_PENDING]: 'bg-[#F3E8FF] text-[#7E22CE] border-[#D8B4FE]',  // Purple
  [TicketStatus.PAYMENT_VERIFIED]: 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]', // Emerald
  [TicketStatus.SENT_TO_CLIENT]: 'bg-[#ECFEFF] text-[#0891B2] border-[#A5F3FC]',   // Cyan
  [TicketStatus.FOLLOW_UP]: 'bg-[#FFF7ED] text-[#EA580C] border-[#FED7AA]',        // Orange
  [TicketStatus.CLOSED]: 'bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]'             // Slate
};

export const STATUS_DOT_COLORS: Record<string, string> = {
  [TicketStatus.NEW]: 'bg-[#4F46E5]',
  [TicketStatus.CALLBACK_REQUIRED]: 'bg-[#E11D48]',
  [TicketStatus.IN_PROGRESS]: 'bg-[#92400E]',
  [TicketStatus.PAYMENT_PENDING]: 'bg-[#7E22CE]',
  [TicketStatus.PAYMENT_VERIFIED]: 'bg-[#047857]',
  [TicketStatus.SENT_TO_CLIENT]: 'bg-[#0891B2]',
  [TicketStatus.FOLLOW_UP]: 'bg-[#EA580C]',
  [TicketStatus.CLOSED]: 'bg-[#64748B]'
};