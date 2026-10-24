import React, { useState, useRef } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const DANGEROUS_EXTS = ['.exe', '.bat', '.cmd', '.sh', '.bash', '.php', '.dll', '.bin'];

const FileUploadModal = ({ isOpen, onClose, projectId, onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [category, setCategory] = useState('DELIVERABLE');
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const validateAndSetFile = (file) => {
    if (!file) return;

    const ext = file.name.slice((file.name.lastIndexOf('.') - 1 >>> 0) + 2).toLowerCase();
    if (DANGEROUS_EXTS.includes(`.${ext}`)) {
      toast.error(`Executable files (.${ext}) are not allowed for security reasons.`);
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size exceeds the 25MB enterprise limit.');
      return;
    }

    setSelectedFile(file);
    if (!fileName) {
      setFileName(file.name);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please choose a file to upload.');
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('projectId', projectId);
      formData.append('category', category);
      formData.append('module', 'PROJECT');
      formData.append('fileName', fileName || selectedFile.name);

      await onUploadSuccess(formData);
      setSelectedFile(null);
      setFileName('');
      setCategory('DELIVERABLE');
      onClose();
    } catch (err) {
      // Handled in parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload File or Deliverable to Google Drive"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Drag & Drop Zone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            dragActive
              ? 'border-emerald-500 bg-emerald-50/50'
              : selectedFile
              ? 'border-emerald-400 bg-emerald-50/30'
              : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
          />

          {selectedFile ? (
            <div className="flex flex-col items-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mb-2" />
              <p className="text-xs font-semibold text-slate-900">{selectedFile.name}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • Ready for Google Drive • Click to replace
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <UploadCloud className="w-8 h-8 text-emerald-600 mb-2" />
              <p className="text-xs font-semibold text-slate-700">
                Drag and drop file here, or <span className="text-emerald-600">browse</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Supports PDFs, Images, ZIPs, Documents up to 25MB
              </p>
            </div>
          )}
        </div>

        <Input
          label="Display Name (Optional)"
          name="fileName"
          placeholder="e.g. Project-Specification-V2.pdf"
          value={fileName}
          onChange={(e) => setFileName(e.target.value)}
        />

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="DELIVERABLE">Deliverable (Requires Admin Approval before Client Access)</option>
            <option value="DESIGN">Design Asset</option>
            <option value="DOCUMENT">Project Document / Brief</option>
            <option value="OTHER">Other Resource</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Upload to Google Drive
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default FileUploadModal;
