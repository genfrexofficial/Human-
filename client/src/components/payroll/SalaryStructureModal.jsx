import React, { useState, useEffect } from 'react';
import { X, Save, IndianRupee, Landmark, ShieldAlert, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { payrollService } from '../../services/payrollService';

const SalaryStructureModal = ({ isOpen, onClose, worker, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    salaryType: 'MONTHLY',
    engagementType: 'Freelance – Monthly Retainer',
    workingMode: 'Remote (Freelance)',
    paymentCycleNote: 'Released after 30 days of placement as per engagement terms.',
    dateOfJoining: new Date().toISOString().split('T')[0],
    baseSalary: 25000,
    allowances: {
      hra: 10000,
      conveyance: 1600,
      specialAllowance: 0,
      medicalAllowance: 1250,
      otherAllowance: 0
    },
    deductions: {
      pf: 1800,
      professionalTax: 200,
      tds: 0,
      esi: 0,
      otherDeduction: 0
    },
    bankDetails: {
      accountHolderName: '',
      accountNumber: '',
      bankName: '',
      ifscCode: '',
      panNumber: '',
      upiId: ''
    },
    notes: ''
  });

  useEffect(() => {
    if (worker) {
      loadStructure();
    }
  }, [worker]);

  const loadStructure = async () => {
    try {
      setLoading(true);
      const res = await payrollService.getSalaryStructureByUser(worker._id);
      if (res.data) {
        setFormData({
          salaryType: res.data.salaryType || 'MONTHLY',
          engagementType: res.data.engagementType || 'Freelance – Monthly Retainer',
          workingMode: res.data.workingMode || 'Remote (Freelance)',
          paymentCycleNote: res.data.paymentCycleNote || 'Released after 30 days of placement as per engagement terms.',
          dateOfJoining: res.data.dateOfJoining ? new Date(res.data.dateOfJoining).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          baseSalary: res.data.baseSalary || 0,
          allowances: {
            hra: res.data.allowances?.hra || 0,
            conveyance: res.data.allowances?.conveyance || 0,
            specialAllowance: res.data.allowances?.specialAllowance || 0,
            medicalAllowance: res.data.allowances?.medicalAllowance || 0,
            otherAllowance: res.data.allowances?.otherAllowance || 0
          },
          deductions: {
            pf: res.data.deductions?.pf || 0,
            professionalTax: res.data.deductions?.professionalTax || 0,
            tds: res.data.deductions?.tds || 0,
            esi: res.data.deductions?.esi || 0,
            otherDeduction: res.data.deductions?.otherDeduction || 0
          },
          bankDetails: {
            accountHolderName: res.data.bankDetails?.accountHolderName || worker.name,
            accountNumber: res.data.bankDetails?.accountNumber || '',
            bankName: res.data.bankDetails?.bankName || '',
            ifscCode: res.data.bankDetails?.ifscCode || '',
            panNumber: res.data.bankDetails?.panNumber || '',
            upiId: res.data.bankDetails?.upiId || ''
          },
          notes: res.data.notes || ''
        });
      } else {
        // Suggested initial values if unconfigured
        const suggestedBase = res.suggestedBaseSalary || 25000;
        setFormData((prev) => ({
          ...prev,
          baseSalary: suggestedBase,
          allowances: {
            ...prev.allowances,
            hra: Math.round(suggestedBase * 0.4)
          },
          deductions: {
            ...prev.deductions,
            pf: Math.round(suggestedBase * 0.12)
          },
          bankDetails: {
            ...prev.bankDetails,
            accountHolderName: worker.name
          }
        }));
      }
    } catch (err) {
      console.error('Error loading salary structure:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !worker) return null;

  // Real-time calculations
  const base = Number(formData.baseSalary) || 0;
  const allowancesTotal =
    (Number(formData.allowances.hra) || 0) +
    (Number(formData.allowances.conveyance) || 0) +
    (Number(formData.allowances.specialAllowance) || 0) +
    (Number(formData.allowances.medicalAllowance) || 0) +
    (Number(formData.allowances.otherAllowance) || 0);

  const gross = base + allowancesTotal;

  const deductionsTotal =
    (Number(formData.deductions.pf) || 0) +
    (Number(formData.deductions.professionalTax) || 0) +
    (Number(formData.deductions.tds) || 0) +
    (Number(formData.deductions.esi) || 0) +
    (Number(formData.deductions.otherDeduction) || 0);

  const estimatedNet = Math.max(0, gross - deductionsTotal);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await payrollService.upsertSalaryStructure(worker._id, formData);
      toast.success(`Salary structure updated for ${worker.name}!`);
      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Failed to save salary structure:', err);
      toast.error(err.response?.data?.message || 'Failed to update salary package.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-fill standard Indian corporate breakdown
  const handleAutoFillBreakdown = () => {
    const b = Number(formData.baseSalary) || 25000;
    setFormData((prev) => ({
      ...prev,
      allowances: {
        hra: Math.round(b * 0.4),
        conveyance: 1600,
        specialAllowance: Math.round(b * 0.1),
        medicalAllowance: 1250,
        otherAllowance: 0
      },
      deductions: {
        pf: Math.min(1800, Math.round(b * 0.12)),
        professionalTax: 200,
        tds: 0,
        esi: 0,
        otherDeduction: 0
      }
    }));
    toast.success('Applied standard CTC breakdown percentages!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden my-8 border border-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/30 text-blue-400 flex items-center justify-center font-bold text-lg">
              ₹
            </div>
            <div>
              <h3 className="font-semibold text-base">Configure Compensation & Bank</h3>
              <p className="text-xs text-slate-400">
                {worker.name} • {worker.title || 'Worker'} • {worker.email}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Quick Real-Time Summary Ribbon */}
          <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Gross Salary</span>
              <p className="text-lg font-bold text-slate-900">₹{gross.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Total Deductions</span>
              <p className="text-lg font-bold text-rose-600">- ₹{deductionsTotal.toLocaleString('en-IN')}</p>
            </div>
            <div>
              <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">Estimated Take-Home</span>
              <p className="text-lg font-bold text-emerald-600">₹{estimatedNet.toLocaleString('en-IN')}</p>
            </div>
          </div>

          {/* Base Salary & Frequency */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                1. Base / Core Pay
              </label>
              <button
                type="button"
                onClick={handleAutoFillBreakdown}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Calculate Standard Allowances & PF</span>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Base Salary (₹ / month) *</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 text-sm">₹</span>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.baseSalary}
                    onChange={(e) => setFormData({ ...formData, baseSalary: Number(e.target.value) })}
                    className="w-full pl-8 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 font-semibold"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Compensation Type</label>
                <select
                  value={formData.salaryType}
                  onChange={(e) => setFormData({ ...formData, salaryType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="MONTHLY">Monthly Fixed Salary</option>
                  <option value="STIPEND">Intern / Trainee Stipend</option>
                  <option value="HOURLY">Hourly Contractor Rate</option>
                </select>
              </div>
            </div>

            {/* Voucher Metadata Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-100">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Engagement Type</label>
                <input
                  type="text"
                  value={formData.engagementType}
                  onChange={(e) => setFormData({ ...formData, engagementType: e.target.value })}
                  placeholder="e.g. Freelance – Monthly Retainer"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Working Mode</label>
                <input
                  type="text"
                  value={formData.workingMode}
                  onChange={(e) => setFormData({ ...formData, workingMode: e.target.value })}
                  placeholder="e.g. Remote (Freelance)"
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">Date of Joining</label>
                <input
                  type="date"
                  value={formData.dateOfJoining}
                  onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Monthly Allowances */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              2. Fixed Allowances (Earnings)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">House Rent (HRA)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.allowances.hra}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      allowances: { ...formData.allowances, hra: Number(e.target.value) }
                    })
                  }
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Conveyance</label>
                <input
                  type="number"
                  min="0"
                  value={formData.allowances.conveyance}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      allowances: { ...formData.allowances, conveyance: Number(e.target.value) }
                    })
                  }
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Special Allowance</label>
                <input
                  type="number"
                  min="0"
                  value={formData.allowances.specialAllowance}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      allowances: { ...formData.allowances, specialAllowance: Number(e.target.value) }
                    })
                  }
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Medical Allowance</label>
                <input
                  type="number"
                  min="0"
                  value={formData.allowances.medicalAllowance}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      allowances: { ...formData.allowances, medicalAllowance: Number(e.target.value) }
                    })
                  }
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Statutory Deductions */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
              3. Standard Deductions (Taxes & PF)
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Employee PF (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.deductions.pf}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deductions: { ...formData.deductions, pf: Number(e.target.value) }
                    })
                  }
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Professional Tax (PT)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.deductions.professionalTax}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deductions: { ...formData.deductions, professionalTax: Number(e.target.value) }
                    })
                  }
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">TDS / Income Tax</label>
                <input
                  type="number"
                  min="0"
                  value={formData.deductions.tds}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      deductions: { ...formData.deductions, tds: Number(e.target.value) }
                    })
                  }
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Bank Account Details */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Landmark className="w-4 h-4 text-slate-500" />
              <span>4. Bank Account & Settlement Details</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Account Holder Name</label>
                <input
                  type="text"
                  value={formData.bankDetails.accountHolderName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankDetails: { ...formData.bankDetails, accountHolderName: e.target.value }
                    })
                  }
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Bank Name</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC Bank, ICICI Bank"
                  value={formData.bankDetails.bankName}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankDetails: { ...formData.bankDetails, bankName: e.target.value }
                    })
                  }
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Account Number</label>
                <input
                  type="text"
                  placeholder="12-16 digit Account Number"
                  value={formData.bankDetails.accountNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankDetails: { ...formData.bankDetails, accountNumber: e.target.value }
                    })
                  }
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">IFSC Code</label>
                <input
                  type="text"
                  placeholder="e.g. HDFC0001234"
                  value={formData.bankDetails.ifscCode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankDetails: { ...formData.bankDetails, ifscCode: e.target.value.toUpperCase() }
                    })
                  }
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">PAN Card Number</label>
                <input
                  type="text"
                  placeholder="e.g. ABCDE1234F"
                  value={formData.bankDetails.panNumber}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankDetails: { ...formData.bankDetails, panNumber: e.target.value.toUpperCase() }
                    })
                  }
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono uppercase"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">UPI ID (Optional)</label>
                <input
                  type="text"
                  placeholder="name@okhdfcbank"
                  value={formData.bankDetails.upiId}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      bankDetails: { ...formData.bankDetails, upiId: e.target.value }
                    })
                  }
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
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
              <span>{loading ? 'Saving Package...' : 'Save Compensation Package'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SalaryStructureModal;
