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
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '../../components/common/Badge';
import ProgressBar from '../../components/common/ProgressBar';
import Button from '../../components/common/Button';

const WorkerTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await taskService.getMyTasks();
      if (res.success) {
        setTasks(res.tasks || []);
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

  const filteredTasks = tasks.filter((t) => {
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesSearch =
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.project?.name && t.project.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const now = new Date();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">My Task Queue</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your engineering tasks, update completion progress, and submit work for review
          </p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks or projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Status Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
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

      {/* Task List */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <CheckSquare className="mx-auto h-8 w-8 text-slate-400" />
          <h3 className="mt-2 text-sm font-semibold text-slate-800">No tasks found</h3>
          <p className="text-xs text-slate-500 mt-1">
            {searchQuery || statusFilter !== 'ALL'
              ? 'No tasks match your filter criteria.'
              : 'You currently have no tasks assigned.'}
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
                {filteredTasks.map((task) => {
                  const isOverdue = task.dueDate && new Date(task.dueDate) < now && task.status !== 'COMPLETED';
                  const isActing = actionLoading[task._id];

                  return (
                    <tr key={task._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 max-w-xs">
                        <Link
                          to={`/worker/tasks/${task._id}`}
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

                          <Link to={`/worker/tasks/${task._id}`}>
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
      )}
    </div>
  );
};

export default WorkerTasks;
