import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useParams, useLocation, Link } from 'react-router-dom';
import { hrService } from '../../services/hrService';
import { projectService } from '../../services/projectService';
import { clientService } from '../../services/clientService';
import { taskRequestService } from '../../services/taskRequestService';
import { EmployeeService } from '../../services/EmployeeService';
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
  AlertTriangle,
  Plus,
  Layers,
  Building2,
  HelpCircle,
  UserCheck,
  Sparkles
} from 'lucide-react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import toast from 'react-hot-toast';

const STANDARD_DEPARTMENTS = [
  'Engineering',
  'Design & Product',
  'DevOps & Infrastructure',
  'Quality Assurance',
  'Data & Analytics',
  'People Operations',
  'Human Resources',
  'Finance & Accounts',
  'Sales & Marketing',
  'Operations',
  'IT & Security'
];

const STANDARD_TRACKS = [
  { value: 'TRAINEE', label: 'TRAINEE (GENFREX Trainee Program)' },
  { value: 'INTERNSHIP', label: 'INTERNSHIP' },
  { value: 'FULL_TIME', label: 'FULL TIME' },
  { value: 'PART_TIME', label: 'PART TIME' }
];

const STANDARD_TRACK_VALUES = STANDARD_TRACKS.map((t) => t.value);

const getTrackDisplay = (track) => {
  const t = (track || '').toUpperCase();
  if (t === 'FULL_TIME' || t === 'FULL-TIME') return 'Full Time';
  if (t === 'PART_TIME' || t === 'PART-TIME') return 'Part Time';
  if (t === 'INTERNSHIP') return 'Internship';
  if (t === 'TRAINEE') return 'Trainee';
  return track || 'Trainee';
};

const getTrackTitle = (track) => {
  const t = (track || '').toUpperCase();
  if (t === 'FULL_TIME' || t === 'FULL-TIME') return 'FULL TIME APPOINTMENT LETTER';
  if (t === 'PART_TIME' || t === 'PART-TIME') return 'PART TIME APPOINTMENT LETTER';
  if (t === 'INTERNSHIP') return 'INTERNSHIP APPOINTMENT LETTER';
  if (t === 'TRAINEE') return 'TRAINEE APPOINTMENT LETTER';
  if (track && track.trim()) return `${t.replace(/_/g, ' ').trim()} APPOINTMENT LETTER`;
  return 'APPOINTMENT LETTER';
};

const getTrackEmploymentType = (track) => {
  const t = (track || '').toUpperCase();
  if (t === 'FULL_TIME' || t === 'FULL-TIME') return 'Full-time';
  if (t === 'PART_TIME' || t === 'PART-TIME') return 'Part-time';
  if (t === 'INTERNSHIP') return 'Internship';
  if (t === 'TRAINEE') return 'Trainee';
  return track || 'Trainee';
};

const getTrackDefaultTerms = (track) => {
  const t = (track || '').toUpperCase();
  if (t === 'FULL_TIME' || t === 'FULL-TIME') {
    return [
      'Employment Status: Full-time permanent position subject to a standard 3-month probation period.',
      'Working Hours & Mode: Professional business engagement adhering to GENFREX operating hours and product engineering schedule.',
      'Compensation & Benefits: Compensation package disbursed monthly in accordance with GENFREX corporate payroll policies.',
      'Notice Period: 30 days written notice during probation; 60 days following confirmation of employment.'
    ];
  }
  if (t === 'PART_TIME' || t === 'PART-TIME') {
    return [
      'Employment Status: Part-time professional engagement with defined weekly deliverables and flexible work hours.',
      'Working Hours & Mode: Part-time schedule adhering to agreed hours and project sprint delivery milestones.',
      'Compensation: Compensation disbursed according to part-time payroll schedule upon delivery of assigned work.',
      'Notice Period: Either party may terminate this part-time engagement by providing a written notice of 15 days.'
    ];
  }
  if (t === 'INTERNSHIP') {
    return [
      'Internship Status: Fixed-term academic and practical internship for students or fresh graduates within the GENFREX ecosystem.',
      'Working Hours & Mode: Flexible hybrid/remote hours compatible with academic guidelines and sprint deliverables.',
      'Compensation: Educational monthly stipend disbursed during the tenure of internship.',
      'Notice Period: Either party may conclude this internship engagement by providing 7 days written notice.'
    ];
  }
  return [
    'Appointment Status: This appointment is for training and professional development within the GENFREX ecosystem. Successful completion of the trainee period may lead to performance-based full-time consideration.',
    'Working Hours & Mode: The trainee shall adhere to the agreed schedule and mode of engagement specified in the appointment details.',
    'Compensation: A monthly stipend/compensation shall be disbursed in accordance with GENFREX payroll schedules, subject to statutory deductions where applicable.',
    'Notice Period: Either party may terminate this trainee engagement by providing a written notice of 15 days or compensation in lieu thereof during the trainee period.'
  ];
};

