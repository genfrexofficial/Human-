import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projectService } from '../../services/projectService';
import { taskService } from '../../services/taskService';
import { milestoneService } from '../../services/milestoneService';
import { fileService } from '../../services/fileService';
import { commentService } from '../../services/commentService';
import { activityService } from '../../services/activityService';
import { PROJECT_STATUS } from '../../utils/constants';
import { formatDate } from '../../utils/formatters';
import ProgressBar from '../../components/common/ProgressBar';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import TaskTable from '../../components/tasks/TaskTable';
import MilestoneTimeline from '../../components/milestones/MilestoneTimeline';
import DeliverableReviewCard from '../../components/files/DeliverableReviewCard';
import ChangeRequestModal from '../../components/files/ChangeRequestModal';
import CommentSection from '../../components/feedback/CommentSection';
import RecentActivityFeed from '../../components/dashboard/RecentActivityFeed';
import CompletionSummaryModal from '../../components/projects/CompletionSummaryModal';
import AIProjectSummaryModal from '../../components/projects/AIProjectSummaryModal';
import ProjectStageRoadmap from '../../components/projects/ProjectStageRoadmap';
import {
  FolderKanban,
  CheckSquare,
  Layers,
  Files,
  MessageSquare,
  Clock,
  Sparkles,
  Award,
  Calendar,
  Building
} from 'lucide-react';
import toast from 'react-hot-toast';

