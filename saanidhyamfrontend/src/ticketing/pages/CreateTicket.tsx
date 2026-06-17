import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { djangoService } from '../services/djangoService';
import {
  Users, Heart, Activity, MapPin, Wallet,
  Plus, Trash2, AlertCircle, Loader2, CheckCircle,
} from 'lucide-react';

// ─── CONSTANTS — Must match ServiceRequestModal exactly ──────────────────────

const COUNTRY_CODES: Record<string, { name: string; digits: number }> = {
  '+91':  { name: 'India',       digits: 10 },
  '+1':   { name: 'USA/Canada',  digits: 10 },
  '+44':  { name: 'UK',          digits: 10 },
  '+61':  { name: 'Australia',   digits: 9  },
  '+971': { name: 'UAE',         digits: 9  },
  '+65':  { name: 'Singapore',   digits: 8  },
  '+49':  { name: 'Germany',     digits: 11 },
  '+':    { name: 'Other',       digits: 10 },
};

const COUNTRIES = [
  'India', 'USA', 'UK', 'Canada', 'Australia', 'UAE',
  'Singapore', 'Germany', 'Other',
];

// Exact list from ServiceRequestModal
const HEALTH_CONDITIONS = [
  'Need assistance for daily activities',
  "Doesn't need any assistance for daily activities",
  'Bedridden',
  'Dementia',
  'Wheelchair-bound',
  'Post-surgery Recovery',
  "Alzheimer's",
  "Parkinson's",
  'Other',
];

// Exact list from ServiceRequestModal
const CARE_SERVICES = [
  'Old Age Home',
  'Assisted Living',
  'Nursing Care',
  'Day Care',
  'Home Care',
  'Dementia Care',
  'Palliative Care',
  'Senior residential living',
  'Retirement homes',
];

// Telangana / AP pincode prefix validation — same as ServiceRequestModal
const TELANGANA_PREFIXES = [
  '500','501','502','503','504','505','506','507','508','509',
  '510','511','512','513','514','515',
];
const AP_PREFIXES = [
  '500','501','502','503','504','505','506','507','508','509',
  '510','511','512','513','514','515','516','517','518','519',
  '520','521','522','523','524','525','526','527','528','529',
  '530','531','532','533','534','535',
];

