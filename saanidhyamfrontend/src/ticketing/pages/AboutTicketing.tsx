import React from 'react';
import { Card } from '../components/Card';
import { Ticket, Users, CheckCircle, Clock } from 'lucide-react';

export const AboutTicketing: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900 mb-4">About Saanidhyam Ticketing</h1>
        <p className="text-slate-500 text-lg">A centralized system to manage elder care requests efficiently.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Ticket size={24} /></div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Ticket Management</h3>
                    <p className="text-sm text-slate-600">Create, track, and manage support requests for clients. Assign statuses like 'New', 'In Progress', or 'Closed' to keep the workflow organized.</p>
                </div>
            </div>
        </Card>

        <Card className="p-6">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Users size={24} /></div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Care Manager Assignment</h3>
                    <p className="text-sm text-slate-600">Assign specific tickets to staff members. This ensures accountability and that every senior gets dedicated attention.</p>
                </div>
            </div>
        </Card>

        <Card className="p-6">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle size={24} /></div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Payment Verification</h3>
                    <p className="text-sm text-slate-600">Track payment statuses. Admins can verify payments and mark tickets as 'Paid', unlocking further services for the client.</p>
                </div>
            </div>
        </Card>

        <Card className="p-6">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Clock size={24} /></div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Audit Trail</h3>
                    <p className="text-sm text-slate-600">Every action is logged. From status changes to notes, the system keeps a complete history of the interaction for future reference.</p>
                </div>
            </div>
        </Card>
      </div>
    </div>
  );
};