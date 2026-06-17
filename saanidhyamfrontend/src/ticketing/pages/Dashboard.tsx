import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Users, CheckCircle, Clock, AlertCircle, TrendingUp,  Calendar, Filter, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { djangoService } from '../services/djangoService';
import { TicketStatus } from '../types';
import type { Ticket } from '../types';
import { TicketStatusLabel } from '../types';
import { useNavigate } from 'react-router-dom';

// ─── STATUS COLORS ────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800 border border-blue-200',
  CALLBACK_REQUIRED: 'bg-orange-100 text-orange-800 border border-orange-200',
  IN_PROGRESS: 'bg-violet-100 text-violet-800 border border-violet-200',
  PAYMENT_PENDING: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  PAYMENT_VERIFIED: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  SENT_TO_CLIENT: 'bg-cyan-100 text-cyan-800 border border-cyan-200',
  FOLLOW_UP: 'bg-pink-100 text-pink-800 border border-pink-200',
  CLOSED: 'bg-slate-100 text-black border border-slate-200',
};

const STATUS_HEX: Record<string, string> = {
    NEW: '#3B82F6', NEW_S1: '#2563EB', NEW_S2: '#1D4ED8',
    CALLBACK_REQUIRED: '#F97316', CALLBACK_S1: '#EA580C', CALLBACK_S2: '#C2410C',
    IN_PROGRESS: '#7C3AED',
    PAYMENT_PENDING: '#EAB308',
    PAYMENT_VERIFIED: '#10B981',
    SENT_TO_CLIENT: '#06B6D4',
    FOLLOW_UP: '#EC4899',
    CLOSED: '#94A3B8',
};

const BENEFICIARY_COLORS: Record<string, string> = {
    myself: '#0EA5E9',
    parents: '#A855F7',
    grandparents: '#6366F1',
    relatives: '#F43F5E',
};

// ─── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({
    title, value, sub, icon, accentColor
}: { title: string; value: any; sub?: string; icon: React.ReactNode; accentColor: string }) => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6" style={{ borderTopWidth: 4, borderTopColor: accentColor }}>
        <div className="flex justify-between items-start">
            <div>
                <p className="text-[13px] font-black text-black uppercase tracking-widest mb-4">{title}</p>
                <p className="text-4xl font-black text-black font-semibold">{value}</p>
                {sub && <p className="text-[12px] text-black mt-1 font-semibold">{sub}</p>}
            </div>
            <div className="p-3 rounded-xl" style={{ backgroundColor: `${accentColor}18` }}>
                <span style={{ color: accentColor }}>{icon}</span>
            </div>
        </div>
    </div>
);

