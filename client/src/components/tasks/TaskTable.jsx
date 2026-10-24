import React from 'react';
import { TASK_STATUS, TASK_PRIORITY } from '../../utils/constants';
import { formatDate } from '../../utils/formatters';
import { CheckCircle2, Clock, AlertCircle, Edit2, Trash2, Calendar, User } from 'lucide-react';

const TaskTable = ({
  tasks = [],
  isAdmin = false,
  onStatusChange,
  onEditTask,
  onDeleteTask
}) => {
  if (!tasks || tasks.length === 0) {
    return (
      <div className="py-12 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
        No tasks created for this project yet.
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-white rounded-xl border border-slate-200/80 shadow-card">
      <div className="overflow-x-auto">
        <table className="min-w-[600px] w-full divide-y divide-slate-200 text-xs">
          <thead>
            <tr className="bg-slate-50/70">
              <th className="py-3 px-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Task
              </th>
              <th className="py-3 px-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Status
              </th>
              <th className="py-3 px-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="py-3 px-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Due Date
              </th>
              {isAdmin && (
                <th className="py-3 px-4 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {tasks.map((task) => {
              const statusCfg = TASK_STATUS[task.status] || {
                label: task.status,
                color: 'bg-slate-100 text-slate-700'
              };
              const priorityCfg = TASK_PRIORITY[task.priority] || {
                label: task.priority,
                color: 'bg-slate-100 text-slate-600'
              };

              return (
                <tr key={task._id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-start gap-2.5">
                      {task.status === 'COMPLETED' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p
                          className={`text-xs font-semibold ${
                            task.status === 'COMPLETED' ? 'text-slate-400 line-through' : 'text-slate-900'
                          }`}
                        >
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            {task.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    {isAdmin ? (
                      <select
                        value={task.status}
                        onChange={(e) => onStatusChange(task._id, e.target.value)}
                        className={`text-xs font-medium rounded-md px-2 py-1 border cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500 ${statusCfg.color}`}
                      >
                        <option value="ASSIGNED">Assigned</option>
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="IN_REVIEW">Under Review</option>
                        <option value="CHANGES_REQUESTED">Changes Requested</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="BLOCKED">Blocked</option>
                      </select>
                    ) : (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusCfg.color}`}
                      >
                        {statusCfg.label}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${priorityCfg.color}`}
                    >
                      {priorityCfg.label}
                    </span>
                  </td>

                  <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDate(task.dueDate)}</span>
                    </div>
                  </td>

                  {isAdmin && (
                    <td className="py-3 px-4 whitespace-nowrap text-right text-xs">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEditTask(task)}
                          className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Edit Task"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteTask(task._id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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

export default TaskTable;
