import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { payrollService } from '../../services/payrollService';
import toast from 'react-hot-toast';
import {
  Banknote,
  Calendar,
  CreditCard,
  Landmark,
  CheckCircle2,
  Printer,
  Download,
  FileText,
  Clock,
  Sparkles,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import PayslipModal from '../../components/payroll/PayslipModal';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WorkerPayroll = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [payrolls, setPayrolls] = useState([]);
  const [myStructure, setMyStructure] = useState(null);
  const [selectedSlip, setSelectedSlip] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [slipsRes, structRes] = await Promise.all([
        payrollService.getMyPayrolls(),
        payrollService.getMySalaryStructure()
      ]);

      if (slipsRes.success) setPayrolls(slipsRes.data || []);
      if (structRes.success) setMyStructure(structRes.data || null);
    } catch (err) {
      console.error('Failed to load payslips:', err);
      toast.error('Failed to load your payslips.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalEarned = payrolls
    .filter((p) => p.status === 'PAID')
    .reduce((acc, p) => acc + (p.netSalary || 0), 0);

  const latestSlip = payrolls.length > 0 ? payrolls[0] : null;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider inline-block mb-3">
              Self-Service Employee Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              My Compensation & Payslips
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
              Access your monthly salary breakdowns, tax withholdings, attendance metrics, and official company payslip documents.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-5 py-4 rounded-2xl border border-white/10">
            <div>
              <span className="text-[11px] text-blue-200 uppercase font-medium">Disbursed Take-Home</span>
              <p className="text-2xl sm:text-3xl font-extrabold text-white mt-0.5">
                ₹{totalEarned.toLocaleString('en-IN')}
              </p>
              <span className="text-[10px] text-slate-300">Across {payrolls.length} statement cycles</span>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 text-blue-300 flex items-center justify-center">
              <Banknote className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Latest Disbursal Card */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                Latest Salary Statement
              </span>
              {latestSlip && (
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800">
                  {latestSlip.status}
                </span>
              )}
            </div>
            {latestSlip ? (
              <div>
                <p className="text-xs text-slate-500">
                  Cycle: {monthNames[latestSlip.month - 1]} {latestSlip.year}
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-extrabold text-slate-900 font-mono">
                    ₹{latestSlip.netSalary?.toLocaleString('en-IN')}
                  </span>
                  <span className="text-xs text-slate-400">Net Take-Home</span>
                </div>
                {latestSlip.paymentReference && (
                  <p className="text-xs font-mono text-slate-500 mt-2">
                    UTR / Ref: {latestSlip.paymentReference}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No salary statement issued yet.</p>
            )}
          </div>

          {latestSlip && (
            <div className="pt-4 mt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedSlip(latestSlip)}
                className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                <span>View Full Statement</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Bank & Structure Details */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-slate-400" />
                <span>Primary Settlement Account</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified
              </span>
            </div>
            {myStructure?.bankDetails?.accountNumber ? (
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Bank Name</span>
                  <span className="font-semibold text-slate-800">{myStructure.bankDetails.bankName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Account Number</span>
                  <span className="font-mono text-slate-800">
                    •••• •••• {myStructure.bankDetails.accountNumber.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">IFSC Code</span>
                  <span className="font-mono text-slate-800">{myStructure.bankDetails.ifscCode}</span>
                </div>
                {myStructure.bankDetails.panNumber && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">PAN ID</span>
                    <span className="font-mono text-slate-800">{myStructure.bankDetails.panNumber}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Bank settlement account is being processed by HR team.
              </p>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-4 pt-3 border-t border-slate-100">
            For account changes or tax declarations, please submit a request to the HR desk.
          </p>
        </div>
      </div>

      {/* Monthly Payslips History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-sm text-slate-900">Payslip History & Tax Statements</h3>
          </div>
          <span className="text-xs text-slate-500">{payrolls.length} statements available</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3 px-4">Pay Period</th>
                <th className="py-3 px-4">Gross Earnings</th>
                <th className="py-3 px-4">Attendance / Worked</th>
                <th className="py-3 px-4">Deductions</th>
                <th className="py-3 px-4">Net Disbursed</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2"></div>
                    <p>Loading your payslips...</p>
                  </td>
                </tr>
              ) : payrolls.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <Banknote className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600 text-sm">No payslips issued yet</p>
                    <p className="text-xs mt-1 text-slate-400">
                      When your monthly payroll is approved and released by HR, your payslip will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                payrolls.map((slip) => (
                  <tr key={slip._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-900">
                        {monthNames[slip.month - 1]} {slip.year}
                      </span>
                      <p className="text-[10px] text-slate-400">Cycle: {slip.payrollCycle}</p>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                      ₹{(slip.grossSalary || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-medium text-emerald-700">
                        {slip.payableDays} / {slip.workingDays} days
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-rose-600 font-mono">
                      - ₹{(slip.totalDeductions || 0).toLocaleString('en-IN')}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="font-bold text-slate-900 font-mono text-sm">
                        ₹{(slip.netSalary || 0).toLocaleString('en-IN')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          slip.status === 'PAID'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        {slip.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedSlip(slip)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>View Voucher</span>
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              const safeRef = (slip.voucherNumber || slip._id).replace(/[^a-zA-Z0-9_-]/g, '_');
                              await payrollService.downloadPayslipPDF(slip._id, `GENFREX_Voucher_${safeRef}.pdf`);
                              toast.success('Downloaded voucher PDF!');
                            } catch {
                              setSelectedSlip(slip);
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Payslip Modal */}
      <PayslipModal
        isOpen={Boolean(selectedSlip)}
        onClose={() => setSelectedSlip(null)}
        payroll={selectedSlip}
      />
    </div>
  );
};

export default WorkerPayroll;
