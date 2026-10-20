import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { clientService } from '../../services/clientService';
import toast from 'react-hot-toast';

const ProjectModal = ({ isOpen, onClose, project = null, onSaved }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client: '',
    startDate: '',
    endDate: '',
    budget: '',
    status: 'PLANNING'
  });
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);

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

      if (project) {
        setFormData({
          name: project.name || '',
          description: project.description || '',
          client: project.client?._id || project.client || '',
          startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
          endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
          budget: project.budget || '',
          status: project.status || 'PLANNING'
        });
      } else {
        setFormData({
          name: '',
          description: '',
          client: '',
          startDate: new Date().toISOString().split('T')[0],
          endDate: '',
          budget: '',
          status: 'PLANNING'
        });
      }
    }
  }, [isOpen, project]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.client) {
      toast.error('Please fill in project name and assign a client.');
      return;
    }

    try {
      setLoading(true);
      await onSaved(formData, project?._id);
      onClose();
    } catch (err) {
      // Error handled by parent or toast
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
      <form onSubmit={handleSubmit} className="space-y-4">
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
            <p className="text-[11px] text-amber-600 mt-1">
              No clients found. You can add one in the Clients section.
            </p>
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
            label="Deadline / End Date"
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

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {project ? 'Save Changes' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default ProjectModal;
