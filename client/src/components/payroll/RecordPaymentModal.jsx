import React, { useState } from 'react';
import { X, CheckCircle2, CreditCard, Landmark, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { payrollService } from '../../services/payrollService';

const RecordPaymentModal = ({ isOpen, onClose, payroll, onPaid }) => {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentNotes, setPaymentNotes] = useState('');

  if (!isOpen || !payroll) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await payrollService.recordPayment(payroll._id, {
        paymentMethod,
        paymentReference,
        paymentDate,
        paymentNotes
      });
      toast.success(`Salary marked as PAID for ${payroll.user?.name}!`);
      if (onPaid) onPaid();
      onClose();
    } catch (err) {
      console.error('Failed to record payment:', err);
      toast.error(err.response?.data?.message || 'Failed to record payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden my-8 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-semibold text-base">Record Salary Disbursement</h3>
              <p className="text-xs text-slate-400">
                {payroll.user?.name} • Net Pay: ₹{payroll.netSalary?.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs text-emerald-700 font-medium uppercase">Net Take-Home Amount</span>
              <p className="text-2xl font-extrabold text-emerald-900">₹{payroll.netSalary?.toLocaleString('en-IN')}</p>
            </div>
            <div className="text-right text-xs text-emerald-800">
              <p className="font-medium">Bank: {payroll.bankDetails?.bankName || 'HDFC Bank'}</p>
              <p className="font-mono text-[11px] text-emerald-700">A/C: {payroll.bankDetails?.accountNumber || 'N/A'}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method *</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-emerald-500"
            >
              <option value="BANK_TRANSFER">Bank Direct Transfer / IMPS</option>
              <option value="NEFT_RTGS">NEFT / RTGS</option>
              <option value="UPI">UPI Transfer</option>
              <option value="CHEQUE">Company Cheque</option>
              <option value="CASH">Cash Disbursement</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Transaction Reference / UTR Number
            </label>
            <input
              type="text"
              placeholder="e.g. UTR49281729183 or Cheque #10294"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Disbursement Date *</label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks / Note (Optional)</label>
            <input
              type="text"
              placeholder="e.g. Cleared via corporate netbanking"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-md disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{loading ? 'Confirming...' : 'Mark as PAID'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordPaymentModal;
