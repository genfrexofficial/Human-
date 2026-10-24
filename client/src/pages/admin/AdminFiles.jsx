import React, { useState, useEffect } from 'react';
import { projectService } from '../../services/projectService';
import { fileService } from '../../services/fileService';
import DeliverableReviewCard from '../../components/files/DeliverableReviewCard';
import FileUploadModal from '../../components/files/FileUploadModal';
import ChangeRequestModal from '../../components/files/ChangeRequestModal';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import { CardSkeleton } from '../../components/common/Skeleton';
import { Files, Upload, Filter, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminFiles = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchInitial = async () => {
    try {
      setLoading(true);
      const projRes = await projectService.getProjects();
      if (projRes.success && projRes.projects?.length > 0) {
        setProjects(projRes.projects);
        const firstId = projRes.projects[0]._id;
        setSelectedProjectId(firstId);
        const filesRes = await fileService.getProjectFiles(firstId);
        if (filesRes.success) setFiles(filesRes.files || []);
      } else {
        setProjects([]);
        setFiles([]);
      }
    } catch (err) {
      toast.error('Failed to load files.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitial();
  }, []);

  const handleProjectSelect = async (projectId) => {
    setSelectedProjectId(projectId);
    if (!projectId) {
      setFiles([]);
      return;
    }
    try {
      setLoading(true);
      const res = await fileService.getProjectFiles(projectId);
      if (res.success) setFiles(res.files || []);
    } catch (err) {
      toast.error('Failed to load project files.');
    } finally {
      setLoading(false);
    }
  };

  const reloadFiles = async () => {
    if (!selectedProjectId) return;
    try {
      const res = await fileService.getProjectFiles(selectedProjectId);
      if (res.success) setFiles(res.files || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadSuccess = async (formData) => {
    try {
      const res = await fileService.uploadFile(formData);
      if (res.success) {
        toast.success('File uploaded successfully!');
        reloadFiles();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed.');
      throw err;
    }
  };

  const handleApproveDeliverable = async (fileId) => {
    try {
      const res = await fileService.reviewDeliverable(fileId, 'APPROVED');
      if (res.success) {
        toast.success('🎉 Deliverable approved! It is now open to the client.');
        reloadFiles();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve deliverable.');
    }
  };

  const handleOpenChangeModal = (file) => {
    setSelectedDeliverable(file);
    setChangeModalOpen(true);
  };

  const handleSubmitChangeRequest = async (fileId, reason) => {
    try {
      const res = await fileService.reviewDeliverable(fileId, 'CHANGES_REQUESTED', reason);
      if (res.success) {
        toast.success('Changes requested! The deliverable remains hidden from client.');
        setChangeModalOpen(false);
        reloadFiles();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit revision request.');
      throw err;
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (window.confirm('Delete this file?')) {
      try {
        await fileService.deleteFile(fileId);
        toast.success('File deleted.');
        reloadFiles();
      } catch (err) {
        toast.error('Failed to delete file.');
      }
    }
  };

  // Stats calculation
  const pendingCount = files.filter(
    (f) => (f.isDeliverable || f.category === 'DELIVERABLE') && !f.adminApproved && f.adminApprovalStatus !== 'APPROVED' && f.approvalStatus !== 'APPROVED' && f.adminApprovalStatus !== 'CHANGES_REQUESTED'
  ).length;

  const approvedCount = files.filter(
    (f) => (f.isDeliverable || f.category === 'DELIVERABLE') && (f.adminApproved || f.adminApprovalStatus === 'APPROVED' || (f.approvalStatus === 'APPROVED' && f.adminApprovalStatus !== 'CHANGES_REQUESTED'))
  ).length;

  const changesCount = files.filter(
    (f) => (f.isDeliverable || f.category === 'DELIVERABLE') && (f.adminApprovalStatus === 'CHANGES_REQUESTED' || f.approvalStatus === 'CHANGES_REQUESTED')
  ).length;

  // Filtered files
  const filteredFiles = files.filter((f) => {
    const isDeliv = f.isDeliverable || f.category === 'DELIVERABLE';
    const isAppr = f.adminApproved || f.adminApprovalStatus === 'APPROVED' || (f.approvalStatus === 'APPROVED' && f.adminApprovalStatus !== 'CHANGES_REQUESTED');
    const isChanges = f.adminApprovalStatus === 'CHANGES_REQUESTED' || f.approvalStatus === 'CHANGES_REQUESTED';
    const isPend = isDeliv && !isAppr && !isChanges;

    if (statusFilter === 'PENDING') return isPend;
    if (statusFilter === 'APPROVED') return isAppr;
    if (statusFilter === 'CHANGES_REQUESTED') return isChanges;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Files & Deliverables</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Admin gatekeeper repository: Review, approve, and release deliverables to the client portal.
          </p>
        </div>

        {selectedProjectId && (
          <Button onClick={() => setUploadModalOpen(true)} icon={Upload}>
            Upload File
          </Button>
        )}
      </div>

      {/* Project Selector Bar & Filters */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">Project:</span>
          <select
            value={selectedProjectId}
            onChange={(e) => handleProjectSelect(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-w-[220px]"
          >
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({files.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white'
                : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <Clock className="w-3 h-3" />
            Pending Admin ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            Open to Client ({approvedCount})
          </button>
          <button
            onClick={() => setStatusFilter('CHANGES_REQUESTED')}
            className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
              statusFilter === 'CHANGES_REQUESTED'
                ? 'bg-rose-600 text-white'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            Revisions ({changesCount})
          </button>
        </div>
      </div>

      {/* Files Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <EmptyState
            icon={Files}
            title={statusFilter === 'ALL' ? 'No files in this project' : 'No deliverables match this filter'}
            description={
              statusFilter === 'ALL'
                ? 'Upload design mockups, contracts, or production deliverables for client review.'
                : 'Switch filters or upload new deliverables for this project.'
            }
            actionLabel={statusFilter === 'ALL' ? 'Upload First File' : undefined}
            onAction={statusFilter === 'ALL' ? () => setUploadModalOpen(true) : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map((file) => (
            <DeliverableReviewCard
              key={file._id}
              file={file}
              isAdmin={true}
              onApprove={handleApproveDeliverable}
              onRequestChanges={handleOpenChangeModal}
              onDelete={handleDeleteFile}
            />
          ))}
        </div>
      )}

      {/* Upload Modal */}
      <FileUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        projectId={selectedProjectId}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Change Request Modal */}
      <ChangeRequestModal
        isOpen={changeModalOpen}
        onClose={() => setChangeModalOpen(false)}
        deliverable={selectedDeliverable}
        onSubmit={handleSubmitChangeRequest}
      />
    </div>
  );
};

export default AdminFiles;
