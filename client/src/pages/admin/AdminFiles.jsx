import React, { useState, useEffect } from 'react';
import { projectService } from '../../services/projectService';
import { fileService } from '../../services/fileService';
import DeliverableReviewCard from '../../components/files/DeliverableReviewCard';
import FileUploadModal from '../../components/files/FileUploadModal';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import { CardSkeleton } from '../../components/common/Skeleton';
import { Files, Upload, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const AdminFiles = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

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

  const handleUploadSuccess = async (formData) => {
    try {
      const res = await fileService.uploadFile(formData);
      if (res.success) {
        toast.success('File uploaded successfully!');
        const filesRes = await fileService.getProjectFiles(selectedProjectId);
        if (filesRes.success) setFiles(filesRes.files || []);
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
        const filesRes = await fileService.getProjectFiles(selectedProjectId);
        if (filesRes.success) setFiles(filesRes.files || []);
      } catch (err) {
        toast.error('Failed to delete file.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Files & Deliverables</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Centralized document and design repository for client deliverables and sign-offs.
          </p>
        </div>

        {selectedProjectId && (
          <Button onClick={() => setUploadModalOpen(true)} icon={Upload}>
            Upload File
          </Button>
        )}
      </div>

      {/* Project Selector Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-700">Filter by Project:</span>
        </div>

        <select
          value={selectedProjectId}
          onChange={(e) => handleProjectSelect(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 min-w-[240px]"
        >
          {projects.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Files Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : files.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <EmptyState
            icon={Files}
            title="No files in this project"
            description="Upload design mockups, contracts, or production deliverables for client review."
            actionLabel="Upload First File"
            onAction={() => setUploadModalOpen(true)}
          />
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

      {/* Upload Modal */}
      <FileUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        projectId={selectedProjectId}
        onUploadSuccess={handleUploadSuccess}
      />
    </div>
  );
};

export default AdminFiles;
