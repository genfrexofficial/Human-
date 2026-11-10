import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { EmployeeService } from '../../services/EmployeeService';
import { userService } from '../../services/userService';
import { Users, X } from 'lucide-react';
import toast from 'react-hot-toast';

const TaskModal = ({ isOpen, onClose, task = null, projectId, onSaved }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedEmployees: [],
    priority: 'MEDIUM',
    status: 'TODO',
    dueDate: '',
    estimatedHours: 0,
    clientVisible: true
  });
  const [Employees, setEmployees] = useState([]);
  const [hrUsers, setHrUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Fetch Employees & HR users
      Promise.all([
        EmployeeService.getEmployees().catch(() => ({ success: false, Employees: [] })),
        userService.getHRUsers().catch(() => ({ success: false, users: [] }))
      ]).then(([empRes, hrRes]) => {
        if (empRes?.success) setEmployees(empRes.Employees || []);
        if (hrRes?.success) setHrUsers(hrRes.users || []);
      }).catch(console.error);

      if (task) {
        let initialAssignees = [];
        if (Array.isArray(task.assignedEmployees) && task.assignedEmployees.length > 0) {
          initialAssignees = task.assignedEmployees.map((e) => e?._id || e);
        } else if (task.assignedTo) {
          initialAssignees = [task.assignedTo?._id || task.assignedTo];
        }

        setFormData({
          title: task.title || '',
          description: task.description || '',
          assignedEmployees: initialAssignees,
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
          assignedEmployees: [],
          priority: 'MEDIUM',
          status: 'TODO',
          dueDate: '',
          estimatedHours: 0,
          clientVisible: true
        });
      }
    }
  }, [isOpen, task]);

  const allAssigneesList = [...Employees, ...hrUsers];

  const handleAddAssignee = (userId) => {
    if (!userId) return;
    setFormData((prev) => {
      if (prev.assignedEmployees.includes(userId)) return prev;
      return {
        ...prev,
        assignedEmployees: [...prev.assignedEmployees, userId]
      };
    });
  };

  const handleRemoveAssignee = (userId) => {
    setFormData((prev) => ({
      ...prev,
      assignedEmployees: prev.assignedEmployees.filter((id) => id !== userId)
    }));
  };

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
        assignedEmployees: formData.assignedEmployees,
        assignedTo: formData.assignedEmployees.length > 0 ? formData.assignedEmployees[0] : null
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
      title={task ? 'Edit Task & Assignments' : 'Create New Engineering Task'}
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

        {/* Multi-Employee Assignment Section */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block font-semibold text-slate-800">
              Assign Team Members ({formData.assignedEmployees.length})
            </label>
            <span className="text-[11px] text-indigo-600 font-medium">
              Multi-employee assignment enabled
            </span>
          </div>

          {/* Selected assignees chip list */}
          {formData.assignedEmployees.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg mb-2">
              {formData.assignedEmployees.map((empId) => {
                const empObj =
                  allAssigneesList.find((o) => o._id === empId) ||
                  (task?.assignedEmployees?.find((o) => (o._id || o) === empId)) ||
                  (task?.assignedTo?._id === empId ? task.assignedTo : null);
                const name = empObj?.name || 'Assigned Member';
                const isHr = empObj?.role === 'HR';

                return (
                  <span
                    key={empId}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-white border border-slate-200 shadow-xs text-slate-800"
                  >
                    <span
                      className={`w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white ${
                        isHr ? 'bg-purple-600' : 'bg-indigo-600'
                      }`}
                    >
                      {name.charAt(0).toUpperCase()}
                    </span>
                    <span className="font-medium text-[11px]">{name}</span>
                    {isHr && (
                      <span className="text-[9px] bg-purple-50 text-purple-700 px-1 rounded font-semibold">
                        HR
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveAssignee(empId)}
                      className="text-slate-400 hover:text-rose-600 ml-0.5 cursor-pointer"
                      title="Remove assignee"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          ) : (
            <div className="p-2 mb-2 text-[11px] text-slate-400 italic bg-slate-50/60 border border-dashed border-slate-200 rounded-lg">
              No employees assigned yet (Task will be in TODO status).
            </div>
          )}

          {/* Dropdown to add an employee */}
          <select
            value=""
            onChange={(e) => {
              handleAddAssignee(e.target.value);
            }}
            className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none bg-white"
          >
            <option value="">+ Add employee or HR officer to task...</option>
            {hrUsers.filter((hr) => !formData.assignedEmployees.includes(hr._id)).length > 0 && (
              <optgroup label="🏢 HR Team Members">
                {hrUsers
                  .filter((hr) => !formData.assignedEmployees.includes(hr._id))
                  .map((hr) => (
                    <option key={hr._id} value={hr._id}>
                      {hr.name} — {hr.title || 'HR Officer'} (HR)
                    </option>
                  ))}
              </optgroup>
            )}
            {Employees.filter((w) => !formData.assignedEmployees.includes(w._id)).length > 0 && (
              <optgroup label="👷 Engineers & Employees">
                {Employees
                  .filter((w) => !formData.assignedEmployees.includes(w._id))
                  .map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.name} — {w.title || 'Engineer'} ({w.workload?.totalActive || 0} active)
                    </option>
                  ))}
              </optgroup>
            )}
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