const ClientProjectDetails = () => {
  const { id: projectId } = useParams();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [milestones, setMilestones] = useState([]);
  const [files, setFiles] = useState([]);
  const [comments, setComments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Review Modals
  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState(null);
  const [completionModalOpen, setCompletionModalOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const [projRes, tasksRes, milesRes, filesRes, commsRes, actsRes] = await Promise.all([
        projectService.getProjectById(projectId),
        taskService.getProjectTasks(projectId),
        milestoneService.getProjectMilestones(projectId),
        fileService.getProjectFiles(projectId),
        commentService.getProjectComments(projectId),
        activityService.getProjectActivities(projectId)
      ]);

      if (projRes.success) setProject(projRes.project);
      if (tasksRes.success) setTasks(tasksRes.tasks || []);
      if (milesRes.success) setMilestones(milesRes.milestones || []);
      if (filesRes.success) setFiles(filesRes.files || []);
      if (commsRes.success) setComments(commsRes.comments || []);
      if (actsRes.success) setActivities(actsRes.activities || []);
    } catch (err) {
      toast.error('Failed to load project details.');
      navigate('/client/projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectData();
    }
  }, [projectId]);

  // Deliverable Review Handlers
  const handleApprove = async (fileId) => {
    try {
      const res = await fileService.reviewDeliverable(fileId, 'APPROVED');
      if (res.success) {
        toast.success('🎉 Deliverable approved successfully!');
        fetchProjectData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval failed.');
    }
  };

  const handleOpenChangeRequest = (file) => {
    setSelectedDeliverable(file);
    setChangeModalOpen(true);
  };

  const handleSubmitChangeRequest = async (fileId, reason) => {
    try {
      const res = await fileService.reviewDeliverable(fileId, 'CHANGES_REQUESTED', reason);
      if (res.success) {
        toast.success('Changes requested. The agency team has been notified!');
        fetchProjectData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit feedback.');
      throw err;
    }
  };

  // Feedback handler
  const handleAddComment = async (commentData) => {
    try {
      const res = await commentService.createComment(commentData);
      if (res.success) {
        toast.success('Feedback sent to agency team.');
        fetchProjectData();
      }
    } catch (err) {
      toast.error('Failed to send comment.');
      throw err;
    }
  };

  if (loading || !project) {
    return (
      <div className="py-16 text-center text-xs text-slate-500 animate-pulse">
        Loading client workspace...
      </div>
    );
  }

  const statusConfig = PROJECT_STATUS[project.status] || {
    label: project.status,
    color: 'bg-slate-100 text-slate-700'
  };

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter((m) => m.status === 'COMPLETED').length;
  const pendingApprovals = files.filter(
    (f) => f.category === 'DELIVERABLE' && f.approvalStatus === 'PENDING_REVIEW'
  ).length;

  const healthConfig = {
    ON_TRACK: { label: 'On Track', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    AT_RISK: { label: 'At Risk', color: 'bg-amber-50 text-amber-700 border-amber-200' },
    OVERDUE_BLOCKED: { label: 'Attention Needed', color: 'bg-rose-50 text-rose-700 border-rose-200' }
  }[project.health || 'ON_TRACK'] || { label: 'On Track', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-card">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {project.name}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusConfig.color}`}
              >
                {statusConfig.label}
              </span>
              <span
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-indigo-50 text-indigo-700 border-indigo-200"
              >
                Stage: {project.stage ? project.stage.replace('_', ' ') : 'PLANNING'}
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${healthConfig.color}`}
              >
                Health: {healthConfig.label}
              </span>
            </div>

            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              {project.description || 'No description provided.'}
            </p>

            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 font-medium">
                <Building className="w-3.5 h-3.5 text-slate-400" />
                <span>Agency Lead: <strong>{project.createdBy?.name || 'Agency'}</strong></span>
              </div>

              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Estimated Delivery: <strong>{formatDate(project.endDate)}</strong></span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAiModalOpen(true)}
              icon={Sparkles}
              className="border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50"
            >
              ✨ AI Project Summary
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCompletionModalOpen(true)}
              icon={Award}
            >
              View Project Summary
            </Button>
          </div>
        </div>

        {/* Progress Bar & Quick Metrics */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <ProgressBar progress={project.progress || 0} size="md" showLabel={true} />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs">
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500 text-[11px]">Tasks Finished</span>
              <p className="font-bold text-slate-900 mt-0.5">{completedTasks} / {totalTasks}</p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500 text-[11px]">Milestones Reached</span>
              <p className="font-bold text-slate-900 mt-0.5">{completedMilestones} / {totalMilestones}</p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500 text-[11px]">Pending Your Review</span>
              <p className="font-bold text-amber-600 mt-0.5">{pendingApprovals} deliverable{pendingApprovals === 1 ? '' : 's'}</p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-500 text-[11px]">Approved Deliverables</span>
              <p className="font-bold text-emerald-600 mt-0.5">
                {files.filter((f) => f.approvalStatus === 'APPROVED').length} signed off
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 overflow-x-auto pb-px">
          {[
            { id: 'overview', label: 'Overview', icon: FolderKanban },
            { id: 'tasks', label: `Tasks (${tasks.length})`, icon: CheckSquare },
            { id: 'milestones', label: `Milestones (${milestones.length})`, icon: Layers },
            { id: 'files', label: `Deliverables & Files (${files.length})`, icon: Files },
            { id: 'feedback', label: `Discussion & Feedback (${comments.length})`, icon: MessageSquare },
            { id: 'activity', label: 'Project Activity', icon: Clock }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-xs whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 font-semibold'
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
              isAdmin={false}
            />

            <Card title="Project Scope" subtitle="Official client requirements and deliverables">
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                {project.description || 'No detailed scope provided.'}
              </p>
            </Card>

            <Card
              title="Deliverables For Your Review"
              subtitle="Review and sign off on completed phase milestones"
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
                      isClient={true}
                      onApprove={handleApprove}
                      onRequestChanges={handleOpenChangeRequest}
                    />
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="space-y-6">
            <Card title="Activity Timeline" subtitle="Live updates from your agency partner">
              <RecentActivityFeed activities={activities.slice(0, 6)} />
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Tasks */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Project Tasks</h3>
            <p className="text-xs text-slate-500">
              Track the real-time completion of engineering, design, and QA tasks.
            </p>
          </div>

          <TaskTable tasks={tasks} isAdmin={false} />
        </div>
      )}

      {/* Tab 3: Milestones */}
      {activeTab === 'milestones' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Milestone Roadmap</h3>
            <p className="text-xs text-slate-500">
              Track major project phases from architecture to final production rollout.
            </p>
          </div>

          <MilestoneTimeline milestones={milestones} isAdmin={false} />
        </div>
      )}

      {/* Tab 4: Files & Deliverables */}
      {activeTab === 'files' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Deliverables & Documents</h3>
            <p className="text-xs text-slate-500">
              Review deliverables, approve completed assets, or request specific revisions.
            </p>
          </div>

          {files.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-xs text-slate-400">
              No deliverables released yet. Deliverables will appear here once approved by your agency admin.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {files.map((file) => (
                <DeliverableReviewCard
                  key={file._id}
                  file={file}
                  isClient={true}
                  onApprove={handleApprove}
                  onRequestChanges={handleOpenChangeRequest}
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
          />
        </div>
      )}

      {/* Tab 6: Activity */}
      {activeTab === 'activity' && (
        <div className="max-w-2xl bg-white rounded-xl border border-slate-200/80 p-6 shadow-card">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Project Activity Timeline</h3>
          <RecentActivityFeed activities={activities} />
        </div>
      )}

      {/* Modals */}
      <ChangeRequestModal
        isOpen={changeModalOpen}
        onClose={() => setChangeModalOpen(false)}
        deliverable={selectedDeliverable}
        onSubmit={handleSubmitChangeRequest}
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
    </div>
  );
};

export default ClientProjectDetails;
