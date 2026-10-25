import React, { useState, useRef } from 'react';
import Modal from '../common/Modal';
import Input from '../common/Input';
import Button from '../common/Button';
import { UploadCloud, FileText, CheckCircle2, AlertTriangle, Link2, ExternalLink, Globe } from 'lucide-react';
import toast from 'react-hot-toast';

const DANGEROUS_EXTS = ['.exe', '.bat', '.cmd', '.sh', '.bash', '.php', '.dll', '.bin'];

const FileUploadModal = ({ isOpen, onClose, projectId, onUploadSuccess }) => {
  const [uploadType, setUploadType] = useState('FILE'); // 'FILE' | 'LINK'
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [category, setCategory] = useState('DELIVERABLE');
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  const resetForm = () => {
    setSelectedFile(null);
    setFileName('');
    setLinkUrl('');
    setUploadType('FILE');
    setCategory('DELIVERABLE');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

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

    if (uploadType === 'FILE') {
      if (!selectedFile) {
        toast.error('Please choose a file to upload.');
        return;
      }
    } else {
      if (!linkUrl.trim()) {
        toast.error('Please enter a valid link / URL.');
        return;
      }
      try {
        const parsed = new URL(linkUrl.includes('://') ? linkUrl.trim() : `https://${linkUrl.trim()}`);
        if (!parsed.hostname) throw new Error('Invalid URL');
      } catch (_) {
        toast.error('Please provide a valid web link (e.g. https://github.com/... or https://figma.com/...)');
        return;
      }
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('projectId', projectId);
      formData.append('category', category);
      formData.append('module', 'PROJECT');

      if (uploadType === 'FILE') {
        formData.append('file', selectedFile);
        formData.append('fileName', fileName || selectedFile.name);
      } else {
        const cleanUrl = linkUrl.trim().startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`;
        formData.append('uploadType', 'LINK');
        formData.append('linkUrl', cleanUrl);
        formData.append('fileName', fileName.trim() || cleanUrl);
      }

      await onUploadSuccess(formData);
      resetForm();
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
      onClose={handleClose}
      title={uploadType === 'FILE' ? "Upload File or Deliverable" : "Add External Link Deliverable"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Toggle Pills: File vs Link */}
        <div className="flex rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => setUploadType('FILE')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
              uploadType === 'FILE'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5 text-emerald-600" />
            Upload File
          </button>
          <button
            type="button"
            onClick={() => setUploadType('LINK')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 ${
              uploadType === 'LINK'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Link2 className="w-3.5 h-3.5 text-indigo-600" />
            External Link / URL
          </button>
        </div>

        {uploadType === 'FILE' ? (
          /* Drag & Drop Zone */
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
        ) : (
          /* Link Input Section */
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                External Resource URL *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="https://github.com/..., https://figma.com/..., or Google Drive link"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="block w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <Globe className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-400">Quick suggestions:</span>
              {[
                { label: 'GitHub PR/Repo', prefix: 'https://github.com/' },
                { label: 'Figma Mockup', prefix: 'https://figma.com/file/' },
                { label: 'Google Drive/Doc', prefix: 'https://drive.google.com/' },
                { label: 'Loom Video', prefix: 'https://loom.com/share/' }
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => {
                    if (!linkUrl) setLinkUrl(item.prefix);
                    if (!fileName) setFileName(item.label);
                  }}
                  className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors border border-slate-200"
                >
                  +{item.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <Input
          label={uploadType === 'FILE' ? "Display Name (Optional)" : "Deliverable / Link Title (Recommended)"}
          name="fileName"
          placeholder={uploadType === 'FILE' ? "e.g. Project-Specification-V2.pdf" : "e.g. Frontend Pull Request #14 / Design Prototype"}
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
            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="DELIVERABLE">Deliverable (Requires Admin Approval before Client Access)</option>
            <option value="DESIGN">Design Asset / Mockup</option>
            <option value="DOCUMENT">Project Document / Architecture</option>
            <option value="OTHER">Other Resource</option>
          </select>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {uploadType === 'FILE' ? 'Upload to Google Drive' : 'Save Deliverable Link'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default FileUploadModal;
