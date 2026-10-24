import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { taskService } from '../../services/taskService';
import {
  CheckSquare,
  Search,
  Filter,
  Play,
  Send,
  Loader2,
  Calendar,
  FolderKanban,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  Tag,
  Clock,
  Layers,
  ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '../../components/common/Badge';
import ProgressBar from '../../components/common/ProgressBar';
import Button from '../../components/common/Button';

const CATEGORY_MAP = {
  INTERNAL_WORK: { label: 'Internal Work', icon: '📋', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  TRAINING: { label: 'Training & Upskilling', icon: '🎓', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  MAINTENANCE: { label: 'Maintenance & DevOps', icon: '🛠️', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  RESEARCH: { label: 'Research Spike', icon: '🔬', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  HR_COMPLIANCE: { label: 'HR & Compliance', icon: '⚖️', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  OTHER: { label: 'Internal Task', icon: '📌', color: 'bg-slate-50 text-slate-700 border-slate-200' }
};

const EmployeeTasks = () => {
  const [activeTab, setActiveTab] = useState('PROJECT'); // 'PROJECT' | 'PERSONAL'
  const [allTasks, setAllTasks] = useState([]);
  const [personalTasks, setPersonalTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const [myTasksRes, personalRes] = await Promise.all([
        taskService.getMyTasks(),
        taskService.getPersonalTasks()
      ]);

      if (myTasksRes.success) {
        // Project tasks are tasks with taskType !== 'PERSONAL' and project defined
        const projTasks = (myTasksRes.tasks || []).filter((t) => t.taskType !== 'PERSONAL');
        setAllTasks(projTasks);
      }
      if (personalRes.success) {
        setPersonalTasks(personalRes.tasks || []);
      }
    } catch (err) {
      toast.error('Failed to load tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleStartTask = async (taskId) => {
    try {
      setActionLoading((prev) => ({ ...prev, [taskId]: true }));
      const res = await taskService.startTask(taskId);
      if (res.success) {
        toast.success('Task started! Status is now In Progress.');
        fetchTasks();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start task.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const handleSubmitReview = async (taskId) => {
    try {
      setActionLoading((prev) => ({ ...prev, [taskId]: true }));
      const res = await taskService.submitReview(taskId);
      if (res.success) {
        toast.success('Task submitted for review.');
        fetchTasks();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const handleQuickProgress = async (taskId, currentProgress) => {
    const nextProgress = prompt('Enter task progress (0 - 100):', currentProgress || 0);
    if (nextProgress === null) return;
    const pNum = Number(nextProgress);
    if (isNaN(pNum) || pNum < 0 || pNum > 100) {
      toast.error('Progress must be a number between 0 and 100.');
      return;
    }

    try {
      setActionLoading((prev) => ({ ...prev, [taskId]: true }));
      const res = await taskService.updateProgress(taskId, pNum);
      if (res.success) {
        toast.success(`Progress updated to ${pNum}%.`);
        fetchTasks();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update progress.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const now = new Date();

  // Filtered Project Tasks
  const filteredProjectTasks = allTasks.filter((t) => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.project?.name && t.project.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Filtered Personal Tasks
  const filteredPersonalTasks = personalTasks.filter((t) => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesCategory = categoryFilter === 'ALL' || t.personalCategory === categoryFilter;
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.assignedBy?.name && t.assignedBy.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesCategory && matchesSearch;
  });

  const totalPersonal = personalTasks.length;
  const inProgressPersonal = personalTasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const completedPersonal = personalTasks.filter((t) => t.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Task Queue</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your project deliverables and company personal assignments from Admin & HR
          </p>
        </div>
      </div>

      {/* Dual Tab Switcher */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => {
            setActiveTab('PROJECT');
            setStatusFilter('ALL');
          }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-xs transition-colors ${
            activeTab === 'PROJECT'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          <span>Project Tasks ({allTasks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('PERSONAL');
            setStatusFilter('ALL');
          }}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-xs transition-colors ${
            activeTab === 'PERSONAL'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Company Personal Tasks</span>
          {personalTasks.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-100 text-indigo-700 font-bold">
              {personalTasks.length}
            </span>
          )}
        </button>
      </div>

      {/* Quick Summary Banner for Personal Tasks */}
      {activeTab === 'PERSONAL' && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-subtle flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 font-medium">Assigned to Me</span>
              <span className="text-base font-bold text-slate-900 block">{totalPersonal}</span>
            </div>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-subtle flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 font-medium">In Progress</span>
              <span className="text-base font-bold text-blue-600 block">{inProgressPersonal}</span>
            </div>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-subtle flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 font-medium">Completed</span>
              <span className="text-base font-bold text-emerald-600 block">{completedPersonal}</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'PROJECT' ? 'Search tasks or projects...' : 'Search personal tasks or notes...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Filter items */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
          {activeTab === 'PERSONAL' && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 font-medium focus:border-indigo-500 focus:outline-none mr-1"
            >
              <option value="ALL">All Categories</option>
              <option value="INTERNAL_WORK">Internal Work</option>
              <option value="TRAINING">Training</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="RESEARCH">Research</option>
              <option value="HR_COMPLIANCE">Compliance</option>
              <option value="OTHER">Other</option>
            </select>
          )}

          {['ALL', 'ASSIGNED', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'COMPLETED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      ) : activeTab === 'PROJECT' ? (
        /* ================= TAB 1: PROJECT TASKS TABLE ================= */
        filteredProjectTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <CheckSquare className="mx-auto h-8 w-8 text-slate-400" />
            <h3 className="mt-2 text-sm font-semibold text-slate-800">No project tasks found</h3>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery || statusFilter !== 'ALL'
                ? 'No project tasks match your filter criteria.'
                : 'You currently have no project tasks assigned.'}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-5 py-3">Task Details</th>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Progress</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProjectTasks.map((task) => {
                    const isOverdue = task.dueDate && new Date(task.dueDate) < now && task.status !== 'COMPLETED';
                    const isActing = actionLoading[task._id];

                    return (
                      <tr key={task._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-3.5 max-w-xs">
                          <Link
                            to={`/Employee/tasks/${task._id}`}
                            className="font-semibold text-slate-900 hover:text-indigo-600 transition-colors line-clamp-1"
                          >
                            {task.title}
                          </Link>
                          {task.milestone && (
                            <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                              Milestone: {task.milestone.title}
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 text-slate-600 font-medium whitespace-nowrap">
                          {task.project?.name || '—'}
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <Badge variant={task.priority?.toLowerCase() || 'default'}>
                            {task.priority}
                          </Badge>
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <Badge variant={task.status?.toLowerCase() || 'default'}>
                            {task.status?.replace('_', ' ')}
                          </Badge>
                        </td>

                        <td className="px-4 py-3.5 w-36">
                          <div className="flex items-center justify-between text-[10px] font-medium text-slate-600 mb-1">
                            <span>{task.progress}%</span>
                          </div>
                          <ProgressBar progress={task.progress} />
                        </td>

                        <td className="px-4 py-3.5 whitespace-nowrap">
                          <span className={`text-[11px] font-medium ${isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                            {isOverdue && ' (Overdue)'}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {task.status === 'ASSIGNED' && (
                              <Button
                                size="xs"
                                variant="primary"
                                disabled={isActing}
                                onClick={() => handleStartTask(task._id)}
                              >
                                {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                                Start
                              </Button>
                            )}

                            {task.status === 'IN_PROGRESS' && (
                              <Button
                                size="xs"
                                variant="outline"
                                disabled={isActing}
                                onClick={() => handleSubmitReview(task._id)}
                              >
                                {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                                Submit
                              </Button>
                            )}

                            <Link to={`/Employee/tasks/${task._id}`}>
                              <Button size="xs" variant="secondary">
                                Open
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        /* ================= TAB 2: COMPANY PERSONAL TASKS TABLE ================= */
        filteredPersonalTasks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
            <UserCheck className="mx-auto h-8 w-8 text-slate-400" />
            <h3 className="mt-2 text-sm font-semibold text-slate-800">No personal company tasks</h3>
            <p className="text-xs text-slate-500 mt-1">
              {searchQuery || statusFilter !== 'ALL' || categoryFilter !== 'ALL'
                ? 'No personal tasks match your filter criteria.'
                : 'You have no internal personal tasks assigned by Admin or HR right now.'}
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[700px]">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Task Description</th>
                    <th className="px-4 py-3.5">Category</th>
                    <th className="px-4 py-3.5">Assigned By</th>
                    <th className="px-4 py-3.5">Priority</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Progress</th>
                    <th className="px-4 py-3.5">Due Date</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPersonalTasks.map((task) => {
                    const cat = CATEGORY_MAP[task.personalCategory] || CATEGORY_MAP.INTERNAL_WORK;
                    const isOverdue = task.dueDate && new Date(task.dueDate) < now && task.status !== 'COMPLETED';
                    const isActing = actionLoading[task._id];

                    return (
                      <tr key={task._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4 max-w-xs">
                          <span className="font-semibold text-slate-900 block text-xs line-clamp-1">
                            {task.title}
                          </span>
                          {task.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5">
                              {task.description}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${cat.color}`}>
                            <span>{cat.icon}</span>
                            <span>{cat.label}</span>
                          </span>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap text-slate-600 font-medium">
                          {task.assignedBy ? (
                            <div>
                              <span className="block text-xs font-semibold text-slate-800">{task.assignedBy.name}</span>
                              <span className="text-[10px] text-slate-400">{task.assignedBy.role}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Admin</span>
                          )}
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge variant={task.priority?.toLowerCase() || 'default'}>
                            {task.priority}
                          </Badge>
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge variant={task.status?.toLowerCase() || 'default'}>
                            {task.status?.replace('_', ' ')}
                          </Badge>
                        </td>

                        <td className="px-4 py-4 w-36 whitespace-nowrap">
                          <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600 mb-1">
                            <span>{task.progress || 0}%</span>
                            {['ASSIGNED', 'IN_PROGRESS'].includes(task.status) && (
                              <button
                                type="button"
                                onClick={() => handleQuickProgress(task._id, task.progress)}
                                className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline text-[10px]"
                              >
                                Edit %
                              </button>
                            )}
                          </div>
                          <ProgressBar progress={task.progress || 0} />
                        </td>

                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`text-[11px] font-medium ${isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                            {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                            {isOverdue && ' (Overdue)'}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {['ASSIGNED', 'TODO'].includes(task.status) && (
                              <Button
                                size="xs"
                                variant="primary"
                                disabled={isActing}
                                onClick={() => handleStartTask(task._id)}
                              >
                                {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                                Start
                              </Button>
                            )}

                            {task.status === 'IN_PROGRESS' && (
                              <Button
                                size="xs"
                                variant="outline"
                                disabled={isActing}
                                onClick={() => handleSubmitReview(task._id)}
                              >
                                {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                                Submit
                              </Button>
                            )}

                            {task.status === 'COMPLETED' && (
                              <span className="inline-flex items-center text-emerald-600 font-medium text-[11px] gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Done
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}
    </div>
  );
};

export default EmployeeTasks;
