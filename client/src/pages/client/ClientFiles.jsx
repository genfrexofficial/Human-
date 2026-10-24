import React, { useState, useEffect } from 'react';
import { projectService } from '../../services/projectService';
import { fileService } from '../../services/fileService';
import DeliverableReviewCard from '../../components/files/DeliverableReviewCard';
import ChangeRequestModal from '../../components/files/ChangeRequestModal';
import EmptyState from '../../components/common/EmptyState';
import { CardSkeleton } from '../../components/common/Skeleton';
import { Files, CheckCircle2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const ClientFiles = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState(null);

  const fetchClientFiles = async () => {
    try {
      setLoading(true);
      const projRes = await projectService.getProjects();
      if (projRes.success) {
        let allFiles = [];
        for (const p of projRes.projects || []) {
          try {
            const fRes = await fileService.getProjectFiles(p._id);
            if (fRes.success) {
              allFiles = [...allFiles, ...(fRes.files || [])];
            }
          } catch (e) {
            console.error(e);
          }
        }
        setFiles(allFiles);
      }
    } catch (err) {
      toast.error('Failed to load deliverables.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientFiles();
  }, []);

  const handleApprove = async (fileId) => {
    try {
      const res = await fileService.reviewDeliverable(fileId, 'APPROVED');
      if (res.success) {
        toast.success('🎉 Deliverable signed off successfully!');
        fetchClientFiles();
      }
    } catch (err) {
      toast.error('Approval failed.');
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
        toast.success('Feedback submitted! The agency team has been notified.');
        setChangeModalOpen(false);
        fetchClientFiles();
      }
    } catch (err) {
      toast.error('Failed to submit revision request.');
      throw err;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Deliverables & Files</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Review and download official deliverables approved and released by your agency.
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Admin Verified Assets</span>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : files.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <EmptyState
            icon={Files}
            title="No deliverables released yet"
            description="Deliverables will open and appear here once approved by your agency admin."
          />
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

export default ClientFiles;
