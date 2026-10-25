import React, { useState } from 'react';
import { APPROVAL_STATUS } from '../../utils/constants';
import { formatDate, formatFileSize } from '../../utils/formatters';
import { fileService } from '../../services/fileService';
import Button from '../common/Button';
import toast from 'react-hot-toast';
import {
  Download,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  FileCode,
  Image as ImageIcon,
  Archive,
  FileCheck,
  User,
  Trash2,
  Loader2
} from 'lucide-react';

const DeliverableReviewCard = ({
  file,
  deliverable,
  isAdmin = false,
  isClient = false,
  onApprove,
  onRequestChanges,
  onDelete
}) => {
  const currentFile = file || deliverable;
  if (!currentFile) return null;

  const [downloading, setDownloading] = useState(false);

  const isDeliverable = currentFile.isDeliverable === true || currentFile.category === 'DELIVERABLE';
  const isLink = currentFile.isLink || currentFile.storageProvider === 'EXTERNAL_LINK' || currentFile.fileType === 'LINK';
  const targetUrl = currentFile.linkUrl || currentFile.fileUrl;
  const isAdminApproved = currentFile.adminApproved === true ||
    currentFile.adminApprovalStatus === 'APPROVED' ||
    (currentFile.approvalStatus === 'APPROVED' && currentFile.adminApprovalStatus !== 'CHANGES_REQUESTED' && currentFile.adminApproved !== false);
  const isChangesRequested = currentFile.adminApprovalStatus === 'CHANGES_REQUESTED' || currentFile.approvalStatus === 'CHANGES_REQUESTED';

  const approvalCfg = APPROVAL_STATUS[currentFile.approvalStatus] || {
    label: currentFile.approvalStatus || 'PENDING_REVIEW',
    color: 'bg-slate-100 text-slate-700'
  };

  const getFileIcon = (mime = '') => {
    if (isLink) return <ExternalLink className="w-5 h-5 text-indigo-600" />;
    if (mime.includes('image')) return <ImageIcon className="w-5 h-5 text-indigo-500" />;
    if (mime.includes('pdf')) return <FileText className="w-5 h-5 text-rose-500" />;
    if (mime.includes('zip') || mime.includes('tar') || mime.includes('archive')) {
      return <Archive className="w-5 h-5 text-amber-500" />;
    }
    return <FileText className="w-5 h-5 text-blue-500" />;
  };

  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (downloading) return;
    try {
      setDownloading(true);
      await fileService.downloadBlob(currentFile._id, currentFile.fileName);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to download file.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-card hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        {/* Header: Icon, Name & Status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${isLink ? 'bg-indigo-50' : 'bg-slate-100'}`}>
              {getFileIcon(currentFile.fileType || currentFile.mimeType)}
            </div>
            <div className="min-w-0">
              {isLink ? (
                <a
                  href={targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline truncate block"
                  title={currentFile.fileName || targetUrl}
                >
                  {currentFile.fileName || targetUrl}
                </a>
              ) : (
                <h4 className="text-xs font-bold text-slate-900 truncate" title={currentFile.fileName}>
                  {currentFile.fileName}
                </h4>
              )}
              <p className="text-[11px] text-slate-500 mt-0.5">
                {currentFile.category} • {isLink ? 'External Link' : formatFileSize(currentFile.fileSize)}
              </p>
            </div>
          </div>

          {/* Contextual Status Badge */}
          {isAdmin && isDeliverable ? (
            isAdminApproved ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved (Open to Client)
              </span>
            ) : isChangesRequested ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 bg-rose-50 text-rose-700 border-rose-200">
                <AlertTriangle className="w-3 h-3 text-rose-600" /> Changes Requested
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 bg-amber-50 text-amber-700 border-amber-200">
                <Clock className="w-3 h-3 text-amber-600" /> Pending Admin Approval
              </span>
            )
          ) : isClient && isDeliverable ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Admin Approved • Open
            </span>
          ) : (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${approvalCfg.color}`}
            >
              {approvalCfg.label}
            </span>
          )}
        </div>

        {/* Metadata */}
        <div className="bg-slate-50 rounded-lg p-2.5 text-[11px] text-slate-600 space-y-1 mb-4 border border-slate-100">
          <div className="flex justify-between">
            <span className="text-slate-400">Uploaded By:</span>
            <span className="font-medium text-slate-700 truncate max-w-[140px]">
              {currentFile.uploadedBy?.name || 'Team Member'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Date:</span>
            <span className="font-medium text-slate-700">{formatDate(currentFile.createdAt)}</span>
          </div>
          {currentFile.task?.title && (
            <div className="flex justify-between">
              <span className="text-slate-400">Linked Task:</span>
              <span className="font-medium text-slate-700 truncate max-w-[150px]" title={currentFile.task.title}>
                {currentFile.task.title}
              </span>
            </div>
          )}
          {currentFile.adminApprovedBy?.name && (
            <div className="flex justify-between">
              <span className="text-slate-400">Approved By Admin:</span>
              <span className="font-medium text-emerald-700 truncate max-w-[140px]">
                {currentFile.adminApprovedBy.name}
              </span>
            </div>
          )}
          {currentFile.revisionNotes && (
            <div className="mt-2 p-2 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[10px]">
              <p className="font-bold">Revision Requested:</p>
              <p className="mt-0.5">{currentFile.revisionNotes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        {/* View / Download / Open Link */}
        {isLink ? (
          <a
            href={targetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
            title={`Open ${currentFile.fileName || targetUrl}`}
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Link</span>
          </a>
        ) : (
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            title={`Download ${currentFile.fileName}`}
          >
            {downloading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-500" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{downloading ? 'Downloading...' : 'Download'}</span>
          </button>
        )}

        {/* Action Controls for Admin and Client */}
        <div className="flex items-center gap-1.5">
          {/* Admin Approval Controls */}
          {isAdmin && isDeliverable && (
            <>
              {!isAdminApproved ? (
                <>
                  {onRequestChanges && (
                    <Button
                      variant="danger"
                      size="xs"
                      onClick={() => onRequestChanges(currentFile)}
                      icon={AlertTriangle}
                    >
                      Request Changes
                    </Button>
                  )}
                  {onApprove && (
                    <Button
                      variant="success"
                      size="xs"
                      onClick={() => onApprove(currentFile._id)}
                      icon={CheckCircle2}
                    >
                      Approve for Client
                    </Button>
                  )}
                </>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                    <CheckCircle2 className="w-3 h-3" /> Client Can Access
                  </span>
                  {onRequestChanges && (
                    <Button
                      variant="secondary"
                      size="xs"
                      onClick={() => onRequestChanges(currentFile)}
                      icon={AlertTriangle}
                      title="Request revisions and hide from client until re-approved"
                    >
                      Revision
                    </Button>
                  )}
                </>
              )}
            </>
          )}

          {/* Client Review Actions (Only active if approved by admin) */}
          {isClient && isDeliverable && isAdminApproved && currentFile.approvalStatus !== 'APPROVED' && (
            <>
              {onRequestChanges && (
                <Button
                  variant="danger"
                  size="xs"
                  onClick={() => onRequestChanges(currentFile)}
                  icon={AlertTriangle}
                >
                  Request Changes
                </Button>
              )}
              {onApprove && (
                <Button
                  variant="success"
                  size="xs"
                  onClick={() => onApprove(currentFile._id)}
                  icon={CheckCircle2}
                >
                  Sign Off
                </Button>
              )}
            </>
          )}

          {isClient && isDeliverable && isAdminApproved && currentFile.approvalStatus === 'APPROVED' && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> Signed Off
            </span>
          )}

          {/* Admin delete file button */}
          {isAdmin && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(currentFile._id)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              title="Delete File"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliverableReviewCard;
