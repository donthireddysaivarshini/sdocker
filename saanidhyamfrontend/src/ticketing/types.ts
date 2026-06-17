// src/types.ts

export const TicketStatus = {
  NEW: 'NEW',
  CALLBACK_REQUIRED: 'CALLBACK_REQUIRED',
  IN_PROGRESS: 'IN_PROGRESS',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  PAYMENT_VERIFIED: 'PAYMENT_VERIFIED',
  SENT_TO_CLIENT: 'SENT_TO_CLIENT',
  FOLLOW_UP: 'FOLLOW_UP',
  CLOSED: 'CLOSED'
} as const;
export const TicketStatusLabel: Record<string, string> = {
  NEW: 'S1',
  CALLBACK_REQUIRED: 'S2',
  IN_PROGRESS: 'S3',
  PAYMENT_PENDING: 'S4',
  PAYMENT_VERIFIED: 'S5',
  SENT_TO_CLIENT: 'S6',
  FOLLOW_UP: 'S7',
  CLOSED: 'S8'
};
export const PaymentStatus = {
  PENDING: 'PENDING',
  RECEIVED: 'RECEIVED'
} as const;

export type TicketStatus = typeof TicketStatus[keyof typeof TicketStatus];
export type PaymentStatus = typeof PaymentStatus[keyof typeof PaymentStatus];

export interface User {
  id: number; // Changed from string to number to match Django IDs
  username: string; // Changed from 'name' to 'username'
  email: string;
  role: 'admin' | 'agent';
}

export interface Note {
  id: number;
  ticket: number;
  user: number;
  user_name: string;
  content: string;
  created_at: string;
}

export interface PreferredLocation {
  state: string;
  stateOther?: string;
  district: string;
  city: string;
  area: string;
  pincode: string;
  landmark?: string;
}

export interface Ticket {
  id: number; 

  // --- MAPPED TO BUTTERFLY DB MODELS.PY ---
  beneficiary: string;
  user_name: string;      // Corrected from client_name to user_name
  phone: string;          // Maps to user_phone in DB
  email: string | null;   // Maps to user_email in DB
  age: number | null;     // Maps to user_age in DB
  
  // User Address (Sender)
  user_country: string;
  user_country_other: string | null;
  user_state: string;
  user_district: string;
  user_city: string;
  user_area: string;      // Added to match model
  user_pincode: string;

  // Specific Beneficiary Info
  father_age: number | null;
  mother_age: number | null;
  relation_type: string;
  relative_name: string;
  relative_age: number | null;

  // Beneficiary Address
  client_country: string;
  client_country_other: string | null;
  client_pincode: string;
  client_state: string;
  client_district: string; // The field we just added!
  client_city: string;
  client_area: string;
  
  // Health & Requirements
  client_condition: string;         // Maps to health_condition in DB
  client_condition_other: string | null;
  client_condition_details: string | null;
  service_types: string[]; 
  budget_min: number | null;
  budget_max: number | null;
  preferred_locations: PreferredLocation[]; 
  
  notes: string | null;

  // Status & Payment
  status: TicketStatus;
  payment_status: string; 
  payment_amount: number | string | null; 
  payment_link: string | null;
  payment_link_id: string | null;
  razorpay_payment_id: string | null;
  
  // Relation/Metadata
  created_by: number | null;
  created_by_name?: string; 
  assigned_to: number | null;
  assigned_to_name?: string; // Injected by serializer
  
  created_at: string;
  updated_at: string;
}