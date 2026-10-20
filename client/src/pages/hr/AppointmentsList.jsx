import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { hrService } from '../../services/hrService';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  Search,
  PlusCircle,
  Clock,
  CheckCircle2,
  Send,
  XCircle,
  Eye,
  Filter,
  Download,
  Calendar,
  AlertCircle
} from 'lucide-react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Skeleton from '../../components/common/Skeleton';
import LetterPreviewModal from '../../components/hr/LetterPreviewModal';
import { formatDate } from '../../utils/formatters';

const AppointmentsList = ({ defaultStatus = '' }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  // Determine current active filter from props or searchParams or URL path
  let initialStatus = defaultStatus || searchParams.get('status') || '';
  if (location.pathname.includes('/approvals-status') || location.pathname.includes('/pending-approvals')) {
    initialStatus = 'PENDING_APPROVAL';
  } else if (location.pathname.includes('/sent-letters') || location.pathname.includes('/admin/hr/sent')) {
    initialStatus = 'SENT';
  } else if (location.pathname.includes('/admin/hr/approved')) {
    initialStatus = 'APPROVED';
  } else if (location.pathname.includes('/admin/hr/rejected')) {
    initialStatus = 'REJECTED';
  }

  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [filterType, setFilterType] = useState('');
  const [search, setSearch] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLetter, setSelectedLetter] = useState(null);

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter, filterType, search, location.pathname]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (filterType) params.filterType = filterType;
      if (search) params.search = search;

      const res = await hrService.getAppointments(params);
      if (res.success) {
        setAppointments(res.appointments);
      }
    } catch (err) {
      console.error('Failed to load appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { label: 'All Letters', status: '', filterType: '' },
    { label: 'Internal Appointments', status: '', filterType: 'INTERNAL' },
    { label: 'Project-linked Appointments', status: '', filterType: 'PROJECT_LINKED' },
    { label: 'Pending Approval', status: 'PENDING_APPROVAL', filterType: '' },
    { label: 'Approved', status: 'APPROVED', filterType: '' },
    { label: 'Sent to Candidate', status: 'SENT', filterType: '' },
    { label: 'Accepted', status: 'ACCEPTED', filterType: '' },
    { label: 'Drafts', status: 'DRAFT', filterType: '' },
    { label: 'Rejected / Returned', status: 'REJECTED', filterType: '' }
  ];

  const getBasePath = () => {
    return isAdmin && location.pathname.startsWith('/admin') ? '/admin/hr/appointments' : '/hr/appointments';
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
              GENFREX HR Module
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            {location.pathname.includes('/approvals-status') ? 'Submitted Letters Awaiting Approval' :
             location.pathname.includes('/sent-letters') ? 'Dispatched Appointment Letters' :
             location.pathname.includes('/admin/hr/approved') ? 'Approved Appointment Letters' :
             location.pathname.includes('/admin/hr/rejected') ? 'Rejected / Returned Letters' :
             'Appointment Letters Registry'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isAdmin ? 'Administrative oversight across all candidate offers and approval records' : 'Draft, track, and dispatch official GENFREX trainee appointment letters'}
          </p>
        </div>

        {!isAdmin && (
          <Link to="/hr/appointments/create">
            <Button variant="primary" size="sm">
              <PlusCircle className="w-3.5 h-3.5 mr-1" />
              <span>Create Appointment</span>
            </Button>
          </Link>
        )}
      </div>

      {/* Tabs & Search Controls */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 pb-2">
          {tabs.map((tab, idx) => {
            const isTabActive = statusFilter === tab.status && filterType === tab.filterType;
            return (
              <button
                key={idx}
                onClick={() => {
                  setStatusFilter(tab.status);
                  setFilterType(tab.filterType);
                  setSearchParams(tab.status ? { status: tab.status } : {});
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isTabActive
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by reference number (GFX/HR/...), candidate name, or designation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Appointments Table */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[750px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              {filterType === 'PROJECT_LINKED' ? (
                <tr>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Joining Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              ) : (
                <tr>
                  <th className="py-3 px-4">Ref Number</th>
                  <th className="py-3 px-4">Candidate</th>
                  <th className="py-3 px-4">Project Context</th>
                  <th className="py-3 px-4">Designation</th>
                  <th className="py-3 px-4">Joining Date</th>
                  <th className="py-3 px-4">Workflow Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-6">
                    <Skeleton className="h-10 w-full rounded" />
                  </td>
                </tr>
              ) : appointments.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No appointment letters yet — Create your first appointment letter.</p>
                    <p className="text-[11px] text-slate-400 mt-1 mb-3">Draft a Trainee Appointment Letter with terms, clauses, and project context for Admin approval.</p>
                    <Link to="/hr/appointments/create">
                      <Button size="sm">Create Appointment Letter</Button>
                    </Link>
                  </td>
                </tr>
              ) : (
                appointments.map((app) => {
                  const clientName = app.clientId?.companyName || app.clientId?.name || app.client?.name || 'Internal GENFREX';
                  const projectName = app.projectId?.name || app.project?.name || 'GENFREX Internal';
                  const candidateName = app.candidateId?.name || app.candidate?.name || 'Unassigned';
                  const candidateEmail = app.candidateId?.email || app.candidate?.email || '';

                  if (filterType === 'PROJECT_LINKED') {
                    return (
                      <tr key={app._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-800">{clientName}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">{projectName}</td>
                        <td className="py-3.5 px-4 font-medium text-slate-900">{app.designation}</td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{candidateName}</p>
                          <p className="text-[10px] text-slate-400">{candidateEmail}</p>
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-700">
                          {app.joiningDate ? formatDate(app.joiningDate) : 'TBD'}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                            app.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' :
                            app.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                            app.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                            app.status === 'ACCEPTED' ? 'bg-purple-100 text-purple-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {app.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedLetter(app)}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
                            >
                              Preview
                            </button>
                            <Link
                              to={`${getBasePath()}/${app._id}`}
                              className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] transition-colors"
                            >
                              Details
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={app._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">
                        {app.referenceNumber}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900">{candidateName}</p>
                        <p className="text-[10px] text-slate-400">{candidateEmail}</p>
                      </td>

                      <td className="py-3.5 px-4">
                        {app.projectId || app.project ? (
                          <div>
                            <span className="font-semibold text-blue-700 block text-[11px]">
                              {projectName}
                            </span>
                            <span className="text-[10px] text-slate-400">{clientName}</span>
                          </div>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                            Internal Hire
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">{app.designation}</p>
                        <p className="text-[10px] text-slate-500">{app.department} • {app.appointmentType}</p>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-700">
                        {app.joiningDate ? formatDate(app.joiningDate) : 'TBD'}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                          app.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' :
                          app.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                          app.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                          app.status === 'ACCEPTED' ? 'bg-purple-100 text-purple-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {app.status?.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedLetter(app)}
                            className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
                          >
                            Preview
                          </button>
                          <Link
                            to={`${getBasePath()}/${app._id}`}
                            className="px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] transition-colors"
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
    </div>
  );
};

export default AppointmentsList;
