import React from 'react';
import { Link } from 'react-router-dom';
import { PROJECT_STATUS } from '../../utils/constants';
import { formatDate, formatCurrency } from '../../utils/formatters';
import ProgressBar from '../common/ProgressBar';
import { Calendar, CheckSquare, Layers, ArrowRight, User, IndianRupee } from 'lucide-react';

const ProjectCard = ({ project, basePath = '/admin/projects' }) => {
  const statusConfig = PROJECT_STATUS[project.status] || {
    label: project.status,
    color: 'bg-slate-100 text-slate-700'
  };

  const totalTasks = project.stats?.totalTasks ?? 0;
  const completedTasks = project.stats?.completedTasks ?? 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card hover:shadow-md transition-all flex flex-col justify-between group">
      <div>
        {/* Header: Title & Status */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <Link
            to={`${basePath}/${project._id}`}
            className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-1"
          >
            {project.name}
          </Link>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${statusConfig.color}`}
          >
            {statusConfig.label}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
          {project.description || 'No project description provided.'}
        </p>

        {/* Client info */}
        <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 mb-4">
          <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0">
            {project.client?.name?.charAt(0) || <User className="w-3 h-3" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-slate-800 truncate">{project.client?.name || 'Unassigned Client'}</p>
            {project.client?.companyName && (
              <p className="text-[10px] text-slate-500 truncate">{project.client.companyName}</p>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <ProgressBar progress={project.progress || 0} size="sm" showLabel={true} />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
            <span>Tasks: <strong className="text-slate-700">{completedTasks}/{totalTasks}</strong></span>
          </div>

          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="truncate">Due: <strong className="text-slate-700">{formatDate(project.endDate)}</strong></span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-400 inline-flex items-center gap-1">
          <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
          <span>Budget: <strong className="text-slate-700">{formatCurrency(project.budget)}</strong></span>
        </span>

        <Link
          to={`${basePath}/${project._id}`}
          className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          Details <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};

export default ProjectCard;
