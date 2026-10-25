import React, { useState, useEffect } from 'react';
import { projectService } from '../../services/projectService';
import { Files, Upload, Loader2, Download, FileText, CheckCircle2, Clock, AlertCircle, Link2, ExternalLink, Globe } from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const EmployeeFiles = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Upload modal
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadType, setUploadType] = useState('FILE'); // 'FILE' | 'LINK'
  const [uploadFileObj, setUploadFileObj] = useState(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkTitle, setLinkTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('DELIVERABLE');
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownload = async (fileId, fileName) => {
    try {
      setDownloadingId(fileId);
      await fileService.downloadBlob(fileId, fileName);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to download file.');
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const pRes = await projectService.getProjects();
        if (pRes.success && pRes.projects?.length > 0) {
          setProjects(pRes.projects);
          const firstId = pRes.projects[0]._id;
          setSelectedProjectId(firstId);
          await loadProjectFiles(firstId);
        } else {
          setProjects([]);
          setFiles([]);
        }
      } catch (err) {
        toast.error('Failed to load project files.');
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  const loadProjectFiles = async (pId) => {
    if (!pId) {
      setFiles([]);
      return;
    }
    try {
      const fRes = await fileService.getProjectFiles(pId);
      if (fRes.success) {
        setFiles(fRes.files || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleProjectChange = async (e) => {
    const newId = e.target.value;
    setSelectedProjectId(newId);
    setLoading(true);
    await loadProjectFiles(newId);
    setLoading(false);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedProjectId) {
      toast.error('Please select a project.');
      return;
    }

    if (uploadType === 'FILE') {
      if (!uploadFileObj) {
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
        toast.error('Please provide a valid URL (e.g. https://github.com/...)');
        return;
      }
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('projectId', selectedProjectId);
      formData.append('category', uploadCategory);

      if (uploadType === 'FILE') {
        formData.append('file', uploadFileObj);
        formData.append('fileName', uploadFileObj.name);
      } else {
        const cleanUrl = linkUrl.trim().startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`;
        formData.append('uploadType', 'LINK');
        formData.append('linkUrl', cleanUrl);
        formData.append('fileName', linkTitle.trim() || cleanUrl);
      }

      const res = await fileService.uploadFile(formData);
      if (res.success) {
        toast.success(uploadType === 'FILE' ? 'Deliverable uploaded successfully!' : 'Deliverable link saved successfully!');
        setUploadFileObj(null);
        setLinkUrl('');
        setLinkTitle('');
        setUploadType('FILE');
        setUploadModalOpen(false);
        loadProjectFiles(selectedProjectId);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'File upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Work Deliverables & Files</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage code deliverables, technical specs, and deliverables awaiting client sign-off
          </p>
        </div>

        <Button onClick={() => setUploadModalOpen(true)} disabled={projects.length === 0}>
          <Upload className="h-3.5 w-3.5 mr-1" />
          Upload Deliverable
        </Button>
      </div>

      {/* Project Selector Bar */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <span className="text-xs font-semibold text-slate-700 whitespace-nowrap">Select Project:</span>
        <select
          value={selectedProjectId}
          onChange={handleProjectChange}
          className="rounded-lg border border-slate-200 py-1.5 px-3 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none max-w-sm"
        >
          {projects.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Files Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
        </div>
      ) : files.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <Files className="mx-auto h-8 w-8 text-slate-400" />
          <h3 className="mt-2 text-sm font-semibold text-slate-800">No files in this project</h3>
          <p className="text-xs text-slate-500 mt-1">Upload build artifacts or documents to share with the client.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-5 py-3">File Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Approval Status</th>
                  <th className="px-4 py-3">Uploaded By</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {files.map((file) => {
                  const isLink = file.isLink || file.storageProvider === 'EXTERNAL_LINK' || file.fileType === 'LINK';
                  const targetUrl = file.linkUrl || file.fileUrl;
                  return (
                    <tr key={file._id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-5 py-3.5 max-w-xs">
                        <div className="flex items-center gap-2.5">
                          {isLink ? (
                            <ExternalLink className="h-4 w-4 text-indigo-500 shrink-0" />
                          ) : (
                            <FileText className="h-4 w-4 text-indigo-500 shrink-0" />
                          )}
                          <div className="min-w-0">
                            {isLink ? (
                              <a
                                href={targetUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline block truncate"
                                title={`Open ${file.fileName || targetUrl}`}
                              >
                                {file.fileName || targetUrl}
                              </a>
                            ) : (
                              <span className="font-semibold text-slate-900 block truncate">{file.fileName}</span>
                            )}
                            {file.revisionNotes && (
                              <span className="text-[10px] text-rose-600 block mt-0.5 truncate font-medium">
                                Revision note: {file.revisionNotes}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="text-slate-600 font-medium text-[11px]">{file.category}</span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {file.isDeliverable ? (
                          <Badge variant={file.approvalStatus?.toLowerCase() || 'default'}>
                            {file.approvalStatus?.replace('_', ' ')}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-[11px]">N/A</span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                        {file.uploadedBy?.name || 'User'}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap text-slate-400 text-[11px]">
                        {new Date(file.createdAt).toLocaleDateString()}
                      </td>

                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        {isLink ? (
                          <a
                            href={targetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium text-[11px] inline-flex items-center gap-1"
                            title={`Open ${file.fileName}`}
                          >
                            <ExternalLink className="h-3 w-3" />
                            <span>Open Link</span>
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDownload(file._id, file.fileName)}
                            disabled={downloadingId === file._id}
                            className="px-2.5 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-medium text-[11px] inline-flex items-center gap-1 disabled:opacity-50"
                            title={`Download ${file.fileName}`}
                          >
                            {downloadingId === file._id ? (
                              <Loader2 className="h-3 w-3 animate-spin text-slate-500" />
                            ) : (
                              <Download className="h-3 w-3" />
                            )}
                            <span>Download</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => {
          setUploadModalOpen(false);
          setUploadFileObj(null);
          setLinkUrl('');
          setLinkTitle('');
          setUploadType('FILE');
        }}
        title={uploadType === 'FILE' ? "Upload Project Deliverable / File" : "Add External Link Deliverable"}
      >
        <form onSubmit={handleUpload} className="space-y-4 text-xs">
          {/* Toggle: File vs Link */}
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
              <Upload className="w-3.5 h-3.5 text-indigo-600" />
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

          <div>
            <label className="block font-semibold text-slate-800 mb-1">Target Project *</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
            >
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {uploadType === 'FILE' ? (
            <div>
              <label className="block font-semibold text-slate-800 mb-1">Choose File *</label>
              <input
                type="file"
                required
                onChange={(e) => setUploadFileObj(e.target.files[0])}
                className="w-full text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
          ) : (
            <div className="space-y-2.5">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">Resource Link / URL *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="https://github.com/..., https://figma.com/..., or cloud link"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                  />
                  <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">Link Title / Label (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. GitHub Pull Request #14, Figma Prototype, Live Demo"
                  value={linkTitle}
                  onChange={(e) => setLinkTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400">Quick suggestions:</span>
                {[
                  { label: 'GitHub PR', prefix: 'https://github.com/' },
                  { label: 'Figma Mockup', prefix: 'https://figma.com/file/' },
                  { label: 'Google Drive', prefix: 'https://drive.google.com/' },
                  { label: 'Loom Video', prefix: 'https://loom.com/share/' }
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      if (!linkUrl) setLinkUrl(item.prefix);
                      if (!linkTitle) setLinkTitle(item.label);
                    }}
                    className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors border border-slate-200"
                  >
                    +{item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-800 mb-1">Category</label>
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none"
            >
              <option value="DELIVERABLE">Deliverable (Requires Admin Approval before Client Access)</option>
              <option value="DOCUMENT">Documentation / Architecture</option>
              <option value="DESIGN">Design Asset</option>
              <option value="OTHER">Other Artifact</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              size="sm"
              variant="secondary"
              type="button"
              onClick={() => {
                setUploadModalOpen(false);
                setUploadFileObj(null);
                setLinkUrl('');
                setLinkTitle('');
                setUploadType('FILE');
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              disabled={uploading || (uploadType === 'FILE' ? !uploadFileObj : !linkUrl.trim())}
            >
              {uploading ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : uploadType === 'FILE' ? (
                <Upload className="h-3 w-3 mr-1" />
              ) : (
                <Link2 className="h-3 w-3 mr-1" />
              )}
              {uploadType === 'FILE' ? 'Upload Deliverable' : 'Save Deliverable Link'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EmployeeFiles;
