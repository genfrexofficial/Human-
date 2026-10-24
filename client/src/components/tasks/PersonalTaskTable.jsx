import React from 'react';
import Badge from '../common/Badge';
import ProgressBar from '../common/ProgressBar';
import Button from '../common/Button';
import {
  Calendar,
  Clock,
  User,
  MoreVertical,
  CheckCircle2,
  Trash2,
  Edit2,
  AlertCircle
} from 'lucide-react';

const CATEGORY_MAP = {
  INTERNAL_WORK: { label: 'Internal Work', icon: '📋', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  TRAINING: { label: 'Training', icon: '🎓', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  MAINTENANCE: { label: 'Maintenance', icon: '🛠️', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  RESEARCH: { label: 'Research Spike', icon: '🔬', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  HR_COMPLIANCE: { label: 'Compliance', icon: '⚖️', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  OTHER: { label: 'Internal', icon: '📌', color: 'bg-slate-50 text-slate-700 border-slate-200' }
};

const PersonalTaskTable = ({
  tasks = [],
  isManager = false, // true for Admin / HR
  onStatusChange,
  onEditTask,
  onDeleteTask
}) => {
  const now = new Date();

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-subtle overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[750px]">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-slate-500 uppercase tracking-wider font-semibold text-[11px]">
            <tr>
              <th className="px-5 py-3.5">Personal Task</th>
              <th className="px-4 py-3.5">Category</th>
              <th className="px-4 py-3.5">Assigned Employee</th>
              <th className="px-4 py-3.5">Priority</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-4 py-3.5">Progress</th>
              <th className="px-4 py-3.5">Due Date</th>
              {isManager && <th className="px-5 py-3.5 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map((task) => {
              const cat = CATEGORY_MAP[task.personalCategory] || CATEGORY_MAP.INTERNAL_WORK;
              const isOverdue = task.dueDate && new Date(task.dueDate) < now && task.status !== 'COMPLETED';

              return (
                <tr key={task._id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Task details */}
                  <td className="px-5 py-4 max-w-xs">
                    <span className="font-semibold text-slate-900 block line-clamp-1 text-xs">
                      {task.title}
                    </span>
                    {task.description && (
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {task.description}
                      </p>
                    )}
                    {task.assignedBy && (
                      <span className="text-[10px] text-slate-400 block mt-1">
                        Assigned by: <strong className="text-slate-600">{task.assignedBy.name}</strong> ({task.assignedBy.role})
                      </span>
                    )}
                  </td>

                  {/* Category chip */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${cat.color}`}>
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </span>
                  </td>

                  {/* Assigned Employee */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    {task.assignedTo ? (
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-[11px] shadow-sm flex-shrink-0">
                          {task.assignedTo.name?.charAt(0).toUpperCase() || 'W'}
                        </div>
                        <div>
                          <span className="font-semibold text-slate-900 block text-xs leading-tight">
                            {task.assignedTo.name}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {task.assignedTo.title || task.assignedTo.email}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                    )}
                  </td>

                  {/* Priority */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <Badge variant={task.priority?.toLowerCase() || 'default'}>
                      {task.priority}
                    </Badge>
                  </td>

                  {/* Status Dropdown (Manager) or Badge (Employee) */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    {isManager && onStatusChange ? (
                      <select
                        value={task.status}
                        onChange={(e) => onStatusChange(task._id, e.target.value)}
                        className={`text-[11px] font-medium rounded-lg px-2.5 py-1 border transition-colors focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                          task.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : task.status === 'IN_PROGRESS'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : task.status === 'BLOCKED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : task.status === 'IN_REVIEW'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        <option value="ASSIGNED">ASSIGNED</option>
                        <option value="TODO">TODO</option>
                        <option value="IN_PROGRESS">IN PROGRESS</option>
                        <option value="IN_REVIEW">IN REVIEW</option>
                        <option value="BLOCKED">BLOCKED</option>
                        <option value="COMPLETED">COMPLETED</option>
                      </select>
                    ) : (
                      <Badge variant={task.status?.toLowerCase() || 'default'}>
                        {task.status?.replace('_', ' ')}
                      </Badge>
                    )}
                  </td>

                  {/* Progress */}
                  <td className="px-4 py-4 w-32 whitespace-nowrap">
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600 mb-1">
                      <span>{task.progress || 0}%</span>
                    </div>
                    <ProgressBar progress={task.progress || 0} />
                  </td>

                  {/* Due date */}
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`text-[11px] font-medium ${isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                      {isOverdue && ' (Overdue)'}
                    </span>
                  </td>

                  {/* Actions (Manager only) */}
                  {isManager && (
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {onEditTask && (
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => onEditTask(task)}
                            title="Edit task"
                          >
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        )}
                        {onDeleteTask && (
                          <Button
                            size="xs"
                            variant="danger"
                            onClick={() => onDeleteTask(task._id)}
                            title="Delete task"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PersonalTaskTable;
