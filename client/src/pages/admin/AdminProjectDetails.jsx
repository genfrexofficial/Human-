import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { projectService } from '../../services/projectService';
import { taskService } from '../../services/taskService';
import { milestoneService } from '../../services/milestoneService';
import { fileService } from '../../services/fileService';
import { commentService } from '../../services/commentService';
import { activityService } from '../../services/activityService';
import { hrService } from '../../services/hrService';
import { taskRequestService } from '../../services/taskRequestService';
import { PROJECT_STATUS } from '../../utils/constants';
import { formatDate, formatCurrency } from '../../utils/formatters';
import ProgressBar from '../../components/common/ProgressBar';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import TaskTable from '../../components/tasks/TaskTable';
import TaskModal from '../../components/tasks/TaskModal';
import MilestoneTimeline from '../../components/milestones/MilestoneTimeline';
import MilestoneModal from '../../components/milestones/MilestoneModal';
import DeliverableReviewCard from '../../components/files/DeliverableReviewCard';
import FileUploadModal from '../../components/files/FileUploadModal';
import CommentSection from '../../components/feedback/CommentSection';
import RecentActivityFeed from '../../components/dashboard/RecentActivityFeed';
import ProjectModal from '../../components/projects/ProjectModal';
import CompletionSummaryModal from '../../components/projects/CompletionSummaryModal';
import AIProjectSummaryModal from '../../components/projects/AIProjectSummaryModal';
import ProjectStageRoadmap from '../../components/projects/ProjectStageRoadmap';
import LetterPreviewModal from '../../components/hr/LetterPreviewModal';
import {
  FolderKanban,
  CheckSquare,
  Layers,
  Files,
  MessageSquare,
  Clock,
  Sparkles,
  Award,
  Edit2,
  Trash2,
  Plus,
  Upload,
  User,
  Calendar,
  IndianRupee,
  Briefcase,
  FileCheck,
  UserCheck,
  Building2,
  ExternalLink,
  Users,
  CheckCircle2,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminProjectDetails = () => {
  const { id: projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [files, setFiles] = useState([]);
  const [comments, setComments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [projectAppointments, setProjectAppointments] = useState([]);
  const [taskRequests, setTaskRequests] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Modals state
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [createApptModalOpen, setCreateApptModalOpen] = useState(false);
  const [previewLetter, setPreviewLetter] = useState(null);

  // Quick Appointment Creation Modal Form State
  const [apptForm, setApptForm] = useState({
    candidateMode: 'existing', // 'existing' or 'new'
    candidateId: '',
    newCandidateName: '',
    newCandidateEmail: '',
    newCandidatePhone: '',
    requirementId: '',
    EmployeeId: '',
    role: ''
  });

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const [projRes, tasksRes, milesRes, filesRes, commsRes, actsRes, apptsRes, reqsRes, candRes] = await Promise.all([
        projectService.getProjectById(projectId),
        taskService.getProjectTasks(projectId),
        milestoneService.getProjectMilestones(projectId),
        fileService.getProjectFiles(projectId),
        commentService.getProjectComments(projectId),
        activityService.getProjectActivities(projectId),
        hrService.getAppointments({ projectId }).catch(() => ({ success: false })),
        taskRequestService.getTaskRequests({ project: projectId }).catch(() => ({ success: false })),
        hrService.getCandidates({ limit: 100 }).catch(() => ({ success: false }))
      ]);

      if (projRes.success) setProject(projRes.project);
      if (tasksRes.success) setTasks(tasksRes.tasks || []);
      if (milesRes.success) setMilestones(milesRes.milestones || []);
      if (filesRes.success) setFiles(filesRes.files || []);
      if (commsRes.success) setComments(commsRes.comments || []);
      if (actsRes.success) setActivities(actsRes.activities || []);
      if (apptsRes.success) setProjectAppointments(apptsRes.appointments || []);
      if (reqsRes.success) setTaskRequests(reqsRes.taskRequests || reqsRes.requests || []);
      if (candRes.success) setCandidates(candRes.candidates || []);
    } catch (err) {
      toast.error('Failed to load project details.');
      navigate('/admin/projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  // Project update
  const handleUpdateProject = async (formData) => {
    try {
      const res = await projectService.updateProject(projectId, formData);
      if (res.success) {
        toast.success('Project details updated.');
        setProject(res.project);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed.');
    }
  };

  // Delete project
  const handleDeleteProject = async () => {
    if (window.confirm('Are you sure you want to delete this project and all associated files, tasks, and data?')) {
      try {
        const res = await projectService.deleteProject(projectId);
        if (res.success) {
          toast.success('Project deleted successfully.');
          navigate('/admin/projects');
        }
      } catch (err) {
        toast.error('Failed to delete project.');
      }
    }
  };

  const handleStageUpdate = async (newStage) => {
    const res = await projectService.updateProjectStage(projectId, newStage);
    if (res.success) {
      setProject((prev) => ({ ...prev, stage: newStage }));
      fetchProjectData();
    }
  };

  // Tasks handlers
  const handleSaveTask = async (taskData, taskId) => {
    try {
      if (taskId) {
        const res = await taskService.updateTask(taskId, taskData);
        if (res.success) {
          toast.success('Task updated successfully.');
          fetchProjectData();
        }
      } else {
        const res = await taskService.createTask(taskData);
        if (res.success) {
          toast.success('Task created successfully.');
          fetchProjectData();
        }
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Task action failed.');
      throw err;
    }
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      const res = await taskService.updateTask(taskId, { status: newStatus });
      if (res.success) {
        toast.success(`Task marked as ${newStatus.replace('_', ' ')}.`);
        fetchProjectData();
      }
    } catch (err) {
      toast.error('Failed to update task status.');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Delete this task?')) {
      try {
        await taskService.deleteTask(taskId);
        toast.success('Task removed.');
        fetchProjectData();
      } catch (err) {
        toast.error('Failed to delete task.');
      }
    }
  };

  // Milestones handlers
  const handleSaveMilestone = async (milestoneData, milestoneId) => {
    try {
      if (milestoneId) {
        const res = await milestoneService.updateMilestone(milestoneId, milestoneData);
        if (res.success) {
          toast.success('Milestone updated.');
          fetchProjectData();
        }
      } else {
        const res = await milestoneService.createMilestone(milestoneData);
        if (res.success) {
          toast.success('Milestone added.');
          fetchProjectData();
        }
      }
    } catch (err) {
      toast.error('Failed to save milestone.');
      throw err;
    }
  };

  const handleMilestoneStatusChange = async (milestoneId, newStatus) => {
    try {
      await milestoneService.updateMilestone(milestoneId, { status: newStatus });
      toast.success('Milestone status updated.');
      fetchProjectData();
    } catch (err) {
      toast.error('Failed to update milestone status.');
    }
  };

  const handleDeleteMilestone = async (milestoneId) => {
    if (window.confirm('Delete this milestone?')) {
      try {
        await milestoneService.deleteMilestone(milestoneId);
        toast.success('Milestone removed.');
        fetchProjectData();
      } catch (err) {
        toast.error('Failed to delete milestone.');
      }
    }
  };

  // File handlers
  const handleUploadFile = async (formData) => {
    try {
      const res = await fileService.uploadFile(formData);
      if (res.success) {
        toast.success('File uploaded successfully!');
        fetchProjectData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed.');
      throw err;
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (window.confirm('Delete this file?')) {
      try {
        await fileService.deleteFile(fileId);
        toast.success('File deleted.');
        fetchProjectData();
      } catch (err) {
        toast.error('Failed to delete file.');
      }
    }
  };

  // Comments handlers
  const handleAddComment = async (commentData) => {
    try {
      const res = await commentService.createComment(commentData);
      if (res.success) {
        toast.success('Feedback posted.');
        fetchProjectData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Feedback post failed.');
      throw err;
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await commentService.deleteComment(commentId);
      toast.success('Comment removed.');
      fetchProjectData();
    } catch (err) {
      toast.error('Failed to remove comment.');
    }
  };

  // Create HR Appointment Action Handler
  const handleOpenCreateAppt = (prefill = {}) => {
    setApptForm({
      candidateMode: 'existing',
      candidateId: prefill.candidateId || '',
      newCandidateName: '',
      newCandidateEmail: '',
      newCandidatePhone: '',
      requirementId: prefill.requirementId || '',
      EmployeeId: prefill.EmployeeId || '',
      role: prefill.role || ''
    });
    setCreateApptModalOpen(true);
  };

  const handleProceedToApptBuilder = async (e) => {
    e.preventDefault();
    try {
      let targetCandId = apptForm.candidateId;

      // If new candidate chosen inline, create candidate record first
      if (apptForm.candidateMode === 'new') {
        if (!apptForm.newCandidateName || !apptForm.newCandidateEmail || !apptForm.newCandidatePhone) {
          toast.error('Candidate name, email, and phone are required.');
          return;
        }
        const candRes = await hrService.createCandidate({
          name: apptForm.newCandidateName,
          email: apptForm.newCandidateEmail,
          phone: apptForm.newCandidatePhone,
          designation: apptForm.role || 'Software Trainee',
          source: 'Client Project',
          projectId: project._id,
          clientId: project.client?._id || project.client,
          requirementId: apptForm.requirementId || null,
          EmployeeId: apptForm.EmployeeId || null
        });
        if (candRes.success) {
          targetCandId = candRes.candidate._id;
        }
      }

      setCreateApptModalOpen(false);

      // Navigate to Appointment Builder with prefilled context
      const queryParams = new URLSearchParams({
        projectId: project._id,
        clientId: project.client?._id || project.client || '',
        ...(targetCandId && { candidateId: targetCandId }),
        ...(apptForm.requirementId && { requirementId: apptForm.requirementId }),
        ...(apptForm.EmployeeId && { EmployeeId: apptForm.EmployeeId }),
        ...(apptForm.role && { designation: apptForm.role })
      });

      navigate(`/hr/appointments/create?${queryParams.toString()}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to prepare appointment.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!project) return null;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter((m) => m.status === 'COMPLETED').length;
  const pendingApprovals = files.filter((f) => f.approvalStatus === 'PENDING_REVIEW').length;

  return (
    <div className="space-y-6">
      {/* Top Project Banner */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-card">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${project.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                  project.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                    'bg-slate-100 text-slate-800'
                }`}>
                {project.status?.replace('_', ' ')}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                Stage: <strong>{project.stage?.replace('_', ' ')}</strong>
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 font-medium">
                Health: <strong>{project.health?.replace('_', ' ')}</strong>
              </span>
            </div>

            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-2">
              {project.name}
            </h1>

            <p className="text-xs text-slate-500 mt-1 max-w-2xl line-clamp-2">
              {project.description || 'No detailed description set for this project.'}
            </p>

            {/* Metadata Tags */}
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 font-medium">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Client: <strong>{project.client?.name}</strong> {project.client?.companyName && `(${project.client.companyName})`}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Target: <strong>{formatDate(project.endDate)}</strong></span>
              </div>

              <div className="flex items-center gap-1.5">
                <IndianRupee className="w-3.5 h-3.5 text-slate-400" />
                <span>Budget: <strong>{formatCurrency(project.budget)}</strong></span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenCreateAppt()}
              icon={FileCheck}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              Create HR Appointment
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setAiModalOpen(true)}
              icon={Sparkles}
              className="border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50"
            >
              AI Summary
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCompletionModalOpen(true)}
              icon={Award}
            >
              Summary
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setProjectModalOpen(true)}
              icon={Edit2}
            >
              Edit
            </Button>

            <button
              type="button"
              onClick={handleDeleteProject}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Delete Project"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress Bar & Quick Metrics */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <ProgressBar progress={project.progress || 0} size="md" showLabel={true} />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500 text-[11px]">Tasks Completed</span>
              <p className="font-bold text-slate-900 mt-0.5">{completedTasks} / {totalTasks}</p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500 text-[11px]">Milestones Achieved</span>
              <p className="font-bold text-slate-900 mt-0.5">{completedMilestones} / {totalMilestones}</p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500 text-[11px]">Client Requirements</span>
              <p className="font-bold text-indigo-600 mt-0.5">{taskRequests.length} requests</p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500 text-[11px]">HR Appointments</span>
              <p className="font-bold text-emerald-600 mt-0.5">
                {projectAppointments.length} linked offer{projectAppointments.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-5 overflow-x-auto pb-px">
          {[
            { id: 'overview', label: 'Overview', icon: FolderKanban },
            { id: 'tasks', label: `Tasks (${tasks.length})`, icon: CheckSquare },
            { id: 'requirements', label: `Requirements (${taskRequests.length})`, icon: Briefcase },
            { id: 'Employees', label: `Employees (${project.assignedEmployees?.length || 0})`, icon: User },
            { id: 'hr-appointments', label: `HR Appointments (${projectAppointments.length})`, icon: FileCheck },
            { id: 'milestones', label: `Milestones (${milestones.length})`, icon: Layers },
            { id: 'files', label: `Files & Deliverables (${files.length})`, icon: Files },
            { id: 'feedback', label: `Feedback (${comments.length})`, icon: MessageSquare },
            { id: 'activity', label: 'Activity Timeline', icon: Clock }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-xs whitespace-nowrap transition-colors ${isActive
                    ? 'border-blue-600 text-blue-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ProjectStageRoadmap
              currentStage={project.stage || 'PLANNING'}
              projectId={projectId}
              isAdmin={true}
              onStageUpdated={handleStageUpdate}
            />

            <Card title="Project Summary" subtitle="Scope and delivery specifications">
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {project.description || 'No detailed project brief provided.'}
              </p>
            </Card>

            {/* Linked HR Appointments Card in Overview */}
            <Card
              title="HR OfferFlow Appointments"
              subtitle="Candidate appointments linked to this client engagement"
              action={
                <Button
                  size="xs"
                  variant="primary"
                  onClick={() => handleOpenCreateAppt()}
                  icon={Plus}
                >
                  Create HR Appointment
                </Button>
              }
            >
              {projectAppointments.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  <FileCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p>No HR candidate appointments linked to this project yet.</p>
                  <button
                    onClick={() => handleOpenCreateAppt()}
                    className="mt-2 text-blue-600 font-bold hover:underline"
                  >
                    + Create HR Appointment Now
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 text-xs">
                  {projectAppointments.map((app) => (
                    <div key={app._id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">{app.referenceNumber}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                              app.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' :
                                app.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                                  app.status === 'ACCEPTED' ? 'bg-purple-100 text-purple-800' :
                                    'bg-slate-100 text-slate-700'
                            }`}>
                            {app.status?.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px] mt-0.5">
                          Candidate: <strong>{app.candidateId?.name || app.candidate?.name}</strong> • Role: <strong>{app.designation}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPreviewLetter(app)}
                          className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]"
                        >
                          Preview
                        </button>
                        <Link
                          to={`/hr/appointments/${app._id}`}
                          className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px]"
                        >
                          Details &rarr;
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card
              title="Recent Deliverables"
              subtitle="Latest assets uploaded for review"
              action={
                <Button size="xs" onClick={() => setActiveTab('files')}>
                  View All Files
                </Button>
              }
            >
              {files.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No files uploaded yet.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {files.slice(0, 2).map((file) => (
                    <DeliverableReviewCard
                      key={file._id}
                      file={file}
                      isAdmin={true}
                      onDelete={handleDeleteFile}
                    />
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Client Stakeholder">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
                  {project.client?.name?.charAt(0) || 'C'}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{project.client?.name}</h4>
                  <p className="text-[11px] text-slate-500">{project.client?.email}</p>
                  {project.client?.companyName && (
                    <p className="text-[10px] text-blue-600 font-semibold mt-0.5">
                      {project.client.companyName}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            <Card
              title="Assigned Employees"
              subtitle="Talent currently deployed on this project"
              action={
                <Button size="xs" onClick={() => setActiveTab('Employees')}>
                  View All
                </Button>
              }
            >
              {!project.assignedEmployees || project.assignedEmployees.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No Employees assigned to this project yet.</p>
              ) : (
                <div className="space-y-2.5 text-xs">
                  {project.assignedEmployees.map((Employee) => (
                    <div key={Employee._id} className="flex items-center justify-between py-1.5 border-b border-slate-50">
                      <div>
                        <p className="font-bold text-slate-900">{Employee.name}</p>
                        <p className="text-[10px] text-slate-400">{Employee.title || 'Engineer'}</p>
                      </div>
                      <button
                        onClick={() => handleOpenCreateAppt({ EmployeeId: Employee._id, role: Employee.title || 'Software Engineer' })}
                        className="text-[10px] text-blue-600 font-semibold hover:underline"
                      >
                        + Offer Letter
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Live Activity Stream" subtitle="Recent actions on this project">
              <RecentActivityFeed activities={activities.slice(0, 5)} />
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Tasks */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Project Tasks</h3>
              <p className="text-xs text-slate-500">
                Updating task status automatically recalculates overall project progress.
              </p>
            </div>
            <Button
              size="sm"
              icon={Plus}
              onClick={() => {
                setEditingTask(null);
                setTaskModalOpen(true);
              }}
            >
              Add Task
            </Button>
          </div>

          <TaskTable
            tasks={tasks}
            isAdmin={true}
            onStatusChange={handleTaskStatusChange}
            onEditTask={(task) => {
              setEditingTask(task);
              setTaskModalOpen(true);
            }}
            onDeleteTask={handleDeleteTask}
          />
        </div>
      )}

      {/* Tab: Requirements (Client Task Requests) */}
      {activeTab === 'requirements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Client Requirements & Task Requests</h3>
              <p className="text-xs text-slate-500">
                Requirements submitted by the client for engineering fulfillment and talent allocation
              </p>
            </div>

            <Button
              size="sm"
              variant="primary"
              onClick={() => handleOpenCreateAppt()}
              icon={FileCheck}
            >
              Create HR Appointment
            </Button>
          </div>

          {taskRequests.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-400">
              <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p>No client requirements submitted for this project yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Requirement / Title</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Requested Deadline</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {taskRequests.map((req) => (
                      <tr key={req._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-slate-900">{req.title}</p>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{req.description}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${req.priority === 'URGENT' ? 'bg-rose-100 text-rose-800' :
                              req.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' :
                                'bg-slate-100 text-slate-700'
                            }`}>
                            {req.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                              req.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' :
                                'bg-slate-100 text-slate-700'
                            }`}>
                            {req.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          {req.requestedDeadline ? formatDate(req.requestedDeadline) : 'Flexible'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => handleOpenCreateAppt({ requirementId: req._id, role: req.title })}
                            className="text-[11px]"
                          >
                            Assign Talent & Offer
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Employees & Talent Assignment */}
      {activeTab === 'Employees' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Talent Assignment & Engineering Staff</h3>
              <p className="text-xs text-slate-500">
                Engineers assigned to this client project with ability to initiate HR appointment letters
              </p>
            </div>

            <Button
              size="sm"
              variant="primary"
              onClick={() => handleOpenCreateAppt()}
              icon={FileCheck}
            >
              Create HR Appointment
            </Button>
          </div>

          {!project.assignedEmployees || project.assignedEmployees.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-400">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p>No Employees assigned to this project yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.assignedEmployees.map((Employee) => (
                <div key={Employee._id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {Employee.name?.charAt(0) || 'W'}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{Employee.name}</h4>
                        <p className="text-[10px] text-slate-400">{Employee.email}</p>
                      </div>
                    </div>
                    <div className="mt-3 text-[11px] text-slate-600">
                      <p>Role: <strong>{Employee.title || 'Software Engineer'}</strong></p>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Assigned
                    </span>
                    <button
                      onClick={() => handleOpenCreateAppt({ EmployeeId: Employee._id, role: Employee.title || 'Software Engineer' })}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                    >
                      Issue Offer Letter &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: HR Appointments */}
      {activeTab === 'hr-appointments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">HR OfferFlow Appointments</h3>
              <p className="text-xs text-slate-500">
                Official candidate appointment letters linked directly to this project
              </p>
            </div>

            <Button
              size="sm"
              variant="primary"
              onClick={() => handleOpenCreateAppt()}
              icon={Plus}
            >
              Create HR Appointment
            </Button>
          </div>

          {projectAppointments.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-xs text-slate-400">
              <FileCheck className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-700">No project-linked HR appointments yet.</p>
              <p className="mt-1 text-[11px]">Generate verified trainee or employment offers for this client project.</p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleOpenCreateAppt()}
                className="mt-4"
              >
                + Create Appointment Letter
              </Button>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[650px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4">Candidate</th>
                      <th className="py-3 px-4">Required Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Joining Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {projectAppointments.map((app) => (
                      <tr key={app._id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {app.referenceNumber}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-semibold text-slate-900">{app.candidateId?.name || app.candidate?.name}</p>
                          <p className="text-[10px] text-slate-400">{app.candidateId?.email || app.candidate?.email}</p>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {app.designation}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${app.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                              app.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' :
                                app.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                                  app.status === 'ACCEPTED' ? 'bg-purple-100 text-purple-800' :
                                    app.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                                      'bg-slate-100 text-slate-700'
                            }`}>
                            {app.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {app.joiningDate ? formatDate(app.joiningDate) : 'TBD'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setPreviewLetter(app)}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]"
                            >
                              Preview
                            </button>
                            <Link
                              to={`/hr/appointments/${app._id}`}
                              className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px]"
                            >
                              Details &rarr;
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Milestones */}
      {activeTab === 'milestones' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Milestone Roadmap</h3>
              <p className="text-xs text-slate-500">
                Phase-by-phase deliverables and target deadlines.
              </p>
            </div>
            <Button
              size="sm"
              icon={Plus}
              onClick={() => {
                setEditingMilestone(null);
                setMilestoneModalOpen(true);
              }}
            >
              Add Milestone
            </Button>
          </div>

          <MilestoneTimeline
            milestones={milestones}
            isAdmin={true}
            onStatusChange={handleMilestoneStatusChange}
            onEditMilestone={(milestone) => {
              setEditingMilestone(milestone);
              setMilestoneModalOpen(true);
            }}
            onDeleteMilestone={handleDeleteMilestone}
          />
        </div>
      )}

      {/* Tab 4: Files & Deliverables */}
      {activeTab === 'files' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Project Files & Deliverables</h3>
              <p className="text-xs text-slate-500">
                Upload files, client design deliverables, and production zip archives.
              </p>
            </div>
            <Button
              size="sm"
              icon={Upload}
              onClick={() => setUploadModalOpen(true)}
            >
              Upload Deliverable
            </Button>
          </div>

          {files.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-400">
              No files or deliverables uploaded yet. Click Upload Deliverable above.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map((file) => (
                <DeliverableReviewCard
                  key={file._id}
                  file={file}
                  isAdmin={true}
                  onDelete={handleDeleteFile}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Feedback & Comments */}
      {activeTab === 'feedback' && (
        <div className="max-w-3xl">
          <CommentSection
            comments={comments}
            projectId={projectId}
            onAddComment={handleAddComment}
            onDeleteComment={handleDeleteComment}
          />
        </div>
      )}

      {/* Tab 6: Activity Timeline */}
      {activeTab === 'activity' && (
        <div className="max-w-2xl bg-white rounded-xl border border-slate-200/80 p-6 shadow-card">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Complete Activity Audit Log</h3>
          <RecentActivityFeed activities={activities} />
        </div>
      )}

      {/* Modal: Create HR Appointment Pre-flight */}
      {createApptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            <div className="p-4 sm:p-5 flex items-center justify-between border-b bg-slate-50 border-slate-200 shrink-0">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Create HR Appointment</h3>
                  <p className="text-[11px] text-slate-500">
                    Project: <strong className="text-slate-800">{project.name}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCreateApptModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleProceedToApptBuilder} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Candidate Source:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setApptForm((prev) => ({ ...prev, candidateMode: 'existing' }))}
                    className={`py-2 px-3 rounded-lg border font-semibold text-center ${apptForm.candidateMode === 'existing'
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    Select Existing Candidate
                  </button>
                  <button
                    type="button"
                    onClick={() => setApptForm((prev) => ({ ...prev, candidateMode: 'new' }))}
                    className={`py-2 px-3 rounded-lg border font-semibold text-center ${apptForm.candidateMode === 'new'
                        ? 'bg-blue-50 border-blue-600 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    + Register New Candidate
                  </button>
                </div>
              </div>

              {apptForm.candidateMode === 'existing' ? (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Select Talent / Candidate:
                  </label>
                  <select
                    value={apptForm.candidateId}
                    onChange={(e) => {
                      const cand = candidates.find((c) => c._id === e.target.value);
                      setApptForm((prev) => ({
                        ...prev,
                        candidateId: e.target.value,
                        role: cand?.designation || prev.role
                      }));
                    }}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Choose Candidate from Talent Pool --</option>
                    {candidates.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.designation}) — {c.employmentType}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Candidate Full Name *</label>
                    <input
                      type="text"
                      required
                      value={apptForm.newCandidateName}
                      onChange={(e) => setApptForm((prev) => ({ ...prev, newCandidateName: e.target.value }))}
                      placeholder="e.g. John Doe"
                      className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={apptForm.newCandidateEmail}
                      onChange={(e) => setApptForm((prev) => ({ ...prev, newCandidateEmail: e.target.value }))}
                      placeholder="john.doe@example.com"
                      className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                    <input
                      type="text"
                      required
                      value={apptForm.newCandidatePhone}
                      onChange={(e) => setApptForm((prev) => ({ ...prev, newCandidatePhone: e.target.value }))}
                      placeholder="+91 9876543210"
                      className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Requirement & Role */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Link Client Requirement (Optional):
                </label>
                <select
                  value={apptForm.requirementId}
                  onChange={(e) => {
                    const req = taskRequests.find((r) => r._id === e.target.value);
                    setApptForm((prev) => ({
                      ...prev,
                      requirementId: e.target.value,
                      role: req?.title || prev.role
                    }));
                  }}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- No specific requirement selected --</option>
                  {taskRequests.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.title} ({r.priority})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Required Role / Designation:
                </label>
                <input
                  type="text"
                  value={apptForm.role}
                  onChange={(e) => setApptForm((prev) => ({ ...prev, role: e.target.value }))}
                  placeholder="e.g. React Developer"
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Employee mentor / assignment */}
              {project.assignedEmployees && project.assignedEmployees.length > 0 && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Assign Employee / Mentor (Optional):
                  </label>
                  <select
                    value={apptForm.EmployeeId}
                    onChange={(e) => setApptForm((prev) => ({ ...prev, EmployeeId: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Direct Technical Lead Assignment --</option>
                    {project.assignedEmployees.map((w) => (
                      <option key={w._id} value={w._id}>
                        {w.name} ({w.title || 'Engineer'})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setCreateApptModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                >
                  <span>Launch Appointment Builder</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modals */}
      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
        project={project}
        onSaved={handleUpdateProject}
      />

      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        task={editingTask}
        projectId={projectId}
        onSaved={handleSaveTask}
      />

      <MilestoneModal
        isOpen={milestoneModalOpen}
        onClose={() => setMilestoneModalOpen(false)}
        milestone={editingMilestone}
        projectId={projectId}
        onSaved={handleSaveMilestone}
      />

      <FileUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        projectId={projectId}
        onUploadSuccess={handleUploadFile}
      />

      <CompletionSummaryModal
        isOpen={completionModalOpen}
        onClose={() => setCompletionModalOpen(false)}
        projectId={projectId}
      />

      <AIProjectSummaryModal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        projectId={projectId}
      />

      {previewLetter && (
        <LetterPreviewModal
          isOpen={!!previewLetter}
          onClose={() => setPreviewLetter(null)}
          appointment={previewLetter}
          candidate={previewLetter.candidateId || previewLetter.candidate}
        />
      )}
    </div>
  );
};

export default AdminProjectDetails;
