import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { hrService } from '../../services/hrService';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  User,
  Calendar,
  AlertTriangle,
  Search,
  ShieldCheck
} from 'lucide-react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Skeleton from '../../components/common/Skeleton';
import LetterPreviewModal from '../../components/hr/LetterPreviewModal';
import ApprovalModal from '../../components/hr/ApprovalModal';
import toast from 'react-hot-toast';

const AdminPendingApprovals = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [selectedLetter, setSelectedLetter] = useState(null);
  const [activeActionLetter, setActiveActionLetter] = useState(null);
  const [approvalMode, setApprovalMode] = useState('APPROVE');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPendingApprovals();
  }, [search]);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      const res = await hrService.getAppointments({
        status: 'PENDING_APPROVAL',
        search
      });
      if (res.success) {
        setAppointments(res.appointments);
      }
    } catch (err) {
      toast.error('Failed to load pending approvals.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAction = (app, mode) => {
    setActiveActionLetter(app);
    setApprovalMode(mode);
  };

  const handleConfirmAction = async (comment) => {
    if (!activeActionLetter) return;
    try {
      setActionLoading(true);
      if (approvalMode === 'APPROVE') {
        const res = await hrService.approveAppointment(activeActionLetter._id, comment);
        if (res.success) {
          toast.success(`Letter ${activeActionLetter.referenceNumber} approved successfully.`);
        }
      } else {
        const res = await hrService.rejectAppointment(activeActionLetter._id, comment);
        if (res.success) {
          toast.success(`Letter ${activeActionLetter.referenceNumber} returned for revision.`);
        }
      }
      setActiveActionLetter(null);
      fetchPendingApprovals();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800">
              Admin Review Queue
            </span>
            <span className="text-xs text-slate-400 font-medium">GENFREX Management</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Pending Appointment Approvals
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Carefully review candidate terms and letters submitted by HR before authorizing candidate dispatch
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/admin/hr/appointments">
            <Button variant="secondary" size="sm">
              <span>All HR Letters</span>
            </Button>
          </Link>
          <Link to="/admin/hr/reports">
            <Button variant="secondary" size="sm">
              <span>HR Reports</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Filter by candidate, reference number, or position..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Table Card */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[750px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Ref Number</th>
                <th className="py-3 px-4">Candidate Name</th>
                <th className="py-3 px-4">Designation</th>
                <th className="py-3 px-4">Employment Track</th>
                <th className="py-3 px-4">Joining Date</th>
                <th className="py-3 px-4">HR Creator</th>
                <th className="py-3 px-4">Submission Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="p-6">
                    <Skeleton className="h-10 w-full rounded" />
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No pending approvals — All caught up.</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">There are currently no appointment letters pending administrative sign-off.</p>
                  </td>
                </tr>
              ) : (
                appointments.map((app) => (
                  <tr key={app._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {app.referenceNumber}
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {app.candidateId?.name}
                    </td>

                    <td className="py-3.5 px-4 text-slate-700">
                      {app.designation}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-[10px] font-semibold text-slate-700">
                        {app.appointmentType}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-semibold text-blue-600">
                      {new Date(app.joiningDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600">
                      {app.createdBy?.name || 'HR Specialist'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500">
                      {new Date(app.submittedAt || app.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short'
                      })}
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                        PENDING
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedLetter(app)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
                          title="Preview Full A4 Letter"
                        >
                          Preview
                        </button>

                        <button
                          onClick={() => handleOpenAction(app, 'APPROVE')}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] flex items-center gap-1 transition-colors"
                          title="Approve Letter"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve</span>
                        </button>

                        <button
                          onClick={() => handleOpenAction(app, 'REJECT')}
                          className="px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                          title="Return for Revision"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Return</span>
                        </button>

                        <Link
                          to={`/admin/hr/appointments/${app._id}`}
                          className="px-2 py-1 rounded-lg text-slate-500 hover:text-blue-600 text-[11px] font-semibold"
                        >
                          View
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* A4 Preview Modal */}
      {selectedLetter && (
        <LetterPreviewModal
          isOpen={!!selectedLetter}
          onClose={() => setSelectedLetter(null)}
          appointment={selectedLetter}
          candidate={selectedLetter.candidateId}
        />
      )}

      {/* Approval / Rejection Modal */}
      {activeActionLetter && (
        <ApprovalModal
          isOpen={!!activeActionLetter}
          onClose={() => setActiveActionLetter(null)}
          mode={approvalMode}
          appointment={activeActionLetter}
          onConfirm={handleConfirmAction}
          loading={actionLoading}
        />
      )}
    </div>
  );
};

export default AdminPendingApprovals;
