import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronLeft, ChevronRight, MapPin, Users, RefreshCw } from 'lucide-react';
import { djangoService } from '../services/djangoService';
import type { Ticket } from '../types';
import { TicketStatusLabel } from '../types';
const PAGE_SIZE = 20;

const STATUS_COLORS: Record<string, string> = {
    NEW: 'bg-blue-100 text-blue-800 border-blue-200',
    
   
    CALLBACK_REQUIRED: 'bg-orange-100 text-orange-800 border-orange-200',
    
    IN_PROGRESS: 'bg-violet-100 text-violet-800 border-violet-200',
    PAYMENT_PENDING: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    PAYMENT_VERIFIED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    SENT_TO_CLIENT: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    FOLLOW_UP: 'bg-pink-100 text-pink-800 border-pink-200',
    CLOSED: 'bg-slate-100 text-black border-slate-200',
};
const STATUS_OPTIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'CALLBACK_REQUIRED', label: 'Callback' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'PAYMENT_PENDING', label: 'Payment Pending' },
  { value: 'PAYMENT_VERIFIED', label: 'Payment Verified' },
  { value: 'SENT_TO_CLIENT', label: 'Sent to Client' },
  { value: 'FOLLOW_UP', label: 'Follow Up' },
  { value: 'CLOSED', label: 'Closed' },
];
const BENEFICIARY_COLORS: Record<string, string> = {
    myself: 'bg-teal-100 text-teal-800 border-teal-200',
    parents: 'bg-purple-100 text-purple-800 border-purple-200',
    grandparents: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    relatives: 'bg-rose-100 text-rose-800 border-rose-200',
};

