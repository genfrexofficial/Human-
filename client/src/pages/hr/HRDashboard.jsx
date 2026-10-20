import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { hrService } from '../../services/hrService';
import {
  Users,
  FileText,
  Clock,
  CheckCircle2,
  Send,
  Calendar,
  PlusCircle,
  UserPlus,
  ArrowRight,
  TrendingUp,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Skeleton from '../../components/common/Skeleton';
import LetterPreviewModal from '../../components/hr/LetterPreviewModal';

const HRDashboard = () => {
  const [stats, setStats] = useState(null);
  const [upcomingJoining, setUpcomingJoining] = useState([]);
  const [recentAppointments, setRecentAppointments] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [res, apptRes] = await Promise.all([
        hrService.getHRStats(),
        hrService.getAppointments({ limit: 100 }).catch(() => ({ success: false }))
      ]);

      if (res.success) {
        setStats(res.stats);
        setUpcomingJoining(res.upcomingJoining || []);
        setRecentAppointments(res.recentAppointments || []);
      }
      if (apptRes.success) {
        setAllAppointments(apptRes.appointments || []);
      }
    } catch (err) {
      console.error('Failed to load HR stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      label: 'Total Candidates',
      value: stats?.totalCandidates || 0,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      link: '/hr/candidates'
    },
    {
      label: 'Pending Admin Approval',
      value: stats?.pendingApprovals || 0,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      link: '/hr/approvals-status'
    },
    {
      label: 'Approved Letters',
      value: stats?.approvedLetters || 0,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      link: '/hr/appointments?status=APPROVED'
    },
    {
      label: 'Letters Sent to Candidates',
      value: stats?.sentLetters || 0,
      icon: Send,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      link: '/hr/sent-letters'
    },
    {
      label: 'Upcoming Joining (30 Days)',
      value: stats?.upcomingJoiningCount || 0,
      icon: Calendar,
      color: 'text-cyan-600',
      bg: 'bg-cyan-50',
      link: '/hr/appointments?status=APPROVED,SENT,ACCEPTED'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">
              GENFREX Ecosystem
            </span>
            <span className="text-xs text-slate-400 font-medium">Build. Grow. Connect.</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            HR & OfferFlow Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Create trainee appointment letters, submit for Admin approval, and issue verified offers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link to="/hr/candidates">
            <Button variant="secondary" size="sm">
              <UserPlus className="w-3.5 h-3.5 mr-1" />
              <span>Candidates</span>
            </Button>
          </Link>
          <Link to="/hr/appointments/create">
            <Button variant="primary" size="sm">
              <PlusCircle className="w-3.5 h-3.5 mr-1" />
              <span>Create Appointment</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={idx}
              to={card.link}
              className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-500 leading-tight">
                  {card.label}
                </span>
                <div className={`p-2 rounded-lg ${card.bg} ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                {loading ? (
                  <Skeleton className="h-7 w-12 rounded" />
                ) : (
                  <span className="text-2xl font-black text-slate-900 tracking-tight">
                    {card.value}
                  </span>
                )}
                <span className="text-[10px] font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                  &rarr;
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Main Grid: Upcoming Joining & Recent Letters */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Upcoming Joining Dates */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="h-full flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-600" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Upcoming Joining Dates
                </h2>
              </div>
              <span className="text-[10px] font-bold text-slate-400">Next 30 Days</span>
            </div>

            <div className="flex-1 divide-y divide-slate-100 overflow-y-auto mt-2">
              {loading ? (
                <div className="space-y-3 p-2">
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                  <Skeleton className="h-12 w-full rounded-lg" />
                </div>
              ) : upcomingJoining.length === 0 ? (
                <div className="text-center py-10 px-4 text-xs text-slate-400">
                  <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p>No candidates scheduled to join in the next 30 days.</p>
                </div>
              ) : (
                upcomingJoining.map((item) => (
                  <div key={item._id} className="py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{item.candidateId?.name}</p>
                      <p className="text-[11px] text-slate-500">{item.designation}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-blue-600">
                        {new Date(item.joiningDate).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short'
                        })}
                      </span>
                      <span className="block text-[9px] font-medium text-slate-400">
                        Ref: {item.referenceNumber}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 mt-auto">
              <Link
                to="/hr/appointments?status=APPROVED,SENT,ACCEPTED"
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1"
              >
                <span>View All Joining Schedules</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>
        </div>

        {/* Right: Recent Appointment Letters Activity */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="h-full flex flex-col">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Appointment Letters Registry
                </h2>
              </div>
              <Link
                to="/hr/appointments"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                View Full Registry &rarr;
              </Link>
            </div>

            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 pt-3 pb-2 border-b border-slate-100">
              {[
                { id: 'ALL', label: 'All Letters' },
                { id: 'INTERNAL', label: 'Internal Appointments' },
                { id: 'PROJECT_LINKED', label: 'Project-linked Appointments' },
                { id: 'PENDING_APPROVAL', label: 'Pending Approval' },
                { id: 'APPROVED', label: 'Approved' },
                { id: 'SENT', label: 'Sent' },
                { id: 'ACCEPTED', label: 'Accepted' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                    activeFilter === tab.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-x-auto mt-2">
              {(() => {
                const list = (allAppointments.length > 0 ? allAppointments : recentAppointments).filter((app) => {
                  const isProject = !!(app.projectId || app.project || app.clientId || app.client);
                  if (activeFilter === 'INTERNAL') return !isProject;
                  if (activeFilter === 'PROJECT_LINKED') return isProject;
                  if (activeFilter === 'PENDING_APPROVAL') return app.status === 'PENDING_APPROVAL';
                  if (activeFilter === 'APPROVED') return app.status === 'APPROVED';
                  if (activeFilter === 'SENT') return app.status === 'SENT';
                  if (activeFilter === 'ACCEPTED') return app.status === 'ACCEPTED' || app.acceptanceStatus === 'ACCEPTED';
                  return true;
                });

                const isProjectView = activeFilter === 'PROJECT_LINKED';

                return (
                  <table className="w-full text-left text-xs min-w-[650px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {isProjectView ? (
                          <>
                            <th className="py-2.5">Client</th>
                            <th className="py-2.5">Project</th>
                            <th className="py-2.5">Role</th>
                            <th className="py-2.5">Candidate</th>
                            <th className="py-2.5">Status</th>
                            <th className="py-2.5 text-right">Actions</th>
                          </>
                        ) : (
                          <>
                            <th className="py-2.5">Reference</th>
                            <th className="py-2.5">Candidate</th>
                            <th className="py-2.5">Context</th>
                            <th className="py-2.5">Role</th>
                            <th className="py-2.5">Status</th>
                            <th className="py-2.5 text-right">Actions</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr>
                          <td colSpan="6" className="py-4">
                            <Skeleton className="h-8 w-full rounded" />
                          </td>
                        </tr>
                      ) : list.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-400">
                            <p className="font-semibold text-slate-700">No appointment letters yet — Create your first appointment letter.</p>
                            <p className="text-[11px] text-slate-400 mt-0.5 mb-2">Draft and issue verified trainee appointment letters for Admin review.</p>
                            <Link to="/hr/appointments/create">
                              <Button size="sm">Create Appointment</Button>
                            </Link>
                          </td>
                        </tr>
                      ) : (
                        list.slice(0, 7).map((app) => {
                          const clientName = app.clientId?.companyName || app.clientId?.name || app.client?.name || 'Internal GENFREX';
                          const projectName = app.projectId?.name || app.project?.name || 'GENFREX Internal';
                          const candidateName = app.candidateId?.name || app.candidate?.name || 'Unassigned';

                          if (isProjectView) {
                            return (
                              <tr key={app._id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-3 font-semibold text-slate-800">{clientName}</td>
                                <td className="py-3 font-medium text-slate-700">{projectName}</td>
                                <td className="py-3 text-slate-600">{app.designation}</td>
                                <td className="py-3 font-bold text-slate-900">{candidateName}</td>
                                <td className="py-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                    app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                                    app.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' :
                                    app.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                                    app.status === 'ACCEPTED' ? 'bg-purple-100 text-purple-800' :
                                    app.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                                    'bg-slate-100 text-slate-700'
                                  }`}>
                                    {app.status?.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="py-3 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => setSelectedLetter(app)}
                                      className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold"
                                    >
                                      Preview
                                    </button>
                                    <Link
                                      to={`/hr/appointments/${app._id}`}
                                      className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold"
                                    >
                                      Details
                                    </Link>
                                  </div>
                                </td>
                              </tr>
                            );
                          }

                          return (
                            <tr key={app._id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 font-bold text-slate-900">
                                {app.referenceNumber}
                              </td>
                              <td className="py-3">
                                <p className="font-semibold text-slate-800">{candidateName}</p>
                                <p className="text-[10px] text-slate-400">{app.candidateId?.email || app.candidate?.email}</p>
                              </td>
                              <td className="py-3">
                                {app.projectId || app.project ? (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700">
                                    {projectName}
                                  </span>
                                ) : (
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                                    Internal
                                  </span>
                                )}
                              </td>
                              <td className="py-3 text-slate-600">{app.designation}</td>
                              <td className="py-3">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                                  app.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' :
                                  app.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                                  app.status === 'ACCEPTED' ? 'bg-purple-100 text-purple-800' :
                                  app.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                                  'bg-slate-100 text-slate-700'
                                }`}>
                                  {app.status?.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => setSelectedLetter(app)}
                                    className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold"
                                  >
                                    Preview
                                  </button>
                                  <Link
                                    to={`/hr/appointments/${app._id}`}
                                    className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold"
                                  >
                                    Details
                                  </Link>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                );
              })()}
            </div>
          </Card>
        </div>
      </div>

      {/* A4 Preview Modal */}
      {selectedLetter && (
        <LetterPreviewModal
          isOpen={!!selectedLetter}
          onClose={() => setSelectedLetter(null)}
          appointment={selectedLetter}
          candidate={selectedLetter.candidateId}
        />
      )}
    </div>
  );
};

export default HRDashboard;
