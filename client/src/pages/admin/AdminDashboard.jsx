import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectService } from '../../services/projectService';
import { activityService } from '../../services/activityService';
import { EmployeeService } from '../../services/EmployeeService';
import { hrService } from '../../services/hrService';
import ProjectModal from '../../components/projects/ProjectModal';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import ProgressBar from '../../components/common/ProgressBar';
import { CardSkeleton } from '../../components/common/Skeleton';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Inbox,
  HardHat,
  Users,
  Send,
  ArrowRight,
  TrendingUp,
  Activity,
  Calendar,
  FileText,
  ShieldCheck,
  UserPlus,
  HardDrive,
  Lock,
  Cloud
} from 'lucide-react';
import { fileService } from '../../services/fileService';
import { formatBytes } from '../../utils/formatters';
import toast from 'react-hot-toast';

const AdminDashboard = () => {
  const [projects, setProjects] = useState([]);
  const [activities, setActivities] = useState([]);
  const [Employees, setEmployees] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [hrStats, setHrStats] = useState(null);
  const [recentPendingHR, setRecentPendingHR] = useState([]);
  const [upcomingJoining, setUpcomingJoining] = useState([]);
  const [projectLinkedAppointments, setProjectLinkedAppointments] = useState([]);
  const [storageStats, setStorageStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [projectModalOpen, setProjectModalOpen] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [projRes, actRes, workRes, anaRes, hrRes, apptsRes, storageRes] = await Promise.all([
        projectService.getProjects(),
        activityService.getRecentActivities(),
        EmployeeService.getEmployees(),
        projectService.getAdminOverviewAnalytics(),
        hrService.getHRStats().catch(() => ({ success: false })),
        hrService.getAppointments({ limit: 50 }).catch(() => ({ success: false })),
        fileService.getStorageStats().catch(() => ({ success: false }))
      ]);

      if (projRes.success) setProjects(projRes.projects || []);
      if (actRes.success) setActivities(actRes.activities || []);
      if (workRes.success) setEmployees(workRes.Employees || []);
      if (anaRes.success) setAnalytics(anaRes.analytics);
      if (storageRes.success) setStorageStats(storageRes.diagnostics);
      if (hrRes.success) {
        setHrStats(hrRes.stats);
        setRecentPendingHR(hrRes.recentPending || []);
        setUpcomingJoining(hrRes.upcomingJoining || []);
      }
      if (apptsRes.success) {
        const linked = (apptsRes.appointments || []).filter(
          (a) => a.projectId || a.project || a.clientId || a.client
        );
        setProjectLinkedAppointments(linked.length > 0 ? linked : apptsRes.appointments || []);
      }
    } catch (err) {
      toast.error('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCreateProject = async (formData) => {
    try {
      const res = await projectService.createProject(formData);
      if (res.success) {
        toast.success(`Project "${res.project.name}" created!`);
        fetchDashboardData();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create project.';
      toast.error(msg);
      throw err;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800">
              GENFREX Core
            </span>
            <span className="text-xs text-slate-400 font-medium">Build. Grow. Connect.</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Admin Command Center
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Unified management across client engagements, engineering delivery, and HR appointment approvals
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link to="/admin/hr/pending-approvals">
            <Button size="sm" variant="secondary" className="relative">
              <Clock className="h-3.5 w-3.5 mr-1 text-amber-500" />
              <span>Pending Approvals</span>
              {(hrStats?.pendingApprovals || 0) > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-amber-500 text-white font-bold text-[9px]">
                  {hrStats.pendingApprovals}
                </span>
              )}
            </Button>
          </Link>
          <Link to="/admin/clients">
            <Button size="sm" variant="secondary">
              <Users className="h-3.5 w-3.5 mr-1 text-slate-600" />
              <span>Add Client</span>
            </Button>
          </Link>
          <Link to="/admin/Employees">
            <Button size="sm" variant="secondary">
              <HardHat className="h-3.5 w-3.5 mr-1 text-slate-600" />
              <span>Add Employee</span>
            </Button>
          </Link>
          <Link to="/admin/hr-team">
            <Button size="sm" variant="secondary">
              <UserPlus className="h-3.5 w-3.5 mr-1 text-cyan-600" />
              <span>Add HR Officer</span>
            </Button>
          </Link>
          <Button size="sm" onClick={() => setProjectModalOpen(true)}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            <span>Create Project</span>
          </Button>
        </div>
      </div>

      {/* Row 1: Core Operational & HR Metrics */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3.5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {/* Active Projects */}
          <Link to="/admin/projects" className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition-all duration-200 stat-card-glow group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Projects</span>
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-110 transition-transform">
                <FolderKanban className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              {analytics?.projects?.active || 0}
              <span className="text-sm font-normal text-slate-400"> / {analytics?.projects?.total || 0}</span>
            </p>
            <span className="text-xs text-emerald-600 font-semibold block mt-1.5">
              {analytics?.projects?.health?.onTrack || 0} On Track
            </span>
          </Link>

          {/* Pending Task Requests */}
          <Link to="/admin/task-requests" className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md hover:border-amber-200 transition-all duration-200 stat-card-glow group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Client Requests</span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 group-hover:scale-110 transition-transform">
                <Inbox className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              {analytics?.taskRequests?.pendingApproval || 0}
            </p>
            <span className="text-xs text-blue-600 font-semibold block mt-1.5 flex items-center gap-1">
              Review requests &rarr;
            </span>
          </Link>

          {/* Overdue Tasks */}
          <Link to="/admin/tasks" className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md hover:border-rose-200 transition-all duration-200 stat-card-glow group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Overdue Tasks</span>
              <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 group-hover:scale-110 transition-transform">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              {analytics?.tasks?.overdue || 0}
            </p>
            <span className="text-xs text-slate-500 font-medium block mt-1.5 truncate">
              {analytics?.tasks?.inProgress || 0} In Progress
            </span>
          </Link>

          {/* HR: Pending Approvals */}
          <Link to="/admin/hr/pending-approvals" className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm hover:shadow-md hover:border-amber-300 transition-all duration-200 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">HR Approvals</span>
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center border border-amber-200 group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-amber-950 mt-2">
              {hrStats?.pendingApprovals || 0}
            </p>
            <span className="text-xs text-amber-700 font-bold block mt-1.5">
              Action required &rarr;
            </span>
          </Link>

          {/* HR: Approved Letters */}
          <Link to="/admin/hr/approved" className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-200 stat-card-glow group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Approved Offers</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              {hrStats?.approvedLetters || 0}
            </p>
            <span className="text-xs text-slate-500 font-medium block mt-1.5">
              {hrStats?.sentLetters || 0} Dispatched
            </span>
          </Link>

          {/* Total Employees & Clients */}
          <Link to="/admin/Employees" className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 stat-card-glow group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">People</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:scale-110 transition-transform">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2">
              {Employees.length}
              <span className="text-sm font-normal text-slate-400"> Emp</span>
            </p>
            <span className="text-xs text-slate-500 font-medium block mt-1.5">
              {hrStats?.totalCandidates || 0} Candidates
            </span>
          </Link>
        </div>
      )}

      {/* Row 2: Pending HR Approvals Callout Widget */}
      {recentPendingHR.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <h2 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                Appointment Letters Awaiting Your Approval ({recentPendingHR.length})
              </h2>
            </div>
            <Link
              to="/admin/hr/pending-approvals"
              className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1"
            >
              <span>Open Approval Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {recentPendingHR.slice(0, 3).map((app) => (
              <div key={app._id} className="p-3 bg-white rounded-lg border border-amber-200 shadow-xs flex justify-between items-center">
                <div>
                  <p className="font-bold text-slate-900">{app.candidateId?.name}</p>
                  <p className="text-[11px] text-slate-500">{app.designation}</p>
                  <span className="text-[10px] text-amber-700 font-semibold">{app.referenceNumber}</span>
                </div>
                <Link
                  to={`/admin/hr/appointments/${app._id}`}
                  className="px-2.5 py-1 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 font-semibold text-[11px] transition-colors"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="font-semibold text-slate-800">No pending approvals — All caught up.</span>
          </div>
          <Link to="/admin/hr/appointments" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
            <span>All HR Letters</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Cloud Storage Infrastructure Widget */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 shrink-0">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Multi-Cloud Storage & Confidential Documents
              </h2>
              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.2 rounded-full border border-blue-200">
                {formatBytes(storageStats?.totalBytes || 0)}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Private S3 object storage for HR Offer Letters & contracts • Cloudinary CDN for project assets • Presigned token security
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-600 mr-2">
            <div className="flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
              <span>{storageStats?.confidentialCount || 0} S3 Private</span>
            </div>
            <div className="flex items-center gap-1">
              <Cloud className="w-3.5 h-3.5 text-blue-600" />
              <span>{storageStats?.providers?.CLOUDINARY?.count || 0} Media</span>
            </div>
          </div>
          <Link to="/admin/storage">
            <Button size="sm" variant="secondary">
              <span>Storage Console</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Row 3: Employee Workload Table & Project Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Employee Workload Capacity */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Engineer Workload & Capacity</h2>
              <p className="text-xs text-slate-500">Live active tasks allocated across engineering roster</p>
            </div>
            <Link to="/admin/Employees" className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1">
              <span>View Roster</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {Employees.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <HardHat className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No Employees created yet.</p>
                <p className="text-[11px] text-slate-400 mb-3">Add engineering talent to your roster to allocate sprint tasks.</p>
                <Link to="/admin/Employees">
                  <Button size="sm" variant="secondary">Add Employee</Button>
                </Link>
              </div>
            ) : (
              <table className="w-full text-left text-xs min-w-[550px]">
                <thead className="border-b border-slate-100 text-slate-400 uppercase tracking-wider font-semibold text-[10px]">
                  <tr>
                    <th className="pb-2">Employee</th>
                    <th className="pb-2 text-center">Assigned</th>
                    <th className="pb-2 text-center">In Progress</th>
                    <th className="pb-2 text-center">Review</th>
                    <th className="pb-2 text-center">Blocked</th>
                    <th className="pb-2 text-center">Overdue</th>
                    <th className="pb-2 text-right">Total Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {Employees.map((w) => {
                    const wl = w.workload || {};
                    return (
                      <tr key={w._id} className="hover:bg-slate-50/50">
                        <td className="py-2.5">
                          <span className="font-semibold text-slate-800 block">{w.name}</span>
                          <span className="text-[10px] text-slate-400">{w.title || 'Engineer'}</span>
                        </td>
                        <td className="py-2.5 text-center font-medium text-slate-600">{wl.assigned || 0}</td>
                        <td className="py-2.5 text-center font-semibold text-amber-600">{wl.inProgress || 0}</td>
                        <td className="py-2.5 text-center font-semibold text-purple-600">{wl.awaitingReview || 0}</td>
                        <td className="py-2.5 text-center font-semibold text-rose-600">{wl.blocked || 0}</td>
                        <td className="py-2.5 text-center font-semibold text-rose-700">{wl.overdue || 0}</td>
                        <td className="py-2.5 text-right font-bold text-slate-900">{wl.totalActive || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Upcoming Joining Schedules */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-cyan-600" />
                <span>Upcoming Joining Dates</span>
              </h2>
              <Link to="/admin/hr/appointments" className="text-xs text-blue-600 font-semibold">
                All
              </Link>
            </div>
            <p className="text-xs text-slate-500 mb-3">Next 30 days candidate onboarding</p>

            <div className="divide-y divide-slate-100 text-xs">
              {upcomingJoining.length === 0 ? (
                <p className="text-slate-400 text-center py-6">No candidates joining in next 30 days.</p>
              ) : (
                upcomingJoining.slice(0, 4).map((cand) => (
                  <div key={cand._id} className="py-2 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-900">{cand.candidateId?.name}</p>
                      <p className="text-[11px] text-slate-500">{cand.designation}</p>
                    </div>
                    <span className="text-xs font-semibold text-blue-600">
                      {new Date(cand.joiningDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <Link to="/admin/hr/reports" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              Open HR Reports & Intelligence &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Cross-Module Link: CLIENT PROJECTS → HR APPOINTMENTS */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800">
                Cross-Module
              </span>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                CLIENT PROJECTS → HR APPOINTMENTS
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Live tracking of talent assignments and appointment status linked to client engagements
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/hr/appointments/create">
              <Button size="sm" variant="secondary">
                <Plus className="w-3.5 h-3.5 mr-1" />
                <span>New Appointment</span>
              </Button>
            </Link>
            <Link to="/admin/hr/appointments" className="text-xs font-semibold text-blue-600 hover:text-blue-700 ml-2">
              View All &rarr;
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-2.5">Project</th>
                <th className="py-2.5">Client</th>
                <th className="py-2.5">Required Role</th>
                <th className="py-2.5">Candidate</th>
                <th className="py-2.5">Appointment Status</th>
                <th className="py-2.5 text-right">Joining Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projectLinkedAppointments.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    No project-linked HR appointments found. Create an appointment from a project to link them.
                  </td>
                </tr>
              ) : (
                projectLinkedAppointments.slice(0, 6).map((item) => {
                  const projectName = item.projectId?.name || item.project?.name || 'GENFREX Core';
                  const clientName = item.clientId?.companyName || item.clientId?.name || item.client?.name || 'Internal GENFREX';
                  const candidateName = item.candidateId?.name || item.candidate?.name || 'Unassigned';
                  const candidateEmail = item.candidateId?.email || item.candidate?.email || '';

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 font-bold text-slate-900">
                        {item.projectId?._id || item.project?._id ? (
                          <Link
                            to={`/admin/projects/${item.projectId?._id || item.project?._id}`}
                            className="hover:text-blue-600 hover:underline"
                          >
                            {projectName}
                          </Link>
                        ) : (
                          projectName
                        )}
                      </td>
                      <td className="py-3 font-medium text-slate-700">
                        {clientName}
                      </td>
                      <td className="py-3 text-slate-600 font-medium">
                        {item.designation}
                      </td>
                      <td className="py-3">
                        <span className="font-semibold text-slate-900 block">{candidateName}</span>
                        {candidateEmail && <span className="text-[10px] text-slate-400">{candidateEmail}</span>}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${item.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'PENDING_APPROVAL'
                                ? 'bg-amber-100 text-amber-800'
                                : item.status === 'SENT'
                                  ? 'bg-blue-100 text-blue-800'
                                  : item.status === 'ACCEPTED'
                                    ? 'bg-purple-100 text-purple-800'
                                    : item.status === 'REJECTED'
                                      ? 'bg-rose-100 text-rose-800'
                                      : 'bg-slate-100 text-slate-700'
                            }`}
                        >
                          {item.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 text-right font-semibold text-slate-800">
                        {item.joiningDate ? (
                          new Date(item.joiningDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })
                        ) : (
                          <span className="text-slate-400 italic">TBD</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 4: Active Projects & Activity Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Projects List */}
        <div className="lg:col-span-2 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Active Client Projects</h2>
              <p className="text-xs text-slate-500">Stage, completion percentage, and health status</p>
            </div>
            <Link to="/admin/projects" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              View All Projects &rarr;
            </Link>
          </div>

          <div className="divide-y divide-slate-100">
            {projects.length === 0 ? (
              <div className="py-8 text-center text-slate-400">
                <FolderKanban className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No projects yet.</p>
                <p className="text-[11px] text-slate-400 mt-0.5 mb-3">Start managing client deliverables, tasks, and talent requirements.</p>
                <Button size="sm" onClick={() => setProjectModalOpen(true)}>Create Project</Button>
              </div>
            ) : (
              projects.slice(0, 5).map((project) => (
                <div key={project._id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/admin/projects/${project._id}`}
                        className="font-bold text-slate-900 hover:text-blue-600 transition-colors truncate"
                      >
                        {project.name}
                      </Link>
                      <Badge variant={project.health?.toLowerCase() || 'default'}>
                        {project.health?.replace('_', ' ')}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Client: {project.client?.name} &bull; Stage: <strong>{project.stage?.replace('_', ' ')}</strong>
                    </span>
                  </div>

                  <div className="w-full sm:w-48 shrink-0">
                    <div className="flex items-center justify-between text-[10px] font-medium text-slate-600 mb-1">
                      <span>Progress</span>
                      <span>{project.progress}%</span>
                    </div>
                    <ProgressBar progress={project.progress} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">Recent Audit Trail</h2>
            <Link to="/admin/activities" className="text-xs font-semibold text-blue-600 hover:text-blue-700">
              Audit Logs &rarr;
            </Link>
          </div>

          {activities.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <Activity className="w-6 h-6 text-slate-300 mx-auto mb-2" />
              <p className="font-medium text-slate-600">No activities recorded yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">System actions and audit entries will appear here live.</p>
            </div>
          ) : (
            <div className="relative pl-5 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {activities.slice(0, 6).map((item) => (
                <div key={item._id} className="relative text-xs">
                  <span className="absolute -left-5 top-1 h-2 w-2 rounded-full bg-blue-600 ring-4 ring-white" />
                  <p className="font-medium text-slate-800 leading-snug">{item.description}</p>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {item.user?.name}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Project Creation Modal */}
      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        onSubmit={handleCreateProject}
      />
    </div>
  );
};

export default AdminDashboard;
