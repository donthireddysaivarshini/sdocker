import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Wallet, ShieldCheck, CheckCircle2, ExternalLink,
    Copy, Share2, Send, Activity, Calendar, UserIcon, Clock,
    Edit3, Save, X, MapPin, Heart, Stethoscope,
    CheckCircle, Users, Phone, Mail, Tag, AlertTriangle,
    RefreshCw, User2
} from 'lucide-react';
import { djangoService } from '../services/djangoService';
import type { Ticket, Note, User } from '../types';
import { TicketStatusLabel } from '../types';
// ─── BRAND COLORS ─────────────────────────────────────────────────────────────
const BRAND = {
    primary: '#1A1A2E',
    accent: '#E94560',
    surface: '#F7F8FC',
    card: '#FFFFFF',
    border: '#E2E8F0',
    text: '#0F172A',
    muted: '#64748B',
    success: '#059669',
    warning: '#D97706',
    info: '#2563EB',
};

// ─── STATUS CONFIG (expanded with S1/S2) ─────────────────────────────────────
const STATUS_OPTIONS = [
    { value: 'NEW', label: 'S1 — New', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    { value: 'CALLBACK_REQUIRED', label: 'S2 — Callback Required', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    { value: 'IN_PROGRESS', label: 'S3 — In Progress', color: 'bg-violet-100 text-violet-800 border-violet-200' },
    { value: 'PAYMENT_PENDING', label: 'S4 — Payment Pending', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    { value: 'PAYMENT_VERIFIED', label: 'S5 — Payment Verified', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    { value: 'SENT_TO_CLIENT', label: 'S6 — Sent to Client', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
    { value: 'FOLLOW_UP', label: 'S7 — Follow Up', color: 'bg-pink-100 text-pink-800 border-pink-200' },
    { value: 'CLOSED', label: 'S8 — Closed', color: 'bg-slate-100 text-black border-slate-200' },
];

const getStatusConfig = (status: string) =>
    STATUS_OPTIONS.find(s => s.value === status) || { value: status, label: status?.replace(/_/g, ' ') || '', color: 'bg-slate-100 text-black border-slate-200' };

const BENEFICIARY_COLORS: Record<string, string> = {
    myself: 'bg-teal-100 text-teal-800 border-teal-200',
    parents: 'bg-purple-100 text-purple-800 border-purple-200',
    grandparents: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    relatives: 'bg-rose-100 text-rose-800 border-rose-200',
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
const fmt = (v: any) => {
    if (v === null || v === undefined || v === '') return '—';
    return String(v);
};
const fmtDT = (d: string) =>
    d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const fmtDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

const SectionBox = ({
    title,
    icon,
    children,
    accentColor = '#1A1A2E'
}: {
    title: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
    accentColor?: string;
}) => (
    <div
        className="bg-white rounded-2xl shadow-sm overflow-hidden border-2"
        style={{
            borderColor: accentColor + '100' // soft colored border
        }}
    >
        <div
            className="px-6 py-4 flex items-center gap-3 border-b"
            style={{
                borderColor: accentColor + '20',
                background: accentColor + '40' // light tint header
            }}
        >
            {icon && <span style={{ color: accentColor }}>{icon}</span>}
            <h2
                className="text-sm font-black uppercase tracking-[0.12em]"
                style={{ color: accentColor }}
            >
                {title}
            </h2>
        </div>

        <div className="p-6">{children}</div>
    </div>
);

const FieldLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
    {children}
  </p>
);
const FieldValue = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[15px] font-semibold text-slate-900">
    {children}
  </p>
);

const Field = ({
    label, value, editable = false, type = 'text', options, onChange
}: {
    label: string; value: any; editable?: boolean; type?: string;
    options?: { value: string; label: string }[];
    onChange?: (v: string) => void;
}) => (
<div className="border border-slate-300 rounded-xl bg-slate-50 p-3 shadow-sm">
    <FieldLabel>{label}</FieldLabel>

    <div className="mt-2 pt-2 border-t border-slate-200">
        <FieldValue>{fmt(value)}</FieldValue>
    </div>
</div>
);

const Divider = ({ label }: { label: string }) => (
    <div className="flex items-center gap-3 my-4">
        <div className="flex-1 h-px bg-slate-100" />
        <span className="text-[10px] font-black text-black uppercase tracking-widest">{label}</span>
        <div className="flex-1 h-px bg-slate-100" />
    </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export const TicketDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    
    const [ticket, setTicket] = useState<Ticket | null>(null);
    const [notes, setNotes] = useState<Note[]>([]);
    const [staffUsers, setStaffUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Edit mode
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Partial<Ticket>>({});
    const [saving, setSaving] = useState(false);

    // Sidebar states
    const [pendingStatus, setPendingStatus] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [payAmount, setPayAmount] = useState('');
    const [generatingLink, setGeneratingLink] = useState(false);
    const [markingPaid, setMarkingPaid] = useState(false);
    const [copied, setCopied] = useState(false);

    // Notes
    const [noteInput, setNoteInput] = useState('');
    const [submittingNote, setSubmittingNote] = useState(false);
    const [showPaymentWarning, setShowPaymentWarning] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
const [successMessage, setSuccessMessage] = useState('');
    // ── Fetch ──────────────────────────────────────────────────────────────
    const refresh = useCallback(async () => {
        if (!id) return;
        try {
            const [t, n, u] = await Promise.all([
                djangoService.getTicket(parseInt(id)),
                djangoService.getNotes(parseInt(id)),
                djangoService.getUsers(),
            ]);
            setTicket(t);
            setNotes(n);
            setStaffUsers(u);
            setPendingStatus(t.status);
            setPayAmount(t.payment_amount?.toString() || '');
        } catch (e) {
            console.error('Error fetching ticket:', e);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => { refresh(); }, [refresh]);

    // ── Edit handlers ──────────────────────────────────────────────────────
    const startEdit = () => { setEditData({ ...ticket }); setIsEditing(true); };
    const cancelEdit = () => { setEditData({}); setIsEditing(false); };
    const saveEdit = async () => {
        if (!ticket || !id) return;
        setSaving(true);
        try {
            const updated = await djangoService.updateTicket(parseInt(id), editData);
            setTicket(updated);
            setIsEditing(false);
            setEditData({});
        } catch (e) {
            alert('Failed to save changes.');
        } finally {
            setSaving(false);
        }
    };
    const set = (key: keyof Ticket, val: any) => setEditData(prev => ({ ...prev, [key]: val }));
    const get = (key: keyof Ticket) => isEditing ? (editData[key] ?? ticket?.[key]) : ticket?.[key];

    // ── Status ─────────────────────────────────────────────────────────────
    const handleStatusUpdate = async () => {
    if (!ticket || pendingStatus === ticket.status) return;

    if (
        pendingStatus === 'PAYMENT_VERIFIED' &&
        ticket.payment_status !== 'RECEIVED'
    ) {
        setShowPaymentWarning(true);
        return;
    }

    setUpdatingStatus(true);

    try {
        const updated = await djangoService.updateTicket(
            parseInt(id!),
            { status: pendingStatus as any }
        );

        setTicket(updated);

        await djangoService.addNote(
            id!,
            `Status changed: ${ticket.status} → ${pendingStatus}`
        );

        await refresh();

setSuccessMessage(`Status updated to ${pendingStatus.replace(/_/g, ' ')}`);
setShowSuccessToast(true);

setTimeout(() => {
    setShowSuccessToast(false);
}, 3000);
    } catch (e) {
        console.error(e);
    } finally {
        setUpdatingStatus(false);
    }
};

    const handleAssign = async (userId: string) => {
        if (!id) return;
        try {
            const updated = await djangoService.updateTicket(parseInt(id), { assigned_to: userId ? parseInt(userId) : null } as any);
            setTicket(updated);
        } catch (e) { console.error(e); }
    };

    // ── Payment ────────────────────────────────────────────────────────────
    const handleGenerateLink = async () => {
        if (!payAmount || !id) return;
        setGeneratingLink(true);
        try {
            const updated = await djangoService.generatePaymentLink(parseInt(id), parseFloat(payAmount));
            setTicket(updated);
            await refresh();
        } catch {
            alert('Failed to generate payment link. Check Razorpay config.');
        } finally { setGeneratingLink(false); }
    };

    const handleMarkPaid = async () => {
        if (!id) return;
        setMarkingPaid(true);
        try {
            const updated = await djangoService.markPaid(parseInt(id));
            setTicket(updated);
            await refresh();
        } catch (e) { console.error(e); }
        finally { setMarkingPaid(false); }
    };

    const handleCopy = () => {
        if (ticket?.payment_link) {
            navigator.clipboard.writeText(ticket.payment_link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleWhatsApp = () => {
        if (!ticket?.payment_link) return;
        const text = `Hello ${ticket.user_name}, your Saanidhyam payment of ₹${ticket.payment_amount} is ready. Please use this link: ${ticket.payment_link}`;
        window.open(`https://wa.me/${ticket.phone?.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`, '_blank');
    };

    // ── Notes ──────────────────────────────────────────────────────────────
    const handleAddNote = async () => {
        if (!noteInput.trim() || !id) return;
        setSubmittingNote(true);
        try {
            await djangoService.addNote(id, noteInput.trim());
            setNoteInput('');
            const fresh = await djangoService.getNotes(parseInt(id));
            setNotes(fresh);
        } catch { alert('Failed to add note.'); }
        finally { setSubmittingNote(false); }
    };

    // ── Loading / not found ────────────────────────────────────────────────
    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-slate-200 border-t-slate-900" />
                <p className="text-sm font-semibold text-black">Loading ticket...</p>
            </div>
        </div>
    );

    if (!ticket) return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
            <div className="text-center">
                <AlertTriangle size={40} className="text-black mx-auto mb-3" />
                <p className="text-black font-semibold">Ticket not found.</p>
                <button onClick={() => navigate(-1)} className="mt-4 text-sm text-blue-600 font-bold hover:underline">← Go Back</button>
            </div>
        </div>
    );

    const ben = ticket.beneficiary?.toLowerCase();
    const isMyself = ben === 'myself';
    const isParents = ben === 'parents';
    const isGrandparents = ben === 'grandparents';
    const isRelatives = ben === 'relatives';
    const hasClientAddress = !isMyself;
    const isPaid = ticket.payment_status === 'RECEIVED';
    const fatherLabel = isGrandparents ? 'Grandfather Age' : 'Father Age';
    const motherLabel = isGrandparents ? 'Grandmother Age' : 'Mother Age';
    const statusCfg = getStatusConfig(ticket.status);

    return (
        <div className="min-h-screen bg-[#F0F2F8] text-slate-900 pb-16 font-sans">

            {/* ── STICKY HEADER ─────────────────────────────────────────── */}
            <div className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
                <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 hover:bg-slate-100 rounded-xl transition-all shrink-0"
                        >
                            <ChevronLeft size={20} className="text-black" />
                        </button>
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                            <h1 className="text-lg font-black text-slate-900 shrink-0">Ticket #{ticket.id}</h1>
                            <span className={`text-[11px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest shrink-0 ${statusCfg.color}`}>
                                {statusCfg.label}
                            </span>
                            <span className={`text-[11px] font-black px-2.5 py-1 rounded-full border uppercase tracking-widest shrink-0 ${BENEFICIARY_COLORS[ben] || 'bg-slate-100 text-black border-slate-200'}`}>
                                {ticket.beneficiary}
                            </span>
                            {ticket.payment_status === 'RECEIVED' && (
                                <span className="text-[11px] font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase tracking-widest shrink-0">
                                    ✓ Paid
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button onClick={refresh} className="p-2 hover:bg-slate-100 rounded-xl transition-all" title="Refresh">
                            <RefreshCw size={16} className="text-black" />
                        </button>
                        {isEditing ? (
                            <>
                                <button onClick={cancelEdit} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-black bg-slate-100 rounded-xl hover:bg-slate-200 transition-all">
                                    <X size={14} /> Cancel
                                </button>
                                <button onClick={saveEdit} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-black transition-all disabled:opacity-50">
                                    <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
                                </button>
                            </>
                        ) : (
                            <button onClick={startEdit} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-slate-900 rounded-xl hover:bg-black transition-all">
                                <Edit3 size={14} /> Edit Ticket
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-5 p-5">

                {/* ── LEFT: DATA SECTIONS (8 cols) ─────────────────────── */}
                <div className="lg:col-span-8 space-y-5">

                    {/* BOX 1: REQUESTER */}
                    <SectionBox title="Requester Details" icon={<Users size={16} />} accentColor="#2563EB">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-5 mb-5">
                            <Field label="Full Name" value={get('user_name')} editable={isEditing} onChange={v => set('user_name', v)} />
                            <Field label="Age" value={get('age')} editable={isEditing} type="number" onChange={v => set('age', parseInt(v))} />
                            <Field label="Gender" value={get('gender' as any)} editable={isEditing}
                                options={[{ value: 'Male', label: 'Male' }, { value: 'Female', label: 'Female' }, { value: 'Other', label: 'Other' }]}
                                onChange={v => set('gender' as any, v)} />
                            <Field label="Alternate Phone" value={get('alternate_phone' as any)} editable={isEditing} onChange={v => set('alternate_phone' as any, v)} />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-2 gap-x-6 gap-y-5 mb-5">
                            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl border-2 border-blue-200 shadow-sm">
                                <Phone size={16} className="text-black mt-1 shrink-0" />
                                <div>
                                    <FieldLabel>Phone</FieldLabel>
                                    {isEditing
                                        ? <input
                                    type="text"
                                    value={(get('phone') as string) || ''}
                                    onChange={e => set('phone', e.target.value)}
                                    className="w-full text-[15px] font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-400"
                                  />
                                        : <FieldValue>{fmt(get('phone'))}</FieldValue>}
                                </div>
                            </div>
                            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl border-2 border-blue-200 shadow-sm">
                                <Mail size={16} className="text-black mt-1 shrink-0" />
                                <div className="min-w-0">
                                    <FieldLabel>Email</FieldLabel>
                                    {isEditing
                                        ? <input
                                          type="email"
                                          value={(get('email') as string) || ''} 
                                          onChange={e => set('email', e.target.value)}
                                          className="w-full text-[15px] font-semibold text-slate-900 bg-white border border-slate-300 rounded-lg px-2 py-1.5 outline-none focus:border-indigo-400"
                                        />
                                        : <FieldValue><span className="break-all">{fmt(get('email'))}</span></FieldValue>}
                                </div>
                            </div>
                        </div>

                        <Divider label="Requester Address" />
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5 mb-3">
                            <Field label="Country" value={get('user_country')} editable={isEditing} onChange={v => set('user_country', v)} />
                            {(get('user_country') === 'Other') && (
                                <Field label="Country (specify)" value={get('user_country_other')} editable={isEditing} onChange={v => set('user_country_other', v)} />
                            )}
                        </div>
                        {get('user_country') !== 'India' && get('user_country') && get('user_area') ? (
                            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                <FieldLabel>International Address</FieldLabel>
                                <FieldValue>{fmt(get('user_area'))}</FieldValue>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-x-5 gap-y-5">
                                <Field label="Area / Locality" value={get('user_area')} editable={isEditing} onChange={v => set('user_area', v)} />
                                <Field label="City" value={get('user_city')} editable={isEditing} onChange={v => set('user_city', v)} />
                                <Field label="District" value={get('user_district')} editable={isEditing} onChange={v => set('user_district', v)} />
                                <Field label="State" value={get('user_state')} editable={isEditing} onChange={v => set('user_state', v)} />
                                <Field label="Pincode" value={get('user_pincode')} editable={isEditing} onChange={v => set('user_pincode', v)} />
                            </div>
                        )}
                    </SectionBox>

                    {/* BOX 2: BENEFICIARY */}
                    {!isMyself && (
                        <SectionBox title="Patient / Beneficiary Info" icon={<Heart size={16} />} accentColor="#7C3AED">
                            {(isParents || isGrandparents) && (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5 mb-5">
                                    <Field label={fatherLabel} value={get('father_age')} editable={isEditing} type="number" onChange={v => set('father_age', parseInt(v))} />
                                    <Field label={motherLabel} value={get('mother_age')} editable={isEditing} type="number" onChange={v => set('mother_age', parseInt(v))} />
                                    <div>
                                        <FieldLabel>Beneficiary Type</FieldLabel>
                                        <span className={`inline-block text-[12px] font-black px-3 py-1 rounded-full border uppercase ${BENEFICIARY_COLORS[ben] || ''}`}>
                                            {ticket.beneficiary}
                                        </span>
                                    </div>
                                </div>
                            )}
                            {isRelatives && (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-5 mb-5">
                                    <Field label="Relative Name" value={get('relative_name')} editable={isEditing} onChange={v => set('relative_name', v)} />
                                    <Field label="Relation" value={get('relation_type')} editable={isEditing} onChange={v => set('relation_type', v)} />
                                    <Field label="Age" value={get('relative_age')} editable={isEditing} type="number" onChange={v => set('relative_age', parseInt(v))} />
                                </div>
                            )}

                            {hasClientAddress && (
                                <>
                                    <Divider label="Service Delivery Address" />
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-5 gap-y-4 mb-4">
                                            <Field label="Country" value={get('client_country')} editable={isEditing} onChange={v => set('client_country', v)} />
                                            {(get('client_country') === 'Other') && (
                                                <Field label="Country (specify)" value={get('client_country_other')} editable={isEditing} onChange={v => set('client_country_other', v)} />
                                            )}
                                        </div>
                                        {get('client_country') !== 'India' && get('client_country') && get('client_area') ? (
                                            <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                                                <FieldLabel>International Address</FieldLabel>
                                                <FieldValue>{fmt(get('client_area'))}</FieldValue>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 gap-y-4">
                                                <Field label="Area" value={get('client_area')} editable={isEditing} onChange={v => set('client_area', v)} />
                                                <Field label="City" value={get('client_city')} editable={isEditing} onChange={v => set('client_city', v)} />
                                                <Field label="District" value={get('client_district')} editable={isEditing} onChange={v => set('client_district', v)} />
                                                <Field label="State" value={get('client_state')} editable={isEditing} onChange={v => set('client_state', v)} />
                                                <Field label="Pincode" value={get('client_pincode')} editable={isEditing} onChange={v => set('client_pincode', v)} />
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </SectionBox>
                    )}

                    {/* BOX 3: CLINICAL */}
                    <SectionBox title="Clinical Requirements" icon={<Stethoscope size={16} />} accentColor="#059669">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <Field
                                label="Health Condition"
                                value={get('client_condition')}
                                editable={isEditing}
                                options={[
                                    { value: 'Need assistance for daily activities', label: 'Need assistance for daily activities' },
                                    { value: "Doesn't need any assistance for daily activities", label: "Doesn't need any assistance" },
                                    { value: 'Bedridden', label: 'Bedridden' },
                                    { value: 'Dementia', label: 'Dementia' },
                                    { value: 'Wheelchair-bound', label: 'Wheelchair-bound' },
                                    { value: 'Post-surgery Recovery', label: 'Post-surgery Recovery' },
                                    { value: "Alzheimer's", label: "Alzheimer's" },
                                    { value: "Parkinson's", label: "Parkinson's" },
                                    { value: 'Other', label: 'Other' },
                                ]}
                                onChange={v => set('client_condition', v)}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Field label="Budget Min (₹)" value={get('budget_min')} editable={isEditing} type="number" onChange={v => set('budget_min', parseInt(v))} />
                                <Field label="Budget Max (₹)" value={get('budget_max')} editable={isEditing} type="number" onChange={v => set('budget_max', parseInt(v))} />
                            </div>
                        </div>

                        {(get('client_condition') === 'Other' || get('client_condition_details')) && (
                            <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-xl">
                                <Field
                                    label="Condition Details"
                                    value={get('client_condition_details')}
                                    editable={isEditing}
                                    type="textarea"
                                    onChange={v => set('client_condition_details', v)}
                                />
                            </div>
                        )}

                        <div className="mb-5">
                            <FieldLabel>Services Required</FieldLabel>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {(ticket.service_types || []).length > 0
                                    ? ticket.service_types.map((s, i) => (
                                        <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 text-blue-800 text-[12px] font-bold rounded-lg">
                                            <Tag size={10} /> {s}
                                        </span>
                                    ))
                                    : <span className="text-sm text-black italic">No services selected</span>}
                            </div>
                        </div>

                        {ticket.notes && (
                            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                                <FieldLabel>User Notes</FieldLabel>
                                <p className="text-[15px] font-medium text-black italic mt-1">"{ticket.notes}"</p>
                            </div>
                        )}
                    </SectionBox>

                    {/* BOX 4: PREFERRED LOCATIONS */}
                    <SectionBox title="Preferred Service Locations" icon={<MapPin size={16} />} accentColor="#D97706">
                        {(ticket.preferred_locations || []).length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {ticket.preferred_locations.map((loc: any, i: number) => (
                                    <div key={i} className="p-4 bg-white border border-slate-200 rounded-xl hover:border-amber-300 hover:shadow-sm transition-all">
                                        <div className="flex items-start gap-3">
                                            <div className="w-7 h-7 bg-amber-100 border border-amber-200 rounded-lg text-[12px] font-black flex items-center justify-center text-amber-700 shrink-0">
                                                {i + 1}
                                            </div>
                                            <div>
                                                <p className="text-[15px] font-bold text-slate-800">
                                                    {[loc.area, loc.city].filter(Boolean).join(', ') || '—'}
                                                </p>
                                                <p className="text-[13px] text-black mt-0.5">
                                                    {[loc.district, loc.state].filter(Boolean).join(', ')}
                                                    {loc.pincode ? ` — ${loc.pincode}` : ''}
                                                </p>
                                                {loc.landmark && (
                                                    <p className="text-[12px] text-black mt-1 flex items-center gap-1">
                                                        <MapPin size={10} /> {loc.landmark}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[15px] text-black italic">No preferred locations specified.</p>
                        )}
                    </SectionBox>

                    {/* BOX 5: ACTIVITY LOG */}
                    <SectionBox title="Activity Log & Staff Notes" icon={<Activity size={16} />} accentColor="#64748B">
                        <div className="flex gap-3 mb-6 pb-6 border-b border-slate-100">
                            <div className="flex-1 relative">
                                <input
                                    type="text"
                                    value={noteInput}
                                    onChange={e => setNoteInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAddNote()}
                                    placeholder="Add a staff note... (Enter to send)"
                                    className="w-full pl-4 pr-14 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[15px] outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition"
                                />
                                <button
                                    onClick={handleAddNote}
                                    disabled={!noteInput.trim() || submittingNote}
                                    className="absolute right-2 top-2 p-2 bg-slate-900 text-white rounded-lg hover:bg-black disabled:opacity-40 transition"
                                >
                                    <Send size={14} />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-5 relative ml-2">
                            <div className="absolute left-[9px] top-2 bottom-2 w-px bg-slate-100" />
                            {notes.map(note => (
                                <div key={note.id} className="relative flex gap-4 group">
                                    <div className="relative z-10 w-5 h-5 rounded-full bg-white border-2 border-slate-200 group-hover:border-slate-500 transition-colors flex items-center justify-center shrink-0 mt-0.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 group-hover:bg-slate-700 transition-colors" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline justify-between mb-1.5 gap-2">
                                            <span className="text-[13px] font-black text-slate-900 truncate">{note.user_name}</span>
                                            <span className="text-[11px] text-black shrink-0">{fmtDT(note.created_at)}</span>
                                        </div>
                                        <div className={`rounded-xl rounded-tl-none p-3.5 text-[14px] leading-relaxed border ${
                                            note.content.startsWith('⚠️') || note.content.startsWith('SYSTEM')
                                                ? 'bg-amber-50 border-amber-100 text-amber-800'
                                                : note.content.includes('Status changed')
                                                    ? 'bg-blue-50 border-blue-100 text-blue-800'
                                                    : note.content.includes('Payment')
                                                        ? 'bg-emerald-50 border-emerald-100 text-emerald-800'
                                                        : 'bg-slate-50 border-slate-100 text-black'
                                        }`}>
                                            {note.content}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <div className="relative flex gap-4">
                                <div className="relative z-10 w-5 h-5 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center shrink-0">
                                    <Calendar size={10} className="text-black" />
                                </div>
                                <div className="flex-1 pt-0.5">
                                    <span className="text-[13px] font-black text-black uppercase tracking-wide">Ticket Created</span>
                                    <span className="text-[12px] text-black ml-2">{fmtDT(ticket.created_at)}</span>
                                    <p className="text-[12px] text-black mt-0.5">by {ticket.created_by_name}</p>
                                </div>
                            </div>
                            {notes.length === 0 && (
                                <p className="text-[14px] text-black italic pl-8">No activity yet. Add the first note above.</p>
                            )}
                        </div>
                    </SectionBox>
                </div>

                {/* ── RIGHT SIDEBAR (4 cols) ────────────────────────────── */}
                <div className="lg:col-span-4 space-y-4">

                    {/* Ticket Meta */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Tag size={14} className="text-black" />
                            <span className="text-[11px] font-black text-black uppercase tracking-widest">Ticket Info</span>
                        </div>
                        <div className="space-y-3.5">
                            {[
                                { label: 'Ticket ID', value: `#${ticket.id}` },
                                { label: 'Created', value: fmtDT(ticket.created_at) },
                                { label: 'Last Updated', value: fmtDT(ticket.updated_at) },
                                { label: 'Created By', value: ticket.created_by_name || 'System' },
                            ].map(row => (
                                <div key={row.label} className="flex justify-between items-start gap-2">
                                    <span className="text-[13px] text-black shrink-0">{row.label}</span>
                                    <span className="text-[13px] font-bold text-slate-800 text-right">{row.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Status Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Clock size={14} className="text-black" />
                                <span className="text-[11px] font-black text-black uppercase tracking-widest">Workflow Status</span>
                            </div>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border uppercase ${statusCfg.color}`}>
                                {TicketStatusLabel[ticket.status]} — {statusCfg.label.replace(/^S\d+ — /, '')}
                            </span>
                        </div>
                        <select
                            value={pendingStatus}
                            onChange={e => setPendingStatus(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[14px] font-bold outline-none mb-3 focus:border-slate-400"
                        >
                            {STATUS_OPTIONS.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                        <button
                            onClick={handleStatusUpdate}
                            disabled={updatingStatus || pendingStatus === ticket.status}
                            className="w-full py-3 bg-slate-900 text-white text-[12px] font-black uppercase tracking-widest rounded-xl hover:bg-black transition-all disabled:opacity-40"
                        >
                            {updatingStatus ? 'Updating…' : 'Update Status'}
                        </button>
                    </div>

                    {/* Assignment Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <User2 size={14} className="text-black" />
                            <span className="text-[11px] font-black text-black uppercase tracking-widest">Assigned Agent</span>
                        </div>
                        <select
                            value={ticket.assigned_to?.toString() || ''}
                            onChange={e => handleAssign(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[14px] font-bold outline-none focus:border-slate-400"
                        >
                            <option value="">Unassigned</option>
                            {staffUsers.map(u => (
                                <option key={u.id} value={u.id}>{u.username}</option>
                            ))}
                        </select>
                        {ticket.assigned_to_name && ticket.assigned_to_name !== 'Unassigned' && (
                            <div className="mt-3 flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-[11px] font-black text-black">
                                    {ticket.assigned_to_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-[12px] font-bold text-black">{ticket.assigned_to_name}</p>
                                    <p className="text-[10px] text-black">Currently assigned</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Payment Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Wallet size={14} className="text-black" />
                            <span className="text-[11px] font-black text-black uppercase tracking-widest">Payment</span>
                        </div>

                        {isPaid ? (
                            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex flex-col items-center gap-3 text-emerald-700">
                                <div className="w-14 h-14 rounded-full bg-emerald-100 border-2 border-emerald-200 flex items-center justify-center">
                                    <CheckCircle size={28} className="text-emerald-500" />
                                </div>
                                <span className="font-black text-[17px]">Payment Verified</span>
                                {ticket.payment_amount && (
                                    <span className="text-3xl font-black">₹{ticket.payment_amount}</span>
                                )}
                                {ticket.razorpay_payment_id && (
                                    <span className="text-[10px] font-mono bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-200 text-emerald-600">
                                        {ticket.razorpay_payment_id}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex justify-between items-end">
                                    <p className="text-[11px] font-black text-black uppercase">Amount Set</p>
                                    <p className="text-2xl font-black text-slate-900">
                                        {ticket.payment_amount ? `₹${ticket.payment_amount}` : '—'}
                                    </p>
                                </div>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black font-bold text-[15px]">₹</span>
                                    <input
                                        type="number"
                                        value={payAmount}
                                        onChange={e => setPayAmount(e.target.value)}
                                        placeholder="Enter amount…"
                                        className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-[17px] font-bold outline-none focus:border-slate-400"
                                    />
                                </div>

                                {!ticket.payment_link ? (
                                    <button
                                        onClick={handleGenerateLink}
                                        disabled={!payAmount || generatingLink}
                                        className="w-full py-3 bg-blue-600 text-white text-[12px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-40 flex items-center justify-center gap-2"
                                    >
                                        <Share2 size={14} />
                                        {generatingLink ? 'Generating…' : 'Generate Payment Link'}
                                    </button>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                                            <p className="text-[10px] text-black font-mono truncate mb-2">{ticket.payment_link}</p>
                                            <div className="flex gap-2">
                                                <button onClick={handleCopy} className={`flex-1 py-2 rounded-lg text-[11px] font-black uppercase flex items-center justify-center gap-1.5 border transition-all ${copied ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-slate-200 text-black hover:bg-slate-50'}`}>
                                                    {copied ? <CheckCircle2 size={11} /> : <Copy size={11} />}
                                                    {copied ? 'Copied!' : 'Copy'}
                                                </button>
                                                <button onClick={handleWhatsApp} className="flex-1 py-2 rounded-lg text-[11px] font-black uppercase flex items-center justify-center gap-1.5 bg-green-500 text-white hover:bg-green-600 transition-all">
                                                    <Share2 size={11} /> WhatsApp
                                                </button>
                                                <a href={ticket.payment_link} target="_blank" rel="noreferrer" className="flex items-center justify-center px-3 py-2 bg-white border border-slate-200 rounded-lg text-black hover:bg-slate-50 transition-all">
                                                    <ExternalLink size={11} />
                                                </a>
                                            </div>
                                        </div>
                                        <button onClick={handleGenerateLink} disabled={!payAmount || generatingLink} className="w-full py-2 bg-slate-100 text-black text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-slate-200 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5">
                                            <RefreshCw size={12} /> {generatingLink ? 'Generating…' : 'Regenerate Link'}
                                        </button>
                                    </div>
                                )}

                                <div className="pt-2 border-t border-slate-100">
                                    <button onClick={handleMarkPaid} disabled={markingPaid} className="w-full py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-emerald-100 transition-all disabled:opacity-40 flex items-center justify-center gap-1.5">
                                        <CheckCircle2 size={13} />
                                        {markingPaid ? 'Marking…' : 'Mark Manually as Paid'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center justify-center gap-2 py-3 bg-white rounded-2xl border border-slate-100">
                        <ShieldCheck size={12} className="text-black" />
                        <p className="text-[10px] font-black text-black uppercase tracking-widest">Encrypted · Secure Record</p>
                    </div>
                </div>
                        </div>

            {showPaymentWarning && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle
                                className="text-amber-500"
                                size={24}
                            />
                            <h3 className="text-lg font-bold">
                                Payment Verification Required
                            </h3>
                        </div>

                        <p className="text-slate-600 mb-6">
                            Please click <strong>Mark Manually as Paid </strong>
                            before changing the ticket status to{" "}
                            <strong>Payment Verified</strong>.
                        </p>

                        <button
                            onClick={() => setShowPaymentWarning(false)}
                            className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold"
                        >
                            Got It
                        </button>
                    </div>
                </div>
            )}
            {showSuccessToast && (
    <div className="fixed top-5 right-5 z-50 animate-in slide-in-from-right duration-300">
        <div className="bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3">
            <CheckCircle2 size={18} />
            <span className="font-semibold">
                {successMessage}
            </span>
        </div>
    </div>
)}
        </div>
    );
};