function isPincodeValidForState(pincode: string, state: string): boolean {
  if (!pincode || pincode.length < 6) return true;
  const p3 = pincode.substring(0, 3);
  if (state === 'Telangana')      return TELANGANA_PREFIXES.includes(p3);
  if (state === 'Andhra Pradesh') return AP_PREFIXES.includes(p3);
  return true;
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface PreferredLocation {
  state: string;
  district: string;
  city: string;
  area: string;
  pincode: string;
  landmark: string;
}

interface FormState {
  beneficiary: string;
  // Requester
  userName: string;
  userAge: string;
  userPhoneCode: string;
  userPhone: string;
  userEmail: string;
  userCountry: string;
  userCountryOther: string;
  userPincode: string;
  userState: string;
  userDistrict: string;
  userCity: string;
  userArea: string;
  // Beneficiary
  fatherAge: string;
  motherAge: string;
  relationType: string;
  relativeName: string;
  relativeAge: string;
  // Client address
  clientCountry: string;
  clientCountryOther: string;
  clientPincode: string;
  clientState: string;
  clientDistrict: string;
  clientCity: string;
  clientArea: string;
  // Clinical
  healthCondition: string;
  healthConditionDetails: string;
  serviceTypes: string[];
  budgetMin: string;
  budgetMax: string;
  preferredLocations: PreferredLocation[];
  notes: string;
  // Workflow
  assignedTo: string;
}

const BLANK_LOCATION: PreferredLocation = {
  state: '', district: '', city: '', area: '', pincode: '', landmark: '',
};

const INITIAL_STATE: FormState = {
  beneficiary: '',
  userName: '', userAge: '', userPhoneCode: '+91', userPhone: '', userEmail: '',
  userCountry: '', userCountryOther: '',
  userPincode: '', userState: '', userDistrict: '', userCity: '', userArea: '',
  fatherAge: '', motherAge: '',
  relationType: '', relativeName: '', relativeAge: '',
  clientCountry: '', clientCountryOther: '',
  clientPincode: '', clientState: '', clientDistrict: '', clientCity: '', clientArea: '',
  healthCondition: '', healthConditionDetails: '',
  serviceTypes: [], budgetMin: '', budgetMax: '',
  preferredLocations: [{ ...BLANK_LOCATION }],
  notes: '',
  assignedTo: '',
};

// ─── SMALL HELPERS ────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-800 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#4a5838]/30 focus:border-[#4a5838] ' +
  'bg-white placeholder-slate-300 transition';
const selectCls = `${inputCls} cursor-pointer`;

const Field: React.FC<{
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}> = ({ label, required, hint, children }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
      {label} {required && <span className="text-red-500">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
  </div>
);

const InputError: React.FC<{ msg?: string }> = ({ msg }) =>
  msg ? (
    <div className="flex items-center gap-1 mt-1 text-red-500 text-xs font-semibold">
      <AlertCircle size={12} /> {msg}
    </div>
  ) : null;

const SectionHeader: React.FC<{ step: number; title: string; subtitle?: string; icon?: React.ReactNode }> = ({
  step, title, subtitle, icon,
}) => (
  <div className="flex items-start gap-4 mb-6">
    <div className="w-8 h-8 rounded-full bg-[#4a5838] text-white flex items-center justify-center text-sm font-bold shrink-0 mt-0.5">
      {step}
    </div>
    <div>
      <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
        {icon}{title}
      </h3>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  </div>
);

// ─── PINCODE API ──────────────────────────────────────────────────────────────

async function lookupPincode(pincode: string) {
  try {
    const res  = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
    const data = await res.json();
    if (data?.[0]?.Status === 'Success' && data[0].PostOffice?.length > 0) {
      const po = data[0].PostOffice[0];
      return {
        state:    po.State    || '',
        district: po.District === 'Hyderabad' ? 'Medchal-Malkajgiri' : (po.District || ''),
        city:     po.Block && po.Block !== 'NA' ? po.Block : (po.Division || po.District || ''),
        area:     po.Name || '',
      };
    }
  } catch {}
  return null;
}

// ─── ADDRESS BLOCK ────────────────────────────────────────────────────────────
// Matches the renderAddressSection() behaviour in ServiceRequestModal exactly.

const AddressBlock: React.FC<{
  prefix: 'user' | 'client';
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  errors: Record<string, string>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}> = ({ prefix, form, setForm, errors, setErrors }) => {

  const [loading,     setLoading]     = useState(false);
  const [manualEntry, setManualEntry] = useState(false);

  const country     = form[`${prefix}Country`    as keyof FormState] as string;
  const pincode     = form[`${prefix}Pincode`    as keyof FormState] as string;
  const pincodeKey  = `${prefix}Pincode`;
  const isIndia     = country === 'India';
  const isNonIndia  = country !== '' && country !== 'India';
  const autoLocked  = !manualEntry && pincode.length === 6;

  const setField = (field: string, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handlePincode = async (val: string) => {
    const pin = val.replace(/\D/g, '').slice(0, 6);
    setField(`${prefix}Pincode`, pin);
    if (pin.length > 0 && pin.length < 6) {
      setErrors(prev => ({ ...prev, [pincodeKey]: 'Pincode must be 6 digits.' }));
    } else {
      setErrors(prev => ({ ...prev, [pincodeKey]: '' }));
    }
    if (pin.length === 6 && isIndia) {
      setLoading(true);
      const data = await lookupPincode(pin);
      setLoading(false);
      if (data) {
        setForm(prev => ({
          ...prev,
          [`${prefix}State`]:    data.state,
          [`${prefix}District`]: data.district,
          [`${prefix}City`]:     data.city,
          [`${prefix}Area`]:     data.area,
        }));
        setManualEntry(false);
      } else {
        setForm(prev => ({
          ...prev,
          [`${prefix}State`]: '', [`${prefix}District`]: '',
          [`${prefix}City`]: '', [`${prefix}Area`]: '',
        }));
        setManualEntry(true);
      }
    }
  };

  return (
    <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
      {/* Country */}
      <select
        className={selectCls}
        value={country}
        onChange={e => {
          setField(`${prefix}Country`, e.target.value);
          setManualEntry(false);
        }}
        required
      >
        <option value="">— Select Country —</option>
        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      {country === 'Other' && (
        <input
          className={inputCls}
          placeholder="Specify Country *"
          value={form[`${prefix}CountryOther` as keyof FormState] as string}
          onChange={e => setField(`${prefix}CountryOther`, e.target.value)}
          required
        />
      )}

      {/* Address fields — only once country is chosen */}
      {country !== '' && (
        <>
          {isIndia ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                {/* Pincode */}
                <div className="relative">
                  <input
                    className={`${inputCls} ${errors[pincodeKey] ? 'border-red-400' : ''}`}
                    placeholder="Pincode * (6 digits)"
                    maxLength={6}
                    value={pincode}
                    onChange={e => handlePincode(e.target.value)}
                    required
                  />
                  {loading && (
                    <span className="absolute right-3 top-3">
                      <Loader2 size={14} className="animate-spin text-[#4a5838]" />
                    </span>
                  )}
                  <InputError msg={errors[pincodeKey]} />
                </div>
                {/* State */}
                <input
                  className={inputCls}
                  placeholder="State *"
                  value={form[`${prefix}State` as keyof FormState] as string}
                  onChange={e => setField(`${prefix}State`, e.target.value)}
                  readOnly={loading || autoLocked}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {/* District */}
                <input
                  className={inputCls}
                  placeholder="District *"
                  value={form[`${prefix}District` as keyof FormState] as string}
                  onChange={e => setField(`${prefix}District`, e.target.value)}
                  readOnly={loading || autoLocked}
                  required
                />
                {/* City */}
                <input
                  className={inputCls}
                  placeholder="City/Town *"
                  value={form[`${prefix}City` as keyof FormState] as string}
                  onChange={e => setField(`${prefix}City`, e.target.value)}
                  readOnly={loading || autoLocked}
                  required
                />
              </div>
              {/* Area */}
              <input
                className={inputCls}
                placeholder="Area / Locality *"
                value={form[`${prefix}Area` as keyof FormState] as string}
                onChange={e => setField(`${prefix}Area`, e.target.value)}
                readOnly={loading || autoLocked}
                required
              />
              {autoLocked && (
                <button
                  type="button"
                  className="text-xs text-[#4a5838] underline"
                  onClick={() => setManualEntry(true)}
                >
                  Edit address manually
                </button>
              )}
            </>
          ) : (
            /* Non-India: single free-text area */
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 font-medium">
                <strong>International Address:</strong> Please enter the full address below.<br />
                Format: House/Flat No, Street, City, State/Province, ZIP/Postal Code
              </div>
              <textarea
                className={`${inputCls} resize-none`}
                rows={3}
                placeholder="Full address (House No, Street, City, State, ZIP) *"
                value={form[`${prefix}Area` as keyof FormState] as string}
                onChange={e => setField(`${prefix}Area`, e.target.value)}
                required
              />
              <p className="text-[11px] text-gray-400">
                District, state, and pincode fields are not required for international addresses.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export const CreateTicket: React.FC = () => {
  const navigate = useNavigate();

  const [form,           setForm]           = useState<FormState>(INITIAL_STATE);
  const [users,          setUsers]          = useState<{ id: number; name: string }[]>([]);
  const [submitting,     setSubmitting]     = useState(false);
  const [submitted,      setSubmitted]      = useState(false);
  const [error,          setError]          = useState('');
  const [serviceError,   setServiceError]   = useState(false);
  const [locErrors,      setLocErrors]      = useState<Record<string, string>>({});
  const [fieldErrors,    setFieldErrors]    = useState<Record<string, string>>({});
  const [locLoading,     setLocLoading]     = useState<string | null>(null);

  useEffect(() => {
    djangoService.getUsers()
      .then(us => setUsers(us.map(u => ({ id: u.id, name: (u as any).name || u.username }))))
      .catch(() => {});
  }, []);

  const set = (key: keyof FormState, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  // ── Phone validation
  const validatePhone = (phone: string, code: string) => {
    if (!phone) { setFieldErrors(p => ({ ...p, userPhone: '' })); return; }
    const info     = COUNTRY_CODES[code];
    const expected = info ? info.digits : 10;
    if (phone.length !== expected) {
      setFieldErrors(p => ({
        ...p,
        userPhone: `Phone must be exactly ${expected} digits for ${code}`,
      }));
    } else {
      setFieldErrors(p => ({ ...p, userPhone: '' }));
    }
  };

  // ── Service toggle
  const toggleService = (svc: string) =>
    setForm(prev => ({
      ...prev,
      serviceTypes: prev.serviceTypes.includes(svc)
        ? prev.serviceTypes.filter(s => s !== svc)
        : [...prev.serviceTypes, svc],
    }));

  // ── Preferred location helpers
  const addLocation = () => {
    if (form.preferredLocations.length >= 3) return;
    setForm(prev => ({ ...prev, preferredLocations: [...prev.preferredLocations, { ...BLANK_LOCATION }] }));
  };

  const removeLocation = (i: number) => {
    if (form.preferredLocations.length <= 1) return;
    setForm(prev => ({ ...prev, preferredLocations: prev.preferredLocations.filter((_, idx) => idx !== i) }));
  };

  const setLocField = (i: number, field: keyof PreferredLocation, value: string) => {
    setForm(prev => {
      const updated = [...prev.preferredLocations];
      updated[i] = { ...updated[i], [field]: value };
      // Reset derived fields when state changes
      if (field === 'state') {
        updated[i] = { ...updated[i], state: value, district: '', city: '', area: '', pincode: '' };
      }
      return { ...prev, preferredLocations: updated };
    });
  };

  const handleLocPincode = useCallback(async (pincode: string, i: number) => {
    const pin = pincode.replace(/\D/g, '').slice(0, 6);
    setLocField(i, 'pincode', pin);

    if (pin.length > 0 && pin.length < 6) {
      setLocErrors(prev => ({ ...prev, [`loc_${i}`]: 'Pincode must be 6 digits.' }));
      return;
    }

    if (pin.length === 6) {
      const state = form.preferredLocations[i]?.state;
      if (!isPincodeValidForState(pin, state)) {
        setLocErrors(prev => ({ ...prev, [`loc_${i}`]: `Not a ${state} pincode.` }));
        return;
      }
      setLocErrors(prev => ({ ...prev, [`loc_${i}`]: '' }));
      setLocLoading(`loc_${i}`);
      const data = await lookupPincode(pin);
      setLocLoading(null);
      if (data) {
        // Verify returned state matches
        if (state === 'Telangana' && data.state !== 'Telangana') {
          setLocErrors(prev => ({ ...prev, [`loc_${i}`]: 'Not a Telangana pincode.' }));
          return;
        }
        if (state === 'Andhra Pradesh' && data.state !== 'Andhra Pradesh') {
          setLocErrors(prev => ({ ...prev, [`loc_${i}`]: 'Not an Andhra Pradesh pincode.' }));
          return;
        }
        setForm(prev => {
          const updated = [...prev.preferredLocations];
          updated[i] = { ...updated[i], district: data.district, city: data.city, area: data.area };
          return { ...prev, preferredLocations: updated };
        });
        setLocErrors(prev => ({ ...prev, [`loc_${i}`]: '' }));
      } else {
        setLocErrors(prev => ({ ...prev, [`loc_${i}`]: 'Invalid pincode.' }));
      }
    }
  }, [form.preferredLocations]);

  // ── Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validations
    if (!form.beneficiary) { setError('Please select who this service is for.'); return; }
    if (!form.userName.trim()) { setError('Requester name is required.'); return; }

    const phoneInfo  = COUNTRY_CODES[form.userPhoneCode];
    const expected   = phoneInfo ? phoneInfo.digits : 10;
    if (!form.userPhone || form.userPhone.length !== expected) {
      setFieldErrors(p => ({ ...p, userPhone: `Phone must be ${expected} digits for ${form.userPhoneCode}` }));
      return;
    }

    if (form.userEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.userEmail)) {
      setFieldErrors(p => ({ ...p, userEmail: 'Please enter a valid email address.' }));
      return;
    }

    if (form.userCountry === 'India' && form.userPincode.length !== 6) {
      setFieldErrors(p => ({ ...p, userPincode: 'Pincode must be exactly 6 digits.' }));
      return;
    }

    if (form.serviceTypes.length === 0) { setServiceError(true); return; }

    // Validate preferred locations
    for (let i = 0; i < form.preferredLocations.length; i++) {
      const loc = form.preferredLocations[i];
      if (!loc.state) { setError(`Please select a state for Location ${i + 1}.`); return; }
      if (!loc.city)  { setError(`Please enter a city for Location ${i + 1}.`); return; }
      if (loc.pincode && loc.pincode.length > 0 && loc.pincode.length !== 6) {
        setError(`Pincode for Location ${i + 1} must be 6 digits.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload: any = {
        beneficiary:          form.beneficiary,
        user_name:            form.userName,
        age:                  form.userAge      ? parseInt(form.userAge)      : null,
        phone:                (form.userPhoneCode + form.userPhone).trim(),
        email:                form.userEmail    || null,

        user_country:         form.userCountry  || 'India',
        user_country_other:   form.userCountryOther || null,
        user_pincode:         form.userPincode,
        user_state:           form.userState,
        user_district:        form.userDistrict,
        user_city:            form.userCity,
        user_area:            form.userArea,

        father_age:           form.fatherAge    ? parseInt(form.fatherAge)    : null,
        mother_age:           form.motherAge    ? parseInt(form.motherAge)    : null,

        relation_type:        form.relationType,
        relative_name:        form.relativeName,
        relative_age:         form.relativeAge  ? parseInt(form.relativeAge)  : null,

        // client_country has no null=True and no blank=True default in DB —
        // for 'myself' the client address section is hidden so clientCountry stays ''.
        // Send 'India' as the safe default; for other beneficiaries use what was filled.
        client_country:       form.clientCountry || 'India',
        client_country_other: form.clientCountryOther || null,
        client_pincode:       form.clientPincode,
        client_state:         form.clientState,
        client_district:      form.clientDistrict,
        client_city:          form.clientCity,
        client_area:          form.clientArea,

        // Maps to health_condition / health_condition_details in DB (via db_column)
        // NOTE: client_condition_details is TextField(blank=True) with NO null=True,
        // so the DB rejects NULL. Always send empty string, never null.
        client_condition:         form.healthCondition,
        client_condition_details: form.healthConditionDetails || '',

        service_types:        form.serviceTypes,
        budget_min:           form.budgetMin ? parseInt(form.budgetMin) : null,
        budget_max:           form.budgetMax ? parseInt(form.budgetMax) : null,
        preferred_locations:  form.preferredLocations,
        notes:                form.notes || null,

        status: 'NEW',
      };

      if (form.assignedTo) payload.assigned_to = parseInt(form.assignedTo);

      const ticket = await djangoService.createTicket(payload);
      setSubmitted(true);
      setTimeout(() => navigate(`/tickets/${ticket.id}`), 1800);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        JSON.stringify(err?.response?.data) ||
        err?.message ||
        'Failed to create ticket. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const showBeneficiaryDetails = form.beneficiary && form.beneficiary !== 'myself';
  const showParents            = form.beneficiary === 'parents';
  const showGrandparents       = form.beneficiary === 'grandparents';
  const showRelative           = form.beneficiary === 'relatives';

  const sectionStep = (base: number) => showBeneficiaryDetails ? base : base - 1;

  // ─── SUCCESS SCREEN ───────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="max-w-3xl mx-auto flex flex-col items-center justify-center py-24 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mb-6" />
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Ticket Created!</h2>
        <p className="text-slate-500 text-sm">Redirecting to ticket details…</p>
      </div>
    );
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto">

      {/* Page header */}
      <div className="mb-8">
        <button
          type="button"
          onClick={() => navigate('/tickets')}
          className="text-sm text-slate-500 hover:text-[#4a5838] flex items-center gap-1.5 mb-4 transition-colors"
        >
          ← Back to Tickets
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Create New Ticket</h1>
        <p className="text-sm text-slate-500 mt-1">Fill in the service request details manually</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ── SECTION 1: Beneficiary ──────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <SectionHeader step={1} title="Whom do you seek services for?" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { value: 'myself',       label: 'Myself',       emoji: '🧑' },
              { value: 'parents',      label: 'Parents',      emoji: '👨‍👩‍👦' },
              { value: 'grandparents', label: 'Grandparents', emoji: '👴' },
              { value: 'relatives',    label: 'Relatives',    emoji: '👥' },
            ].map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => set('beneficiary', opt.value)}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all text-sm font-medium gap-1.5 ${
                  form.beneficiary === opt.value
                    ? 'border-[#4a5838] bg-[#4a5838]/5 text-[#4a5838]'
                    : 'border-slate-200 text-slate-600 hover:border-[#4a5838]/40'
                }`}
              >
                <span className="text-2xl">{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── SECTION 2: Requester Info ────────────────────────────────────── */}
        {form.beneficiary && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <SectionHeader step={2} title="Your Details" icon={<Users size={18} />}
              subtitle="The person making this request" />

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <Field label="Full Name" required>
                  <input
                    className={inputCls}
                    placeholder="Your Full Name"
                    value={form.userName}
                    onChange={e => set('userName', e.target.value)}
                    required
                  />
                </Field>

                <Field label="Age" required>
                  <input
                    className={inputCls}
                    type="number"
                    placeholder="Age"
                    min={1} max={120}
                    value={form.userAge}
                    onChange={e => set('userAge', e.target.value)}
                    required
                  />
                </Field>

                {/* Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
                    Phone <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <select
                      className={`${selectCls} w-36`}
                      value={form.userPhoneCode}
                      onChange={e => {
                        set('userPhoneCode', e.target.value);
                        validatePhone(form.userPhone, e.target.value);
                      }}
                    >
                      {Object.entries(COUNTRY_CODES)
                        .filter(([k]) => k !== '+')
                        .map(([code, info]) => (
                          <option key={code} value={code}>{code} ({info.name})</option>
                        ))}
                      <option value="+">Other</option>
                    </select>
                    <input
                      className={`${inputCls} ${fieldErrors.userPhone ? 'border-red-400' : ''}`}
                      placeholder={`Phone (${COUNTRY_CODES[form.userPhoneCode]?.digits ?? 10} digits)`}
                      value={form.userPhone}
                      maxLength={COUNTRY_CODES[form.userPhoneCode]?.digits ?? 15}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, '');
                        set('userPhone', v);
                        validatePhone(v, form.userPhoneCode);
                      }}
                      required
                    />
                  </div>
                  <InputError msg={fieldErrors.userPhone} />
                </div>

                {/* Email */}
                <div>
                  <Field label="Email">
                    <input
                      className={`${inputCls} ${fieldErrors.userEmail ? 'border-red-400' : ''}`}
                      type="text"
                      placeholder="Email Address (Optional)"
                      value={form.userEmail}
                      onChange={e => {
                        set('userEmail', e.target.value);
                        if (e.target.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.target.value)) {
                          setFieldErrors(p => ({ ...p, userEmail: 'Invalid email address.' }));
                        } else {
                          setFieldErrors(p => ({ ...p, userEmail: '' }));
                        }
                      }}
                    />
                  </Field>
                  <InputError msg={fieldErrors.userEmail} />
                </div>
              </div>

              {/* Requester address */}
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Your Current Address
              </p>
              <AddressBlock
                prefix="user"
                form={form}
                setForm={setForm}
                errors={fieldErrors}
                setErrors={setFieldErrors}
              />
            </div>
          </div>
        )}

        {/* ── SECTION 3: Beneficiary Details (non-myself) ──────────────────── */}
        {showBeneficiaryDetails && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <SectionHeader step={3}
              title={showParents ? 'Parent Details' : showGrandparents ? 'Grandparent Details' : 'Relative Details'}
              icon={<Heart size={18} />}
              subtitle="Details of the person who needs care"
            />

            <div className="space-y-4">
              {/* Parents / Grandparents */}
              {(showParents || showGrandparents) && (
                <div className="grid grid-cols-2 gap-4">
                  <Field label={showGrandparents ? "Grandfather's Age" : "Father's Age"} required>
                    <input className={inputCls} type="number" placeholder="Age" min={1} max={120}
                      value={form.fatherAge} onChange={e => set('fatherAge', e.target.value)} required />
                  </Field>
                  <Field label={showGrandparents ? "Grandmother's Age" : "Mother's Age"} required>
                    <input className={inputCls} type="number" placeholder="Age" min={1} max={120}
                      value={form.motherAge} onChange={e => set('motherAge', e.target.value)} required />
                  </Field>
                </div>
              )}

              {/* Relatives */}
              {showRelative && (
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Relation" required>
                    <input className={inputCls} placeholder="e.g. Uncle, Sibling"
                      value={form.relationType} onChange={e => set('relationType', e.target.value)} required />
                  </Field>
                  <Field label="Name" required>
                    <input className={inputCls} placeholder="Full Name"
                      value={form.relativeName} onChange={e => set('relativeName', e.target.value)} required />
                  </Field>
                  <Field label="Age" required>
                    <input className={inputCls} type="number" placeholder="Age" min={1} max={120}
                      value={form.relativeAge} onChange={e => set('relativeAge', e.target.value)} required />
                  </Field>
                </div>
              )}

              {/* Beneficiary address */}
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mt-2">
                Beneficiary Address (where care is needed)
              </p>
              <AddressBlock
                prefix="client"
                form={form}
                setForm={setForm}
                errors={fieldErrors}
                setErrors={setFieldErrors}
              />
            </div>
          </div>
        )}

        {/* ── SECTION 4: Health Condition ──────────────────────────────────── */}
        {form.beneficiary && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <SectionHeader
              step={showBeneficiaryDetails ? 4 : 3}
              title="Health Condition"
              icon={<Activity size={18} />}
            />

            <div className="space-y-4">
              <Field label="Select Health Condition" required>
                <select
                  className={selectCls}
                  value={form.healthCondition}
                  onChange={e => set('healthCondition', e.target.value)}
                  required
                >
                  <option value="">Select Health Condition *</option>
                  {HEALTH_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>

              {/* Details — only shown when "Other" selected, matching ServiceRequestModal */}
              {form.healthCondition === 'Other' && (
                <Field label="Please specify details" required>
                  <textarea
                    className={`${inputCls} resize-none`}
                    rows={3}
                    placeholder="Please specify the health condition in detail *"
                    value={form.healthConditionDetails}
                    onChange={e => set('healthConditionDetails', e.target.value)}
                    required
                  />
                </Field>
              )}
            </div>
          </div>
        )}

        {/* ── SECTION 5: Care Requirements ─────────────────────────────────── */}
        {form.beneficiary && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <SectionHeader
              step={showBeneficiaryDetails ? 5 : 4}
              title="Care Requirements"
            />

            <div className="space-y-5">
              {/* Service Types */}
              <Field label="Services Required" required hint="Select all that apply">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mt-1">
                  {CARE_SERVICES.map(svc => (
                    <label
                      key={svc}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer text-sm transition-all ${
                        form.serviceTypes.includes(svc)
                          ? 'border-[#4a5838] bg-[#4a5838]/5 text-[#4a5838] font-medium'
                          : 'border-slate-200 text-slate-600 hover:border-[#4a5838]/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="w-4 h-4 text-[#4a5838]"
                        checked={form.serviceTypes.includes(svc)}
                        onChange={() => { setServiceError(false); toggleService(svc); }}
                      />
                      {svc}
                    </label>
                  ))}
                </div>
                {serviceError && (
                  <p className="text-red-500 text-xs font-bold flex items-center gap-1 mt-2">
                    <AlertCircle size={12} /> Please select at least one service.
                  </p>
                )}
              </Field>

              {/* Budget */}
              <Field label="Budget Range (Monthly — ₹)">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    className={inputCls}
                    type="number"
                    placeholder="Budget Min (₹) Optional"
                    value={form.budgetMin}
                    onChange={e => set('budgetMin', e.target.value)}
                  />
                  <input
                    className={inputCls}
                    type="number"
                    placeholder="Budget Max (₹) Optional"
                    value={form.budgetMax}
                    onChange={e => set('budgetMax', e.target.value)}
                  />
                </div>
              </Field>

              {/* ── Preferred Locations — Telangana & AP only, max 3 ── */}
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
                      <span className="flex items-center gap-1.5"><MapPin size={14} /> Preferred Location(s)</span>
                    </label>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Service available in Telangana &amp; Andhra Pradesh only · Max 3 locations
                    </p>
                  </div>
                  {form.preferredLocations.length < 3 && (
                    <button
                      type="button"
                      onClick={addLocation}
                      className="flex items-center gap-1 text-xs bg-[#4a5838] text-white px-3 py-1.5 rounded-full font-semibold hover:bg-[#3a4529] transition shrink-0 ml-4"
                    >
                      <Plus size={12} /> Add Location
                    </button>
                  )}
                </div>

                <div className="space-y-4">
                  {form.preferredLocations.map((loc, i) => (
                    <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-200 relative space-y-3">
                      {form.preferredLocations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLocation(i)}
                          className="absolute top-3 right-3 text-red-400 hover:bg-red-50 p-1.5 rounded-lg transition"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Location {i + 1}
                      </p>

                      {/* State: Telangana or AP only */}
                      <select
                        className={selectCls}
                        value={loc.state}
                        onChange={e => setLocField(i, 'state', e.target.value)}
                        required
                      >
                        <option value="">Select State *</option>
                        <option value="Telangana">Telangana</option>
                        <option value="Andhra Pradesh">Andhra Pradesh</option>
                      </select>

                      {loc.state && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {/* Pincode */}
                          <div className="relative">
                            <input
                              className={`${inputCls} ${locErrors[`loc_${i}`] ? 'border-red-400' : ''}`}
                              placeholder={`Pincode (${loc.state} only)`}
                              value={loc.pincode}
                              maxLength={6}
                              onChange={e => handleLocPincode(e.target.value, i)}
                            />
                            {locLoading === `loc_${i}` && (
                              <span className="absolute right-3 top-3">
                                <Loader2 size={14} className="animate-spin text-[#4a5838]" />
                              </span>
                            )}
                            <InputError msg={locErrors[`loc_${i}`]} />
                          </div>

                          <input
                            className={inputCls}
                            placeholder="District"
                            value={loc.district}
                            onChange={e => setLocField(i, 'district', e.target.value)}
                          />

                          <input
                            className={inputCls}
                            placeholder="City / Town *"
                            value={loc.city}
                            onChange={e => setLocField(i, 'city', e.target.value)}
                            required
                          />

                          <input
                            className={inputCls}
                            placeholder="Area / Locality"
                            value={loc.area}
                            onChange={e => setLocField(i, 'area', e.target.value)}
                          />

                          <input
                            className={`${inputCls} md:col-span-2`}
                            placeholder="Landmark (Optional)"
                            value={loc.landmark}
                            onChange={e => setLocField(i, 'landmark', e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── SECTION 6: Notes & Assignment ────────────────────────────────── */}
        {form.beneficiary && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
            <SectionHeader
              step={showBeneficiaryDetails ? 6 : 5}
              title="Internal Notes & Assignment"
              subtitle="Only visible to the team — not shared with the client"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="Notes">
                  <textarea
                    className={`${inputCls} resize-none`}
                    rows={3}
                    placeholder="Any specific requirements, urgency, or context… (Optional)"
                    value={form.notes}
                    onChange={e => set('notes', e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Assign To">
                <select className={selectCls} value={form.assignedTo} onChange={e => set('assignedTo', e.target.value)}>
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </Field>
            </div>
          </div>
        )}

        {/* ── ERROR ────────────────────────────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* ── SUBMIT ───────────────────────────────────────────────────────── */}
        {form.beneficiary && (
          <div className="flex items-center justify-end gap-3 pb-4">
            <button
              type="button"
              onClick={() => navigate('/tickets')}
              className="px-5 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-[#4a5838] hover:bg-[#3a4529] text-white rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating…
                </>
              ) : 'Create Ticket'}
            </button>
          </div>
        )}

      </form>
    </div>
  );
};

export default CreateTicket;