import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { EmployeeService } from '../../services/EmployeeService';
import toast from 'react-hot-toast';

const TaskModal = ({ isOpen, onClose, task = null, projectId, onSaved }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    priority: 'MEDIUM',
    status: 'TODO',
    dueDate: '',
    estimatedHours: 0,
    clientVisible: true
  });
  const [Employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Fetch Employees
      EmployeeService.getEmployees().then((res) => {
        if (res.success) setEmployees(res.Employees || []);
      }).catch(console.error);

      if (task) {
        setFormData({
          title: task.title || '',
          description: task.description || '',
          assignedTo: task.assignedTo?._id || task.assignedTo || '',
          priority: task.priority || 'MEDIUM',
          status: task.status || 'TODO',
          dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
          estimatedHours: task.estimatedHours || 0,
          clientVisible: task.clientVisible !== undefined ? task.clientVisible : true
        });
      } else {
        setFormData({
          title: '',
          description: '',
          assignedTo: '',
          priority: 'MEDIUM',
          status: 'TODO',
          dueDate: '',
          estimatedHours: 0,
          clientVisible: true
        });
      }
    }
  }, [isOpen, task]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Task title is required.');
      return;
    }

    try {
      setLoading(true);
      await onSaved({
        ...formData,
        project: projectId,
        assignedTo: formData.assignedTo || null
      }, task?._id);
      onClose();
    } catch (err) {
      // Handled in parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? 'Edit Task & Assignment' : 'Create New Engineering Task'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <Input
          label="Task Title *"
          name="title"
          placeholder="e.g. Implement OAuth SSO Flow"
          value={formData.title}
          onChange={handleChange}
          required
        />

        <Input
          label="Task Description"
          name="description"
          type="textarea"
          rows={3}
          placeholder="Acceptance criteria and technical instructions..."
          value={formData.description}
          onChange={handleChange}
        />

        <div>
          <label className="block font-semibold text-slate-800 mb-1">
            Assign Employee / Engineer
          </label>
          <select
            name="assignedTo"
            value={formData.assignedTo}
            onChange={handleChange}
            className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">-- Unassigned (TODO) --</option>
            {Employees.map((w) => (
              <option key={w._id} value={w._id}>
                {w.name} — {w.title || 'Engineer'} ({w.workload?.totalActive || 0} active)
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Priority Tier
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Status
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
            >
              <option value="TODO">TODO</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="BLOCKED">BLOCKED</option>
              <option value="IN_REVIEW">IN REVIEW</option>
              <option value="CHANGES_REQUESTED">CHANGES REQUESTED</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Target Due Date"
            name="dueDate"
            type="date"
            value={formData.dueDate}
            onChange={handleChange}
          />

          <Input
            label="Estimated Hours"
            name="estimatedHours"
            type="number"
            value={formData.estimatedHours}
            onChange={handleChange}
          />
        </div>

        <div>
          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              name="clientVisible"
              checked={formData.clientVisible}
              onChange={handleChange}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
            />
            <span className="text-slate-700 font-medium">
              Client Visible (Show this task on customer progress portal)
            </span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={loading}>
            {task ? 'Update Task' : 'Create Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TaskModal;