const CreateAppointment = () => {
  const [searchParams] = useSearchParams();
  const { id: routeEditId } = useParams();
  const location = useLocation();
  const editId = routeEditId || searchParams.get('editId');
  const isEditing = Boolean(editId);

  const preselectedCandidateId = searchParams.get('candidateId');
  const preselectedProjectId = searchParams.get('projectId');
  const preselectedClientId = searchParams.get('clientId');
  const preselectedReqId = searchParams.get('requirementId');
  const preselectedEmployeeId = searchParams.get('EmployeeId');
  const preselectedDesignation = searchParams.get('designation');

  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [isCustomDept, setIsCustomDept] = useState(false);
  const [isCustomTrack, setIsCustomTrack] = useState(false);
  const [isCustomTemplate, setIsCustomTemplate] = useState(false);
  const [customTemplateName, setCustomTemplateName] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [isPaidStipend, setIsPaidStipend] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [Employees, setEmployees] = useState([]);

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
    isPaid: true,
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
    variablePay: {
      isEnabled: false,
      amount: '',
      frequency: 'ANNUAL',
      criteria: ''
    },
    responsibilities: [],
    terms: [],
    confidentialityTerms: '',
    professionalConductTerms: '',
    acceptanceDeadline: '',
    // Step 3 Project Context (Optional)
    clientId: preselectedClientId || '',
    projectId: preselectedProjectId || '',
    requirementId: preselectedReqId || '',
    EmployeeId: preselectedEmployeeId || ''
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const applyTemplate = (tmpl, overrideDetails = false) => {
    if (!tmpl) return;
    setIsCustomTemplate(false);
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
        EmployeeService.getEmployees().catch(() => ({ success: false }))
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
      if (workRes.success) setEmployees(workRes.Employees || []);

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

      // If in edit mode, fetch existing appointment and populate fields
      if (isEditing) {
        const appRes = await hrService.getAppointmentById(editId).catch(() => null);
        if (appRes?.success && appRes.appointment) {
          const app = appRes.appointment;
          setEditingAppointment(app);
          const cand = app.candidateId || app.candidate;
          if (cand) {
            setSelectedCandidate(cand);
          }
          const loadedTrack = app.appointmentType || 'TRAINEE';
          const expectedTrackTitle = `${loadedTrack.replace(/_/g, ' ')} APPOINTMENT LETTER`.toUpperCase();
          const effectiveTitle = (app.title && app.title !== 'TRAINEE APPOINTMENT LETTER')
            ? app.title
            : (loadedTrack === 'TRAINEE' ? (app.title || expectedTrackTitle) : expectedTrackTitle);
          const effectiveEmpType = app.employmentType || getTrackEmploymentType(loadedTrack);
          const tId = app.templateId?._id || app.templateId || '';
          if (tId) setSelectedTemplateId(tId);

          setFormData({
            candidateId: cand?._id || cand || '',
            templateId: tId,
            appointmentType: loadedTrack,
            employmentType: effectiveEmpType,
            title: effectiveTitle,
            designation: app.designation || '',
            department: app.department || 'Engineering',
            appointmentDate: app.appointmentDate ? new Date(app.appointmentDate).toISOString().substring(0, 10) : new Date().toISOString().substring(0, 10),
            joiningDate: app.joiningDate ? new Date(app.joiningDate).toISOString().substring(0, 10) : '',
            workLocation: app.workLocation || 'Remote / Bengaluru HQ',
            reportingManager: app.reportingManager || 'Technical Lead',
            compensation: (app.isPaid === false || Number(app.compensation) === 0 || app.compensationFrequency === 'UNPAID')
              ? ''
              : (app.compensation || 25000),
            compensationFrequency: (app.isPaid === false || Number(app.compensation) === 0 || app.compensationFrequency === 'UNPAID')
              ? 'UNPAID'
              : (app.compensationFrequency || 'STIPEND_MONTHLY'),
            variablePay: {
              isEnabled: Boolean(app.variablePay?.isEnabled),
              amount: app.variablePay?.amount || '',
              frequency: app.variablePay?.frequency || 'ANNUAL',
              criteria: app.variablePay?.criteria || ''
            },
            responsibilities: app.responsibilities && app.responsibilities.length > 0 ? [...app.responsibilities] : [],
            terms: app.terms && app.terms.length > 0 ? [...app.terms] : getTrackDefaultTerms(loadedTrack),
            confidentialityTerms: app.confidentialityTerms || '',
            professionalConductTerms: app.professionalConductTerms || '',
            acceptanceDeadline: app.acceptanceDeadline ? new Date(app.acceptanceDeadline).toISOString().substring(0, 10) : '',
            clientId: app.clientId?._id || app.clientId || app.client?._id || app.client || '',
            projectId: app.projectId?._id || app.projectId || app.project?._id || app.project || '',
            requirementId: app.requirementId?._id || app.requirementId || app.requirement?._id || app.requirement || '',
            EmployeeId: app.EmployeeId?._id || app.EmployeeId || app.assignedEmployee?._id || app.assignedEmployee || ''
          });
          if (app.department && !STANDARD_DEPARTMENTS.includes(app.department)) {
            setIsCustomDept(true);
          }
          if (app.appointmentType && !STANDARD_TRACK_VALUES.includes(app.appointmentType)) {
            setIsCustomTrack(true);
          }
          if (app.letterContentSnapshot?.customTemplateName) {
            setIsCustomTemplate(true);
            setCustomTemplateName(app.letterContentSnapshot.customTemplateName);
          }
          if (app.isPaid === false || Number(app.compensation) === 0 || app.compensationFrequency === 'UNPAID') {
            setIsPaidStipend(false);
          } else {
            setIsPaidStipend(true);
          }
          setStep(2); // Jump directly to details since candidate is already set
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
    const empNorm = (cand.employmentType || '').toUpperCase().replace('-', '_');
    const track = empNorm === 'FULL_TIME' ? 'FULL_TIME' :
      empNorm === 'PART_TIME' ? 'PART_TIME' :
        empNorm === 'INTERNSHIP' ? 'INTERNSHIP' :
          empNorm === 'TRAINEE' ? 'TRAINEE' :
            (cand.employmentType || 'TRAINEE');

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

    if (cand.department && !STANDARD_DEPARTMENTS.includes(cand.department)) {
      setIsCustomDept(true);
    } else {
      setIsCustomDept(false);
    }

    if (track && !STANDARD_TRACK_VALUES.includes(track)) {
      setIsCustomTrack(true);
    } else {
      setIsCustomTrack(false);
    }

    const isCandUnpaid = cand.compensation === 0 || cand.compensationFrequency === 'UNPAID';
    if (isCandUnpaid) {
      setIsPaidStipend(false);
    } else if (cand.compensation > 0) {
      setIsPaidStipend(true);
    }

    const targetTitle = (matchedTmpl && matchedTmpl.appointmentType === track) ? matchedTmpl.title : getTrackTitle(track);
    const targetTerms = (matchedTmpl?.termsAndConditions?.length > 0) ? [...matchedTmpl.termsAndConditions] : getTrackDefaultTerms(track);

    setFormData((prev) => ({
      ...prev,
      candidateId: cand._id,
      title: targetTitle,
      designation: cand.designation || prev.designation,
      department: cand.department || prev.department || matchedTmpl?.department || 'Engineering',
      employmentType: cand.employmentType || getTrackEmploymentType(track),
      appointmentType: track,
      terms: targetTerms,
      joiningDate: cand.joiningDate ? cand.joiningDate.substring(0, 10) : prev.joiningDate,
      workLocation: cand.workLocation || prev.workLocation,
      reportingManager: cand.reportingManager || prev.reportingManager,
      compensation: isCandUnpaid ? '' : (cand.compensation || prev.compensation),
      compensationFrequency: isCandUnpaid ? 'UNPAID' : (cand.compensationFrequency || prev.compensationFrequency),
      variablePay: (cand.variablePay && cand.variablePay.isEnabled !== undefined) ? {
        isEnabled: Boolean(cand.variablePay.isEnabled),
        amount: cand.variablePay.amount || '',
        frequency: cand.variablePay.frequency || 'ANNUAL',
        criteria: cand.variablePay.criteria || ''
      } : prev.variablePay,
      acceptanceDeadline: prev.acceptanceDeadline || deadline,
      projectId: prev.projectId || cand.projectId || cand.project?._id || cand.project || '',
      clientId: prev.clientId || cand.clientId || cand.client?._id || cand.client || '',
      requirementId: prev.requirementId || cand.requirementId || cand.requirement?._id || cand.requirement || '',
      EmployeeId: prev.EmployeeId || cand.EmployeeId || cand.assignedEmployee?._id || cand.assignedEmployee || ''
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

  const handleVariablePayChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      variablePay: {
        ...(prev.variablePay || { isEnabled: false, amount: '', frequency: 'ANNUAL', criteria: '' }),
        [field]: value
      }
    }));
  };

  const handleTrackChange = (newTrack) => {
    const matchedTrackTmpl = (templates || []).find((t) => t.appointmentType === newTrack);
    const newTitle = matchedTrackTmpl?.title || getTrackTitle(newTrack);
    const newEmpType = getTrackEmploymentType(newTrack);
    const newTerms = matchedTrackTmpl?.termsAndConditions?.length > 0
      ? [...matchedTrackTmpl.termsAndConditions]
      : getTrackDefaultTerms(newTrack);

    setFormData((prev) => ({
      ...prev,
      appointmentType: newTrack,
      employmentType: newEmpType,
      title: newTitle,
      terms: newTerms,
      templateId: matchedTrackTmpl?._id || prev.templateId
    }));
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

  const handleSaveCustomTemplate = async () => {
    if (!customTemplateName.trim()) {
      toast.error('Please enter a name for the custom template.');
      return;
    }
    try {
      setSavingTemplate(true);
      const res = await hrService.createLetterTemplate({
        name: customTemplateName.trim(),
        targetRole: customTemplateName.trim(),
        department: formData.department || 'Engineering',
        appointmentType: formData.appointmentType || 'TRAINEE',
        roleCategory: 'CUSTOM',
        title: formData.title || `${customTemplateName.trim().toUpperCase()} APPOINTMENT LETTER`,
        roleAndResponsibilities: formData.responsibilities.filter((r) => r && r.trim()),
        termsAndConditions: formData.terms.filter((t) => t && t.trim()),
        confidentialityClause: formData.confidentialityTerms,
        professionalConductClause: formData.professionalConductTerms
      });

      if (res.success && res.template) {
        toast.success(`Template "${res.template.targetRole || res.template.name}" saved to Master Templates!`);
        setTemplates((prev) => [...prev, res.template]);
        setTemplate(res.template);
        setSelectedTemplateId(res.template._id);
        setIsCustomTemplate(false);
        setFormData((prev) => ({
          ...prev,
          templateId: res.template._id
        }));
      } else {
        toast.error(res.message || 'Failed to save template.');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save custom template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleSave = async (submitNow = false) => {
    if (!formData.candidateId) {
      toast.error('Please select a candidate in Step 1.');
      setStep(1);
      return;
    }
    if (!formData.designation || !formData.joiningDate || !formData.acceptanceDeadline) {
      toast.error('Please complete all required appointment details in Step 2.');
      setStep(2);
      return;
    }
    if (isPaidStipend && (!formData.compensation || Number(formData.compensation) <= 0)) {
      toast.error('Please enter a valid stipend/compensation amount for the Paid engagement.');
      setStep(2);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        isPaid: isPaidStipend,
        compensation: isPaidStipend ? Number(formData.compensation) : 0,
        compensationFrequency: isPaidStipend
          ? (formData.compensationFrequency === 'UNPAID' ? 'STIPEND_MONTHLY' : formData.compensationFrequency)
          : 'UNPAID',
        variablePay: {
          isEnabled: isPaidStipend && Boolean(formData.variablePay?.isEnabled),
          amount: (isPaidStipend && formData.variablePay?.isEnabled) ? Number(formData.variablePay?.amount || 0) : 0,
          frequency: formData.variablePay?.frequency || 'ANNUAL',
          criteria: formData.variablePay?.criteria || ''
        },
        isCustomTemplate,
        customTemplateName: isCustomTemplate ? customTemplateName : null,
        templateId: isCustomTemplate ? null : formData.templateId,
        clientId: formData.clientId || null,
        client: formData.clientId || null,
        projectId: formData.projectId || null,
        project: formData.projectId || null,
        requirementId: formData.requirementId || null,
        requirement: formData.requirementId || null,
        EmployeeId: formData.EmployeeId || null,
        assignedEmployee: formData.EmployeeId || null,
        submitNow
      };

      let res;
      if (isEditing) {
        res = await hrService.updateAppointment(editId, payload);
      } else {
        res = await hrService.createAppointment(payload);
      }

      if (res.success) {
        toast.success(
          submitNow
            ? (isEditing ? 'Appointment letter updated & resubmitted for Admin approval!' : 'Appointment letter submitted for Admin approval!')
            : (isEditing ? 'Appointment letter updated successfully!' : 'Appointment draft saved successfully!')
        );
        const redirectBase = location.pathname.includes('/admin/') ? '/admin/hr/appointments' : '/hr/appointments';
        const targetId = isEditing ? editId : res.appointment?._id;
        navigate(targetId ? `${redirectBase}/${targetId}` : redirectBase);
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
  const selectedEmployeeObj = Employees.find((w) => w._id === formData.EmployeeId);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-slate-200">
        <div>
          <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">
            GENFREX HR OfferFlow
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
            {isEditing
              ? editingAppointment?.status === 'REJECTED'
                ? 'Update & Fix Returned Appointment Letter'
                : 'Edit Appointment Letter'
              : 'Create Appointment Letter'}
          </h1>
          <p className="text-xs text-slate-500">
            {isEditing
              ? `Revising letter ${editingAppointment?.referenceNumber || ''} • Update details across steps and resubmit for approval`
              : '6-Step guided appointment workflow with optional ClientFlow project linking'}
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            const redirectBase = location.pathname.includes('/admin/') ? '/admin/hr/appointments' : '/hr/appointments';
            navigate(isEditing ? `${redirectBase}/${editId}` : redirectBase);
          }}
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          <span>{isEditing ? 'Back to Letter' : 'Back to Letters'}</span>
        </Button>
      </div>

      {/* Alert banner if fixing a returned / rejected appointment letter */}
      {isEditing && editingAppointment?.status === 'REJECTED' && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="flex items-center gap-2">
              <p className="font-bold text-rose-900 text-sm">
                Returned for Revision by Admin: {editingAppointment.referenceNumber}
              </p>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 text-rose-800">
                Action Required
              </span>
            </div>
            <p className="text-rose-800 font-medium mt-1">
              Admin Rejection Reason: <strong className="font-bold underline">"{editingAppointment.rejectionReason}"</strong>
            </p>
            <p className="text-rose-600 mt-1 text-[11px]">
              You can modify the candidate role, compensation, responsibilities, or terms across the steps below. Once updated, click <strong>"Update & Resubmit for Approval"</strong> in Step 6.
            </p>
          </div>
        </div>
      )}

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
              className={`flex items-center justify-center sm:justify-start gap-1.5 py-2 px-2.5 rounded-xl font-semibold transition-all ${isActive
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                : isDone
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold ${isActive ? 'bg-white text-blue-600' : isDone ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-600'
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
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${isSelected
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
          {!isCustomTemplate ? (
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
                <div className="flex items-center gap-2 shrink-0">
                  {template && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      <CheckCircle2 className="w-3 h-3 text-blue-600" />
                      <span>Applied: {template.targetRole || template.name}</span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomTemplate(true);
                      setSelectedTemplateId('__CUSTOM__');
                      if (!customTemplateName && formData.designation) {
                        setCustomTemplateName(formData.designation);
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer"
                  >
                    + Add custom / manual
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <div className="relative flex-1">
                  <select
                    value={selectedTemplateId}
                    onChange={(e) => {
                      if (e.target.value === '__CUSTOM__') {
                        setIsCustomTemplate(true);
                        setSelectedTemplateId('__CUSTOM__');
                        if (!customTemplateName && formData.designation) {
                          setCustomTemplateName(formData.designation);
                        }
                      } else {
                        const found = templates.find((t) => t._id === e.target.value);
                        if (found) {
                          applyTemplate(found, true);
                          toast.success(`Applied template: ${found.targetRole || found.name}`);
                        }
                      }
                    }}
                    className="w-full p-2.5 rounded-xl border border-blue-200 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm"
                  >
                    {templates.map((t) => (
                      <option key={t._id} value={t._id}>
                        {t.targetRole || t.name} • [{t.department}] • {t.appointmentType}
                      </option>
                    ))}
                    <option value="__CUSTOM__">+ Enter Other / Custom Role Template (Manual)...</option>
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
          ) : (
            <div className="p-4 bg-gradient-to-r from-amber-50/80 via-blue-50/40 to-slate-50 border border-amber-300 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-600 text-white shadow-sm shadow-amber-500/20">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      Custom / Manual Role Template
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Manual template mode active. Define your own role title and customize duties, terms, and clauses in Step 4.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    <Sparkles className="w-3 h-3 text-amber-600" />
                    <span>Manual / Custom Template</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomTemplate(false);
                      const defaultTmpl = templates.find((t) => t._id === selectedTemplateId) || templates[0];
                      if (defaultTmpl) {
                        applyTemplate(defaultTmpl, false);
                      }
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer"
                  >
                    ← Select from preset templates
                  </button>
                </div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={customTemplateName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCustomTemplateName(val);
                      setFormData((prev) => ({
                        ...prev,
                        title: val ? `${val.toUpperCase()} APPOINTMENT LETTER` : prev.title,
                        designation: prev.designation || val
                      }));
                    }}
                    placeholder="Type custom role or template name (e.g. AI Prompt Engineer, Growth Lead, Business Analyst...)"
                    className="flex-1 p-2.5 rounded-xl border border-amber-400 bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-sm"
                    autoFocus
                  />

                  {customTemplateName.trim() && (
                    <button
                      type="button"
                      onClick={handleSaveCustomTemplate}
                      disabled={savingTemplate}
                      className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50 cursor-pointer"
                    >
                      <span>{savingTemplate ? 'Saving...' : '💾 Save to Master Templates'}</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-0.5">
                  <span>
                    Manual template enabled: You can freely customize duties & obligations in <strong>Step 4</strong> without preset overrides.
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          responsibilities: [''],
                          terms: ['']
                        }));
                        toast.success('Clauses cleared for fresh manual entry in Step 4');
                      }}
                      className="text-xs text-rose-600 hover:text-rose-800 font-medium hover:underline cursor-pointer"
                    >
                      Clear clauses (Start blank)
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => {
                        const baseline = templates[0];
                        if (baseline) {
                          setFormData((prev) => ({
                            ...prev,
                            responsibilities: [...(baseline.roleAndResponsibilities || [])],
                            terms: [...(baseline.termsAndConditions || [])],
                            confidentialityTerms: baseline.confidentialityClause || prev.confidentialityTerms,
                            professionalConductTerms: baseline.professionalConductClause || prev.professionalConductTerms
                          }));
                          toast.success('Loaded baseline clauses as draft');
                        }
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer"
                    >
                      Load baseline clauses
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

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
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700">
                  Employment Track <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isCustomTrack;
                    setIsCustomTrack(next);
                    if (!next && !STANDARD_TRACK_VALUES.includes(formData.appointmentType)) {
                      handleTrackChange('TRAINEE');
                    }
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer"
                >
                  {isCustomTrack ? '← Select from list' : '+ Add custom / manual'}
                </button>
              </div>

              {isCustomTrack ? (
                <div>
                  <input
                    type="text"
                    name="appointmentType"
                    required
                    value={formData.appointmentType}
                    onChange={(e) => handleTrackChange(e.target.value)}
                    placeholder="Type track name (e.g. PART TIME, CONTRACT, CONSULTANT, etc.)"
                    className="w-full p-2 rounded-lg border border-blue-400 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-blue-50/20 font-medium uppercase"
                    autoFocus
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Manual employment track entry enabled.</p>
                </div>
              ) : (
                <select
                  name="appointmentType"
                  value={STANDARD_TRACK_VALUES.includes(formData.appointmentType) ? formData.appointmentType : '__CUSTOM__'}
                  onChange={(e) => {
                    if (e.target.value === '__CUSTOM__') {
                      setIsCustomTrack(true);
                    } else {
                      handleTrackChange(e.target.value);
                    }
                  }}
                  className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 font-medium"
                >
                  {STANDARD_TRACKS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                  <option value="__CUSTOM__">+ Add Custom / Manual Track...</option>
                </select>
              )}
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
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700">
                  Department <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isCustomDept;
                    setIsCustomDept(next);
                    if (!next && !STANDARD_DEPARTMENTS.includes(formData.department)) {
                      setFormData((prev) => ({ ...prev, department: 'Engineering' }));
                    }
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer"
                >
                  {isCustomDept ? '← Select from list' : '+ Add custom / manual'}
                </button>
              </div>

              {isCustomDept ? (
                <div>
                  <input
                    type="text"
                    name="department"
                    required
                    value={formData.department}
                    onChange={handleInputChange}
                    placeholder="Type department name (e.g. People Operations, Finance, etc.)"
                    className="w-full p-2 rounded-lg border border-blue-400 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-blue-50/20"
                    autoFocus
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Manual department entry enabled.</p>
                </div>
              ) : (
                <select
                  name="department"
                  value={STANDARD_DEPARTMENTS.includes(formData.department) ? formData.department : '__CUSTOM__'}
                  onChange={(e) => {
                    if (e.target.value === '__CUSTOM__') {
                      setIsCustomDept(true);
                      setFormData((prev) => ({ ...prev, department: '' }));
                    } else {
                      handleInputChange(e);
                    }
                  }}
                  className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
                >
                  {STANDARD_DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                  {!STANDARD_DEPARTMENTS.includes(formData.department) && formData.department && (
                    <option value={formData.department}>{formData.department} (Custom)</option>
                  )}
                  <option value="__CUSTOM__">+ Enter Other / Custom Department (Manual)...</option>
                </select>
              )}
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

            {/* Stipend Options: Paid vs Unpaid */}
            <div className="col-span-1 sm:col-span-2 p-3.5 bg-slate-50/80 border border-slate-200 rounded-xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="block font-bold text-slate-800 text-xs">
                    Stipend / Compensation Type <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Choose whether this role is a Paid or Unpaid engagement / internship
                  </p>
                </div>

                <div className="inline-flex p-1 bg-white border border-slate-200 rounded-xl shadow-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPaidStipend(true);
                      setFormData((prev) => ({
                        ...prev,
                        isPaid: true,
                        compensation: prev.compensation && Number(prev.compensation) > 0 ? prev.compensation : 15000,
                        compensationFrequency: prev.compensationFrequency === 'UNPAID' ? 'STIPEND_MONTHLY' : prev.compensationFrequency
                      }));
                    }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${isPaidStipend
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                  >
                    <span>Paid</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsPaidStipend(false);
                      setFormData((prev) => ({
                        ...prev,
                        isPaid: false,
                        compensation: '',
                        compensationFrequency: 'UNPAID'
                      }));
                    }}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${!isPaidStipend
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                  >
                    <span>Unpaid</span>
                  </button>
                </div>
              </div>

              {isPaidStipend ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Stipend / Compensation Amount (₹) <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">₹</span>
                        <input
                          type="number"
                          name="compensation"
                          min="1"
                          required
                          value={formData.compensation || ''}
                          onChange={handleInputChange}
                          placeholder="Enter amount manually (e.g. 15000)"
                          className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 font-semibold"
                          autoFocus
                        />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">Enter stipend or compensation amount manually.</p>
                    </div>

                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">
                        Compensation Frequency
                      </label>
                      <select
                        name="compensationFrequency"
                        value={formData.compensationFrequency === 'UNPAID' ? 'STIPEND_MONTHLY' : formData.compensationFrequency}
                        onChange={handleInputChange}
                        className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
                      >
                        <option value="STIPEND_MONTHLY">Monthly Stipend</option>
                        <option value="MONTHLY">Monthly Salary</option>
                        <option value="ANNUAL">Annual CTC</option>
                      </select>
                    </div>
                  </div>

                  {/* Performance-based Pay Section */}
                  <div className="pt-3 border-t border-slate-200/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={Boolean(formData.variablePay?.isEnabled)}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            handleVariablePayChange('isEnabled', checked);
                          }}
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                        />
                        <span>Include Performance-based Pay</span>
                      </label>
                      {formData.variablePay?.isEnabled && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                          Performance Pay Active
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 pl-6">
                      Add performance-linked incentive, appraisal bonus, or milestone pay
                    </p>

                    {formData.variablePay?.isEnabled && (
                      <div className="p-3.5 bg-blue-50/50 border border-blue-200/70 rounded-xl space-y-3 mt-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">
                              Performance-based Pay Amount (₹) <span className="text-rose-500">*</span>
                            </label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-slate-400 font-bold text-xs">₹</span>
                              <input
                                type="number"
                                min="0"
                                value={formData.variablePay?.amount || ''}
                                onChange={(e) => handleVariablePayChange('amount', e.target.value)}
                                placeholder="e.g. 50000"
                                className="w-full pl-7 pr-3 py-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 font-semibold bg-white"
                              />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">Amount allocated for performance-based incentive.</p>
                          </div>

                          <div>
                            <label className="block font-semibold text-slate-700 mb-1">
                              Payout Frequency / Cycle
                            </label>
                            <select
                              value={formData.variablePay?.frequency || 'ANNUAL'}
                              onChange={(e) => handleVariablePayChange('frequency', e.target.value)}
                              className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
                            >
                              <option value="ANNUAL">Annual Performance Bonus (Yearly)</option>
                              <option value="QUARTERLY">Quarterly Appraisal Bonus</option>
                              <option value="HALF_YEARLY">Half-Yearly Bonus</option>
                              <option value="MONTHLY">Monthly Performance Pay</option>
                              <option value="MILESTONE">Project Milestone / Delivery Based</option>
                            </select>
                            <p className="text-[10px] text-slate-400 mt-1">Disbursement evaluation cycle.</p>
                          </div>
                        </div>

                        <div>
                          <label className="block font-semibold text-slate-700 mb-1">
                            Payout Criteria / Notes (Optional)
                          </label>
                          <input
                            type="text"
                            value={formData.variablePay?.criteria || ''}
                            onChange={(e) => handleVariablePayChange('criteria', e.target.value)}
                            placeholder="e.g. Subject to individual KPI performance >= 80% & active employment at disbursement"
                            className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 bg-white text-xs"
                          />
                        </div>

                        {/* Performance-based Pay Summary Box */}
                        {Number(formData.compensation || 0) > 0 && Number(formData.variablePay?.amount || 0) > 0 && (
                          <div className="p-3 bg-white border border-blue-200 rounded-lg text-xs space-y-1.5 shadow-xs">
                            <div className="flex items-center justify-between text-slate-600 font-medium">
                              <span>Fixed Compensation ({formData.compensationFrequency}):</span>
                              <span className="font-semibold text-slate-800">
                                ₹ {Number(formData.compensation).toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-blue-700 font-medium">
                              <span>Performance-based Pay ({formData.variablePay.frequency}):</span>
                              <span className="font-semibold text-blue-800">
                                ₹ {Number(formData.variablePay.amount).toLocaleString('en-IN')}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <p className="font-bold text-amber-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Unpaid Engagement / Internship
                    </p>
                    <p className="text-[11px] text-amber-700">
                      No monetary compensation or stipend will be disbursed. Appointment will be issued as an Unpaid Internship/Engagement.
                    </p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-amber-200/80 text-amber-900 font-bold text-[10px] uppercase tracking-wider shrink-0">
                    Unpaid
                  </span>
                </div>
              )}
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
                Link this appointment letter to a ClientFlow Client, Project, Requirement, or Assigned Employee.
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
              Clients and Employees will never see salary, compensation amounts, internal notes, or appointment letter contents.
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
                Assigned Employee / Mentor (Optional):
              </label>
              <select
                name="EmployeeId"
                value={formData.EmployeeId}
                onChange={handleInputChange}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="">-- None (Direct Manager Assignment) --</option>
                {Employees.map((w) => (
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
                  <p className="font-semibold text-slate-700">Email : hr@genfrex.com</p>
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
                <strong>{formData.designation}</strong> ({getTrackDisplay(formData.appointmentType)}) in our{' '}
                <strong>{formData.department}</strong> department.
              </p>

              {/* Details Summary */}
              <div className="border border-slate-200 rounded overflow-hidden">
                <div className="grid grid-cols-2 p-2 bg-slate-50 border-b border-slate-200">
                  <span className="font-semibold text-slate-600">Designation / Role:</span>
                  <span className="font-bold text-slate-900">{formData.designation}</span>
                </div>
                <div className="grid grid-cols-2 p-2 border-b border-slate-200">
                  <span className="font-semibold text-slate-600">Department:</span>
                  <span className="font-bold text-slate-900">{formData.department}</span>
                </div>
                <div className="grid grid-cols-2 p-2 bg-slate-50 border-b border-slate-200">
                  <span className="font-semibold text-slate-600">Employment Track:</span>
                  <span className="font-bold text-blue-700">{getTrackDisplay(formData.appointmentType)}</span>
                </div>
                <div className="grid grid-cols-2 p-2 border-b border-slate-200">
                  <span className="font-semibold text-slate-600">Joining Date:</span>
                  <span className="font-bold text-blue-700">{formData.joiningDate}</span>
                </div>
                <div className="grid grid-cols-2 p-2 bg-slate-50 border-b border-slate-200">
                  <span className="font-semibold text-slate-600">Work Location:</span>
                  <span className="text-slate-800">{formData.workLocation || 'Remote / Hybrid'}</span>
                </div>
                <div className="grid grid-cols-2 p-2 border-b border-slate-200">
                  <span className="font-semibold text-slate-600">Fixed Compensation / Stipend:</span>
                  {isPaidStipend && Number(formData.compensation) > 0 ? (
                    <span className="font-bold text-emerald-700">
                      ₹ {Number(formData.compensation).toLocaleString('en-IN')} / {formData.compensationFrequency}
                    </span>
                  ) : (
                    <span className="font-bold text-amber-700">Unpaid</span>
                  )}
                </div>
                {isPaidStipend && formData.variablePay?.isEnabled && Number(formData.variablePay?.amount || 0) > 0 && (
                  <div className="grid grid-cols-2 p-2 bg-slate-50 border-b border-slate-200">
                    <span className="font-semibold text-slate-600">Performance-based Pay:</span>
                    <span className="font-bold text-blue-700">
                      ₹ {Number(formData.variablePay.amount).toLocaleString('en-IN')} ({formData.variablePay.frequency})
                      {formData.variablePay.criteria ? ` • ${formData.variablePay.criteria}` : ''}
                    </span>
                  </div>
                )}
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

              {/* Terms & Conditions preview */}
              {formData.terms.length > 0 && (
                <div className="pt-2">
                  <p className="font-bold text-slate-900 mb-1">Terms & Conditions:</p>
                  <ol className="list-decimal pl-5 space-y-1 text-slate-700">
                    {formData.terms.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Signatories */}
              <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-200">
                <div className="p-3 border rounded-lg bg-slate-50 text-[11px] flex flex-col justify-between">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Authorized Signatory</p>
                  <div className="h-10 flex items-center mb-1">
                    <img
                      src="/anisha-signature.png"
                      alt="Signature of Anisha"
                      className="h-9 object-contain select-none"
                    />
                  </div>
                  <div>
                    <div className="border-b border-slate-200 pb-1 mb-1.5" />
                    <p className="font-bold text-slate-900 text-xs">Anisha</p>
                    <p className="text-slate-600">People Operations, GENFREX</p>
                  </div>
                </div>
                <div className="p-3 border rounded-lg bg-slate-50 text-[11px] flex flex-col items-center justify-between text-center">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider w-full text-left">Company Seal</p>
                  <div className="my-1 flex items-center justify-center">
                    <img
                      src="/company-seal.png"
                      alt="GENFREX Official Seal"
                      className="w-14 h-14 object-contain drop-shadow-sm select-none"
                    />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-xs">GENFREX</p>
                    <p className="text-slate-500 text-[10px]">Karur • 639113</p>
                  </div>
                </div>
              </div>

              {/* Candidate Acceptance */}
              <div className="mt-4 border border-slate-200 rounded-lg p-3.5 bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Candidate Acceptance</p>
                    <p className="text-xs text-slate-600">
                      I accept the appointment and agree to abide by the terms and conditions outlined in this letter.
                    </p>
                    <p className="text-xs font-bold text-slate-900 mt-1">{selectedCandidate?.name || 'Candidate Name'}</p>
                    <p className="text-[10px] text-slate-400">
                      {formData.appointmentType === 'INTERNSHIP' ? 'Appointed Intern' :
                        formData.appointmentType === 'PART_TIME' ? 'Appointed Part-Time Employee' :
                        formData.appointmentType === 'FULL_TIME' ? 'Appointed Full-Time Employee' :
                        `Appointed ${getTrackDisplay(formData.appointmentType)}`}
                    </p>
                  </div>
                  <div className="sm:w-52 text-right sm:text-center shrink-0">
                    <div className="border-b border-dashed border-slate-400 pb-1 mb-1 mt-3 sm:mt-5">
                      <span className="text-[10px] text-slate-500 italic">Signature & Date</span>
                    </div>
                    <p className="text-[9px] text-slate-400">Authorized Candidate Signature</p>
                  </div>
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
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Position & Track</span>
                <span className="font-bold text-slate-900">
                  {formData.designation} ({getTrackDisplay(formData.appointmentType)})
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Joining Date</span>
                <span className="font-bold text-blue-600">{formData.joiningDate}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Compensation</span>
                {isPaidStipend && Number(formData.compensation) > 0 ? (
                  <div>
                    <span className="font-bold text-emerald-700">
                      ₹ {Number(formData.compensation).toLocaleString('en-IN')}
                    </span>
                    {formData.variablePay?.isEnabled && Number(formData.variablePay?.amount || 0) > 0 ? (
                      <p className="text-[10px] text-blue-600 font-medium mt-0.5 leading-tight">
                        + ₹{Number(formData.variablePay.amount).toLocaleString('en-IN')} Performance Pay ({formData.variablePay.frequency})
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <span className="font-bold text-amber-700">Unpaid</span>
                )}
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
                <span>{isEditing ? 'Update Draft' : 'Save Draft'}</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleSave(true)}
                loading={submitting}
              >
                <Send className="w-3.5 h-3.5 mr-1" />
                <span>{isEditing ? 'Update & Resubmit for Approval' : 'Submit for Admin Approval'}</span>
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default CreateAppointment;
