import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, Briefcase, Mail, Phone, MapPin, FolderKanban } from 'lucide-react';
import Button from '../common/Button';
import { projectService } from '../../services/projectService';
import { clientService } from '../../services/clientService';
import { taskRequestService } from '../../services/taskRequestService';
import { EmployeeService } from '../../services/EmployeeService';

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

const CandidateModal = ({ isOpen, onClose, candidate, onSave, loading }) => {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [Employees, setEmployees] = useState([]);
  const [isCustomDepartment, setIsCustomDepartment] = useState(false);
  const [isPaidStipend, setIsPaidStipend] = useState(true);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    designation: '',
    department: 'Engineering',
    employmentType: 'Trainee',
    joiningDate: '',
    workLocation: 'Remote / Hybrid',
    reportingManager: 'Technical Lead',
    compensation: 25000,
    compensationFrequency: 'STIPEND_MONTHLY',
    variablePay: {
      isEnabled: false,
      amount: '',
      frequency: 'ANNUAL',
      criteria: ''
    },
    probationPeriod: '3 Months',
    notes: '',
    source: 'Direct HR',
    clientId: '',
    projectId: '',
    requirementId: '',
    EmployeeId: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadContextData();
    }
  }, [isOpen]);

  const loadContextData = async () => {
    try {
      const [projRes, clientRes, reqRes, workRes] = await Promise.all([
        projectService.getProjects().catch(() => ({ success: false })),
        clientService.getClients().catch(() => ({ success: false })),
        taskRequestService.getTaskRequests().catch(() => ({ success: false })),
        EmployeeService.getEmployees().catch(() => ({ success: false }))
      ]);
      if (projRes.success) setProjects(projRes.projects || []);
      if (clientRes.success) setClients(clientRes.clients || []);
      if (reqRes.success) setRequirements(reqRes.taskRequests || reqRes.requests || []);
      if (workRes.success) setEmployees(workRes.Employees || []);
    } catch (err) {
      // Non-critical
    }
  };

  useEffect(() => {
    if (candidate) {
      const isCustom = candidate.department ? !STANDARD_DEPARTMENTS.includes(candidate.department) : false;
      setIsCustomDepartment(isCustom);
      if (candidate.compensation === 0 || candidate.compensationFrequency === 'UNPAID') {
        setIsPaidStipend(false);
      } else {
        setIsPaidStipend(true);
      }
      setFormData({
        name: candidate.name || '',
        email: candidate.email || '',
        phone: candidate.phone || '',
        address: candidate.address || '',
        designation: candidate.designation || '',
        department: candidate.department || 'Engineering',
        employmentType: candidate.employmentType || 'Trainee',
        joiningDate: candidate.joiningDate ? candidate.joiningDate.substring(0, 10) : '',
        workLocation: candidate.workLocation || 'Remote / Hybrid',
        reportingManager: candidate.reportingManager || 'Technical Lead',
        compensation: candidate.compensation !== undefined ? candidate.compensation : 25000,
        compensationFrequency: candidate.compensationFrequency || 'STIPEND_MONTHLY',
        variablePay: {
          isEnabled: Boolean(candidate.variablePay?.isEnabled),
          amount: candidate.variablePay?.amount || '',
          frequency: candidate.variablePay?.frequency || 'ANNUAL',
          criteria: candidate.variablePay?.criteria || ''
        },
        probationPeriod: candidate.probationPeriod || '3 Months',
        notes: candidate.notes || '',
        source: candidate.source || 'Direct HR',
        clientId: candidate.clientId || candidate.client?._id || candidate.client || '',
        projectId: candidate.projectId || candidate.project?._id || candidate.project || '',
        requirementId: candidate.requirementId || candidate.requirement?._id || candidate.requirement || '',
        EmployeeId: candidate.EmployeeId || candidate.assignedEmployee?._id || candidate.assignedEmployee || ''
      });
    } else {
      setIsCustomDepartment(false);
      setIsPaidStipend(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        address: '',
        designation: '',
        department: 'Engineering',
        employmentType: 'Trainee',
        joiningDate: '',
        workLocation: 'Remote / Hybrid',
        reportingManager: 'Technical Lead',
        compensation: 25000,
        compensationFrequency: 'STIPEND_MONTHLY',
        variablePay: {
          isEnabled: false,
          amount: '',
          frequency: 'ANNUAL',
          criteria: ''
        },
        probationPeriod: '3 Months',
        notes: '',
        source: 'Direct HR',
        clientId: '',
        projectId: '',
        requirementId: '',
        EmployeeId: ''
      });
    }
  }, [candidate, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      compensation: isPaidStipend ? (Number(formData.compensation) || 0) : 0,
      compensationFrequency: isPaidStipend
        ? (formData.compensationFrequency === 'UNPAID' ? 'STIPEND_MONTHLY' : formData.compensationFrequency)
        : 'UNPAID',
      variablePay: {
        isEnabled: isPaidStipend && Boolean(formData.variablePay?.isEnabled),
        amount: (isPaidStipend && formData.variablePay?.isEnabled) ? (Number(formData.variablePay?.amount) || 0) : 0,
        frequency: formData.variablePay?.frequency || 'ANNUAL',
        criteria: formData.variablePay?.criteria || ''
      },
      clientId: formData.clientId || null,
      client: formData.clientId || null,
      projectId: formData.projectId || null,
      project: formData.projectId || null,
      requirementId: formData.requirementId || null,
      requirement: formData.requirementId || null,
      EmployeeId: formData.EmployeeId || null,
      assignedEmployee: formData.EmployeeId || null
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto sm:my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 flex shrink-0 items-center justify-between border-b bg-slate-50 border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {candidate ? 'Edit Candidate Record' : 'Register New Candidate'}
              </h3>
              <p className="text-[11px] text-slate-500">
                GENFREX Talent Pool Management
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Rohan Sharma"
                className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official / Personal Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="rohan@example.com"
                className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                placeholder="+91 98765 43210"
                className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Candidate Source <span className="text-rose-500">*</span>
              </label>
              <select
                name="source"
                value={formData.source}
                onChange={handleChange}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 bg-white font-medium"
              >
                <option value="Direct HR">Direct HR</option>
                <option value="Client Project">Client Project</option>
                <option value="Talent Pool">Talent Pool</option>
                <option value="Internal">Internal</option>
              </select>
            </div>

            {/* Optional Project Context fields if Sourced from ClientFlow */}
            {(formData.source === 'Client Project' || formData.projectId) && (
              <div className="sm:col-span-2 p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-blue-900">
                  <FolderKanban className="w-3.5 h-3.5 text-blue-600" />
                  <span>ClientFlow Project Assignment</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Client Project</label>
                    <select
                      name="projectId"
                      value={formData.projectId}
                      onChange={handleChange}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="">-- Select Project --</option>
                      {projects.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Client</label>
                    <select
                      name="clientId"
                      value={formData.clientId}
                      onChange={handleChange}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="">-- Select Client --</option>
                      {clients.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.companyName || c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Client Requirement</label>
                    <select
                      name="requirementId"
                      value={formData.requirementId}
                      onChange={handleChange}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="">-- None --</option>
                      {requirements
                        .filter((r) => !formData.projectId || String(r.project?._id || r.project) === String(formData.projectId))
                        .map((r) => (
                          <option key={r._id} value={r._id}>
                            {r.title}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Assigned Employee / Mentor</label>
                    <select
                      name="EmployeeId"
                      value={formData.EmployeeId}
                      onChange={handleChange}
                      className="w-full p-2 rounded-lg border border-slate-300 bg-white"
                    >
                      <option value="">-- None --</option>
                      {Employees.map((w) => (
                        <option key={w._id} value={w._id}>
                          {w.name} ({w.title || 'Engineer'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Employment Track <span className="text-rose-500">*</span>
              </label>
              <select
                name="employmentType"
                value={formData.employmentType}
                onChange={handleChange}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="Trainee">Trainee</option>
                <option value="Internship">Internship</option>
                <option value="Full-time">Full-time</option>
                <option value="Part-time">Part-time</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Designation / Position <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="designation"
                required
                value={formData.designation}
                onChange={handleChange}
                placeholder="e.g. Trainee Full-Stack Engineer"
                className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Department <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const next = !isCustomDepartment;
                    setIsCustomDepartment(next);
                    if (!next && !STANDARD_DEPARTMENTS.includes(formData.department)) {
                      setFormData((prev) => ({ ...prev, department: 'Engineering' }));
                    }
                  }}
                  className="text-[11px] text-blue-600 hover:text-blue-800 font-medium hover:underline cursor-pointer"
                >
                  {isCustomDepartment ? '← Select from list' : '+ Add custom / manual'}
                </button>
              </div>

              {isCustomDepartment ? (
                <div>
                  <input
                    type="text"
                    name="department"
                    required
                    value={formData.department}
                    onChange={handleChange}
                    placeholder="Type department name (e.g. People Operations, Finance, etc.)"
                    className="w-full p-2.5 rounded-lg border border-blue-400 text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 bg-blue-50/20 text-xs"
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
                      setIsCustomDepartment(true);
                      setFormData((prev) => ({ ...prev, department: '' }));
                    } else {
                      handleChange(e);
                    }
                  }}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 bg-white text-xs"
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

            {/* Stipend Options: Paid vs Unpaid */}
            <div className="col-span-1 sm:col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-800">
                    Stipend / Compensation Type
                  </label>
                  <p className="text-[11px] text-slate-500">Choose whether this candidate engagement is Paid or Unpaid</p>
                </div>
                <div className="inline-flex p-1 bg-white border border-slate-200 rounded-lg">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPaidStipend(true);
                      setFormData((prev) => ({
                        ...prev,
                        compensation: prev.compensation && Number(prev.compensation) > 0 ? prev.compensation : 15000,
                        compensationFrequency: prev.compensationFrequency === 'UNPAID' ? 'STIPEND_MONTHLY' : prev.compensationFrequency
                      }));
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      isPaidStipend
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Paid
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsPaidStipend(false);
                      setFormData((prev) => ({
                        ...prev,
                        compensation: '',
                        compensationFrequency: 'UNPAID'
                      }));
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      !isPaidStipend
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Unpaid
                  </button>
                </div>
              </div>

              {isPaidStipend ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Stipend / Compensation Amount (₹)
                    </label>
                    <input
                      type="number"
                      name="compensation"
                      min="1"
                      value={formData.compensation}
                      onChange={handleChange}
                      placeholder="Enter amount manually (e.g. 15000)"
                      className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 font-semibold"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Payment Frequency
                    </label>
                    <select
                      name="compensationFrequency"
                      value={formData.compensationFrequency === 'UNPAID' ? 'STIPEND_MONTHLY' : formData.compensationFrequency}
                      onChange={handleChange}
                      className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
                    >
                      <option value="STIPEND_MONTHLY">Monthly Stipend</option>
                      <option value="MONTHLY">Monthly Salary</option>
                      <option value="ANNUAL">Annual CTC</option>
                    </select>
                  </div>

                  {/* Variable Pay Toggle & Input */}
                  <div className="col-span-1 sm:col-span-2 pt-2 border-t border-slate-200/60 space-y-2">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={Boolean(formData.variablePay?.isEnabled)}
                        onChange={(e) => handleVariablePayChange('isEnabled', e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                      />
                      <span>Include Variable Pay / Performance Bonus</span>
                    </label>

                    {formData.variablePay?.isEnabled && (
                      <div className="p-3 bg-blue-50/50 border border-blue-200/70 rounded-xl space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Variable Amount (₹)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={formData.variablePay?.amount || ''}
                              onChange={(e) => handleVariablePayChange('amount', e.target.value)}
                              placeholder="e.g. 50000"
                              className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 font-semibold bg-white text-xs"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                              Payout Frequency
                            </label>
                            <select
                              value={formData.variablePay?.frequency || 'ANNUAL'}
                              onChange={(e) => handleVariablePayChange('frequency', e.target.value)}
                              className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 bg-white text-xs"
                            >
                              <option value="ANNUAL">Annual Performance Bonus</option>
                              <option value="QUARTERLY">Quarterly Appraisal Bonus</option>
                              <option value="HALF_YEARLY">Half-Yearly Bonus</option>
                              <option value="MONTHLY">Monthly Incentive</option>
                              <option value="MILESTONE">Project Milestone Based</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Payout Criteria / Notes (Optional)
                          </label>
                          <input
                            type="text"
                            value={formData.variablePay?.criteria || ''}
                            onChange={(e) => handleVariablePayChange('criteria', e.target.value)}
                            placeholder="e.g. Subject to 80%+ KPI rating"
                            className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 bg-white text-xs"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-lg text-[11px] text-amber-800 flex items-center justify-between">
                  <span>Unpaid engagement: No monetary compensation or stipend.</span>
                  <span className="font-bold uppercase text-[10px] px-2 py-0.5 rounded bg-amber-200 text-amber-900">Unpaid</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expected Date of Joining
              </label>
              <input
                type="date"
                name="joiningDate"
                value={formData.joiningDate}
                onChange={handleChange}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Work Mode / Location
              </label>
              <input
                type="text"
                name="workLocation"
                value={formData.workLocation}
                onChange={handleChange}
                placeholder="e.g. Remote / Hybrid - Bengaluru HQ"
                className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Residential Address
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="e.g. Indiranagar, Bengaluru, Karnataka, India"
                className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Internal HR Notes & Evaluation
              </label>
              <textarea
                rows={2}
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Interview highlights, portfolio links, or technical strengths..."
                className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2.5 -mx-6 -mb-6 mt-6">
            <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit" loading={loading}>
              <Save className="w-3.5 h-3.5 mr-1" />
              <span>{candidate ? 'Save Changes' : 'Register Candidate'}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CandidateModal;
