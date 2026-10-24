import React, { useState, useEffect } from 'react';
import { X, UserPlus, Save, Briefcase, Mail, Phone, MapPin, FolderKanban } from 'lucide-react';
import Button from '../common/Button';
import { projectService } from '../../services/projectService';
import { clientService } from '../../services/clientService';
import { taskRequestService } from '../../services/taskRequestService';
import { EmployeeService } from '../../services/EmployeeService';

const CandidateModal = ({ isOpen, onClose, candidate, onSave, loading }) => {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [requirements, setRequirements] = useState([]);
  const [Employees, setEmployees] = useState([]);

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
        compensation: candidate.compensation || 25000,
        compensationFrequency: candidate.compensationFrequency || 'STIPEND_MONTHLY',
        probationPeriod: candidate.probationPeriod || '3 Months',
        notes: candidate.notes || '',
        source: candidate.source || 'Direct HR',
        clientId: candidate.clientId || candidate.client?._id || candidate.client || '',
        projectId: candidate.projectId || candidate.project?._id || candidate.project || '',
        requirementId: candidate.requirementId || candidate.requirement?._id || candidate.requirement || '',
        EmployeeId: candidate.EmployeeId || candidate.assignedEmployee?._id || candidate.assignedEmployee || ''
      });
    } else {
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

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...formData,
      client: formData.clientId || null,
      project: formData.projectId || null,
      requirement: formData.requirementId || null,
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department <span className="text-rose-500">*</span>
              </label>
              <select
                name="department"
                value={formData.department}
                onChange={handleChange}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="Engineering">Engineering</option>
                <option value="Design">Design & Product</option>
                <option value="DevOps & Infrastructure">DevOps & Infrastructure</option>
                <option value="Quality Assurance">Quality Assurance</option>
                <option value="Data & Analytics">Data & Analytics</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Stipend / Compensation (₹)
              </label>
              <input
                type="number"
                name="compensation"
                value={formData.compensation}
                onChange={handleChange}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Frequency
              </label>
              <select
                name="compensationFrequency"
                value={formData.compensationFrequency}
                onChange={handleChange}
                className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500 bg-white"
              >
                <option value="STIPEND_MONTHLY">Monthly Stipend</option>
                <option value="MONTHLY">Monthly Salary</option>
                <option value="ANNUAL">Annual CTC</option>
              </select>
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
