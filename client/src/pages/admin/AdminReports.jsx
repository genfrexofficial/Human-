import React, { useState, useEffect } from 'react';
import { projectService } from '../../services/projectService';
import { EmployeeService } from '../../services/EmployeeService';
import {
  BarChart3,
  CheckCircle2,
  Clock,
  AlertCircle,
  Inbox,
  Files,
  Loader2,
  TrendingUp,
  FolderKanban
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const AdminReports = () => {
  const [analytics, setAnalytics] = useState(null);
  const [Employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setLoading(true);
        const [aRes, wRes] = await Promise.all([
          projectService.getAdminOverviewAnalytics(),
          EmployeeService.getEmployees()
        ]);

        if (aRes.success) setAnalytics(aRes.analytics);
        if (wRes.success) setEmployees(wRes.Employees || []);
      } catch (err) {
        toast.error('Failed to load operational analytics.');
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
      </div>
    );
  }

  const tasksData = [
    { name: 'Completed', count: analytics?.tasks?.completed || 0, fill: '#10b981' },
    { name: 'In Progress', count: analytics?.tasks?.inProgress || 0, fill: '#f59e0b' },
    { name: 'In Review', count: analytics?.tasks?.awaitingReview || 0, fill: '#8b5cf6' },
    { name: 'Overdue', count: analytics?.tasks?.overdue || 0, fill: '#f43f5e' }
  ];

  const healthData = [
    { name: 'On Track', value: analytics?.projects?.health?.onTrack || 0, color: '#10b981' },
    { name: 'At Risk', value: analytics?.projects?.health?.atRisk || 0, color: '#f59e0b' },
    { name: 'Overdue / Blocked', value: analytics?.projects?.health?.overdueBlocked || 0, color: '#f43f5e' }
  ].filter((d) => d.value > 0);

  const EmployeeWorkloadData = Employees.map((w) => ({
    name: w.name.split(' ')[0],
    inProgress: w.workload?.inProgress || 0,
    assigned: w.workload?.assigned || 0,
    blocked: w.workload?.blocked || 0,
    completed: w.workload?.completed || 0
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Operational Analytics & Reports</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time metrics on project health velocity, engineering bandwidth, and deliverable approvals
        </p>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-500">Active Projects</span>
            <FolderKanban className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {analytics?.projects?.active || 0}{' '}
            <span className="text-xs font-normal text-slate-400">/ {analytics?.projects?.total || 0}</span>
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {analytics?.projects?.completed || 0} projects delivered
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-500">Pending Requests</span>
            <Inbox className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {analytics?.taskRequests?.pendingApproval || 0}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Awaiting admin assignment</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-500">Deliverable Sign-Offs</span>
            <Files className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {analytics?.deliverables?.pendingReview || 0}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            {analytics?.deliverables?.approved || 0} approved by clients
          </p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold text-slate-500">Engineering Staff</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">
            {analytics?.users?.Employees || 0}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Serving {analytics?.users?.clients || 0} client organizations
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Velocity Chart */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-sm min-w-0">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Task Status Throughput</h2>
          <p className="text-xs text-slate-500 mb-6">Current breakdown of engineering tasks across all active projects</p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={tasksData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px', border: 'none' }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {tasksData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Employee Workload Capacity */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-sm min-w-0">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Engineer Workload Distribution</h2>
          <p className="text-xs text-slate-500 mb-6">Active tasks allocated per team member</p>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={EmployeeWorkloadData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', fontSize: '11px', border: 'none' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="inProgress" name="In Progress" fill="#f59e0b" stackId="a" />
                <Bar dataKey="assigned" name="Assigned" fill="#3b82f6" stackId="a" />
                <Bar dataKey="blocked" name="Blocked" fill="#f43f5e" stackId="a" />
                <Bar dataKey="completed" name="Completed" fill="#10b981" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
