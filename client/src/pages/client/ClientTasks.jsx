import React, { useState, useEffect } from 'react';
import { projectService } from '../../services/projectService';
import { taskService } from '../../services/taskService';
import { CheckSquare, Search, Filter, Loader2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '../../components/common/Badge';
import ProgressBar from '../../components/common/ProgressBar';

const ClientTasks = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const res = await projectService.getProjects();
        if (res.success && res.projects?.length > 0) {
          setProjects(res.projects);
          const firstId = res.projects[0]._id;
          setSelectedProjectId(firstId);
          await loadTasks(firstId);
        }
      } catch (err) {
        toast.error('Failed to load project tasks.');
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  const loadTasks = async (pId) => {
    try {
      const res = await taskService.getProjectTasks(pId);
      if (res.success) {
        setTasks(res.tasks || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleProjectChange = async (e) => {
    const newId = e.target.value;
    setSelectedProjectId(newId);
    setLoading(true);
    await loadTasks(newId);
    setLoading(false);
  };

  const filteredTasks = tasks.filter((t) => {
    return t.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Project Engineering Tasks</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Real-time visibility into the implementation progress of your project requirements
        </p>
      </div>

      {/* Project Selector & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Project:</span>
          <select
            value={selectedProjectId}
            onChange={handleProjectChange}
            className="rounded-lg border border-slate-200 py-1.5 px-3 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
          >
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Tasks Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <CheckSquare className="mx-auto h-8 w-8 text-slate-400" />
          <h3 className="mt-2 text-sm font-semibold text-slate-800">No tasks found</h3>
          <p className="text-xs text-slate-500 mt-1">Tasks planned for this project will appear here.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3">Task</th>
                  <th className="px-4 py-3">Milestone</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-5 py-3 text-right">Target Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.map((task) => (
                  <tr key={task._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5 max-w-sm">
                      <span className="font-semibold text-slate-900 block">{task.title}</span>
                      {task.description && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{task.description}</p>
                      )}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                      {task.milestone?.title || '—'}
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

                    <td className="px-4 py-3.5 w-40">
                      <div className="flex items-center justify-between text-[10px] font-medium text-slate-600 mb-1">
                        <span>{task.progress}%</span>
                      </div>
                      <ProgressBar progress={task.progress} />
                    </td>

                    <td className="px-5 py-3.5 text-right whitespace-nowrap text-slate-500 text-[11px]">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientTasks;
