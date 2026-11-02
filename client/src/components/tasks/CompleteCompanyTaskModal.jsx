import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import { fileService } from '../../services/fileService';
import { taskService } from '../../services/taskService';
import {
  CheckCircle2,
  Upload,
  Link2,
  FileText,
  AlertCircle,
  Paperclip,
  Loader2,
  ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

const CompleteCompanyTaskModal = ({ isOpen, onClose, task, onCompleted }) => {
  const [uploadType, setUploadType] = useState('FILE'); // 'FILE' | 'LINK'
  const [selectedFile, setSelectedFile] = useState(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [completionNotes, setCompletionNotes] = useState('');
  const [selectedExistingId, setSelectedExistingId] = useState('');
  const [useExisting, setUseExisting] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Existing attachments on task
  const existingAttachments = (task?.attachments && task.attachments.length > 0)
    ? task.attachments
    : (task?.files && task.files.length > 0)
    ? task.files
    : [];

  useEffect(() => {
    if (isOpen) {
      setSelectedFile(null);
      setLinkUrl('');
      setLinkTitle('');
      setCompletionNotes('');
      setUploadType('FILE');
      setSubmitting(false);

      if (existingAttachments.length > 0) {
        setSelectedExistingId(existingAttachments[0]._id || 'existing');
        setUseExisting(true);
      } else {
        setSelectedExistingId('');
        setUseExisting(false);
      }
    }
  }, [isOpen, task]);

  if (!task) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    let uploadedFileId = null;
    let attachmentObj = null;

    if (useExisting && existingAttachments.length > 0) {
      const selected = existingAttachments.find(
        (a) => a._id === selectedExistingId || a.fileUrl === selectedExistingId
      ) || existingAttachments[0];

      if (selected._id) {
        uploadedFileId = selected._id;
      } else if (selected.fileUrl) {
        attachmentObj = {
          fileName: selected.fileName || 'Attached Document',
          fileUrl: selected.fileUrl,
          fileSize: selected.fileSize || 0,
          fileType: selected.fileType || 'application/octet-stream'
        };
      }
    } else {
      // Validate new attachment is provided
      if (uploadType === 'FILE') {
        if (!selectedFile) {
          toast.error('Please choose a document or work file to attach.');
          return;
        }
      } else {
        if (!linkUrl.trim()) {
          toast.error('Please enter a valid document or deliverable URL.');
          return;
        }
        try {
          const formatted = linkUrl.trim().startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`;
          const parsed = new URL(formatted);
          if (!parsed.hostname) throw new Error('Invalid URL');
        } catch (_) {
          toast.error('Please provide a valid URL (e.g. https://drive.google.com/...)');
          return;
        }
      }
    }

    try {
      setSubmitting(true);

      // Upload if new document
      if (!useExisting) {
        let uploadRes;
        if (uploadType === 'FILE') {
          const formData = new FormData();
          formData.append('taskId', task._id);
          formData.append('module', 'Employee');
          formData.append('category', 'DOCUMENT');
          formData.append('file', selectedFile);
          formData.append('fileName', selectedFile.name);
          uploadRes = await fileService.uploadFile(formData);
        } else {
          const cleanUrl = linkUrl.trim().startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`;
          uploadRes = await fileService.uploadFile({
            taskId: task._id,
            module: 'Employee',
            category: 'DOCUMENT',
            uploadType: 'LINK',
            linkUrl: cleanUrl,
            fileName: linkTitle.trim() || cleanUrl,
            title: linkTitle.trim() || cleanUrl
          });
        }

        if (uploadRes && uploadRes.success && uploadRes.file) {
          uploadedFileId = uploadRes.file._id;
        }
      }

      // Mark task as completed with attached document
      const completeRes = await taskService.completeTask(task._id, {
        fileId: uploadedFileId,
        attachment: attachmentObj,
        notes: completionNotes.trim()
      });

      if (completeRes.success) {
        toast.success('Company task completed with document attached!');
        if (onCompleted) onCompleted();
        onClose();
      } else {
        toast.error(completeRes.message || 'Failed to complete task.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Error completing task.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Complete Company Task"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Task Header Summary */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Company Task
            </span>
            {task.personalCategory && (
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {task.personalCategory.replace('_', ' ')}
              </span>
            )}
          </div>
          <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{task.title}</h4>
          {task.assignedBy && (
            <p className="text-[11px] text-slate-500">
              Assigned by: <strong className="text-slate-700">{task.assignedBy.name}</strong> ({task.assignedBy.role})
            </p>
          )}
        </div>

        {/* Informative Notice */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div className="text-[11px] text-emerald-900 leading-relaxed">
            <strong className="block font-semibold">Document Attachment Required</strong>
            To complete this company task, worker documentation or proof of work (such as a certificate, work output, report, or signed file) must be attached for supervisor verification.
          </div>
        </div>

        {/* Option: Choose existing file or upload new */}
        {existingAttachments.length > 0 && (
          <div className="space-y-2 rounded-xl border border-slate-200 p-3 bg-white">
            <span className="block font-semibold text-slate-800 text-xs">
              Select Document Source
            </span>
            <div className="flex items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                <input
                  type="radio"
                  name="docSource"
                  checked={useExisting}
                  onChange={() => setUseExisting(true)}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span>Use Previously Attached Document ({existingAttachments.length})</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                <input
                  type="radio"
                  name="docSource"
                  checked={!useExisting}
                  onChange={() => setUseExisting(false)}
                  className="text-indigo-600 focus:ring-indigo-500"
                />
                <span>Upload New Document</span>
              </label>
            </div>

            {useExisting && (
              <div className="mt-2 space-y-1.5 pt-2 border-t border-slate-100">
                {existingAttachments.map((att, idx) => (
                  <label
                    key={att._id || idx}
                    className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${
                      (selectedExistingId === att._id || (idx === 0 && !selectedExistingId))
                        ? 'border-indigo-500 bg-indigo-50/50 text-indigo-900 font-medium'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <input
                        type="radio"
                        name="existingDoc"
                        checked={selectedExistingId === att._id || (idx === 0 && !selectedExistingId)}
                        onChange={() => setSelectedExistingId(att._id || att.fileUrl)}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="truncate text-xs">{att.fileName}</span>
                    </div>
                    {att.fileSize > 0 && (
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {(att.fileSize / 1024).toFixed(0)} KB
                      </span>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Upload New Document Form (if not using existing) */}
        {(!useExisting || existingAttachments.length === 0) && (
          <div className="space-y-3 rounded-xl border border-slate-200 p-3.5 bg-white">
            <div className="flex items-center justify-between">
              <span className="block font-semibold text-slate-800 text-xs">
                Attach Document / Proof of Work <span className="text-rose-500">*</span>
              </span>

              {/* Upload Type Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-[11px]">
                <button
                  type="button"
                  onClick={() => setUploadType('FILE')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                    uploadType === 'FILE'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Upload className="w-3 h-3" />
                  <span>Upload File</span>
                </button>
                <button
                  type="button"
                  onClick={() => setUploadType('LINK')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1 ${
                    uploadType === 'LINK'
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Link2 className="w-3 h-3" />
                  <span>External Link</span>
                </button>
              </div>
            </div>

            {uploadType === 'FILE' ? (
              <div>
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-xl cursor-pointer bg-slate-50/50 hover:bg-indigo-50/20 transition-all">
                  <Upload className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="font-semibold text-slate-700 text-xs">
                    {selectedFile ? selectedFile.name : 'Click to select file to upload'}
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {selectedFile
                      ? `${(selectedFile.size / 1024).toFixed(0)} KB — click to change`
                      : 'PDF, DOCX, XLSX, Images, ZIP, or text files up to 25MB'}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setSelectedFile(e.target.files[0]);
                      }
                    }}
                  />
                </label>
              </div>
            ) : (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Document or Resource URL *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://drive.google.com/file/d/... or https://github.com/..."
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-700 mb-1">
                    Document Title (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Completed Training Certification / Final Report"
                    value={linkTitle}
                    onChange={(e) => setLinkTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Completion Remarks */}
        <div>
          <label className="block font-semibold text-slate-800 mb-1">
            Completion Note & Remarks (Optional)
          </label>
          <textarea
            rows={2}
            placeholder="Add any notes for your manager/HR regarding this completed work..."
            value={completionNotes}
            onChange={(e) => setCompletionNotes(e.target.value)}
            className="w-full rounded-xl border border-slate-200 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={submitting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                <span>Completing & Attaching...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                <span>Attach Document & Complete Task</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default CompleteCompanyTaskModal;

