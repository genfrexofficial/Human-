import React, { useState, useEffect } from 'react';
import { activityService } from '../../services/activityService';
import { History, Search, Filter, Loader2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminActivities = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await activityService.getAuditLogs({ action: actionFilter || undefined });
      if (res.success) {
        setActivities(res.activities || []);
      }
    } catch (err) {
      toast.error('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [actionFilter]);

  const filtered = activities.filter((a) => {
    return (
      a.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.project?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Security & Activity Audit Logs</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Immutable event log of user logins, project stage transitions, task approvals, and file sign-offs
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by actor, description, project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg border border-slate-200 py-1.5 px-3 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none w-full sm:w-auto"
        >
          <option value="">All Action Types</option>
          <option value="TASK_REQUEST_CREATED">TASK_REQUEST_CREATED</option>
          <option value="TASK_REQUEST_APPROVED">TASK_REQUEST_APPROVED</option>
          <option value="TASK_REQUEST_REJECTED">TASK_REQUEST_REJECTED</option>
          <option value="TASK_ASSIGNED">TASK_ASSIGNED</option>
          <option value="TASK_STARTED">TASK_STARTED</option>
          <option value="TASK_BLOCKED">TASK_BLOCKED</option>
          <option value="TASK_SUBMITTED_FOR_REVIEW">TASK_SUBMITTED_FOR_REVIEW</option>
          <option value="TASK_COMPLETED">TASK_COMPLETED</option>
          <option value="DELIVERABLE_APPROVED">DELIVERABLE_APPROVED</option>
          <option value="CHANGES_REQUESTED">CHANGES_REQUESTED</option>
          <option value="PROJECT_CREATED">PROJECT_CREATED</option>
          <option value="PROJECT_UPDATED">PROJECT_UPDATED</option>
        </select>
      </div>

      {/* Audit Log Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <History className="mx-auto h-8 w-8 text-slate-400" />
          <h3 className="mt-2 text-sm font-semibold text-slate-800">No audit logs found</h3>
          <p className="text-xs text-slate-500 mt-1">Audit log records will appear as actions take place in the workspace.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-5 py-3">Description</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3 text-right">Visibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3 whitespace-nowrap text-slate-400 font-mono text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{log.user?.name || 'System'}</div>
                      <span className="text-[10px] text-slate-400 uppercase font-medium">{log.user?.role}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-700 max-w-md">
                      {log.description}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-medium">
                      {log.project?.name || '—'}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      {log.clientVisible ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                          Client Visible
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-medium border border-amber-200">
                          Internal Only
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
    </div>
  );
};

export default AdminActivities;
