import { apiClient } from '../apiClient';
import type { Ticket, User, Note } from '../types';

const getHeaders = () => {
    const token = localStorage.getItem('access_token');
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
};

const getResults = (data: any) => {
    if (Array.isArray(data)) return data;
    if (data && Array.isArray(data.results)) return data.results;
    return [];
};

export interface PaginatedResponse<T> {
    results: T[];
    count: number;
    next: string | null;
    previous: string | null;
}

export const djangoService = {

    // ─── USERS ──────────────────────────────────────────────────────────────
    getUsers: async (): Promise<User[]> => {
        try {
            const response = await apiClient.get('users/', { headers: getHeaders() });
            const users = getResults(response.data);
            return users.map((u: any) => ({
                id: u.id,
                name: `${u.first_name} ${u.last_name}`.trim() || u.username,
                username: u.username,
                email: u.email,
                role: u.is_staff ? 'admin' : 'agent',
            }));
        } catch (e) {
            return [];
        }
    },

    // ─── TICKETS ─────────────────────────────────────────────────────────────
    getTickets: async (
        page: number = 1,
        pageSize: number = 20,
        searchTerm: string = '',
        status: string = 'ALL',
        beneficiary: string = 'ALL'
    ): Promise<PaginatedResponse<Ticket>> => {
        let url = `tickets/?page=${page}&page_size=${pageSize}`;
        if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;
        if (status !== 'ALL') url += `&status=${status}`;
        if (beneficiary !== 'ALL') url += `&beneficiary=${beneficiary}`;

        const response = await apiClient.get(url, { headers: getHeaders() });

        return {
            results: getResults(response.data).map(mapTicketFromDB),
            count: response.data.count || 0,
            next: response.data.next,
            previous: response.data.previous,
        };
    },

    getTicket: async (id: number): Promise<Ticket> => {
        const response = await apiClient.get(`tickets/${id}/`, { headers: getHeaders() });
        return mapTicketFromDB(response.data);
    },

    // Alias for backward compatibility
    getTicketById: async (id: string | number): Promise<Ticket | undefined> => {
        try {
            const response = await apiClient.get(`tickets/${id}/`, { headers: getHeaders() });
            return mapTicketFromDB(response.data);
        } catch {
            return undefined;
        }
    },

    // ─── CREATE TICKET (manual) ───────────────────────────────────────────────
    // All fields mirror the main website ServiceRequestModal form.
    // The payload keys must match Django model field names (snake_case).
    createTicket: async (data: Partial<Ticket> & { [key: string]: any }): Promise<Ticket> => {
        const response = await apiClient.post('tickets/', data, { headers: getHeaders() });
        return mapTicketFromDB(response.data);
    },

    updateTicket: async (id: number | string, data: Partial<Ticket>): Promise<Ticket> => {
        const payload: any = { ...data };
        if ('assigned_to' in data) payload.assigned_to = data.assigned_to;
        if ('payment_status' in data) payload.payment_status = data.payment_status;
        if ('razorpay_payment_id' in data) payload.razorpay_payment_id = data.razorpay_payment_id;

        const response = await apiClient.patch(`tickets/${id}/`, payload, { headers: getHeaders() });
        return mapTicketFromDB(response.data);
    },

    deleteTicket: async (id: number | string): Promise<void> => {
        await apiClient.delete(`tickets/${id}/`, { headers: getHeaders() });
    },

    // ─── PAYMENT ─────────────────────────────────────────────────────────────
    generatePaymentLink: async (ticketId: number | string, amount: number): Promise<Ticket> => {
        await apiClient.post(
            `tickets/${ticketId}/generate_payment_link/`,
            { amount },
            { headers: getHeaders() }
        );
        return djangoService.getTicket(Number(ticketId));
    },

    markPaid: async (ticketId: number | string): Promise<Ticket> => {
        const response = await apiClient.post(
            `tickets/${ticketId}/mark_paid/`,
            {},
            { headers: getHeaders() }
        );
        return mapTicketFromDB(response.data);
    },

    // ─── NOTES ───────────────────────────────────────────────────────────────
    getNotes: async (ticketId: number | string): Promise<Note[]> => {
        try {
            const response = await apiClient.get(`notes/?ticket=${ticketId}`, { headers: getHeaders() });
            const notes = getResults(response.data);
            return notes.map((n: any) => ({
                id: n.id,
                ticket: n.ticket,
                user: n.user,
                user_name: n.user_name || 'Unknown',
                content: n.content,
                created_at: n.created_at,
            }));
        } catch {
            return [];
        }
    },

    createNote: async (data: { ticket: number | string; content: string }): Promise<Note> => {
        const response = await apiClient.post('notes/', data, { headers: getHeaders() });
        return {
            id: response.data.id,
            ticket: response.data.ticket,
            user: response.data.user,
            user_name: response.data.user_name || 'Unknown',
            content: response.data.content,
            created_at: response.data.created_at,
        };
    },

    addNote: async (ticketId: string | number, content: string, _user?: any): Promise<void> => {
        await apiClient.post('notes/', { ticket: ticketId, content }, { headers: getHeaders() });
    },
};

// ─── MAPPER ───────────────────────────────────────────────────────────────────
const mapTicketFromDB = (t: any): Ticket => ({
    // ── Identity
    id: t.id,
    beneficiary: t.beneficiary || '',

    // ── Requester
    user_name: t.user_name || 'No Name',
    phone: t.phone || '',
    email: t.email || '',
    age: t.age ?? null,

    // ── Requester Address
    user_country: t.user_country || 'India',
    user_country_other: t.user_country_other || '',
    user_pincode: t.user_pincode || '',
    user_state: t.user_state || '',
    user_district: t.user_district || '',
    user_city: t.user_city || '',
    user_area: t.user_area || '',

    // ── Beneficiary (Parents / Grandparents)
    father_age: t.father_age ?? null,
    mother_age: t.mother_age ?? null,

    // ── Beneficiary (Relatives only)
    relation_type: t.relation_type || '',
    relative_name: t.relative_name || '',
    relative_age: t.relative_age ?? null,

    // ── Beneficiary / Client Address
    client_country: t.client_country || 'India',
    client_country_other: t.client_country_other || '',
    client_pincode: t.client_pincode || '',
    client_state: t.client_state || '',
    client_district: t.client_district || '',
    client_city: t.client_city || '',
    client_area: t.client_area || '',

    // ── Clinical
    client_condition: t.client_condition || '',
    client_condition_other: t.client_condition_other || '',
    client_condition_details: t.client_condition_details || '',
    service_types: Array.isArray(t.service_types) ? t.service_types : [],
    budget_min: t.budget_min ?? null,
    budget_max: t.budget_max ?? null,
    preferred_locations: Array.isArray(t.preferred_locations) ? t.preferred_locations : [],
    notes: t.notes || '',

    // ── Workflow
    status: t.status || 'NEW',
    payment_status: t.payment_status || 'PENDING',
    assigned_to: t.assigned_to ?? null,
    assigned_to_name: t.assigned_to_name || 'Unassigned',
    created_by: t.created_by ?? null,
    created_by_name: t.created_by_name || 'System',
    created_at: t.created_at || '',
    updated_at: t.updated_at || '',

    // ── Payment
    payment_amount: t.payment_amount ?? null,
    payment_link: t.payment_link || null,
    payment_link_id: t.payment_link_id || null,
    razorpay_payment_id: t.razorpay_payment_id || null,
});