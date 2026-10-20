import React, { useState, useEffect } from 'react';
import { taskRequestService } from '../../services/taskRequestService';
import { workerService } from '../../services/workerService';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Search,
  Check,
  X,
  Loader2,
  Calendar,
  Layers,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const AdminTaskRequests = () => {
  const [requests, setRequests] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Approve Modal State
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [assignedWorkerId, setAssignedWorkerId] = useState('');
  const [assignPriority, setAssignPriority] = useState('MEDIUM');
  const [assignDueDate, setAssignDueDate] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [approving, setApproving] = useState(false);

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rRes, wRes] = await Promise.all([
        taskRequestService.getTaskRequests(),
        workerService.getWorkers()
      ]);

      if (rRes.success) setRequests(rRes.taskRequests || []);
      if (wRes.success) setWorkers(wRes.workers || []);
    } catch (err) {
      toast.error('Failed to load task requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openApproveModal = (req) => {
    setSelectedRequest(req);
    setAssignPriority(req.priority || 'MEDIUM');
    setAssignDueDate(req.requestedDeadline ? req.requestedDeadline.split('T')[0] : '');
    setAdminNotes('');
    setAssignedWorkerId(workers.length > 0 ? workers[0]._id : '');
    setApproveModalOpen(true);
  };

  const handleApprove = async (e) => {
    e.preventDefault();
    if (!assignedWorkerId) {
      toast.error('Please assign a worker to execute this task.');
      return;
    }

    try {
      setApproving(true);
      const res = await taskRequestService.approveTaskRequest(selectedRequest._id, {
        assignedTo: assignedWorkerId,
        priority: assignPriority,
        dueDate: assignDueDate || null,
        adminNotes: adminNotes.trim()
      });

      if (res.success) {
        toast.success(res.message || 'Task request approved and assigned!');
        setApproveModalOpen(false);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed.');
    } finally {
      setApproving(false);
    }
  };

  const openRejectModal = (req) => {
    setSelectedRequest(req);
    setRejectionReason('');
    setRejectModalOpen(true);
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection.');
      return;
    }

    try {
      setRejecting(true);
      const res = await taskRequestService.rejectTaskRequest(selectedRequest._id, {
        rejectionReason: rejectionReason.trim()
      });

      if (res.success) {
        toast.success('Task request rejected. Client notified.');
        setRejectModalOpen(false);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Rejection failed.');
    } finally {
      setRejecting(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesSearch =
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.requestedBy?.name && r.requestedBy.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (r.project?.name && r.project.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Client Task Requests</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Review incoming feature requests and requirements submitted by clients, approve and assign to engineers
        </p>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by client, title, project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {['ALL', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Requests Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Inbox className="mx-auto h-8 w-8 text-slate-400" />
          <h3 className="mt-2 text-sm font-semibold text-slate-800">No task requests found</h3>
          <p className="text-xs text-slate-500 mt-1">Client requirement submissions will appear here for review.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3">Client</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-5 py-3">Task Title & Details</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Requested Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.map((req) => (
                <tr key={req._id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="font-semibold text-slate-900">{req.requestedBy?.name || 'Client'}</div>
                    <span className="text-[10px] text-slate-400 block">{req.requestedBy?.companyName}</span>
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap text-slate-700 font-medium">
                    {req.project?.name || '—'}
                  </td>

                  <td className="px-5 py-3.5 max-w-sm">
                    <span className="font-semibold text-slate-900 block">{req.title}</span>
                    <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{req.description}</p>
                    {req.rejectionReason && (
                      <span className="text-[10px] text-rose-600 block mt-1 font-medium">
                        Rejection reason: {req.rejectionReason}
                      </span>
                    )}
                    {req.createdTask?.assignedTo && (
                      <span className="text-[10px] text-emerald-600 block mt-1 font-semibold">
                        Assigned to: {req.createdTask.assignedTo.name}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <Badge variant={req.priority?.toLowerCase() || 'default'}>
                      {req.priority}
                    </Badge>
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap text-slate-500 text-[11px]">
                    {new Date(req.createdAt).toLocaleDateString()}
                  </td>

                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <Badge variant={req.status?.toLowerCase() || 'default'}>
                      {req.status?.replace('_', ' ')}
                    </Badge>
                  </td>

                  <td className="px-5 py-3.5 text-right whitespace-nowrap">
                    {req.status === 'PENDING_APPROVAL' ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="xs"
                          variant="primary"
                          onClick={() => openApproveModal(req)}
                        >
                          <Check className="h-3 w-3 mr-1" />
                          Approve & Assign
                        </Button>
                        <Button
                          size="xs"
                          variant="outline"
                          className="text-rose-600 border-rose-200 hover:bg-rose-50"
                          onClick={() => openRejectModal(req)}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">
                        Reviewed {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString() : ''}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Approve & Assign Worker Modal */}
      <Modal
        isOpen={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        title="Approve & Assign Task Request"
      >
        {selectedRequest && (
          <form onSubmit={handleApprove} className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Requested Task</span>
              <p className="text-xs font-bold text-slate-900">{selectedRequest.title}</p>
              <p className="text-xs text-slate-600">{selectedRequest.description}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Project: <strong>{selectedRequest.project?.name}</strong> &bull; Client: <strong>{selectedRequest.requestedBy?.name}</strong>
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">Assign Engineer / Worker *</label>
              <select
                required
                value={assignedWorkerId}
                onChange={(e) => setAssignedWorkerId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
              >
                {workers.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name} — {w.title || 'Engineer'} ({w.workload?.totalActive || 0} active tasks)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">Priority</label>
                <select
                  value={assignPriority}
                  onChange={(e) => setAssignPriority(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">Target Deadline</label>
                <input
                  type="date"
                  value={assignDueDate}
                  onChange={(e) => setAssignDueDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-1.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">Admin Notes (Optional)</label>
              <textarea
                rows={2}
                placeholder="Internal notes or special instructions for the assigned worker..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button size="sm" variant="secondary" type="button" onClick={() => setApproveModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" disabled={approving || !assignedWorkerId}>
                {approving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                Approve & Assign Task
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Reject Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Task Request"
      >
        {selectedRequest && (
          <form onSubmit={handleReject} className="space-y-4 text-xs">
            <p className="text-slate-600">
              Please specify the reason for rejecting <strong>"{selectedRequest.title}"</strong>. The client will be notified immediately with this explanation.
            </p>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">Rejection Reason *</label>
              <textarea
                rows={3}
                required
                placeholder="e.g. Out of current scope, technical infeasibility, or requires separate statement of work..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button size="sm" variant="secondary" type="button" onClick={() => setRejectModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="danger" type="submit" disabled={rejecting || !rejectionReason.trim()}>
                {rejecting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <X className="h-3 w-3 mr-1" />}
                Reject Request
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default AdminTaskRequests;
