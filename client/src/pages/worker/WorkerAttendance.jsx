import React, { useState, useEffect } from 'react';
import { attendanceService } from '../../services/attendanceService';
import { leaveService } from '../../services/leaveService';
import toast from 'react-hot-toast';
import {
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Send,
  UserCheck,
  CalendarCheck,
  TrendingUp,
  LogIn,
  LogOut
} from 'lucide-react';

const WorkerAttendance = () => {
  const [loading, setLoading] = useState(true);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [summary, setSummary] = useState({ presentDays: 0, totalHours: 0 });
  const [leaves, setLeaves] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState({ casual: 12, sick: 8, paid: 10 });
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'leaves'

  // Apply Leave Modal
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'CASUAL',
    startDate: '',
    endDate: '',
    reason: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [attRes, leaveRes] = await Promise.all([
        attendanceService.getMyAttendance(),
        leaveService.getMyLeaves()
      ]);

      if (attRes.success) {
        setAttendanceRecords(attRes.records || []);
        setSummary(attRes.summary || { presentDays: 0, totalHours: 0 });
      }

      if (leaveRes.success) {
        setLeaves(leaveRes.leaves || []);
        if (leaveRes.balance) setLeaveBalance(leaveRes.balance);
      }
    } catch (err) {
      toast.error('Failed to load attendance & leave records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    if (!leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason.trim()) {
      return toast.error('Please fill all required fields.');
    }

    try {
      setSubmittingLeave(true);
      const res = await leaveService.applyLeave(leaveForm);
      if (res.success) {
        toast.success('Leave applied successfully. Awaiting HR approval.');
        setShowLeaveModal(false);
        setLeaveForm({ leaveType: 'CASUAL', startDate: '', endDate: '', reason: '' });
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit leave request.');
    } finally {
      setSubmittingLeave(false);
    }
  };

  const handleCancelLeave = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this pending leave?')) return;
    try {
      const res = await leaveService.cancelLeave(id);
      if (res.success) {
        toast.success('Leave request cancelled.');
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to cancel leave.');
    }
  };

  const todayRecord = attendanceRecords.find(
    (r) => r.date === new Date().toISOString().split('T')[0]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            My Attendance & Leaves
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated session tracking on login/logout and formal leave requests.
          </p>
        </div>

        <button
          onClick={() => setShowLeaveModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Apply for Leave
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Login Status */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Today's Session</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <LogIn className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-lg font-bold text-slate-900">
              {todayRecord ? (
                <span className="text-emerald-600 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Present
                </span>
              ) : (
                <span className="text-slate-400">Not Logged Yet</span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {todayRecord?.firstLogin
                ? `Logged in at: ${new Date(todayRecord.firstLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                : 'Session records upon login'}
            </p>
          </div>
        </div>

        {/* Total Working Hours */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Work Hours</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{summary.totalHours} hrs</div>
            <p className="text-[11px] text-slate-400 mt-1">Logged across this period</p>
          </div>
        </div>

        {/* Days Present */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Days Present</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <UserCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{summary.presentDays} days</div>
            <p className="text-[11px] text-slate-400 mt-1">Recorded calendar check-ins</p>
          </div>
        </div>

        {/* Available Casual Leave */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Leave Balance</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <CalendarCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {leaveBalance.casual + leaveBalance.sick} days
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              CL: {leaveBalance.casual} | SL: {leaveBalance.sick} | PL: {leaveBalance.paid}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('attendance')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition ${
            activeTab === 'attendance'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Attendance History
        </button>
        <button
          onClick={() => setActiveTab('leaves')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition ${
            activeTab === 'leaves'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Leave Applications ({leaves.length})
        </button>
      </div>

      {/* Tab 1: Attendance Table */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Daily Attendance Log
            </h2>
            <span className="text-[11px] text-slate-400">
              Automatically captures login & logout timestamps
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[550px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">First Login</th>
                  <th className="py-3 px-4">Last Logout</th>
                  <th className="py-3 px-4">Total Active Hours</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceRecords.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-slate-400">
                      No attendance records found yet.
                    </td>
                  </tr>
                ) : (
                  attendanceRecords.map((record) => (
                    <tr key={record._id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">{record.date}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {record.firstLogin
                          ? new Date(record.firstLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {record.lastLogout
                          ? new Date(record.lastLogout).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : record.date === new Date().toISOString().split('T')[0]
                          ? <span className="text-emerald-600 font-medium">Session Active</span>
                          : 'Auto-closed'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {record.totalHours} hrs
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            record.status === 'PRESENT'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : record.status === 'HALF_DAY'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : record.status === 'ON_LEAVE'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Leaves Table */}
      {activeTab === 'leaves' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Leave Requests & History
            </h2>
            <button
              onClick={() => setShowLeaveModal(true)}
              className="text-xs text-blue-600 font-semibold hover:underline"
            >
              + Apply New
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[650px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Start Date</th>
                  <th className="py-3 px-4">End Date</th>
                  <th className="py-3 px-4">Days</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-slate-400">
                      No leave requests submitted yet.
                    </td>
                  </tr>
                ) : (
                  leaves.map((leave) => (
                    <tr key={leave._id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">{leave.leaveType}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(leave.startDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(leave.endDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{leave.totalDays}</td>
                      <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate" title={leave.reason}>
                        {leave.reason}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            leave.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : leave.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {leave.status}
                        </span>
                        {leave.reviewNote && (
                          <p className="text-[10px] text-slate-400 mt-0.5 italic">"{leave.reviewNote}"</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {leave.status === 'PENDING' && (
                          <button
                            onClick={() => handleCancelLeave(leave._id)}
                            className="text-rose-600 hover:text-rose-800 font-semibold text-[11px]"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md my-4 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" /> Apply for Leave
              </h3>
              <button
                onClick={() => setShowLeaveModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyLeave} className="p-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Leave Type</label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                >
                  <option value="CASUAL">Casual Leave (CL)</option>
                  <option value="SICK">Sick Leave (SL)</option>
                  <option value="PAID">Paid Leave (PL)</option>
                  <option value="UNPAID">Leave Without Pay (LWP)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Leave</label>
                <textarea
                  required
                  rows="3"
                  placeholder="Provide brief context for HR approval..."
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLeaveModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLeave}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50"
                >
                  {submittingLeave ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkerAttendance;
