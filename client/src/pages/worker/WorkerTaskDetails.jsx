import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { taskService } from '../../services/taskService';
import { commentService } from '../../services/commentService';
import { fileService } from '../../services/fileService';
import { activityService } from '../../services/activityService';
import { useAuth } from '../../context/AuthContext';
import {
  ArrowLeft,
  CheckSquare,
  Play,
  Send,
  AlertCircle,
  Clock,
  Calendar,
  Layers,
  Upload,
  MessageSquare,
  History,
  FileText,
  Paperclip,
  Loader2,
  CheckCircle2,
  Lock,
  User,
  Download
} from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '../../components/common/Badge';
import ProgressBar from '../../components/common/ProgressBar';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const EmployeeTaskDetails = () => {
  const { id: taskId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Progress edit state
  const [progressValue, setProgressValue] = useState(0);
  const [updatingProgress, setUpdatingProgress] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState(null);

  const handleDownloadFile = async (fileId, fileName) => {
    try {
      setDownloadingFileId(fileId);
      await fileService.downloadBlob(fileId, fileName);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to download file.');
    } finally {
      setDownloadingFileId(null);
    }
  };

  // Blocker modal state
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  // Comments state
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [isInternalComment, setIsInternalComment] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);

  // Files state
  const [files, setFiles] = useState([]);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileCategory, setFileCategory] = useState('DELIVERABLE');
  const [uploadingFile, setUploadingFile] = useState(false);

  // Activities state
  const [activities, setActivities] = useState([]);

  // Active Tab
  const [activeTab, setActiveTab] = useState('discussion'); // 'discussion' | 'files' | 'activity'

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      const res = await taskService.getTaskById(taskId);
      if (res.success && res.task) {
        setTask(res.task);
        setProgressValue(res.task.progress || 0);

        // Fetch task-related comments
        if (res.task.project?._id) {
          fetchComments(res.task.project._id);
          fetchFiles(res.task.project._id);
          fetchActivities(res.task.project._id);
        }
      }
    } catch (err) {
      toast.error('Failed to load task details.');
      navigate('/Employee/tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async (projectId) => {
    try {
      const res = await commentService.getProjectComments(projectId, null, taskId);
      if (res.success) {
        setComments(res.comments || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFiles = async (projectId) => {
    try {
      const res = await fileService.getProjectFiles(projectId, null, taskId);
      if (res.success) {
        setFiles(res.files || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchActivities = async (projectId) => {
    try {
      const res = await activityService.getProjectActivities(projectId);
      if (res.success) {
        // Filter activities for this task if entityId matches, or project-wide
        const taskActs = (res.activities || []).filter(
          (a) => a.entityId === taskId || a.description.includes(task?.title || '')
        );
        setActivities(taskActs.length > 0 ? taskActs : res.activities.slice(0, 8));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  // Status transitions
  const handleStartTask = async () => {
    try {
      setSubmitting(true);
      const res = await taskService.startTask(taskId);
      if (res.success) {
        toast.success('Task started! Status moved to In Progress.');
        fetchTaskDetails();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not start task.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReview = async () => {
    try {
      setSubmitting(true);
      const res = await taskService.submitReview(taskId);
      if (res.success) {
        toast.success('Task submitted for review! Admin notified.');
        fetchTaskDetails();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReportBlocked = async (e) => {
    e.preventDefault();
    if (!blockReason.trim()) {
      toast.error('Please describe what is blocking this task.');
      return;
    }
    try {
      setSubmitting(true);
      const res = await taskService.blockTask(taskId, blockReason);
      if (res.success) {
        toast.success('Task reported as blocked. Admin notified.');
        setBlockModalOpen(false);
        setBlockReason('');
        fetchTaskDetails();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark blocked.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveProgress = async () => {
    try {
      setUpdatingProgress(true);
      const res = await taskService.updateProgress(taskId, progressValue);
      if (res.success) {
        toast.success(`Progress updated to ${progressValue}%.`);
        setTask((prev) => ({ ...prev, progress: progressValue }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update progress.');
    } finally {
      setUpdatingProgress(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    if (!task?.project?._id) {
      toast.error('Notes and discussion are only enabled for project tasks.');
      return;
    }

    try {
      setCommentLoading(true);
      const res = await commentService.createComment({
        project: task.project._id,
        task: taskId,
        message: commentText.trim(),
        isInternal: isInternalComment
      });

      if (res.success) {
        toast.success(isInternalComment ? 'Internal team note added.' : 'Comment posted.');
        setCommentText('');
        fetchComments(task.project._id);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to post comment.');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select a file to upload.');
      return;
    }
    if (!task?.project?._id) {
      toast.error('File storage is only available for client project deliverables.');
      return;
    }

    try {
      setUploadingFile(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('projectId', task.project._id);
      formData.append('taskId', taskId);
      formData.append('category', fileCategory);
      formData.append('fileName', selectedFile.name);

      const res = await fileService.uploadFile(formData);
      if (res.success) {
        toast.success('File uploaded successfully!');
        setSelectedFile(null);
        setUploadModalOpen(false);
        fetchFiles(task.project._id);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'File upload failed.');
    } finally {
      setUploadingFile(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!task) return null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back button */}
      <Link
        to="/Employee/tasks"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        <span>Back to My Tasks</span>
      </Link>

      {/* Main Task Header Card */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-slate-500">
                {task.taskType === 'PERSONAL' ? 'Personal Company Assignment' : (task.project?.name || 'Project Deliverable')}
              </span>
              <span className="text-slate-300">&bull;</span>
              {task.personalCategory && (
                <>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {task.personalCategory.replace('_', ' ')}
                  </span>
                  <span className="text-slate-300">&bull;</span>
                </>
              )}
              <Badge variant={task.priority?.toLowerCase() || 'default'}>
                {task.priority} Priority
              </Badge>
              <Badge variant={task.status?.toLowerCase() || 'default'}>
                {task.status?.replace('_', ' ')}
              </Badge>
            </div>

            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {task.title}
            </h1>

            {task.description && (
              <p className="text-xs text-slate-600 mt-2 leading-relaxed whitespace-pre-line">
                {task.description}
              </p>
            )}
          </div>

          {/* Action Transition Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {task.status === 'ASSIGNED' && (
              <Button
                variant="primary"
                disabled={submitting}
                onClick={handleStartTask}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                Start Task
              </Button>
            )}

            {task.status === 'IN_PROGRESS' && (
              <>
                <Button
                  variant="outline"
                  className="text-rose-600 border-rose-200 hover:bg-rose-50"
                  disabled={submitting}
                  onClick={() => setBlockModalOpen(true)}
                >
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Report Blocked
                </Button>

                <Button
                  variant="primary"
                  disabled={submitting}
                  onClick={handleSubmitReview}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                  Submit for Review
                </Button>
              </>
            )}

            {task.status === 'BLOCKED' && (
              <Button
                variant="primary"
                disabled={submitting}
                onClick={handleStartTask}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                Resume Task
              </Button>
            )}

            {task.status === 'CHANGES_REQUESTED' && (
              <Button
                variant="primary"
                disabled={submitting}
                onClick={handleStartTask}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                Resume & Address Revisions
              </Button>
            )}

            {task.status === 'IN_REVIEW' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium border border-amber-200">
                <Clock className="h-4 w-4" />
                <span>Awaiting Admin Review & Sign-Off</span>
              </div>
            )}

            {task.status === 'COMPLETED' && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
                <CheckCircle2 className="h-4 w-4" />
                <span>Completed & Approved</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Slider Controller */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
            <div>
              <span className="text-xs font-semibold text-slate-900">Task Completion Progress:</span>
              <span className="text-xs font-bold text-indigo-600 ml-1.5">{progressValue}%</span>
            </div>

            {task.status !== 'COMPLETED' && (
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={progressValue}
                  onChange={(e) => setProgressValue(Number(e.target.value))}
                  className="w-40 sm:w-56 accent-indigo-600 cursor-pointer"
                />
                <Button
                  size="xs"
                  variant="secondary"
                  disabled={updatingProgress || progressValue === task.progress}
                  onClick={handleSaveProgress}
                >
                  {updatingProgress ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Save Progress'}
                </Button>
              </div>
            )}
          </div>
          <ProgressBar progress={progressValue} />
        </div>

        {/* Task Meta Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-5 border-t border-slate-100 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Target Due Date</span>
            <span className="font-medium text-slate-800 mt-0.5 block">
              {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No deadline'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              {task.taskType === 'PERSONAL' ? 'Category' : 'Milestone'}
            </span>
            <span className="font-medium text-slate-800 mt-0.5 block truncate">
              {task.taskType === 'PERSONAL'
                ? (task.personalCategory?.replace('_', ' ') || 'Internal')
                : (task.milestone?.title || 'None assigned')}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Assigned By</span>
            <span className="font-medium text-slate-800 mt-0.5 block">
              {task.assignedBy?.name || task.createdBy?.name || 'Admin'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Estimated Effort</span>
            <span className="font-medium text-slate-800 mt-0.5 block">
              {task.estimatedHours ? `${task.estimatedHours} hrs` : 'Not specified'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 overflow-x-auto">
        <nav className="flex space-x-6 min-w-max pb-px">
          <button
            type="button"
            onClick={() => setActiveTab('discussion')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'discussion'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>Discussion ({comments.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'files'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
          >
            <Paperclip className="h-4 w-4" />
            <span>Work Files & Deliverables ({files.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('activity')}
            className={`pb-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'activity'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
          >
            <History className="h-4 w-4" />
            <span>Audit Trail</span>
          </button>
        </nav>
      </div>

      {/* Tab 1: Discussion */}
      {activeTab === 'discussion' && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-slate-900">Task Communication</h3>

          {/* Comment list */}
          <div className="space-y-3">
            {comments.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No comments or notes posted yet.</p>
            ) : (
              comments.map((c) => (
                <div
                  key={c._id}
                  className={`p-3.5 rounded-lg border text-xs ${c.isInternal
                      ? 'bg-amber-50/60 border-amber-200/80 text-amber-900'
                      : 'bg-slate-50 border-slate-200/80 text-slate-800'
                    }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">{c.user?.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-600 uppercase font-medium">
                        {c.user?.role}
                      </span>
                      {c.isInternal && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 text-amber-800 font-semibold flex items-center gap-1">
                          <Lock className="h-2.5 w-2.5" /> Internal Note (Hidden from client)
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(c.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{c.message}</p>
                </div>
              ))
            )}
          </div>

          {/* Add Comment Form */}
          <form onSubmit={handleAddComment} className="pt-4 border-t border-slate-100 space-y-3">
            <textarea
              rows={3}
              placeholder="Post an update, ask a question, or leave a note..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="w-full rounded-lg border border-slate-200 p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={isInternalComment}
                  onChange={(e) => setIsInternalComment(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
                />
                <span className="flex items-center gap-1 text-slate-700 font-medium">
                  <Lock className="h-3 w-3 text-amber-600" />
                  Internal Team Note (Admin & Employees only)
                </span>
              </label>

              <Button size="sm" type="submit" disabled={commentLoading || !commentText.trim()}>
                {commentLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                Post Message
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tab 2: Files & Deliverables */}
      {activeTab === 'files' && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Deliverables & Attachments</h3>
              <p className="text-xs text-slate-500">Upload code artifacts, design documents, or build outputs for this task</p>
            </div>
            <Button size="sm" onClick={() => setUploadModalOpen(true)}>
              <Upload className="h-3.5 w-3.5 mr-1" />
              Upload Deliverable
            </Button>
          </div>

          {files.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-lg">
              <FileText className="mx-auto h-8 w-8 text-slate-300" />
              <p className="text-xs text-slate-500 mt-1">No files attached to this task yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {files.map((f) => (
                <div key={f._id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-6 w-6 text-indigo-500 shrink-0" />
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => handleDownloadFile(f._id, f.fileName)}
                        className="font-semibold text-slate-900 hover:text-indigo-600 truncate block text-left"
                        title={`Download ${f.fileName}`}
                      >
                        {f.fileName}
                      </button>
                      <span className="text-[10px] text-slate-400">
                        Uploaded by {f.uploadedBy?.name} &bull; {(f.fileSize / 1024).toFixed(0)} KB &bull;{' '}
                        {new Date(f.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {f.isDeliverable && (
                      <Badge variant={f.approvalStatus?.toLowerCase() || 'default'}>
                        {f.approvalStatus?.replace('_', ' ')}
                      </Badge>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDownloadFile(f._id, f.fileName)}
                      disabled={downloadingFileId === f._id}
                      className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium text-[11px] inline-flex items-center gap-1 disabled:opacity-50"
                      title={`Download ${f.fileName}`}
                    >
                      {downloadingFileId === f._id ? (
                        <Loader2 className="h-3 w-3 animate-spin text-slate-500" />
                      ) : (
                        <Download className="h-3 w-3" />
                      )}
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Activity Audit */}
      {activeTab === 'activity' && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900">Task Audit Trail</h3>
          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {activities.map((a) => (
              <div key={a._id} className="relative text-xs">
                <span className="absolute -left-6 top-1 h-2.5 w-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                <p className="font-semibold text-slate-800">{a.description}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {new Date(a.createdAt).toLocaleString()} &bull; Action: {a.action}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report Blocked Modal */}
      <Modal
        isOpen={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        title="Report Task Blocker"
      >
        <form onSubmit={handleReportBlocked} className="space-y-4 text-xs">
          <p className="text-slate-600">
            Reporting a blocker alerts project managers immediately and transitions this task to{' '}
            <strong className="text-rose-600">BLOCKED</strong> status.
          </p>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Blocker Description / Reason *
            </label>
            <textarea
              rows={3}
              required
              placeholder="e.g. Waiting for third-party API credentials, database migration failure, or missing assets..."
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className="w-full rounded-lg border border-slate-200 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button size="sm" variant="secondary" type="button" onClick={() => setBlockModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="danger" type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
              Report Blocker
            </Button>
          </div>
        </form>
      </Modal>

      {/* Upload File Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Work Deliverable"
      >
        <form onSubmit={handleFileUpload} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-800 mb-1">Choose File *</label>
            <input
              type="file"
              required
              onChange={(e) => setSelectedFile(e.target.files[0])}
              className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">Category</label>
            <select
              value={fileCategory}
              onChange={(e) => setFileCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
            >
              <option value="DELIVERABLE">Deliverable (Requires Client Sign-off)</option>
              <option value="DOCUMENT">Documentation / Spec</option>
              <option value="DESIGN">Design Asset</option>
              <option value="OTHER">Other Attachment</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button size="sm" variant="secondary" type="button" onClick={() => setUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" type="submit" disabled={uploadingFile || !selectedFile}>
              {uploadingFile ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Upload className="h-3 w-3 mr-1" />}
              Upload
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EmployeeTaskDetails;
