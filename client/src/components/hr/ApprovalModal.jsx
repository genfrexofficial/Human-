import React, { useState } from 'react';
import { X, CheckCircle2, AlertOctagon, ShieldCheck } from 'lucide-react';
import Button from '../common/Button';

const ApprovalModal = ({ isOpen, onClose, mode, appointment, onConfirm, loading }) => {
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !appointment) return null;

  const isApprove = mode === 'APPROVE';

  const handleAction = () => {
    setError('');
    if (!isApprove && (!comment || !comment.trim())) {
      setError('Please provide a mandatory reason for returning/rejecting this appointment letter.');
      return;
    }
    onConfirm(comment);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto sm:my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className={`p-4 sm:p-5 flex shrink-0 items-center justify-between border-b ${
          isApprove ? 'bg-emerald-50/70 border-emerald-100' : 'bg-rose-50/70 border-rose-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${
              isApprove ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}>
              {isApprove ? <CheckCircle2 className="w-5 h-5" /> : <AlertOctagon className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isApprove ? 'Approve Appointment Letter' : 'Return Letter for Revision'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Ref: {appointment.referenceNumber} • {appointment.candidateId?.name}
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

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Candidate:</span>
              <span className="font-semibold text-slate-900">{appointment.candidateId?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Position / Designation:</span>
              <span className="font-semibold text-slate-900">{appointment.designation}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Department:</span>
              <span className="font-semibold text-slate-900">{appointment.department}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Stipend / Compensation:</span>
              <span className="font-semibold text-emerald-700">
                ₹ {Number(appointment.compensation).toLocaleString('en-IN')} / {appointment.compensationFrequency}
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {isApprove ? 'Approval Comments (Optional):' : 'Revision / Rejection Reason (Mandatory):'}
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                isApprove
                  ? 'Add any administrative notes or clearance comments...'
                  : 'Describe clearly what modifications HR must make before resubmitting...'
              }
              className="w-full p-3 rounded-xl border border-slate-300 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <p className="text-[11px] text-slate-500">
            {isApprove
              ? 'Once approved, the letter will be locked and HR will be authorized to generate the official A4 PDF and dispatch it to the candidate.'
              : 'Returning the letter will notify the HR creator and allow them to revise the terms and resubmit for review.'}
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5">
          <Button variant="secondary" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={isApprove ? 'primary' : 'danger'}
            size="sm"
            onClick={handleAction}
            loading={loading}
          >
            {isApprove ? 'Confirm & Approve' : 'Return for Revision'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalModal;