// ─── DATE HELPERS ─────────────────────────────────────────────────────────────
const toInputDate = (d: Date) => d.toISOString().slice(0, 10);
const getNDaysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
export const Dashboard: React.FC = () => {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [allTickets, setAllTickets] = useState<Ticket[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    // Date filter for chart
    const [startDate, setStartDate] = useState(toInputDate(getNDaysAgo(30)));
    const [endDate, setEndDate] = useState(toInputDate(new Date()));

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Fetch up to 200 for stats (adjust page_size as needed)
            const response = await djangoService.getTickets(1, 200, '', 'ALL', 'ALL');
            if (response && Array.isArray(response.results)) {
                setAllTickets(response.results);
                setTickets(response.results.slice(0, 10)); // recent 10 for table
                setTotalCount(response.count || 0);
            }
        } catch (error) {
            console.error('Dashboard fetch error:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ── Stats from ALL tickets ────────────────────────────────────────────
    const newTickets = allTickets.filter(t => t.status === 'NEW').length;
    const activeTickets = allTickets.filter(t => 
  ['IN_PROGRESS', 'CALLBACK_REQUIRED', 'FOLLOW_UP'].includes(t.status)
).length;
    const closedTickets = allTickets.filter(t => t.status === 'CLOSED').length;
    const paidTickets = allTickets.filter(t => t.payment_status === 'RECEIVED').length;
    const totalRevenue = allTickets
        .filter(t => t.payment_status === 'RECEIVED' && t.payment_amount)
        .reduce((sum, t) => sum + Number(t.payment_amount || 0), 0);

    // ── Date-filtered tickets for chart ───────────────────────────────────
    const filteredTickets = allTickets.filter(t => {
        if (!t.created_at) return false;
        const d = t.created_at.slice(0, 10);
        return d >= startDate && d <= endDate;
    });

    // Status breakdown chart data
    const allStatusKeys = Array.from(new Set([...allTickets.map(t => t.status), ...Object.keys(STATUS_HEX)]));
    const statusData = allStatusKeys
        .map(status => ({
            name: status.replace(/_/g, ' '),
            key: status,
            count: filteredTickets.filter(t => t.status === status).length,
        }))
        .filter(d => d.count > 0)
        .sort((a, b) => b.count - a.count);

    // Beneficiary breakdown
    const beneficiaryData = ['myself', 'parents', 'grandparents', 'relatives'].map(b => ({
        name: b.charAt(0).toUpperCase() + b.slice(1),
        count: filteredTickets.filter(t => t.beneficiary?.toLowerCase() === b).length,
        fill: BENEFICIARY_COLORS[b],
    })).filter(d => d.count > 0);

    // Daily trend (last 14 days within filter)
    const trendData = (() => {
        const days: { date: string; tickets: number }[] = [];
        const start = new Date(startDate);
        const end = new Date(endDate);
        const diff = Math.min(Math.ceil((end.getTime() - start.getTime()) / 86400000), 60);
        for (let i = 0; i <= diff; i++) {
            const d = new Date(start);
            d.setDate(d.getDate() + i);
            const key = toInputDate(d);
            days.push({
                date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
                tickets: filteredTickets.filter(t => t.created_at?.slice(0, 10) === key).length,
            });
        }
        return days;
    })();

    if (loading) return (
        <div className="p-8 flex flex-col items-center justify-center min-h-[400px] gap-4">
            <div className="w-10 h-10 border-[3px] border-slate-200 border-t-slate-900 rounded-full animate-spin" />
            <p className="text-sm font-semibold text-black">Loading dashboard...</p>
        </div>
    );

    return (
        <div className="space-y-7 bg-[#F0F2F8] min-h-screen p-6 font-sans">

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black text-black tracking-tight">Dashboard</h1>
                    <p className="text-[14px] font-semibold text-black mt-0.5">Saanidhyam CRM — Lead & Ticket Overview</p>
                </div>
                <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-black hover:bg-slate-50 transition-all shadow-sm">
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Total Tickets" value={totalCount} icon={<Users size={22} />} accentColor="#6366F1" />
                <StatCard title="New Inquiries" value={newTickets} sub="Awaiting action" icon={<AlertCircle size={22} />} accentColor="#3B82F6" />
                <StatCard title="Active" value={activeTickets} sub="In pipeline" icon={<Clock size={22} />} accentColor="#F97316" />
                <StatCard title="Closed" value={closedTickets} sub="Completed" icon={<CheckCircle size={22} />} accentColor="#64748B" />
                <StatCard
  title="Revenue"
  value={`₹${totalRevenue.toLocaleString('en-IN')}`}
  sub={`${paidTickets} paid`}
  icon={<span className="text-xl font-black">₹</span>}
  accentColor="#10B981"
/>
            </div>

            {/* Date Range Filter for Charts */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 text-[13px] font-black text-black uppercase tracking-widest">
                    <Filter size={14} /> Chart Date Range:
                </div>
                <div className="flex items-center gap-2">
                    <label className="text-[13px] text-black font-semibold">From</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} max={endDate}
                        className="border border-slate-200 rounded-xl px-3 py-2 text-[13px] font-semibold text-black outline-none focus:border-indigo-400 bg-slate-50" />
                    <label className="text-[13px] text-black font-semibold">To</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate}
                        className="border border-slate-200 rounded-xl px-3 py-2 text-[13px] font-semibold text-black outline-none focus:border-indigo-400 bg-slate-50" />
                </div>
                <div className="flex gap-2">
                    {[7, 14, 30, 90].map(n => (
                        <button key={n} onClick={() => { setStartDate(toInputDate(getNDaysAgo(n))); setEndDate(toInputDate(new Date())); }}
                            className={`px-3 py-1.5 rounded-lg text-[12px] font-black uppercase tracking-wide transition-all border ${
                                startDate === toInputDate(getNDaysAgo(n)) && endDate === toInputDate(new Date())
                                    ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-black border-slate-200 hover:bg-slate-100'
                            }`}>
                            {n}d
                        </button>
                    ))}
                </div>
                <p className="text-[12px] text-black font-semibold ml-auto">
                    {filteredTickets.length} tickets in range
                </p>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                {/* Status Breakdown */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <h3 className="text-[13px] font-black text-black uppercase tracking-widest mb-4">Status Breakdown</h3>
                    {statusData.length > 0 ? (
                        <div className="w-full h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={statusData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11, fill: '#0F172A', fontWeight: 700 }} interval={0} />
                                    <Tooltip
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700 }}
                                        formatter={(v) => [`₹{v} tickets`, '']}
                                    />
                                    <Bar dataKey="count" barSize={18} radius={[0, 6, 6, 0]}>
                                        {statusData.map((entry) => (
                                            <Cell key={entry.key} fill={STATUS_HEX[entry.key] || '#CBD5E1'} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-72 flex items-center justify-center text-black text-sm font-semibold">No data in range</div>
                    )}
                </div>

                {/* Daily Trend */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 lg:col-span-2">
                    <h3 className="text-[13px] font-black text-black uppercase tracking-widest mb-4">Tickets Created — Daily Trend</h3>
                    {trendData.some(d => d.tickets > 0) ? (
                        <div className="w-full h-72">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} interval="preserveStartEnd" />
                                    <YAxis tick={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 700 }}
                                        formatter={(v) => [`${v} tickets`, 'New Tickets']}
                                    />
                                    <Line type="monotone" dataKey="tickets" stroke="#6366F1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366F1', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-72 flex items-center justify-center text-black text-sm font-semibold">No data in range</div>
                    )}
                </div>
            </div>

            {/* Beneficiary Distribution */}
            {beneficiaryData.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <h3 className="text-[13px] font-black text-black uppercase tracking-widest mb-4">Beneficiary Distribution (in range)</h3>
                    <div className="flex flex-wrap gap-3">
                        {beneficiaryData.map(b => (
                            <div
  key={b.name}
  className="flex items-center gap-3 px-5 py-3 rounded-xl border-2 border-slate-300 bg-slate-50"
>
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: b.fill }} />
                                <span className="text-[14px] font-bold text-black">{b.name}</span>
                                <span className="text-[18px] font-black" style={{ color: b.fill }}>{b.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recent Activity — Excel Table Style */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="text-[13px] font-black text-black uppercase tracking-widest">Recent Activity</h3>
                    <Link to="/tickets" className="flex items-center gap-1 text-[13px] font-bold text-indigo-600 hover:text-indigo-700 transition">
                        View All <ArrowRight size={14} />
                    </Link>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-5 py-3 text-[11px] font-black text-black uppercase tracking-wider">ID</th>
                                <th className="px-5 py-3 text-[11px] font-black text-black uppercase tracking-wider">Client Name</th>
                                <th className="px-5 py-3 text-[11px] font-black text-black uppercase tracking-wider">Phone</th>
                                <th className="px-5 py-3 text-[11px] font-black text-black uppercase tracking-wider">City</th>
                                <th className="px-5 py-3 text-[11px] font-black text-black uppercase tracking-wider">Beneficiary</th>
                                <th className="px-5 py-3 text-[11px] font-black text-black uppercase tracking-wider">Service</th>
                                <th className="px-5 py-3 text-[11px] font-black text-black uppercase tracking-wider">Status</th>
                                <th className="px-5 py-3 text-[11px] font-black text-black uppercase tracking-wider">Date</th>
                                
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tickets.slice(0, 8).map((ticket) => (
                                <tr
  key={ticket.id}
  onClick={() => navigate(`/tickets/${ticket.id}`)}
  className="hover:bg-indigo-50/40 transition-all cursor-pointer group"
>
                                    <td className="px-5 py-3.5">
                                        <span className="text-[13px] font-bold text-black">#{ticket.id}</span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-[11px] font-black text-indigo-700 shrink-0">
                                                {ticket.user_name?.charAt(0)?.toUpperCase() || '?'}
                                            </div>
                                            <span className="text-[14px] font-bold text-black">{ticket.user_name || '—'}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className="text-[13px] text-black font-semibold">{ticket.phone || '—'}</span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className="text-[13px] text-black font-semibold">{ticket.user_city || '—'}</span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className={`text-[11px] font-black px-2.5 py-1 rounded-full border uppercase tracking-wide ${
                                            ticket.beneficiary === 'myself' ? 'bg-teal-100 text-teal-800 border-teal-200' :
                                            ticket.beneficiary === 'parents' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                            ticket.beneficiary === 'grandparents' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
                                            'bg-rose-100 text-rose-800 border-rose-200'
                                        }`}>
                                            {ticket.beneficiary || '—'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className="text-[13px] text-black font-semibold truncate max-w-[120px] block">
                                            {ticket.service_types?.[0] || '—'}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className={`text-[11px] font-black px-2.5 py-1 rounded-full uppercase ${STATUS_COLORS[ticket.status] || 'bg-slate-100 text-black'}`}>
                                           {TicketStatusLabel[ticket.status as TicketStatus]} - {ticket.status?.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className="text-[13px] font-semibold text-black">
                                            {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                                        </span>
                                    </td>
                                    
                                </tr>
                            ))}
                            {tickets.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-black text-[14px] font-semibold">
                                        No tickets found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};