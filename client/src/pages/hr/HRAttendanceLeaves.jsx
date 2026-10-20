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
  UserCheck,
  Users,
  Search,
  Filter,
  Check,
  X,
  FileSpreadsheet
} from 'lucide-react';

const HRAttendanceLeaves = () => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'leaves'
  const [todaySummary, setTodaySummary] = useState({
    totalEmployees: 0,
    presentCount: 0,
    currentlyActive: 0
  });
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedLeaveStatus, setSelectedLeaveStatus] = useState('');

  // Review Modal
  const [reviewModalData, setReviewModalData] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sumRes, attRes, leavesRes] = await Promise.all([
        attendanceService.getTodaySummary(),
        attendanceService.getAllAttendance({ date: selectedDate }),
        leaveService.getAllLeaves(selectedLeaveStatus)
      ]);

      if (sumRes.success) setTodaySummary(sumRes);
      if (attRes.success) setAttendanceRecords(attRes.records || []);
      if (leavesRes.success) setLeaveRequests(leavesRes.leaves || []);
    } catch (err) {
      toast.error('Failed to load attendance and leave data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate, selectedLeaveStatus]);

  const handleReviewAction = async (status) => {
    if (!reviewModalData) return;
    try {
      setSubmittingReview(true);
      const res = await leaveService.updateLeaveStatus(reviewModalData._id, status, reviewNote);
      if (res.success) {
        toast.success(`Leave request ${status.toLowerCase()} successfully.`);
        setReviewModalData(null);
        setReviewNote('');
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update leave request.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const pendingLeavesCount = leaveRequests.filter((l) => l.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Attendance & Leave Operations
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time automated login/logout audit trail & employee leave approvals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-xs font-medium rounded-xl border border-slate-300 px-3 py-2 text-slate-700 focus:outline-none focus:border-blue-500 shadow-sm"
          />
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Workforce</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{todaySummary.totalEmployees}</div>
            <p className="text-[11px] text-slate-400 mt-1">Total registered staff</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Present Today</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <UserCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{todaySummary.presentCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">Logged into platform today</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Currently Online</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{todaySummary.currentlyActive}</div>
            <p className="text-[11px] text-slate-400 mt-1">Active working sessions</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Leaves</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">{pendingLeavesCount}</div>
            <p className="text-[11px] text-slate-400 mt-1">Awaiting decision</p>
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
          Daily Attendance Sheet ({attendanceRecords.length})
        </button>
        <button
          onClick={() => setActiveTab('leaves')}
          className={`pb-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
            activeTab === 'leaves'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>Leave Requests</span>
          {pendingLeavesCount > 0 && (
            <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px]">
              {pendingLeavesCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Attendance Sheet */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Staff Attendance Log for {selectedDate}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Total logged: {attendanceRecords.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[650px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Login Time</th>
                  <th className="py-3 px-4">Logout Time</th>
                  <th className="py-3 px-4">Total Active Hours</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendanceRecords.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-slate-400">
                      No attendance activity recorded for {selectedDate}.
                    </td>
                  </tr>
                ) : (
                  attendanceRecords.map((r) => (
                    <tr key={r._id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex flex-col">
                          <span>{r.user?.name || 'Unknown'}</span>
                          <span className="text-[11px] text-slate-400 font-normal">{r.user?.email}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {r.user?.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {r.firstLogin
                          ? new Date(r.firstLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {r.lastLogout
                          ? new Date(r.lastLogout).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : r.date === new Date().toISOString().split('T')[0]
                          ? <span className="text-emerald-600 font-medium">Session Active</span>
                          : 'Auto-closed'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{r.totalHours} hrs</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            r.status === 'PRESENT'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : r.status === 'HALF_DAY'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : r.status === 'ON_LEAVE'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {r.status}
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

      {/* Tab 2: Leave Requests Table */}
      {activeTab === 'leaves' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              All Leave Applications
            </h2>
            <div className="flex items-center gap-2">
              <select
                value={selectedLeaveStatus}
                onChange={(e) => setSelectedLeaveStatus(e.target.value)}
                className="text-xs rounded-xl border border-slate-300 px-3 py-1.5 focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="PENDING">Pending Only</option>
                <option value="APPROVED">Approved Only</option>
                <option value="REJECTED">Rejected Only</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[700px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-4">Leave Type</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Days</th>
                  <th className="py-3 px-4">Reason</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leaveRequests.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="text-center py-8 text-slate-400">
                      No leave requests found for this filter.
                    </td>
                  </tr>
                ) : (
                  leaveRequests.map((leave) => (
                    <tr key={leave._id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <div className="flex flex-col">
                          <span>{leave.user?.name || 'Employee'}</span>
                          <span className="text-[11px] text-slate-400 font-normal">{leave.user?.email}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{leave.leaveType}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {new Date(leave.startDate).toLocaleDateString()} -{' '}
                        {new Date(leave.endDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{leave.totalDays} days</td>
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
                        {leave.reviewedBy && (
                          <p className="text-[10px] text-slate-400 mt-0.5">By {leave.reviewedBy.name}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {leave.status === 'PENDING' ? (
                          <button
                            onClick={() => {
                              setReviewModalData(leave);
                              setReviewNote('');
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 text-[11px]"
                          >
                            Review
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Reviewed</span>
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

      {/* Review Leave Modal */}
      {reviewModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md my-auto max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-bold text-slate-900">
                Review Leave Application
              </h3>
              <button
                onClick={() => setReviewModalData(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              <div className="bg-slate-50 p-3.5 rounded-xl text-xs space-y-1">
                <p>
                  <strong className="text-slate-700">Applicant:</strong>{' '}
                  {reviewModalData.user?.name} ({reviewModalData.user?.email})
                </p>
                <p>
                  <strong className="text-slate-700">Type:</strong> {reviewModalData.leaveType}
                </p>
                <p>
                  <strong className="text-slate-700">Dates:</strong>{' '}
                  {new Date(reviewModalData.startDate).toLocaleDateString()} to{' '}
                  {new Date(reviewModalData.endDate).toLocaleDateString()} ({reviewModalData.totalDays} days)
                </p>
                <p>
                  <strong className="text-slate-700">Reason:</strong> {reviewModalData.reason}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  HR Review Note (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="e.g. Approved. Please handover tasks to team."
                  value={reviewNote}
                  onChange={(e) => setReviewNote(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={submittingReview}
                  onClick={() => handleReviewAction('REJECTED')}
                  className="px-4 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl"
                >
                  Reject Request
                </button>
                <button
                  type="button"
                  disabled={submittingReview}
                  onClick={() => handleReviewAction('APPROVED')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                >
                  {submittingReview ? 'Processing...' : 'Approve Leave'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRAttendanceLeaves;