export const TicketList: React.FC = () => {
    const navigate = useNavigate();
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('ALL');
    const [beneficiaryFilter, setBeneficiaryFilter] = useState<string>('ALL');

    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(1);
            fetchData(1);
        }, 400);
        return () => clearTimeout(timer);
    }, [searchTerm, statusFilter, beneficiaryFilter]);

    const fetchData = async (page: number) => {
        setLoading(true);
        try {
            const data = await djangoService.getTickets(page, PAGE_SIZE, searchTerm, statusFilter, beneficiaryFilter);
            setTickets(data.results);
            setTotalPages(Math.ceil(data.count / PAGE_SIZE));
            setTotalCount(data.count);
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setCurrentPage(newPage);
            fetchData(newPage);
        }
    };

    return (
        <div className="space-y-5 p-6 bg-[#F0F2F8] min-h-screen font-sans">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900">All Tickets</h1>
                    <p className="text-[14px] font-semibold text-black mt-0.5">
                        {totalCount > 0 ? `${totalCount} total records` : 'Manage and track service requests'}
                    </p>
                </div>
                <button onClick={() => fetchData(currentPage)} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-black hover:bg-slate-50 transition-all shadow-sm shrink-0">
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {/* Filters Bar */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center flex-wrap">

                {/* Search */}
                <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
                    <input
                        type="text"
                        placeholder="Search by name, phone, email, city..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 w-full text-[14px] font-semibold text-slate-800 transition-all placeholder-slate-400"
                    />
                </div>

                {/* Status Filter */}
                <div className="relative">
                    <select
    value={statusFilter}
    onChange={(e) => setStatusFilter(e.target.value)}
    className="pl-4 pr-9 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 appearance-none bg-slate-50 text-[14px] font-semibold text-slate-800 cursor-pointer transition-all min-w-[170px]"
>
    <option value="ALL">All Statuses</option>

    <option value="NEW">
        {TicketStatusLabel.NEW} - New
    </option>

    <option value="CALLBACK_REQUIRED">
        {TicketStatusLabel.CALLBACK_REQUIRED} - Callback
    </option>

    <option value="IN_PROGRESS">
        {TicketStatusLabel.IN_PROGRESS} - In Progress
    </option>

    <option value="PAYMENT_PENDING">
        {TicketStatusLabel.PAYMENT_PENDING} - Payment Pending
    </option>

    <option value="PAYMENT_VERIFIED">
        {TicketStatusLabel.PAYMENT_VERIFIED} - Payment Verified
    </option>

    <option value="SENT_TO_CLIENT">
        {TicketStatusLabel.SENT_TO_CLIENT} - Sent to Client
    </option>

    <option value="FOLLOW_UP">
        {TicketStatusLabel.FOLLOW_UP} - Follow Up
    </option>

    <option value="CLOSED">
        {TicketStatusLabel.CLOSED} - Closed
    </option>
</select>
                    <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black pointer-events-none" />
                </div>

                {/* Beneficiary Filter */}
                <div className="relative">
                    <select
                        value={beneficiaryFilter}
                        onChange={(e) => setBeneficiaryFilter(e.target.value)}
                        className="pl-4 pr-9 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 appearance-none bg-slate-50 text-[14px] font-semibold text-slate-800 cursor-pointer transition-all min-w-[160px]"
                    >
                        <option value="ALL">All Beneficiaries</option>
                        <option value="myself">Myself</option>
                        <option value="parents">Parents</option>
                        <option value="grandparents">Grandparents</option>
                        <option value="relatives">Relatives</option>
                    </select>
                    <Users className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-black pointer-events-none" />
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="px-5 py-3.5 text-[11px] font-black text-black uppercase tracking-wider">S.No</th>
                            <th className="px-5 py-3.5 text-[11px] font-black text-black uppercase tracking-wider">ID</th>
                            <th className="px-5 py-3.5 text-[11px] font-black text-black uppercase tracking-wider">Client</th>
                            <th className="px-5 py-3.5 text-[11px] font-black text-black uppercase tracking-wider">Phone</th>
                            <th className="px-5 py-3.5 text-[11px] font-black text-black uppercase tracking-wider">Location</th>
                            <th className="px-5 py-3.5 text-[11px] font-black text-black uppercase tracking-wider">Beneficiary</th>
                            <th className="px-5 py-3.5 text-[11px] font-black text-black uppercase tracking-wider">Status</th>
                            
                            <th className="px-5 py-3.5 text-[11px] font-black text-black uppercase tracking-wider text-right">Date</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            <tr>
                                <td colSpan={9} className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="w-8 h-8 border-[3px] border-slate-200 border-t-indigo-500 rounded-full animate-spin" />
                                        <span className="text-[14px] text-black font-semibold">Loading tickets...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : tickets.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="px-6 py-16 text-center text-black text-[14px] font-semibold">
                                    No tickets match your filters.
                                </td>
                            </tr>
                        ) : (
                            tickets.map((ticket, index) => (
                                <tr
                                    key={ticket.id}
                                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                                    className="hover:bg-indigo-50/40 transition-all cursor-pointer group"
                                >
                                    <td className="px-5 py-4">
                                        <span className="text-[13px] font-semibold text-black">
                                            {(currentPage - 1) * PAGE_SIZE + index + 1}
                                        </span>
                                    </td>

                                    <td className="px-5 py-4">
                                        <span className="text-[13px] font-black text-black">#{ticket.id}</span>
                                    </td>

                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-[12px] font-black text-indigo-700 shrink-0">
                                                {ticket.user_name?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <p className="text-[14px] font-bold text-slate-900 leading-tight">{ticket.user_name || '—'}</p>
                                                <p className="text-sm text-black">{ticket.email || ''}</p>
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-5 py-4">
                                        <span className="text-[14px] font-semibold text-black">{ticket.phone || '—'}</span>
                                    </td>

                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-black shrink-0" />
                                            <div>
                                                <p className="text-[13px] font-bold text-slate-800">{ticket.user_city || '—'}</p>
                                                {ticket.user_state && <p className="text-sm text-black">{ticket.user_state}</p>}
                                            </div>
                                        </div>
                                    </td>

                                    <td className="px-5 py-4">
                                        <span className={`text-[11px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wide ${BENEFICIARY_COLORS[ticket.beneficiary?.toLowerCase()] || 'bg-slate-100 text-black border-slate-200'}`}>
                                            {ticket.beneficiary || '—'}
                                        </span>
                                    </td>

                                    <td className="px-5 py-4">
                                        <span className={`text-[11px] font-black px-2.5 py-1 rounded-full border uppercase whitespace-nowrap ${STATUS_COLORS[ticket.status] || 'bg-slate-100 text-black border-slate-200'}`}>
                                            {TicketStatusLabel[ticket.status as keyof typeof TicketStatusLabel]} - {ticket.status?.replace(/_/g, ' ') || '—'}
                                        </span>
                                    </td>

                                    

                                    <td className="px-5 py-4 text-right">
                                        <div className="leading-tight">
  <p className="text-[13px] font-bold text-slate-800">
    {new Date(ticket.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
  </p>
  <p className="text-[11px] text-black">
    {new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
  </p>
</div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between py-2">
                    <p className="text-[13px] font-semibold text-black">
                        Showing <span className="text-slate-900 font-black">{(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, totalCount)}</span> of <span className="text-slate-900 font-black">{totalCount}</span>
                    </p>

                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={(e) => { e.stopPropagation(); handlePageChange(currentPage - 1); }}
                            disabled={currentPage === 1}
                            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white transition-all shadow-sm"
                        >
                            <ChevronLeft className="w-4 h-4 text-black" />
                        </button>

                        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
                            {[...Array(totalPages)].map((_, i) => {
                                const page = i + 1;
                                if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                    return (
                                        <button
                                            key={page}
                                            onClick={(e) => { e.stopPropagation(); handlePageChange(page); }}
                                            className={`w-9 h-9 text-[13px] font-black rounded-lg transition-all ${currentPage === page ? 'bg-slate-900 text-white shadow-sm' : 'text-black hover:text-slate-900 hover:bg-slate-50'}`}
                                        >
                                            {page}
                                        </button>
                                    );
                                }
                                if (page === currentPage - 2 || page === currentPage + 2) {
                                    return <span key={page} className="px-1.5 text-slate-300 font-bold">···</span>;
                                }
                                return null;
                            })}
                        </div>

                        <button
                            onClick={(e) => { e.stopPropagation(); handlePageChange(currentPage + 1); }}
                            disabled={currentPage === totalPages}
                            className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white transition-all shadow-sm"
                        >
                            <ChevronRight className="w-4 h-4 text-black" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};