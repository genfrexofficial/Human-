import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { taskService } from '../../services/taskService';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  FolderKanban,
  ArrowRight,
  Play,
  Send,
  Loader2,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '../../components/common/Badge';
import ProgressBar from '../../components/common/ProgressBar';
import Button from '../../components/common/Button';

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await taskService.getMyTasks();
      if (res.success) {
        setTasks(res.tasks || []);
      }
    } catch (err) {
      toast.error('Failed to load your assigned tasks.');
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
        toast.success('Task started! Status moved to In Progress.');
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
        toast.success('Submitted for Admin review!');
        fetchTasks();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setActionLoading((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const now = new Date();
  const assignedCount = tasks.filter((t) => t.status === 'ASSIGNED' || t.status === 'TODO').length;
  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const awaitingReviewCount = tasks.filter((t) => t.status === 'IN_REVIEW').length;
  const blockedCount = tasks.filter((t) => t.status === 'BLOCKED').length;
  const completedCount = tasks.filter((t) => t.status === 'COMPLETED').length;
  const overdueCount = tasks.filter(
    (t) => t.status !== 'COMPLETED' && t.dueDate && new Date(t.dueDate) < now
  ).length;

  const activeTasks = tasks.filter((t) => t.status !== 'COMPLETED');

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
          <p className="text-xs text-slate-500">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
            Engineer Portal
          </span>
          <h1 className="text-xl font-bold text-slate-900 mt-2">
            Welcome back, {user?.name}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {user?.title || 'Team Member'} &bull; Apex Digital Systems
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/Employee/tasks">
            <Button size="sm" variant="secondary">
              View All Tasks ({tasks.length})
            </Button>
          </Link>
          <Link to="/Employee/files">
            <Button size="sm">
              Upload Work File
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-slate-500">Assigned</span>
            <CheckSquare className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{assignedCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Awaiting start</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-slate-500">In Progress</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{inProgressCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Active execution</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-slate-500">Under Review</span>
            <Send className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{awaitingReviewCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Submitted to Admin</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-slate-500">Blocked</span>
            <AlertCircle className="h-4 w-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{blockedCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Need resolution</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-slate-500">Overdue</span>
            <Clock className="h-4 w-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{overdueCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Past target date</p>
        </div>

        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium text-slate-500">Completed</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-slate-900 mt-2">{completedCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Delivered</p>
        </div>
      </div>

      {/* Active Work Section */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Your Active Queue</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Tasks assigned to you requiring active implementation or review
            </p>
          </div>
          <Link to="/Employee/tasks" className="text-xs font-medium text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
            <span>View All</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {activeTasks.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-200 rounded-lg">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
            <h3 className="mt-2 text-sm font-semibold text-slate-900">Queue is clear!</h3>
            <p className="text-xs text-slate-500 mt-1">You have no active or pending tasks right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeTasks.map((task) => {
              const isOverdue = task.dueDate && new Date(task.dueDate) < now && task.status !== 'COMPLETED';
              const isLoading = actionLoading[task._id];

              return (
                <div
                  key={task._id}
                  className="flex flex-col justify-between rounded-lg border border-slate-200/80 p-4 hover:border-indigo-200 transition-colors bg-slate-50/40"
                >
                  <div>
                    {/* Header tags */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-[11px] font-medium text-slate-500 truncate">
                        {task.project?.name || 'Project'}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant={task.priority?.toLowerCase() || 'default'}>
                          {task.priority}
                        </Badge>
                        <Badge variant={task.status?.toLowerCase() || 'default'}>
                          {task.status?.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>

                    {/* Task Title */}
                    <Link
                      to={`/Employee/tasks/${task._id}`}
                      className="text-sm font-semibold text-slate-900 hover:text-indigo-600 transition-colors line-clamp-1"
                    >
                      {task.title}
                    </Link>

                    {task.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {task.description}
                      </p>
                    )}

                    {/* Progress */}
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 mb-1">
                        <span>Progress</span>
                        <span>{task.progress}%</span>
                      </div>
                      <ProgressBar progress={task.progress} />
                    </div>
                  </div>

                  {/* Footer & Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2 text-xs">
                    <div className={`flex items-center gap-1 text-[11px] ${isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No deadline'}
                        {isOverdue && ' (Overdue)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {task.status === 'ASSIGNED' && (
                        <Button
                          size="xs"
                          variant="primary"
                          disabled={isLoading}
                          onClick={() => handleStartTask(task._id)}
                        >
                          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 mr-1" />}
                          Start
                        </Button>
                      )}

                      {task.status === 'IN_PROGRESS' && (
                        <Button
                          size="xs"
                          variant="outline"
                          disabled={isLoading}
                          onClick={() => handleSubmitReview(task._id)}
                        >
                          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
                          Submit
                        </Button>
                      )}

                      <Link to={`/Employee/tasks/${task._id}`}>
                        <Button size="xs" variant="secondary">
                          Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboard;
