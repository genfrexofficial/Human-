import React, { useState, useEffect } from 'react';
import { projectService } from '../../services/projectService';
import ProjectCard from '../../components/projects/ProjectCard';
import ProjectModal from '../../components/projects/ProjectModal';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import EmptyState from '../../components/common/EmptyState';
import { CardSkeleton } from '../../components/common/Skeleton';
import { Plus, Search, FolderKanban, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminProjects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await projectService.getProjects();
      if (res.success) {
        setProjects(res.projects || []);
      }
    } catch (err) {
      toast.error('Failed to load projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (formData) => {
    try {
      const res = await projectService.createProject(formData);
      if (res.success) {
        toast.success(`Project "${res.project.name}" created!`);
        fetchProjects();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create project.';
      toast.error(msg);
      throw err;
    }
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.client?.companyName?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Projects</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your agency portfolio, client deliverables, and milestones.
          </p>
        </div>

        <Button onClick={() => setModalOpen(true)} icon={Plus}>
          New Project
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-subtle">
        {/* Search */}
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search by project or client..."
            icon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {['ALL', 'IN_PROGRESS', 'PLANNING', 'COMPLETED', 'ON_HOLD'].map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Projects Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <EmptyState
            icon={FolderKanban}
            title={projects.length === 0 ? "No projects yet." : "No projects match your filter"}
            description={projects.length === 0 ? "Add your first client project to manage milestones, sprint tasks, and talent assignments." : "Try changing your search terms or create a new client project."}
            actionLabel="Create Project"
            onAction={() => setModalOpen(true)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              basePath="/admin/projects"
            />
          ))}
        </div>
      )}

      {/* Project Creation Modal */}
      <ProjectModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={handleCreateProject}
        onSubmit={handleCreateProject}
      />
    </div>
  );
};

export default AdminProjects;
