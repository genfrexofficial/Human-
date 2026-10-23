import React, { useState } from 'react';
import { X, Plus, Trash2, Save, Calculator, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import { payrollService } from '../../services/payrollService';

const EditPayrollSlipModal = ({ isOpen, onClose, payroll, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const [payableDays, setPayableDays] = useState(payroll?.payableDays || 0);
  const [bonuses, setBonuses] = useState(payroll?.bonuses || []);
  const [customDeductions, setCustomDeductions] = useState(payroll?.customDeductions || []);
  const [notes, setNotes] = useState(payroll?.paymentNotes || '');

  // Voucher specific customizable fields
  const [payPeriod, setPayPeriod] = useState(payroll?.payPeriod || '');
  const [engagementType, setEngagementType] = useState(payroll?.engagementType || 'Freelance – Monthly Retainer');
  const [workingMode, setWorkingMode] = useState(payroll?.workingMode || 'Remote (Freelance)');
  const [leaveDeductionNote, setLeaveDeductionNote] = useState(
    payroll?.leaveDeductionNote || (payroll?.unpaidLeaves > 0 ? `Less: Deduction for ${payroll.unpaidLeaves} Days Leave` : '')
  );
  const [paymentCycleNote, setPaymentCycleNote] = useState(
    payroll?.paymentCycleNote || 'Released after 30 days of placement as per engagement terms.'
  );

  if (!isOpen || !payroll) return null;

  // New bonus line
  const handleAddBonus = () => {
    setBonuses([...bonuses, { title: '', amount: 0 }]);
  };

  const handleUpdateBonus = (index, field, value) => {
    const updated = [...bonuses];
    updated[index][field] = field === 'amount' ? Number(value) : value;
    setBonuses(updated);
  };

  const handleRemoveBonus = (index) => {
    setBonuses(bonuses.filter((_, i) => i !== index));
  };

  // New custom deduction line
  const handleAddDeduction = () => {
    setCustomDeductions([...customDeductions, { title: '', amount: 0 }]);
  };

  const handleUpdateDeduction = (index, field, value) => {
    const updated = [...customDeductions];
    updated[index][field] = field === 'amount' ? Number(value) : value;
    setCustomDeductions(updated);
  };

  const handleRemoveDeduction = (index) => {
    setCustomDeductions(customDeductions.filter((_, i) => i !== index));
  };

  // Recalculate preview
  const days = Number(payableDays);
  const unpaid = Math.max(0, payroll.workingDays - days);
  const lop = Math.round(unpaid * (payroll.perDayRate || 0));

  const totalBonuses = bonuses.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
  const totalCustomDeductions = customDeductions.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);

  const totalDeductions = lop + (payroll.totalStandardDeductions || 0) + totalCustomDeductions;
  const netSalary = Math.max(0, Math.round(payroll.grossSalary - totalDeductions + totalBonuses));

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await payrollService.updatePayrollSlip(payroll._id, {
        payableDays: days,
        bonuses: bonuses.filter((b) => b.title.trim() && b.amount > 0),
        customDeductions: customDeductions.filter((d) => d.title.trim() && d.amount > 0),
        notes,
        payPeriod,
        engagementType,
        workingMode,
        leaveDeductionNote,
        paymentCycleNote
      });
      toast.success('Payroll voucher details updated!');
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to update slip:', err);
      toast.error(err.response?.data?.message || 'Failed to update slip.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden my-8 border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-blue-600/30 text-blue-400 rounded-lg">
              <Calculator className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-semibold text-base">Edit Payment Voucher Details</h3>
              <p className="text-xs text-slate-400">
                {payroll.user?.name} • Ref: {payroll.voucherNumber || payroll._id.slice(-8).toUpperCase()}
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

        {/* Content */}
        <form onSubmit={handleSave} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Quick Real-Time Summary Ribbon */}
          <div className="grid grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-center">
            <div>
              <span className="text-[11px] text-slate-500 uppercase">Gross Compensation</span>
              <p className="text-base font-bold text-slate-800">₹{payroll.grossSalary?.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 uppercase">Total Deductions</span>
              <p className="text-base font-bold text-rose-600">- ₹{totalDeductions.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 uppercase">Net Payable</span>
              <p className="text-base font-bold text-emerald-600">₹{netSalary.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Voucher Header Info */}
          <div className="space-y-3 pt-1">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Voucher Display Details (Matches PDF)</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Pay Period (e.g. 18 Sep 2026 – 18 Oct 2026)
                </label>
                <input
                  type="text"
                  value={payPeriod}
                  onChange={(e) => setPayPeriod(e.target.value)}
                  placeholder="e.g. 18 Sep 2026 – 18 Oct 2026"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Engagement Type
                </label>
                <input
                  type="text"
                  value={engagementType}
                  onChange={(e) => setEngagementType(e.target.value)}
                  placeholder="e.g. Freelance – Monthly Retainer"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Working Mode
                </label>
                <input
                  type="text"
                  value={workingMode}
                  onChange={(e) => setWorkingMode(e.target.value)}
                  placeholder="e.g. Remote (Freelance)"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Leave Deduction Description (Item label)
                </label>
                <input
                  type="text"
                  value={leaveDeductionNote}
                  onChange={(e) => setLeaveDeductionNote(e.target.value)}
                  placeholder="e.g. Less: Deduction for 3 Days Leave (15, 16 & 17 Oct 2026)"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-rose-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Payment Cycle Terms / Note
              </label>
              <input
                type="text"
                value={paymentCycleNote}
                onChange={(e) => setPaymentCycleNote(e.target.value)}
                placeholder="e.g. Released after 30 days of placement as per engagement terms."
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Payable Days Override */}
          <div className="pt-2 border-t border-slate-200">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
              Payable / Worked Days (Total: {payroll.workingDays} days)
            </label>
            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max={payroll.workingDays}
                  value={payableDays}
                  onChange={(e) => setPayableDays(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold"
                />
              </div>
              <div className="text-xs text-slate-500">
                Unpaid / LOP Days: <span className="font-semibold text-rose-600">{unpaid} days</span> (₹{lop.toLocaleString('en-IN')})
              </div>
            </div>
          </div>

          {/* Variable Bonuses */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Special Bonuses / Retainers
              </label>
              <button
                type="button"
                onClick={handleAddBonus}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>
            {bonuses.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No extra additions.</p>
            ) : (
              <div className="space-y-2">
                {bonuses.map((b, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Sprint Incentive, Special Retainer"
                      value={b.title}
                      onChange={(e) => handleUpdateBonus(i, 'title', e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                    <div className="relative w-32">
                      <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={b.amount}
                        onChange={(e) => handleUpdateBonus(i, 'amount', e.target.value)}
                        className="w-full pl-6 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-emerald-600"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveBonus(i)}
                      className="p-1.5 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Custom Deductions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Other Deductions / Advance
              </label>
              <button
                type="button"
                onClick={handleAddDeduction}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Deduction</span>
              </button>
            </div>
            {customDeductions.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No extra custom deductions.</p>
            ) : (
              <div className="space-y-2">
                {customDeductions.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Salary Advance, Tools Recovery"
                      value={d.title}
                      onChange={(e) => handleUpdateDeduction(i, 'title', e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                    />
                    <div className="relative w-32">
                      <span className="absolute left-2.5 top-1.5 text-xs text-slate-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={d.amount}
                        onChange={(e) => handleUpdateDeduction(i, 'amount', e.target.value)}
                        className="w-full pl-6 pr-2 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-rose-600"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveDeduction(i)}
                      className="p-1.5 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
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
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-md disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{loading ? 'Saving...' : 'Apply & Save Voucher'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditPayrollSlipModal;
