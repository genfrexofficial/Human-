import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { payrollService } from '../../services/payrollService';
import toast from 'react-hot-toast';
import {
  Banknote,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Plus,
  Play,
  Printer,
  Download,
  Edit3,
  Send,
  CheckCheck,
  CreditCard,
  Trash2,
  Users,
  Building2,
  Sparkles,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';
import PayslipModal from '../../components/payroll/PayslipModal';
import SalaryStructureModal from '../../components/payroll/SalaryStructureModal';
import EditPayrollSlipModal from '../../components/payroll/EditPayrollSlipModal';
import RecordPaymentModal from '../../components/payroll/RecordPaymentModal';

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const AdminPayroll = () => {
  const { user, isAdmin, isHR } = useAuth();

  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [activeTab, setActiveTab] = useState('payrolls'); // 'payrolls' | 'structures'
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [payrolls, setPayrolls] = useState([]);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalGross: 0,
    totalNetPayable: 0,
    totalDisbursed: 0,
    totalPending: 0,
    draftCount: 0,
    pendingApprovalCount: 0,
    approvedCount: 0,
    paidCount: 0
  });
  const [structuresList, setStructuresList] = useState([]);

  // Modals state
  const [selectedSlipForPreview, setSelectedSlipForPreview] = useState(null);
  const [selectedSlipForEdit, setSelectedSlipForEdit] = useState(null);
  const [selectedSlipForPayment, setSelectedSlipForPayment] = useState(null);
  const [selectedEmployeeForStructure, setSelectedEmployeeForStructure] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genWorkingDays, setGenWorkingDays] = useState(26);

  const fetchPayrollData = async () => {
    try {
      setLoading(true);
      const [payrollRes, statsRes] = await Promise.all([
        payrollService.getPayrolls({
          month: selectedMonth,
          year: selectedYear,
          status: statusFilter !== 'ALL' ? statusFilter : undefined
        }),
        payrollService.getPayrollStats({
          month: selectedMonth,
          year: selectedYear
        })
      ]);

      if (payrollRes.success) setPayrolls(payrollRes.data || []);
      if (statsRes.success) setStats(statsRes.stats || {});
    } catch (err) {
      console.error('Error fetching payrolls:', err);
      toast.error('Failed to load payroll records.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStructuresData = async () => {
    try {
      setLoading(true);
      const res = await payrollService.getAllSalaryStructures();
      if (res.success) setStructuresList(res.data || []);
    } catch (err) {
      console.error('Error fetching structures:', err);
      toast.error('Failed to load salary structures.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'payrolls') {
      fetchPayrollData();
    } else {
      fetchStructuresData();
    }
  }, [selectedMonth, selectedYear, statusFilter, activeTab]);

  // Handle Run Payroll Generation
  const handleGeneratePayroll = async () => {
    try {
      setGenerating(true);
      const res = await payrollService.generateMonthlyPayroll({
        month: selectedMonth,
        year: selectedYear,
        defaultWorkingDays: genWorkingDays
      });
      toast.success(res.message || 'Payroll generated successfully!');
      setShowGenerateModal(false);
      fetchPayrollData();
    } catch (err) {
      console.error('Failed to generate payroll:', err);
      toast.error(err.response?.data?.message || 'Failed to generate payroll.');
    } finally {
      setGenerating(false);
    }
  };

  // Submit for Approval (HR)
  const handleSubmitApproval = async (id) => {
    try {
      await payrollService.submitForApproval([id]);
      toast.success('Submitted for Admin approval!');
      fetchPayrollData();
    } catch (err) {
      toast.error('Failed to submit for approval.');
    }
  };

  // Approve (Admin)
  const handleApproveSlip = async (id) => {
    try {
      await payrollService.approvePayroll([id]);
      toast.success('Payroll slip approved!');
      fetchPayrollData();
    } catch (err) {
      toast.error('Failed to approve slip.');
    }
  };

  // Bulk Approve (Admin)
  const handleBulkApprove = async () => {
    const pendingIds = payrolls
      .filter((p) => p.status === 'PENDING_APPROVAL' || p.status === 'DRAFT')
      .map((p) => p._id);

    if (!pendingIds.length) {
      toast('No pending slips to approve.', { icon: 'ℹ️' });
      return;
    }

    try {
      await payrollService.approvePayroll(pendingIds);
      toast.success(`Approved ${pendingIds.length} payroll slips!`);
      fetchPayrollData();
    } catch (err) {
      toast.error('Failed to approve batch.');
    }
  };

  // Delete Draft
  const handleDeleteSlip = async (id) => {
    if (!window.confirm('Are you sure you want to delete this draft payroll record?')) return;
    try {
      await payrollService.deletePayroll(id);
      toast.success('Record deleted.');
      fetchPayrollData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete record.');
    }
  };

  // Filter records by search
  const filteredPayrolls = payrolls.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.user?.name?.toLowerCase().includes(q) ||
      p.user?.email?.toLowerCase().includes(q) ||
      p.user?.title?.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            PAID
          </span>
        );
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <CheckCheck className="w-3 h-3" />
            APPROVED
          </span>
        );
      case 'PENDING_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" />
            PENDING APPROVAL
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            DRAFT
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payroll & Salary Management</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              {isAdmin ? 'Admin Console' : 'HR Portal'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Compute attendance, adjust variable bonuses/deductions, manage approvals, and disburse payslips.
          </p>
        </div>

        {/* Month/Year Selector & Run Button */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="text-xs font-medium text-slate-700 bg-transparent border-none focus:ring-0 cursor-pointer"
            >
              {monthNames.map((m, idx) => (
                <option key={idx} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs font-medium text-slate-700 bg-transparent border-none focus:ring-0 cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setShowGenerateModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md transition-all hover:shadow-lg active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run {monthNames[selectedMonth - 1]} Payroll</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('payrolls')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'payrolls'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <Banknote className="w-4 h-4" />
          <span>Monthly Payroll Slips ({payrolls.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('structures')}
          className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold border-b-2 transition-all ${activeTab === 'structures'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
        >
          <Users className="w-4 h-4" />
          <span>Employee Salary Packages</span>
        </button>
      </div>

      {/* TAB 1: Monthly Payroll */}
      {activeTab === 'payrolls' && (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Net Payroll</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">₹{stats.totalNetPayable?.toLocaleString('en-IN')}</p>
                <span className="text-[11px] text-slate-400 mt-1 inline-block">
                  {stats.totalEmployees || 0} Employees in {monthNames[selectedMonth - 1]}
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Banknote className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Disbursed (Paid)</span>
                <p className="text-2xl font-bold text-emerald-700 mt-1">₹{stats.totalDisbursed?.toLocaleString('en-IN')}</p>
                <span className="text-[11px] text-emerald-600 mt-1 inline-block font-medium">
                  {stats.paidCount || 0} completed payouts
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-amber-600 uppercase tracking-wide">Pending Payout</span>
                <p className="text-2xl font-bold text-amber-700 mt-1">₹{stats.totalPending?.toLocaleString('en-IN')}</p>
                <span className="text-[11px] text-amber-600 mt-1 inline-block font-medium">
                  {stats.pendingApprovalCount + stats.draftCount + stats.approvedCount} uncompleted
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Workflow Status</span>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                    {stats.pendingApprovalCount} Review
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                    {stats.approvedCount} Approved
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search Employee by name / email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white cursor-pointer"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="PENDING_APPROVAL">Pending Approval</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PAID">Paid</option>
                </select>
              </div>
            </div>

            {/* Bulk actions */}
            {isAdmin && stats.pendingApprovalCount > 0 && (
              <button
                onClick={handleBulkApprove}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-sm"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Approve All Pending ({stats.pendingApprovalCount})</span>
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Base / Gross</th>
                    <th className="py-3 px-4">Attendance</th>
                    <th className="py-3 px-4">Deductions</th>
                    <th className="py-3 px-4">Net Salary</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent mb-2"></div>
                        <p>Loading payroll records...</p>
                      </td>
                    </tr>
                  ) : filteredPayrolls.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-12 text-center text-slate-400">
                        <Banknote className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                        <p className="font-semibold text-slate-600 text-sm">No payroll records for this period</p>
                        <p className="text-xs mt-1">
                          Click "Run {monthNames[selectedMonth - 1]} Payroll" to generate payslips for all active Employees.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredPayrolls.map((slip) => (
                      <tr key={slip._id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Employee */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
                              {slip.user?.name ? slip.user.name.charAt(0).toUpperCase() : 'U'}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{slip.user?.name || 'Employee'}</p>
                              <p className="text-[11px] text-slate-500">{slip.user?.title || slip.user?.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Base / Gross */}
                        <td className="py-3.5 px-4 font-mono">
                          <span className="font-semibold text-slate-800">
                            ₹{(slip.grossSalary || 0).toLocaleString('en-IN')}
                          </span>
                          <p className="text-[10px] text-slate-400">Base: ₹{(slip.baseSalary || 0).toLocaleString('en-IN')}</p>
                        </td>

                        {/* Attendance */}
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-emerald-700">
                            {slip.payableDays} / {slip.workingDays}
                          </span>
                          <span className="text-[11px] text-slate-500"> days</span>
                          {slip.unpaidLeaves > 0 && (
                            <p className="text-[10px] text-rose-600 font-medium">LOP: {slip.unpaidLeaves}d</p>
                          )}
                        </td>

                        {/* Deductions */}
                        <td className="py-3.5 px-4 text-rose-600 font-mono">
                          - ₹{(slip.totalDeductions || 0).toLocaleString('en-IN')}
                          {slip.totalBonuses > 0 && (
                            <p className="text-[10px] text-emerald-600 font-medium">
                              +₹{slip.totalBonuses.toLocaleString('en-IN')} bonus
                            </p>
                          )}
                        </td>

                        {/* Net Salary */}
                        <td className="py-3.5 px-4">
                          <span className="text-sm font-extrabold text-slate-900 font-mono">
                            ₹{(slip.netSalary || 0).toLocaleString('en-IN')}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">{getStatusBadge(slip.status)}</td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Preview & Print */}
                            <button
                              onClick={() => setSelectedSlipForPreview(slip)}
                              title="View & Print Voucher"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Printer className="w-4 h-4" />
                            </button>

                            {/* Download Official PDF */}
                            <button
                              onClick={async () => {
                                try {
                                  const safeRef = (slip.voucherNumber || slip._id).replace(/[^a-zA-Z0-9_-]/g, '_');
                                  await payrollService.downloadPayslipPDF(slip._id, `GENFREX_Voucher_${safeRef}.pdf`);
                                  toast.success('Downloaded payment voucher PDF!');
                                } catch {
                                  setSelectedSlipForPreview(slip);
                                }
                              }}
                              title="Download PDF Voucher"
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Download className="w-4 h-4" />
                            </button>

                            {/* Edit Slip (if not paid) */}
                            {slip.status !== 'PAID' && (
                              <button
                                onClick={() => setSelectedSlipForEdit(slip)}
                                title="Adjust bonus/deduction"
                                className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}

                            {/* HR: Submit for Approval */}
                            {slip.status === 'DRAFT' && isHR && (
                              <button
                                onClick={() => handleSubmitApproval(slip._id)}
                                title="Submit for Admin approval"
                                className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
                              >
                                <Send className="w-4 h-4" />
                              </button>
                            )}

                            {/* Admin: Approve */}
                            {isAdmin && (slip.status === 'PENDING_APPROVAL' || slip.status === 'DRAFT') && (
                              <button
                                onClick={() => handleApproveSlip(slip._id)}
                                title="Approve slip"
                                className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                              >
                                <CheckCheck className="w-4 h-4" />
                              </button>
                            )}

                            {/* Mark as Paid (Admin or HR once approved) */}
                            {slip.status !== 'PAID' && (
                              <button
                                onClick={() => setSelectedSlipForPayment(slip)}
                                title="Record Disbursement / Mark Paid"
                                className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors border border-emerald-200"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Pay</span>
                              </button>
                            )}

                            {/* Delete Draft */}
                            {slip.status === 'DRAFT' && (
                              <button
                                onClick={() => handleDeleteSlip(slip._id)}
                                title="Delete draft"
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Employee Salary Packages */}
      {activeTab === 'structures' && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <div>
                <h4 className="text-sm font-semibold text-blue-900">Configured Compensation Architecture</h4>
                <p className="text-xs text-blue-700">
                  Define baseline salary, standard allowances (HRA/Medical), statutory deductions (PF/PT), and bank details for each Employee.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Base Salary</th>
                  <th className="py-3 px-4">Fixed Allowances</th>
                  <th className="py-3 px-4">Bank Account</th>
                  <th className="py-3 px-4">Package Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {structuresList.map((item) => {
                  const struct = item.salaryStructure;
                  const hasBank = struct?.bankDetails?.accountNumber;
                  const totalAllowances = struct
                    ? (struct.allowances?.hra || 0) +
                    (struct.allowances?.conveyance || 0) +
                    (struct.allowances?.specialAllowance || 0) +
                    (struct.allowances?.medicalAllowance || 0)
                    : 0;

                  return (
                    <tr key={item.Employee._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                            {item.Employee.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{item.Employee.name}</p>
                            <p className="text-[11px] text-slate-500">{item.Employee.title || item.Employee.email}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-800">
                        {struct ? `₹${struct.baseSalary.toLocaleString('en-IN')}` : (
                          <span className="text-slate-400 italic">
                            Suggested: ₹{(item.suggestedBaseSalary || 25000).toLocaleString('en-IN')}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-700">
                        {struct ? `+ ₹${totalAllowances.toLocaleString('en-IN')}` : '—'}
                      </td>

                      <td className="py-3.5 px-4">
                        {hasBank ? (
                          <div>
                            <p className="font-medium text-slate-800">{struct.bankDetails.bankName}</p>
                            <p className="font-mono text-[11px] text-slate-500">
                              A/C: {struct.bankDetails.accountNumber}
                            </p>
                          </div>
                        ) : (
                          <span className="text-amber-600 text-[11px] font-medium">Pending Bank Info</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {struct ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Configured
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Auto-Draft
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setSelectedEmployeeForStructure(item.Employee)}
                          className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
                        >
                          Configure Package
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Generate Payroll Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 mb-4">
              <span className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                <Play className="w-5 h-5 fill-current" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">Run Monthly Payroll Batch</h3>
                <p className="text-xs text-slate-500">
                  {monthNames[selectedMonth - 1]} {selectedYear} Cycle
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              This will automatically scan all active Employees, sync their attendance and approved leaves for {monthNames[selectedMonth - 1]} {selectedYear}, apply base salaries, calculate LOP deductions, and generate editable draft payslips.
            </p>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Standard Working Days in Cycle:
              </label>
              <input
                type="number"
                min="20"
                max="31"
                value={genWorkingDays}
                onChange={(e) => setGenWorkingDays(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowGenerateModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleGeneratePayroll}
                disabled={generating}
                className="flex items-center gap-2 px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow-md transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{generating ? 'Calculating...' : 'Confirm & Generate'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payslip Modal */}
      <PayslipModal
        isOpen={Boolean(selectedSlipForPreview)}
        onClose={() => setSelectedSlipForPreview(null)}
        payroll={selectedSlipForPreview}
      />

      {/* Salary Structure Modal */}
      <SalaryStructureModal
        isOpen={Boolean(selectedEmployeeForStructure)}
        onClose={() => setSelectedEmployeeForStructure(null)}
        Employee={selectedEmployeeForStructure}
        onSaved={fetchStructuresData}
      />

      {/* Edit Payroll Slip Modal */}
      <EditPayrollSlipModal
        isOpen={Boolean(selectedSlipForEdit)}
        onClose={() => setSelectedSlipForEdit(null)}
        payroll={selectedSlipForEdit}
        onSaved={fetchPayrollData}
      />

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={Boolean(selectedSlipForPayment)}
        onClose={() => setSelectedSlipForPayment(null)}
        payroll={selectedSlipForPayment}
        onPaid={fetchPayrollData}
      />
    </div>
  );
};

export default AdminPayroll;
