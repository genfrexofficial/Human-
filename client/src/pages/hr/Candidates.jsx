import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { hrService } from '../../services/hrService';
import {
  Users,
  Search,
  Filter,
  Plus,
  FilePlus,
  Edit,
  Trash2,
  Mail,
  Phone,
  Briefcase,
  MapPin,
  Calendar,
  ExternalLink,
  FolderKanban
} from 'lucide-react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Skeleton from '../../components/common/Skeleton';
import CandidateModal from '../../components/hr/CandidateModal';
import toast from 'react-hot-toast';

const Candidates = () => {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState(null);
  const [saving, setSaving] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchCandidates();
  }, [search, statusFilter, typeFilter, sourceFilter]);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.employmentType = typeFilter;
      if (sourceFilter) params.source = sourceFilter;

      const res = await hrService.getCandidates(params);
      if (res.success) {
        setCandidates(res.candidates);
      }
    } catch (err) {
      toast.error('Failed to load candidates.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingCandidate(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (cand) => {
    setEditingCandidate(cand);
    setIsModalOpen(true);
  };

  const handleSaveCandidate = async (formData) => {
    try {
      setSaving(true);
      if (editingCandidate) {
        await hrService.updateCandidate(editingCandidate._id, formData);
        toast.success('Candidate updated successfully.');
      } else {
        await hrService.createCandidate(formData);
        toast.success('Candidate registered successfully.');
      }
      setIsModalOpen(false);
      fetchCandidates();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving candidate.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cand) => {
    if (!window.confirm(`Are you sure you want to remove candidate "${cand.name}"?`)) return;
    try {
      await hrService.deleteCandidate(cand._id);
      toast.success('Candidate removed.');
      fetchCandidates();
    } catch (err) {
      toast.error('Failed to delete candidate.');
    }
  };

  const handleCreateAppointmentForCandidate = (cand) => {
    const queryParams = new URLSearchParams({
      candidateId: cand._id,
      ...(cand.projectId && { projectId: cand.projectId }),
      ...(cand.clientId && { clientId: cand.clientId }),
      ...(cand.requirementId && { requirementId: cand.requirementId }),
      ...(cand.workerId && { workerId: cand.workerId })
    });
    navigate(`/hr/appointments/create?${queryParams.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Candidate Directory
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage aspiring trainees, applicants, and talent onboarding records
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleOpenAdd}>
          <Plus className="w-4 h-4 mr-1" />
          <span>Add Candidate</span>
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidates by name, email, or designation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:border-blue-500"
          />
        </div>

        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="py-2 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500 font-medium"
        >
          <option value="">All Sources</option>
          <option value="Direct HR">Direct HR</option>
          <option value="Client Project">Client Project</option>
          <option value="Talent Pool">Talent Pool</option>
          <option value="Internal">Internal</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="py-2 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Employment Tracks</option>
          <option value="Trainee">Trainee</option>
          <option value="Internship">Internship</option>
          <option value="Full-time">Full-time</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="py-2 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-700 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="APPOINTED">APPOINTED</option>
          <option value="ONBOARDED">ONBOARDED</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
      </div>

      {/* Candidates Table Card */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[750px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Candidate Details</th>
                <th className="py-3 px-4">Track & Dept</th>
                <th className="py-3 px-4">Source & Project Context</th>
                <th className="py-3 px-4">Joining Date</th>
                <th className="py-3 px-4">Compensation</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-6">
                    <Skeleton className="h-10 w-full rounded" />
                  </td>
                </tr>
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No candidates yet — Add your first candidate.</p>
                    <p className="text-[11px] text-slate-400 mt-1 mb-3">Register a candidate in the talent pool to track interviews, evaluate profiles, and issue appointment letters.</p>
                    <Button size="sm" onClick={() => { setEditingCandidate(null); setIsModalOpen(true); }}>
                      Add Candidate
                    </Button>
                  </td>
                </tr>
              ) : (
                candidates.map((cand) => {
                  const isClientSourced = cand.source === 'Client Project' || cand.project || cand.projectId;
                  const projectName = cand.project?.name || 'Project Assignment';
                  const clientName = cand.client?.companyName || cand.client?.name || '';
                  const requirementTitle = cand.requirement?.title || '';
                  const projectId = cand.project?._id || cand.projectId || cand.project;

                  return (
                    <tr key={cand._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-slate-900 text-sm">{cand.name}</p>
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {cand.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {cand.phone}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-slate-800">{cand.designation}</p>
                        <p className="text-[11px] text-slate-500">{cand.department} • {cand.employmentType}</p>
                      </td>

                      {/* Source & Project Context */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cand.source === 'Client Project'
                              ? 'bg-purple-100 text-purple-800'
                              : cand.source === 'Talent Pool'
                              ? 'bg-blue-100 text-blue-800'
                              : cand.source === 'Internal'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {cand.source || 'Direct HR'}
                        </span>

                        {isClientSourced && projectId && (
                          <div className="mt-1 text-[11px] text-slate-600 space-y-0.5">
                            {clientName && <p className="font-medium text-slate-700">{clientName}</p>}
                            <p className="text-slate-500">{projectName}</p>
                            {requirementTitle && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[180px]">
                                Req: {requirementTitle}
                              </p>
                            )}
                            <Link
                              to={`/admin/projects/${projectId}`}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline pt-0.5"
                            >
                              <span>View Project</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-slate-700">
                        {cand.joiningDate ? (
                          <span className="font-medium">
                            {new Date(cand.joiningDate).toLocaleDateString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Not set</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="font-bold text-emerald-700">
                          ₹ {Number(cand.compensation || 0).toLocaleString('en-IN')}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {cand.compensationFrequency?.replace('_', ' ')}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            cand.candidateStatus === 'ONBOARDED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : cand.candidateStatus === 'APPOINTED'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {cand.candidateStatus}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleCreateAppointmentForCandidate(cand)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] flex items-center gap-1 transition-colors"
                            title="Generate Appointment Letter"
                          >
                            <FilePlus className="w-3.5 h-3.5" />
                            <span>Letter</span>
                          </button>

                          <button
                            onClick={() => handleOpenEdit(cand)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(cand)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
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

      {/* Candidate Add/Edit Modal */}
      <CandidateModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        candidate={editingCandidate}
        onSave={handleSaveCandidate}
        loading={saving}
      />
    </div>
  );
};

export default Candidates;
