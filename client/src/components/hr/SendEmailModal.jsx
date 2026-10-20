import React, { useState } from 'react';
import { X, Send, Mail, FileText, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import Button from '../common/Button';

const SendEmailModal = ({ isOpen, onClose, appointment, onSend, loading }) => {
  const [confirmResend, setConfirmResend] = useState(false);

  if (!isOpen || !appointment) return null;

  const candidate = appointment.candidateId || {};
  const isAlreadySent = appointment.status === 'SENT';

  const handleSend = () => {
    onSend(confirmResend);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto sm:my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 flex shrink-0 items-center justify-between border-b bg-blue-50/60 border-blue-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isAlreadySent ? 'Resend Appointment Letter' : 'Send Appointment Letter'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Official communication via genfrexofficial@gmail.com
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
          {isAlreadySent && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 space-y-2">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Letter Already Sent</span>
              </div>
              <p className="text-[11px] text-amber-700">
                This letter was already sent on {new Date(appointment.sentAt).toLocaleString()}. To avoid duplicate notifications, please confirm that you intend to resend.
              </p>
              <label className="flex items-center gap-2 font-semibold text-slate-900 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={confirmResend}
                  onChange={(e) => setConfirmResend(e.target.checked)}
                  className="rounded border-amber-300 text-blue-600 focus:ring-0"
                />
                <span>Confirm re-dispatching official letter to candidate</span>
              </label>
            </div>
          )}

          {/* Details Card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-500">Official Sender:</span>
              <span className="font-bold text-slate-900">genfrexofficial@gmail.com</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Recipient Candidate:</span>
              <span className="font-bold text-slate-900">{candidate.name || 'Candidate'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Recipient Email:</span>
              <span className="font-semibold text-blue-600">{candidate.email || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Appointment Reference:</span>
              <span className="font-bold text-slate-800">{appointment.referenceNumber}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Position / Designation:</span>
              <span className="font-semibold text-slate-900">{appointment.designation}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-slate-500">PDF Attachment:</span>
              <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <FileText className="w-3.5 h-3.5" />
                <span>GENFREX_Appointment_{appointment.referenceNumber?.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-[11px] text-blue-700">
            <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
            <span>
              The candidate will receive the approved terms and signed Trainee Appointment Letter with instructions to review and acknowledge receipt before the deadline.
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSend}
            loading={loading}
            disabled={isAlreadySent && !confirmResend}
          >
            <Send className="w-3.5 h-3.5 mr-1" />
            <span>{isAlreadySent ? 'Resend Letter' : 'Send Letter to Candidate'}</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SendEmailModal;
