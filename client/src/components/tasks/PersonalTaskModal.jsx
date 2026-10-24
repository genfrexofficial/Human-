import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { EmployeeService } from '../../services/EmployeeService';
import { UserCheck, Tag, Calendar, Clock, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { value: 'INTERNAL_WORK', label: 'Internal Operations', icon: '📋', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'TRAINING', label: 'Training & Upskilling', icon: '🎓', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'MAINTENANCE', label: 'Maintenance & DevOps', icon: '🛠️', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'RESEARCH', label: 'Research & R&D Spike', icon: '🔬', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'HR_COMPLIANCE', label: 'HR & Compliance', icon: '⚖️', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { value: 'OTHER', label: 'General / Other', icon: '📌', color: 'bg-slate-50 text-slate-700 border-slate-200' }
];

const PersonalTaskModal = ({ isOpen, onClose, task = null, onSaved, preselectedEmployeeId = '' }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: preselectedEmployeeId || '',
    personalCategory: 'INTERNAL_WORK',
    priority: 'MEDIUM',
    status: 'ASSIGNED',
    dueDate: '',
    estimatedHours: 0
  });
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      EmployeeService.getEmployees()
        .then((res) => {
          if (res.success) setEmployees(res.Employees || []);
        })
        .catch((err) => {
          console.error('Error fetching employees:', err);
        });

      if (task) {
        setFormData({
          title: task.title || '',
          description: task.description || '',
          assignedTo: task.assignedTo?._id || task.assignedTo || preselectedEmployeeId || '',
          personalCategory: task.personalCategory || 'INTERNAL_WORK',
          priority: task.priority || 'MEDIUM',
          status: task.status || 'ASSIGNED',
          dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
          estimatedHours: task.estimatedHours || 0
        });
      } else {
        setFormData({
          title: '',
          description: '',
          assignedTo: preselectedEmployeeId || '',
          personalCategory: 'INTERNAL_WORK',
          priority: 'MEDIUM',
          status: 'ASSIGNED',
          dueDate: '',
          estimatedHours: 0
        });
      }
    }
  }, [isOpen, task, preselectedEmployeeId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Task title is required.');
      return;
    }
    if (!formData.assignedTo) {
      toast.error('Please select an employee to assign this personal task to.');
      return;
    }

    try {
      setLoading(true);
      await onSaved({
        ...formData,
        taskType: 'PERSONAL',
        clientVisible: false
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
      title={task ? 'Edit Personal Company Task' : 'Assign Personal Task to Employee'}
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Banner explanation */}
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 flex items-start gap-2.5">
          <UserCheck className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
          <div>
            <span className="font-semibold text-indigo-900 block text-xs">Internal Company Assignment</span>
            <span className="text-[11px] text-indigo-700/80">
              Personal tasks are directly assigned to workers (internal work, training, compliance). They are not visible to external clients.
            </span>
          </div>
        </div>

        {/* Worker selection */}
        <div>
          <label className="block font-semibold text-slate-800 mb-1">
            Assign To Worker / Employee <span className="text-rose-500">*</span>
          </label>
          <select
            name="assignedTo"
            value={formData.assignedTo}
            onChange={handleChange}
            required
            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">-- Select Worker --</option>
            {employees.map((w) => (
              <option key={w._id} value={w._id}>
                {w.name} — {w.title || 'Team Member'} ({w.email})
              </option>
            ))}
          </select>
        </div>

        {/* Category selector */}
        <div>
          <label className="block font-semibold text-slate-800 mb-1.5">
            Personal Task Category
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => {
              const isSelected = formData.personalCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setFormData((prev) => ({ ...prev, personalCategory: cat.value }))}
                  className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 shadow-sm font-semibold'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  <span className="text-base">{cat.icon}</span>
                  <span className="text-[11px] truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <Input
          label="Task Title *"
          name="title"
          placeholder="e.g. Complete ISO Security Training / Refactor Auth Middleware"
          value={formData.title}
          onChange={handleChange}
          required
        />

        {/* Description */}
        <Input
          label="Instructions & Details"
          name="description"
          type="textarea"
          rows={3}
          placeholder="Specific steps, resources, links, or expectations for the employee..."
          value={formData.description}
          onChange={handleChange}
        />

        {/* Priority & Status */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Priority Tier
            </label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent ⚡</option>
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
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ASSIGNED">Assigned (Ready)</option>
              <option value="TODO">To Do</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="IN_REVIEW">Under Review</option>
              <option value="COMPLETED">Completed</option>
              <option value="BLOCKED">Blocked</option>
            </select>
          </div>
        </div>

        {/* Target Due Date & Estimated Hours */}
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

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <Button variant="secondary" size="sm" type="button" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={loading} variant="primary">
            {task ? 'Update Personal Task' : 'Assign Task'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default PersonalTaskModal;
