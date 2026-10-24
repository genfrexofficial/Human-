import React, { useState, useEffect } from 'react';
import { projectService } from '../../services/projectService';
import { taskService } from '../../services/taskService';
import { EmployeeService } from '../../services/EmployeeService';
import TaskTable from '../../components/tasks/TaskTable';
import TaskModal from '../../components/tasks/TaskModal';
import PersonalTaskTable from '../../components/tasks/PersonalTaskTable';
import PersonalTaskModal from '../../components/tasks/PersonalTaskModal';
import Button from '../../components/common/Button';
import { CardSkeleton } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import {
  CheckSquare,
  Plus,
  Filter,
  FolderKanban,
  UserCheck,
  Search,
  Sparkles,
  Layers,
  Clock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminTasks = () => {
  const [activeTab, setActiveTab] = useState('PROJECT'); // 'PROJECT' | 'PERSONAL'

  // PROJECT TASKS STATE
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // PERSONAL TASKS STATE
  const [personalTasks, setPersonalTasks] = useState([]);
  const [personalLoading, setPersonalLoading] = useState(false);
  const [personalModalOpen, setPersonalModalOpen] = useState(false);
  const [editingPersonalTask, setEditingPersonalTask] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [employeeFilter, setEmployeeFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilterPersonal, setStatusFilterPersonal] = useState('ALL');
  const [personalSearch, setPersonalSearch] = useState('');

  // Initial Fetch for Project Tasks
  const fetchInitial = async () => {
    try {
      setLoading(true);
      const projRes = await projectService.getProjects();
      if (projRes.success && projRes.projects?.length > 0) {
        setProjects(projRes.projects);
        const firstId = projRes.projects[0]._id;
        setSelectedProjectId(firstId);
        const tasksRes = await taskService.getProjectTasks(firstId);
        if (tasksRes.success) setTasks(tasksRes.tasks || []);
      }
    } catch (err) {
      toast.error('Failed to load project tasks.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Personal Tasks
  const fetchPersonalTasks = async () => {
    try {
      setPersonalLoading(true);
      const [pRes, empRes] = await Promise.all([
        taskService.getPersonalTasks(),
        EmployeeService.getEmployees()
      ]);
      if (pRes.success) setPersonalTasks(pRes.tasks || []);
      if (empRes.success) setEmployees(empRes.Employees || []);
    } catch (err) {
      toast.error('Failed to load personal company tasks.');
    } finally {
      setPersonalLoading(false);
    }
  };

  useEffect(() => {
    fetchInitial();
    fetchPersonalTasks();
  }, []);

  // When switching tabs
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'PERSONAL' && personalTasks.length === 0) {
      fetchPersonalTasks();
    }
  };

  // PROJECT TASK ACTIONS
  const handleProjectSelect = async (projectId) => {
    setSelectedProjectId(projectId);
    try {
      setLoading(true);
      const res = await taskService.getProjectTasks(projectId);
      if (res.success) setTasks(res.tasks || []);
    } catch (err) {
      toast.error('Failed to load project tasks.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskService.updateTask(taskId, { status: newStatus });
      toast.success(`Task status updated to ${newStatus}.`);
      const res = await taskService.getProjectTasks(selectedProjectId);
      if (res.success) setTasks(res.tasks || []);
    } catch (err) {
      toast.error('Failed to update status.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Delete this project task?')) {
      try {
        await taskService.deleteTask(taskId);
        toast.success('Task deleted.');
        const res = await taskService.getProjectTasks(selectedProjectId);
        if (res.success) setTasks(res.tasks || []);
      } catch (err) {
        toast.error('Failed to delete task.');
      }
    }
  };

  const handleSaveTask = async (taskData, taskId) => {
    try {
      if (taskId) {
        await taskService.updateTask(taskId, taskData);
        toast.success('Task updated.');
      } else {
        await taskService.createTask(taskData);
        toast.success('Task created.');
      }
      const res = await taskService.getProjectTasks(selectedProjectId);
      if (res.success) setTasks(res.tasks || []);
    } catch (err) {
      toast.error('Task action failed.');
      throw err;
    }
  };

  // PERSONAL TASK ACTIONS
  const handlePersonalStatusChange = async (taskId, newStatus) => {
    try {
      await taskService.updateTask(taskId, { status: newStatus });
      toast.success(`Personal task marked as ${newStatus}.`);
      fetchPersonalTasks();
    } catch (err) {
      toast.error('Failed to update status.');
    }
  };

  const handleDeletePersonalTask = async (taskId) => {
    if (window.confirm('Delete this company personal task?')) {
      try {
        await taskService.deleteTask(taskId);
        toast.success('Personal task deleted.');
        fetchPersonalTasks();
      } catch (err) {
        toast.error('Failed to delete personal task.');
      }
    }
  };

  const handleSavePersonalTask = async (taskData, taskId) => {
    try {
      if (taskId) {
        await taskService.updateTask(taskId, taskData);
        toast.success('Personal task updated.');
      } else {
        await taskService.createTask(taskData);
        toast.success('Personal task assigned to employee successfully!');
      }
      fetchPersonalTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save personal task.');
      throw err;
    }
  };

  // Filtered Personal Tasks
  const filteredPersonalTasks = personalTasks.filter((t) => {
    const matchesEmployee =
      employeeFilter === 'ALL' ||
      (t.assignedTo && (t.assignedTo._id === employeeFilter || t.assignedTo === employeeFilter));
    const matchesCategory = categoryFilter === 'ALL' || t.personalCategory === categoryFilter;
    const matchesStatus = statusFilterPersonal === 'ALL' || t.status === statusFilterPersonal;
    const matchesSearch =
      t.title.toLowerCase().includes(personalSearch.toLowerCase()) ||
      (t.assignedTo?.name && t.assignedTo.name.toLowerCase().includes(personalSearch.toLowerCase())) ||
      (t.description && t.description.toLowerCase().includes(personalSearch.toLowerCase()));

    return matchesEmployee && matchesCategory && matchesStatus && matchesSearch;
  });

  // Personal task stats
  const totalPersonal = personalTasks.length;
  const inProgressPersonal = personalTasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const completedPersonal = personalTasks.filter((t) => t.status === 'COMPLETED').length;
  const reviewOrBlockedPersonal = personalTasks.filter((t) => ['IN_REVIEW', 'BLOCKED'].includes(t.status)).length;

  return (
    <div className="space-y-6">
      {/* Page Title & Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            Task Management Hub
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage deliverables across client projects or assign internal personal tasks directly to company workers.
          </p>
        </div>

        {/* Action Button depends on active tab */}
        {activeTab === 'PROJECT' ? (
          selectedProjectId && (
            <Button
              onClick={() => {
                setEditingTask(null);
                setTaskModalOpen(true);
              }}
              icon={Plus}
            >
              Create Project Task
            </Button>
          )
        ) : (
          <Button
            onClick={() => {
              setEditingPersonalTask(null);
              setPersonalModalOpen(true);
            }}
            icon={Plus}
            variant="primary"
          >
            Assign Personal Task
          </Button>
        )}
      </div>

      {/* Modern Dual Tab Selector */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => handleTabChange('PROJECT')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 font-semibold text-xs transition-colors ${
            activeTab === 'PROJECT'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
          }`}
        >
          <FolderKanban className="w-4 h-4" />
          <span>Project Tasks ({projects.reduce((acc, p) => acc + (p.taskCount || 0), tasks.length)})</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('PERSONAL')}
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

      {/* ================= TAB 1: PROJECT TASKS ================= */}
      {activeTab === 'PROJECT' && (
        <div className="space-y-4">
          {/* Project Selector Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-semibold text-slate-700">Select Project:</span>
            </div>

            <select
              value={selectedProjectId}
              onChange={(e) => handleProjectSelect(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-w-[240px]"
            >
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.progress}%)
                </option>
              ))}
            </select>
          </div>

          {/* Project Task List */}
          {loading ? (
            <CardSkeleton />
          ) : tasks.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8">
              <EmptyState
                icon={CheckSquare}
                title="No tasks in this project"
                description="Create tasks to break down deliverables and automatically calculate project progress."
                actionLabel="Add First Task"
                onAction={() => {
                  setEditingTask(null);
                  setTaskModalOpen(true);
                }}
              />
            </div>
          ) : (
            <TaskTable
              tasks={tasks}
              isAdmin={true}
              onStatusChange={handleStatusChange}
              onEditTask={(t) => {
                setEditingTask(t);
                setTaskModalOpen(true);
              }}
              onDeleteTask={handleDeleteTask}
            />
          )}

          {/* Project Task Modal */}
          <TaskModal
            isOpen={taskModalOpen}
            onClose={() => setTaskModalOpen(false)}
            task={editingTask}
            projectId={selectedProjectId}
            onSaved={handleSaveTask}
          />
        </div>
      )}

      {/* ================= TAB 2: COMPANY PERSONAL TASKS ================= */}
      {activeTab === 'PERSONAL' && (
        <div className="space-y-4">
          {/* Quick Metrics Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-subtle flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Total Assigned</span>
                <span className="text-lg font-bold text-slate-900">{totalPersonal}</span>
              </div>
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                <Layers className="w-4 h-4" />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-subtle flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">In Progress</span>
                <span className="text-lg font-bold text-blue-600">{inProgressPersonal}</span>
              </div>
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-subtle flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Completed</span>
                <span className="text-lg font-bold text-emerald-600">{completedPersonal}</span>
              </div>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-subtle flex items-center justify-between">
              <div>
                <span className="text-[11px] font-medium text-slate-500 block">Attention Needed</span>
                <span className="text-lg font-bold text-amber-600">{reviewOrBlockedPersonal}</span>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <AlertCircle className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Filters & Search Toolbar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-subtle flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search personal tasks, employee name, or details..."
                value={personalSearch}
                onChange={(e) => setPersonalSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Filter Dropdowns */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Employee filter */}
              <select
                value={employeeFilter}
                onChange={(e) => setEmployeeFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">All Workers</option>
                {employees.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name}
                  </option>
                ))}
              </select>

              {/* Category filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">All Categories</option>
                <option value="INTERNAL_WORK">Internal Work</option>
                <option value="TRAINING">Training</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="RESEARCH">Research</option>
                <option value="HR_COMPLIANCE">Compliance</option>
                <option value="OTHER">Other</option>
              </select>

              {/* Status filter */}
              <select
                value={statusFilterPersonal}
                onChange={(e) => setStatusFilterPersonal(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="IN_REVIEW">Under Review</option>
                <option value="COMPLETED">Completed</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </div>
          </div>

          {/* Personal Tasks Table */}
          {personalLoading ? (
            <CardSkeleton />
          ) : filteredPersonalTasks.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10">
              <EmptyState
                icon={UserCheck}
                title="No Personal Tasks Found"
                description={
                  personalSearch || employeeFilter !== 'ALL' || categoryFilter !== 'ALL' || statusFilterPersonal !== 'ALL'
                    ? 'No personal tasks match your current filter criteria.'
                    : 'Assign personal tasks (internal development, training, HR compliance) to company workers.'
                }
                actionLabel="Assign First Personal Task"
                onAction={() => {
                  setEditingPersonalTask(null);
                  setPersonalModalOpen(true);
                }}
              />
            </div>
          ) : (
            <PersonalTaskTable
              tasks={filteredPersonalTasks}
              isManager={true}
              onStatusChange={handlePersonalStatusChange}
              onEditTask={(t) => {
                setEditingPersonalTask(t);
                setPersonalModalOpen(true);
              }}
              onDeleteTask={handleDeletePersonalTask}
            />
          )}

          {/* Personal Task Modal */}
          <PersonalTaskModal
            isOpen={personalModalOpen}
            onClose={() => setPersonalModalOpen(false)}
            task={editingPersonalTask}
            onSaved={handleSavePersonalTask}
          />
        </div>
      )}
    </div>
  );
};

export default AdminTasks;
