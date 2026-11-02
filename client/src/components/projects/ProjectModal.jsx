import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { clientService } from '../../services/clientService';
import { EmployeeService } from '../../services/EmployeeService';
import { Users, Check, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const ProjectModal = ({ isOpen, onClose, project = null, onSaved, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client: '',
    startDate: '',
    endDate: '',
    budget: '',
    status: 'PLANNING',
    assignedEmployees: []
  });
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Load clients for dropdown
      const loadClients = async () => {
        try {
          setLoadingClients(true);
          const res = await clientService.getClients();
          if (res.success) {
            setClients(res.clients || []);
          }
        } catch (err) {
          toast.error('Failed to load clients list.');
        } finally {
          setLoadingClients(false);
        }
      };
      loadClients();

      // Load existing workers / employees
      const loadEmployees = async () => {
        try {
          setLoadingEmployees(true);
          const res = await EmployeeService.getEmployees();
          if (res.success) {
            setEmployees(res.Employees || []);
          }
        } catch (err) {
          console.error('Failed to load workers list:', err);
        } finally {
          setLoadingEmployees(false);
        }
      };
      loadEmployees();

      if (project) {
        setFormData({
          name: project.name || '',
          description: project.description || '',
          client: project.client?._id || project.client || '',
          startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
          endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
          budget: project.budget || '',
          status: project.status || 'PLANNING',
          assignedEmployees: Array.isArray(project.assignedEmployees)
            ? project.assignedEmployees.map((e) => (e._id ? e._id : e))
            : []
        });
      } else {
        setFormData({
          name: '',
          description: '',
          client: '',
          startDate: new Date().toISOString().split('T')[0],
          endDate: '',
          budget: '',
          status: 'PLANNING',
          assignedEmployees: []
        });
      }
    }
  }, [isOpen, project]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleToggleEmployee = (employeeId) => {
    setFormData((prev) => {
      const exists = prev.assignedEmployees.includes(employeeId);
      return {
        ...prev,
        assignedEmployees: exists
          ? prev.assignedEmployees.filter((id) => id !== employeeId)
          : [...prev.assignedEmployees, employeeId]
      };
    });
  };

  const handleToggleAllEmployees = () => {
    setFormData((prev) => ({
      ...prev,
      assignedEmployees:
        prev.assignedEmployees.length === employees.length
          ? []
          : employees.map((e) => e._id)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Project Name is required.', { id: 'project-validation-error' });
      return;
    }
    if (!formData.client) {
      if (clients.length === 0) {
        toast.error('No clients found. Please create a client account in the Clients section first.', { id: 'project-validation-error' });
      } else {
        toast.error('Please assign a client to this project.', { id: 'project-validation-error' });
      }
      return;
    }

    const saveHandler = onSaved || onSubmit;
    if (!saveHandler) {
      console.error('ProjectModal: Neither onSaved nor onSubmit prop was provided.');
      toast.error('Configuration error: No save handler provided.', { id: 'project-error' });
      return;
    }

    try {
      setLoading(true);
      await saveHandler(
        {
          ...formData,
          name: formData.name.trim(),
          description: formData.description ? formData.description.trim() : '',
          budget: formData.budget !== '' && !isNaN(formData.budget) ? Number(formData.budget) : 0,
          endDate: formData.endDate ? formData.endDate : null,
          assignedEmployees: formData.assignedEmployees
        },
        project?._id
      );
      onClose();
    } catch (err) {
      console.error('Project save error:', err);
      const errMsg = err.response?.data?.message || err.message || 'Failed to save project.';
      toast.error(errMsg, { id: 'project-error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={project ? 'Edit Project' : 'Create New Project'}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Project Name"
          name="name"
          placeholder="e.g. Acme Branding & Website Redesign"
          value={formData.name}
          onChange={handleChange}
          required
        />

        <Input
          label="Project Description"
          name="description"
          type="textarea"
          rows={3}
          placeholder="Summary of deliverables, objectives, and client requirements..."
          value={formData.description}
          onChange={handleChange}
        />

        {/* Client Selector */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Assign Client <span className="text-rose-500">*</span>
          </label>
          <select
            name="client"
            value={formData.client}
            onChange={handleChange}
            required
            disabled={loadingClients}
            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">-- Select Client --</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name} {c.companyName ? `(${c.companyName})` : ''} - {c.email}
              </option>
            ))}
          </select>
          {clients.length === 0 && !loadingClients && (
            <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800">
                <span className="font-semibold">No clients registered yet.</span>
                <p className="mt-0.5 text-amber-700">
                  Every project must be assigned to a registered client. Please add a client first from the{' '}
                  <Link
                    to="/admin/clients"
                    className="underline font-semibold text-amber-900 hover:text-amber-950"
                    onClick={onClose}
                  >
                    Clients section
                  </Link>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Assign Workers / Employees */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-slate-700">
              Assign Workers / Team Members{' '}
              <span className="text-slate-400 font-normal">
                ({formData.assignedEmployees.length} selected)
              </span>
            </label>
            {employees.length > 0 && (
              <button
                type="button"
                onClick={handleToggleAllEmployees}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition"
              >
                {formData.assignedEmployees.length === employees.length ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>

          {loadingEmployees ? (
            <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg">
              Loading available workers...
            </div>
          ) : employees.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 border border-slate-200 rounded-lg">
              No workers created yet. You can create workers in the HR / Workers section.
            </div>
          ) : (
            <div className="max-h-44 overflow-y-auto space-y-1.5 p-2 bg-slate-50/70 border border-slate-200 rounded-lg">
              {employees.map((emp) => {
                const isSelected = formData.assignedEmployees.includes(emp._id);
                return (
                  <label
                    key={emp._id}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-300 text-indigo-900 font-medium shadow-xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleEmployee(emp._id)}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 shrink-0"
                      />
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {emp.name?.charAt(0) || 'W'}
                      </div>
                      <div className="truncate">
                        <span className="block truncate font-medium">{emp.name}</span>
                        <span className="block text-[10px] text-slate-400 truncate">{emp.email}</span>
                      </div>
                    </div>
                    {emp.title && (
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                        {emp.title}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Start Date"
            name="startDate"
            type="date"
            value={formData.startDate}
            onChange={handleChange}
          />

          <Input
            label="Deadline / End Date (Optional)"
            name="endDate"
            type="date"
            value={formData.endDate}
            onChange={handleChange}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Budget (₹)"
            name="budget"
            type="number"
            placeholder="e.g. 500000"
            value={formData.budget}
            onChange={handleChange}
          />

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Project Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="PLANNING">Planning</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ON_HOLD">On Hold</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {project ? 'Update Project' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ProjectModal;
