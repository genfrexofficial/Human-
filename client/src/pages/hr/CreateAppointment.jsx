import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { hrService } from '../../services/hrService';
import { projectService } from '../../services/projectService';
import { clientService } from '../../services/clientService';
import { taskRequestService } from '../../services/taskRequestService';
import { workerService } from '../../services/workerService';
import {
  FileText,
  User,
  Briefcase,
  FolderKanban,
  ShieldCheck,
  Eye,
  Save,
  Send,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Plus,
  Layers,
  Building2,
  HelpCircle,
  UserCheck
} from 'lucide-react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import toast from 'react-hot-toast';

const CreateAppointment = () => {
  const [searchParams] = useSearchParams();
  const preselectedCandidateId = searchParams.get('candidateId');
  const preselectedProjectId = searchParams.get('projectId');
  const preselectedClientId = searchParams.get('clientId');
  const preselectedReqId = searchParams.get('requirementId');
  const preselectedWorkerId = searchParams.get('workerId');
  const preselectedDesignation = searchParams.get('designation');

  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [candidates, setCandidates] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [workers, setWorkers] = useState([]);

  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [template, setTemplate] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    candidateId: '',
    templateId: '',
    appointmentType: 'TRAINEE',
    employmentType: 'Trainee',
    title: 'TRAINEE APPOINTMENT LETTER',
    designation: preselectedDesignation || '',
    department: 'Engineering',
    appointmentDate: new Date().toISOString().substring(0, 10),
    joiningDate: '',
    workLocation: 'Remote / Bengaluru HQ',
    reportingManager: 'Technical Lead',
    compensation: 25000,
    compensationFrequency: 'STIPEND_MONTHLY',
    responsibilities: [],
    terms: [],
    confidentialityTerms: '',
    professionalConductTerms: '',
    acceptanceDeadline: '',
    // Step 3 Project Context (Optional)
    clientId: preselectedClientId || '',
    projectId: preselectedProjectId || '',
    requirementId: preselectedReqId || '',
    workerId: preselectedWorkerId || ''
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const applyTemplate = (tmpl, overrideDetails = false) => {
    if (!tmpl) return;
    setSelectedTemplateId(tmpl._id);
    setTemplate(tmpl);

    setFormData((prev) => ({
      ...prev,
      templateId: tmpl._id,
      title: tmpl.title || prev.title,
      appointmentType: tmpl.appointmentType || prev.appointmentType,
      department: overrideDetails ? (tmpl.department || prev.department) : (prev.department || tmpl.department),
      designation: overrideDetails && tmpl.targetRole ? tmpl.targetRole : prev.designation,
      responsibilities: tmpl.roleAndResponsibilities?.length > 0 ? [...tmpl.roleAndResponsibilities] : prev.responsibilities,
      terms: tmpl.termsAndConditions?.length > 0 ? [...tmpl.termsAndConditions] : prev.terms,
      confidentialityTerms: tmpl.confidentialityClause || prev.confidentialityTerms,
      professionalConductTerms: tmpl.professionalConductClause || prev.professionalConductTerms
    }));
  };

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [candRes, settingsRes, templatesRes, projRes, clientRes, reqRes, workRes] = await Promise.all([
        hrService.getCandidates({ limit: 100 }),
        hrService.getHRSettings().catch(() => ({ success: false })),
        hrService.getLetterTemplates().catch(() => ({ success: false })),
        projectService.getProjects().catch(() => ({ success: false })),
        clientService.getClients().catch(() => ({ success: false })),
        taskRequestService.getTaskRequests().catch(() => ({ success: false })),
        workerService.getWorkers().catch(() => ({ success: false }))
      ]);

      let availableTemplates = [];
      if (templatesRes.success && templatesRes.templates?.length > 0) {
        availableTemplates = templatesRes.templates;
      } else if (settingsRes.success && settingsRes.templates?.length > 0) {
        availableTemplates = settingsRes.templates;
      } else if (settingsRes.success && settingsRes.template) {
        availableTemplates = [settingsRes.template];
      }
      setTemplates(availableTemplates);

      const defaultTmpl = availableTemplates.find((t) => t.isDefault) || availableTemplates[0];
      if (defaultTmpl) {
        applyTemplate(defaultTmpl, false);
      }

      if (candRes.success) {
        setCandidates(candRes.candidates);

        if (preselectedCandidateId) {
          const found = candRes.candidates.find((c) => c._id === preselectedCandidateId);
          if (found) {
            selectCandidate(found, availableTemplates);
          }
        }
      }

      if (projRes.success) setProjects(projRes.projects || []);
      if (clientRes.success) setClients(clientRes.clients || []);
      if (reqRes.success) setRequirements(reqRes.taskRequests || reqRes.requests || []);
      if (workRes.success) setWorkers(workRes.workers || []);

      // If preselected project passed, auto-set client if project has one
      if (preselectedProjectId && projRes.success) {
        const targetProj = (projRes.projects || []).find((p) => p._id === preselectedProjectId);
        if (targetProj) {
          setFormData((prev) => ({
            ...prev,
            projectId: targetProj._id,
            clientId: prev.clientId || targetProj.client?._id || targetProj.client || ''
          }));
        }
      }
    } catch (err) {
      toast.error('Failed to load initial form data.');
    } finally {
      setLoading(false);
    }
  };

  const selectCandidate = (cand, templateList = templates) => {
    setSelectedCandidate(cand);
    const deadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

    // Intelligently find matching role template for this candidate
    const des = (cand.designation || '').toLowerCase();
    const track = cand.employmentType?.toUpperCase() === 'FULL-TIME' ? 'FULL_TIME' :
                  cand.employmentType?.toUpperCase() === 'INTERNSHIP' ? 'INTERNSHIP' : 'TRAINEE';

    let matchedTmpl = (templateList || []).find((t) => {
      if (des.includes('devops') || des.includes('cloud') || des.includes('infra')) return t.roleCategory === 'DEVOPS';
      if (des.includes('ui') || des.includes('ux') || des.includes('design')) return t.roleCategory === 'UI_UX';
      if (des.includes('qa') || des.includes('test') || des.includes('automation')) return t.roleCategory === 'QA_TESTING';
      if (des.includes('full stack') || des.includes('fullstack')) return t.roleCategory === 'FULL_STACK';
      if (des.includes('web') || des.includes('frontend') || des.includes('backend') || des.includes('developer')) return t.roleCategory === 'WEB_DEV';
      if (des.includes('intern')) return t.roleCategory === 'INTERNSHIP';
      return false;
    });

    if (!matchedTmpl && track) {
      matchedTmpl = (templateList || []).find((t) => t.appointmentType === track);
    }

    if (!matchedTmpl) {
      matchedTmpl = (templateList || []).find((t) => t.isDefault) || (templateList || [])[0];
    }

    if (matchedTmpl) {
      applyTemplate(matchedTmpl, false);
    }

    setFormData((prev) => ({
      ...prev,
      candidateId: cand._id,
      designation: cand.designation || prev.designation,
      department: cand.department || prev.department || matchedTmpl?.department || 'Engineering',
      employmentType: cand.employmentType || 'Trainee',
      appointmentType: track,
      joiningDate: cand.joiningDate ? cand.joiningDate.substring(0, 10) : prev.joiningDate,
      workLocation: cand.workLocation || prev.workLocation,
      reportingManager: cand.reportingManager || prev.reportingManager,
      compensation: cand.compensation || prev.compensation,
      compensationFrequency: cand.compensationFrequency || prev.compensationFrequency,
      acceptanceDeadline: prev.acceptanceDeadline || deadline,
      projectId: prev.projectId || cand.projectId || cand.project?._id || cand.project || '',
      clientId: prev.clientId || cand.clientId || cand.client?._id || cand.client || '',
      requirementId: prev.requirementId || cand.requirementId || cand.requirement?._id || cand.requirement || '',
      workerId: prev.workerId || cand.workerId || cand.assignedWorker?._id || cand.assignedWorker || ''
    }));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // If changing project, auto-update client if available
    if (name === 'projectId') {
      const p = projects.find((proj) => proj._id === value);
      if (p && p.client) {
        setFormData((prev) => ({
          ...prev,
          projectId: value,
          clientId: p.client?._id || p.client
        }));
      }
    }
  };

  const handleResponsibilityChange = (index, value) => {
    const updated = [...formData.responsibilities];
    updated[index] = value;
    setFormData((prev) => ({ ...prev, responsibilities: updated }));
  };

  const addResponsibility = () => {
    setFormData((prev) => ({
      ...prev,
      responsibilities: [...prev.responsibilities, '']
    }));
  };

  const removeResponsibility = (index) => {
    setFormData((prev) => ({
      ...prev,
      responsibilities: prev.responsibilities.filter((_, i) => i !== index)
    }));
  };

  const handleTermChange = (index, value) => {
    const updated = [...formData.terms];
    updated[index] = value;
    setFormData((prev) => ({ ...prev, terms: updated }));
  };

  const handleSave = async (submitNow = false) => {
    if (!formData.candidateId) {
      toast.error('Please select a candidate in Step 1.');
      setStep(1);
      return;
    }
    if (!formData.designation || !formData.joiningDate || !formData.compensation || !formData.acceptanceDeadline) {
      toast.error('Please complete all required appointment details in Step 2.');
      setStep(2);
      return;
    }

    try {
      setSubmitting(true);
      const res = await hrService.createAppointment({
        ...formData,
        client: formData.clientId || null,
        project: formData.projectId || null,
        requirement: formData.requirementId || null,
        assignedWorker: formData.workerId || null,
        submitNow
      });

      if (res.success) {
        toast.success(
          submitNow
            ? 'Appointment letter submitted for Admin approval!'
            : 'Appointment draft saved successfully!'
        );
        navigate(`/hr/appointments/${res.appointment._id}`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save appointment letter.');
    } finally {
      setSubmitting(false);
    }
  };

  const stepsList = [
    { num: 1, title: 'Candidate', icon: User },
    { num: 2, title: 'Details', icon: Briefcase },
    { num: 3, title: 'Project Context', icon: FolderKanban },
    { num: 4, title: 'Terms & Clauses', icon: ShieldCheck },
    { num: 5, title: 'Live A4 Preview', icon: Eye },
    { num: 6, title: 'Admin Submission', icon: Send }
  ];

  const selectedProjectObj = projects.find((p) => p._id === formData.projectId);
  const selectedClientObj = clients.find((c) => c._id === formData.clientId);
  const selectedReqObj = requirements.find((r) => r._id === formData.requirementId);
  const selectedWorkerObj = workers.find((w) => w._id === formData.workerId);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
            GENFREX HR OfferFlow
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            Create Appointment Letter
          </h1>
          <p className="text-xs text-slate-500">
            6-Step guided appointment workflow with optional ClientFlow project linking
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={() => navigate('/hr/appointments')}>
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          <span>Back to Letters</span>
        </Button>
      </div>

      {/* Stepper Navigation */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm text-xs">
        {stepsList.map((item) => {
          const Icon = item.icon;
          const isActive = step === item.num;
          const isDone = step > item.num;
          return (
            <button
              key={item.num}
              type="button"
              onClick={() => setStep(item.num)}
              className={`flex items-center justify-center sm:justify-start gap-1.5 py-2 px-2.5 rounded-xl font-semibold transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                  : isDone
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${
                  isActive ? 'bg-white text-blue-600' : isDone ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {isDone ? '✓' : item.num}
              </div>
              <span className="truncate text-[11px]">{item.title}</span>
            </button>
          );
        })}
      </div>

      {/* STEP 1: CANDIDATE SELECTION */}
      {step === 1 && (
        <Card className="space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Step 1: Select Candidate</h2>
            <p className="text-xs text-slate-500">
              Choose an existing candidate from the talent pool to prefill appointment terms
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Select Candidate <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto p-1">
              {candidates.map((cand) => {
                const isSelected = selectedCandidate?._id === cand._id;
                return (
                  <div
                    key={cand._id}
                    onClick={() => selectCandidate(cand)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/60 shadow-sm ring-2 ring-blue-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-slate-900 text-xs">{cand.name}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                        {cand.employmentType}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">{cand.designation}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{cand.email} • {cand.phone}</p>
                    {cand.source === 'Client Project' && (
                      <span className="inline-block mt-2 px-1.5 py-0.5 text-[9px] rounded bg-purple-50 text-purple-700 font-bold">
                        Client Sourced
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <div className="text-xs text-slate-500">
              {selectedCandidate ? (
                <span className="text-emerald-600 font-semibold">Selected: {selectedCandidate.name}</span>
              ) : (
                <span className="text-amber-600 font-medium">Please select a candidate to continue</span>
              )}
            </div>
            <Button
              variant="primary"
              size="sm"
              disabled={!selectedCandidate}
              onClick={() => setStep(2)}
            >
              <span>Next: Appointment Details</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 2: APPOINTMENT DETAILS */}
      {step === 2 && (
        <Card className="space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Step 2: Appointment Details & Master Template</h2>
            <p className="text-xs text-slate-500">
              Select or customize the Master Template tailored for this company role, compensation, and responsibilities
            </p>
          </div>

          {/* Master Role-Based Template Picker */}
          <div className="p-4 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-slate-50 border border-blue-200/90 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Master Letter Template by Company Role
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Different company roles require specific responsibilities, terms, and clauses. Select a role template to auto-populate.
                  </p>
                </div>
              </div>
              {template && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 shrink-0">
                  <CheckCircle2 className="w-3 h-3 text-blue-600" />
                  <span>Applied: {template.targetRole || template.name}</span>
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <div className="relative flex-1">
                <select
                  value={selectedTemplateId}
                  onChange={(e) => {
                    const found = templates.find((t) => t._id === e.target.value);
                    if (found) {
                      applyTemplate(found, true);
                      toast.success(`Applied template: ${found.targetRole || found.name}`);
                    }
                  }}
                  className="w-full p-2.5 rounded-xl border border-blue-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                >
                  {templates.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.targetRole || t.name} • [{t.department}] • {t.appointmentType}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={() => {
                  const current = templates.find((t) => t._id === selectedTemplateId) || templates[0];
                  if (current) {
                    applyTemplate(current, true);
                    toast.success(`Re-applied master clauses for ${current.targetRole || current.name}`);
                  }
                }}
                className="px-3.5 py-2.5 rounded-xl bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5 shrink-0"
              >
                <span>Re-apply Role Clauses</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Letter Title:
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Employment Track <span className="text-rose-500">*</span>
              </label>
              <select
                name="appointmentType"
                value={formData.appointmentType}
                onChange={handleInputChange}
                className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="TRAINEE">TRAINEE (GENFREX Trainee Program)</option>
                <option value="INTERNSHIP">INTERNSHIP</option>
                <option value="FULL_TIME">FULL TIME</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Position / Designation <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="designation"
                value={formData.designation}
                onChange={handleInputChange}
                placeholder="e.g. Associate Software Trainee"
                className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Department <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="department"
                value={formData.department}
                onChange={handleInputChange}
                className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Date of Joining <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                name="joiningDate"
                value={formData.joiningDate}
                onChange={handleInputChange}
                className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Offer Acceptance Deadline <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                name="acceptanceDeadline"
                value={formData.acceptanceDeadline}
                onChange={handleInputChange}
                className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Stipend / Compensation (₹) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                name="compensation"
                value={formData.compensation}
                onChange={handleInputChange}
                className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Compensation Frequency
              </label>
              <select
                name="compensationFrequency"
                value={formData.compensationFrequency}
                onChange={handleInputChange}
                className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="STIPEND_MONTHLY">Monthly Stipend</option>
                <option value="MONTHLY">Monthly Salary</option>
                <option value="ANNUAL">Annual CTC</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Work Location:
              </label>
              <input
                type="text"
                name="workLocation"
                value={formData.workLocation}
                onChange={handleInputChange}
                className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Reporting Manager:
              </label>
              <input
                type="text"
                name="reportingManager"
                value={formData.reportingManager}
                onChange={handleInputChange}
                className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <Button variant="secondary" size="sm" onClick={() => setStep(1)}>
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              <span>Back</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setStep(3)}>
              <span>Next: Project Context</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 3: PROJECT CONTEXT (OPTIONAL) */}
      {step === 3 && (
        <Card className="space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-start justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Step 3: Project Context</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                  Optional
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Link this appointment letter to a ClientFlow Client, Project, Requirement, or Assigned Worker.
                Leave blank for internal GENFREX appointments.
              </p>
            </div>
            <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded-lg">
              Cross-Module Link
            </span>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <Building2 className="w-3.5 h-3.5 text-blue-600" />
              <span>Internal Confidentiality Notice</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              These references are retained internally for delivery tracking, talent utilization, and HR records.
              Clients and workers will never see salary, compensation amounts, internal notes, or appointment letter contents.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Client (Optional):
              </label>
              <select
                name="clientId"
                value={formData.clientId}
                onChange={handleInputChange}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="">-- None (Internal GENFREX Appointment) --</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.companyName ? `${c.companyName} (${c.name})` : c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Client Project (Optional):
              </label>
              <select
                name="projectId"
                value={formData.projectId}
                onChange={handleInputChange}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="">-- None (Internal GENFREX Project) --</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name} {p.client?.name ? `[${p.client.name}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Client Requirement / Task Request (Optional):
              </label>
              <select
                name="requirementId"
                value={formData.requirementId}
                onChange={handleInputChange}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="">-- None (No Specific Task Request) --</option>
                {requirements
                  .filter((r) => !formData.projectId || String(r.project?._id || r.project) === String(formData.projectId))
                  .map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.title} ({r.priority})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Assigned Worker / Mentor (Optional):
              </label>
              <select
                name="workerId"
                value={formData.workerId}
                onChange={handleInputChange}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="">-- None (Direct Manager Assignment) --</option>
                {workers.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name} {w.title ? `(${w.title})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Context Preview Badge */}
          {(formData.projectId || formData.clientId) && (
            <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 flex items-center justify-between text-xs">
              <div>
                <p className="font-bold text-blue-900">Project Context Attached</p>
                <p className="text-[11px] text-blue-700">
                  Project: <strong>{selectedProjectObj?.name || 'Selected'}</strong> • Client: <strong>{selectedClientObj?.name || 'Selected'}</strong>
                </p>
              </div>
              <span className="px-2 py-1 rounded bg-blue-600 text-white font-bold text-[10px]">
                Linked
              </span>
            </div>
          )}

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <Button variant="secondary" size="sm" onClick={() => setStep(2)}>
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              <span>Back</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setStep(4)}>
              <span>Next: Terms & Clauses</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 4: TERMS & CLAUSES */}
      {step === 4 && (
        <Card className="space-y-4 text-xs">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Step 4: Terms & Clauses</h2>
            <p className="text-xs text-slate-500">
              Customize duties, obligations, confidentiality clauses, and corporate terms
            </p>
          </div>

          {/* Responsibilities */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="font-semibold text-slate-700">
                Key Roles & Responsibilities:
              </label>
              <button
                type="button"
                onClick={addResponsibility}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Responsibility</span>
              </button>
            </div>
            <div className="space-y-2">
              {formData.responsibilities.map((resp, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="font-bold text-slate-400">•</span>
                  <input
                    type="text"
                    value={resp}
                    onChange={(e) => handleResponsibilityChange(idx, e.target.value)}
                    className="flex-1 p-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                  {formData.responsibilities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeResponsibility(idx)}
                      className="text-slate-400 hover:text-rose-600 text-xs px-2"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Terms & Conditions */}
          <div>
            <label className="block font-semibold text-slate-700 mb-2">
              Terms & Conditions:
            </label>
            <div className="space-y-2">
              {formData.terms.map((term, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <span className="font-bold text-slate-500 text-[11px] mt-2">{idx + 1}.</span>
                  <textarea
                    rows={2}
                    value={term}
                    onChange={(e) => handleTermChange(idx, e.target.value)}
                    className="flex-1 p-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Confidentiality */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Confidentiality & Data Protection:
            </label>
            <textarea
              rows={3}
              name="confidentialityTerms"
              value={formData.confidentialityTerms}
              onChange={handleInputChange}
              className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Professional Conduct */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Professional Conduct & Compliance:
            </label>
            <textarea
              rows={2}
              name="professionalConductTerms"
              value={formData.professionalConductTerms}
              onChange={handleInputChange}
              className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <Button variant="secondary" size="sm" onClick={() => setStep(3)}>
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              <span>Back to Context</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setStep(5)}>
              <span>Next: Live A4 Preview</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 5: LIVE A4 PREVIEW */}
      {step === 5 && (
        <Card className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Step 5: Live A4 Document Preview</h2>
              <p className="text-xs text-slate-500">
                Pixel-accurate preview of the official appointment letter as it will be generated and signed
              </p>
            </div>

            <Button variant="primary" size="sm" onClick={() => setStep(6)}>
              <span>Next: Submit for Approval</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>

          {/* Live A4 Container */}
          <div className="bg-slate-100 p-2 sm:p-6 rounded-xl border border-slate-200 overflow-x-auto">
            <div className="mx-auto min-w-[300px] max-w-[720px] bg-white rounded-lg shadow-lg p-4 sm:p-10 border border-slate-200 text-slate-800 text-xs space-y-4">
              <div className="w-full h-1.5 bg-blue-600 mb-4" />

              <div className="flex justify-between items-start pb-3 border-b border-slate-200">
                <div>
                  <h1 className="text-xl font-black text-blue-600 tracking-tight">GENFREX</h1>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    DIGITAL SERVICES & TALENT ECOSYSTEM
                  </p>
                </div>
                <div className="text-right text-[10px] text-slate-500">
                  <p className="font-semibold text-slate-700">genfrexofficial@gmail.com</p>
                  <p className="text-blue-600">Build. Grow. Connect.</p>
                </div>
              </div>

              <div className="bg-slate-50 py-2 text-center rounded border border-slate-200 font-bold text-slate-900 uppercase">
                {formData.title}
              </div>

              <div className="flex justify-between text-slate-600 font-semibold text-[11px]">
                <span>Ref: (Auto-allocated upon submission e.g. GFX/HR/2026/XXXX)</span>
                <span>Date: {formData.appointmentDate}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-0.5">
                <p className="font-bold text-slate-900">{selectedCandidate?.name}</p>
                <p className="text-slate-500">{selectedCandidate?.email} • {selectedCandidate?.phone}</p>
                <p className="text-slate-500">{selectedCandidate?.address}</p>
              </div>

              <p className="font-bold text-slate-900">Dear {selectedCandidate?.name},</p>
              <p className="text-justify text-slate-700">
                On behalf of GENFREX, we are pleased to offer you an appointment as{' '}
                <strong>{formData.designation}</strong> in our <strong>{formData.department}</strong> department.
              </p>

              {/* Details Summary */}
              <div className="border border-slate-200 rounded overflow-hidden">
                <div className="grid grid-cols-2 p-2 bg-slate-50 border-b border-slate-200">
                  <span className="font-semibold text-slate-600">Designation:</span>
                  <span className="font-bold text-slate-900">{formData.designation}</span>
                </div>
                <div className="grid grid-cols-2 p-2 border-b border-slate-200">
                  <span className="font-semibold text-slate-600">Joining Date:</span>
                  <span className="font-bold text-blue-700">{formData.joiningDate}</span>
                </div>
                <div className="grid grid-cols-2 p-2 bg-slate-50 border-b border-slate-200">
                  <span className="font-semibold text-slate-600">Compensation / Stipend:</span>
                  <span className="font-bold text-emerald-700">
                    ₹ {Number(formData.compensation).toLocaleString('en-IN')} / {formData.compensationFrequency}
                  </span>
                </div>
                <div className="grid grid-cols-2 p-2">
                  <span className="font-semibold text-slate-600">Acceptance Deadline:</span>
                  <span className="font-bold text-rose-600">{formData.acceptanceDeadline}</span>
                </div>
              </div>

              {/* Roles & Responsibilities preview */}
              {formData.responsibilities.length > 0 && (
                <div className="pt-2">
                  <p className="font-bold text-slate-900 mb-1">Key Responsibilities:</p>
                  <ul className="list-disc pl-5 space-y-0.5 text-slate-700">
                    {formData.responsibilities.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Signatories */}
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-200">
                <div className="p-2 border rounded bg-slate-50 text-[11px]">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Authorized Signatory</p>
                  <p className="font-bold text-slate-900 mt-4">P.S. Dharshan</p>
                  <p className="text-slate-600">Founder, GENFREX</p>
                </div>
                <div className="p-2 border rounded bg-slate-50 text-[11px]">
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Authorized Signatory</p>
                  <p className="font-bold text-slate-900 mt-4">Deepak P</p>
                  <p className="text-slate-600">Chief Operating Officer, GENFREX</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-slate-100">
            <Button variant="secondary" size="sm" onClick={() => setStep(4)}>
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              <span>Back to Clauses</span>
            </Button>
            <Button variant="primary" size="sm" onClick={() => setStep(6)}>
              <span>Next: Final Review & Submission</span>
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* STEP 6: SUBMIT FOR ADMIN APPROVAL */}
      {step === 6 && (
        <Card className="space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">Step 6: Submit for Admin Approval</h2>
            <p className="text-xs text-slate-500">
              Review submission details. Once submitted, the letter is locked for Admin review and approval.
            </p>
          </div>

          {/* Submission Summary Card */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Candidate</span>
                <span className="font-bold text-slate-900">{selectedCandidate?.name}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Position</span>
                <span className="font-bold text-slate-900">{formData.designation}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Joining Date</span>
                <span className="font-bold text-blue-600">{formData.joiningDate}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Stipend</span>
                <span className="font-bold text-emerald-700">
                  ₹ {Number(formData.compensation).toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {/* Project Context summary */}
            {(formData.projectId || formData.clientId) && (
              <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-600 flex flex-wrap items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">
                  Project Linked
                </span>
                {selectedProjectObj && (
                  <span>Project: <strong>{selectedProjectObj.name}</strong></span>
                )}
                {selectedClientObj && (
                  <span>Client: <strong>{selectedClientObj.companyName || selectedClientObj.name}</strong></span>
                )}
                {selectedReqObj && (
                  <span>Requirement: <strong>{selectedReqObj.title}</strong></span>
                )}
              </div>
            )}
          </div>

          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-1">
            <p className="font-bold">Administrative Approval Policy</p>
            <p className="text-[11px] text-amber-700">
              In accordance with GENFREX compliance, HR cannot self-approve appointment letters.
              Submitting now queues this letter for Admin approval before PDF dispatch or email issuance.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" size="sm" onClick={() => setStep(5)}>
              <ArrowLeft className="w-3.5 h-3.5 mr-1" />
              <span>Back to Preview</span>
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSave(false)}
                disabled={submitting}
              >
                <Save className="w-3.5 h-3.5 mr-1" />
                <span>Save Draft</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleSave(true)}
                loading={submitting}
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                <span>Submit for Admin Approval</span>
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CreateAppointment;
