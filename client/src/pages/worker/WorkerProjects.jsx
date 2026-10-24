import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectService } from '../../services/projectService';
import { FolderKanban, Calendar, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '../../components/common/Badge';
import ProgressBar from '../../components/common/ProgressBar';

const EmployeeProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const res = await projectService.getProjects();
        if (res.success) {
          setProjects(res.projects || []);
        }
      } catch (err) {
        toast.error('Failed to load assigned projects.');
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Assigned Projects</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Projects where you are actively assigned tasks or registered as an engineering collaborator
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <FolderKanban className="mx-auto h-8 w-8 text-slate-400" />
          <h3 className="mt-2 text-sm font-semibold text-slate-800">No projects assigned</h3>
          <p className="text-xs text-slate-500 mt-1">You are not currently assigned to any active client projects.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project._id}
              className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm hover:border-indigo-200 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-medium text-slate-500 truncate">
                    Client: {project.client?.name || 'Assigned Client'}
                  </span>
                  <Badge variant={project.health?.toLowerCase() || 'default'}>
                    {project.health?.replace('_', ' ')}
                  </Badge>
                </div>

                <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                  {project.name}
                </h3>

                {project.description && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500 font-medium">Stage:</span>
                    <span className="font-semibold text-slate-800">{project.stage?.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500 font-medium">Progress:</span>
                    <span className="font-semibold text-indigo-600">{project.progress}%</span>
                  </div>
                  <ProgressBar progress={project.progress} />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Due {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'TBD'}</span>
                </div>

                <Link
                  to={`/Employee/tasks?projectId=${project._id}`}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                >
                  <span>My Tasks</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmployeeProjects;
