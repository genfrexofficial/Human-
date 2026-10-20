import React, { useState, useEffect } from 'react';
import { fileService } from '../../services/fileService';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { CardSkeleton } from '../../components/common/Skeleton';
import { formatBytes, formatDate } from '../../utils/formatters';
import {
  HardDrive,
  Cloud,
  Lock,
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  FolderLock,
  Layers,
  FileCheck,
  Download,
  Eye,
  Trash2,
  Search,
  Filter,
  ArrowUpDown,
  History,
  AlertCircle,
  FileUp,
  Folder,
  Server
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminStorage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [totalFiles, setTotalFiles] = useState(0);
  const [page, setPage] = useState(1);
  const [recentDeletions, setRecentDeletions] = useState([]);
  const [storageErrors, setStorageErrors] = useState([]);
  const [fileTypeBreakdown, setFileTypeBreakdown] = useState([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedFileType, setSelectedFileType] = useState('ALL');

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [replaceModalOpen, setReplaceModalOpen] = useState(false);
  const [targetReplaceFile, setTargetReplaceFile] = useState(null);

  // Upload Form State
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadCategory, setUploadCategory] = useState('DOCUMENT');
  const [uploadModule, setUploadModule] = useState('GENERAL');
  const [uploadConfidential, setUploadConfidential] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Replace Form State
  const [replacementFile, setReplacementFile] = useState(null);
  const [replacing, setReplacing] = useState(false);

  // Active Tab
  const [activeTab, setActiveTab] = useState('files'); // 'files' | 'audit' | 'errors'

  const fetchStorageData = async () => {
    try {
      setLoading(true);
      const res = await fileService.getStorageStats();
      if (res.success) {
        setStats(res.diagnostics);
        setRecentDeletions(res.recentDeletions || []);
        setStorageErrors(res.storageErrors || []);
        setFileTypeBreakdown(res.fileTypeBreakdown || []);
      }
    } catch (err) {
      toast.error('Failed to load storage diagnostics.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFiles = async (currentPage = 1) => {
    try {
      setFilesLoading(true);
      const params = {
        page: currentPage,
        limit: 15,
        search: searchQuery || undefined,
        module: selectedModule !== 'ALL' ? selectedModule : undefined,
        fileType: selectedFileType !== 'ALL' ? selectedFileType : undefined
      };

      const res = await fileService.browseFiles(params);
      if (res.success) {
        setFiles(res.files || []);
        setTotalFiles(res.total || 0);
        setPage(res.page || 1);
      }
    } catch (err) {
      toast.error('Failed to query files.');
    } finally {
      setFilesLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageData();
    fetchFiles(1);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchFiles(1);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedModule('ALL');
    setSelectedFileType('ALL');
    setTimeout(() => {
      fileService.browseFiles({ page: 1, limit: 15 }).then((res) => {
        if (res.success) {
          setFiles(res.files || []);
          setTotalFiles(res.total || 0);
          setPage(1);
        }
      });
    }, 50);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!uploadFile) {
      toast.error('Please select a file to upload.');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(20);
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('fileName', uploadFileName || uploadFile.name);
      formData.append('category', uploadCategory);
      formData.append('module', uploadModule);
      formData.append('isConfidential', uploadConfidential);

      setUploadProgress(60);
      if (uploadConfidential || uploadCategory.startsWith('HR_')) {
        await fileService.uploadConfidential(formData);
      } else {
        await fileService.uploadFile(formData);
      }
      setUploadProgress(100);

      toast.success('Document uploaded successfully to Google Drive.');
      setUploadModalOpen(false);
      setUploadFile(null);
      setUploadFileName('');
      setUploadProgress(0);
      fetchStorageData();
      fetchFiles(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload document.');
    } finally {
      setUploading(false);
    }
  };

  const handleReplaceSubmit = async (e) => {
    e.preventDefault();
    if (!replacementFile || !targetReplaceFile) {
      toast.error('Please choose a replacement file.');
      return;
    }

    try {
      setReplacing(true);
      const formData = new FormData();
      formData.append('file', replacementFile);
      formData.append('fileName', replacementFile.name);

      await fileService.replaceFile(targetReplaceFile._id, formData);
      toast.success('File successfully replaced in Google Drive.');
      setReplaceModalOpen(false);
      setReplacementFile(null);
      setTargetReplaceFile(null);
      fetchStorageData();
      fetchFiles(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to replace file.');
    } finally {
      setReplacing(false);
    }
  };

  const handleDeleteFile = async (fileId, fileName) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${fileName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      toast.loading('Deleting file from cloud storage...', { id: 'delete-toast' });
      await fileService.deleteFile(fileId);
      toast.success('File deleted successfully.', { id: 'delete-toast' });
      fetchStorageData();
      fetchFiles(page);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete file.', { id: 'delete-toast' });
    }
  };

  const handleDownloadFile = async (fileId, fileName) => {
    try {
      toast.loading('Streaming file from Google Drive...', { id: 'stream-toast' });
      await fileService.downloadBlob(fileId, fileName);
      toast.dismiss('stream-toast');
    } catch (err) {
      toast.dismiss('stream-toast');
      toast.error(err.response?.data?.message || 'Failed to download file.');
    }
  };

  const handleViewFile = async (fileId) => {
    try {
      toast.loading('Opening secure file viewer...', { id: 'view-toast' });
      await fileService.viewBlob(fileId);
      toast.dismiss('view-toast');
    } catch (err) {
      toast.dismiss('view-toast');
      toast.error(err.response?.data?.message || 'Failed to open file view.');
    }
  };

  const getProviderBadge = (provider) => {
    switch (provider) {
      case 'GOOGLE_DRIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300">
            <Cloud className="w-2.5 h-2.5 text-emerald-700" />
            Google Drive
          </span>
        );
      case 'S3':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            <Lock className="w-2.5 h-2.5 text-amber-700" />
            Private S3
          </span>
        );
      case 'CLOUDINARY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
            <Cloud className="w-2.5 h-2.5 text-blue-700" />
            Cloudinary
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <HardDrive className="w-2.5 h-2.5 text-slate-500" />
            Local Secure
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800">
              Primary Cloud Storage
            </span>
            <span className="text-xs text-slate-400 font-medium">Google Drive API v3 + MongoDB Index</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            Google Drive Storage Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage enterprise files, HR confidential offer letters, client deliverables, and worker assets stored in Google Drive.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => { fetchStorageData(); fetchFiles(page); }} disabled={loading || filesLoading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading || filesLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>

          <Button size="sm" onClick={() => setUploadModalOpen(true)}>
            <Upload className="h-3.5 w-3.5 mr-1" />
            <span>Upload Document</span>
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Storage */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold text-slate-500">Total Storage Used</span>
              <HardDrive className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {formatBytes(stats?.totalBytes || 0)}
            </p>
            <span className="text-[10px] text-slate-400 block mt-1">Real-time MongoDB metadata sum</span>
          </div>

          {/* Files Count */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-[11px] font-semibold text-slate-500">Total Files Managed</span>
              <FileText className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {stats?.totalFiles || 0}
            </p>
            <span className="text-[10px] text-slate-400 block mt-1">Files indexed in catalog</span>
          </div>

          {/* Confidential HR Files */}
          <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 shadow-xs">
            <div className="flex items-center justify-between text-rose-700">
              <span className="text-[11px] font-semibold">Confidential HR Files</span>
              <FolderLock className="h-4 w-4 text-rose-600" />
            </div>
            <p className="text-2xl font-black text-rose-950 mt-1">
              {stats?.confidentialCount || 0}
            </p>
            <span className="text-[10px] text-rose-700 font-medium block mt-1">
              Admin & HR strict RBAC protection
            </span>
          </div>

          {/* Google Drive Files */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-xs">
            <div className="flex items-center justify-between text-emerald-700">
              <span className="text-[11px] font-semibold">Google Drive Storage</span>
              <Cloud className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-950 mt-1">
              {stats?.providers?.GOOGLE_DRIVE?.count || 0}
            </p>
            <span className="text-[10px] text-emerald-700 font-medium block mt-1">
              Status: {stats?.providers?.GOOGLE_DRIVE?.status || 'STANDBY'}
            </span>
          </div>
        </div>
      )}

      {/* Provider & Infrastructure Diagnostic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Google Drive Status Card */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/30 p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Google Drive API v3</h3>
                <p className="text-[10px] text-slate-400">Primary Enterprise Cloud</p>
              </div>
            </div>
            {stats?.isGoogleDriveConfigured ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3 h-3" /> Connected
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" /> Standby
              </span>
            )}
          </div>
          <div className="p-2.5 rounded-lg bg-white border border-emerald-100 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Root Folder:</span>
              <span className="font-semibold text-slate-800 font-mono text-[10px]">
                {stats?.googleDrive?.rootFolderId || 'GENFREX (Auto-managed)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Access Mode:</span>
              <span className="font-semibold text-emerald-700">Server-side Stream Proxy</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Public Links:</span>
              <span className="font-semibold text-rose-600">Strictly Blocked</span>
            </div>
          </div>
        </div>

        {/* Module Breakdown Card */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-800">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">Module Distribution</h3>
                <p className="text-[10px] text-slate-400">Files by business unit</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
              {stats?.modules?.length || 0} Modules Active
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1 text-[11px]">
            {stats?.modules && stats.modules.length > 0 ? (
              stats.modules.map((m) => (
                <div key={m._id} className="p-1.5 rounded bg-slate-50 border border-slate-100 flex justify-between">
                  <span className="font-medium text-slate-600 truncate">{m._id || 'OTHER'}:</span>
                  <span className="font-bold text-slate-900">{m.count}</span>
                </div>
              ))
            ) : (
              <div className="col-span-2 text-center text-slate-400 py-2">No files categorized yet</div>
            )}
          </div>
        </div>

        {/* Security & RBAC Enforcement Card */}
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-800">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900">RBAC Security Gate</h3>
                <p className="text-[10px] text-slate-400">Zero-Trust File Protection</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
              Enforced
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">HR Confidential Barrier:</span>
              <span className="font-semibold text-rose-700">Strict (403 on breach)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Cross-Client Isolation:</span>
              <span className="font-semibold text-slate-800">Hard Isolated</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Audit Logging:</span>
              <span className="font-semibold text-purple-700">100% Operations Recorded</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('files')}
          className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'files'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Folder className="w-3.5 h-3.5" />
          <span>File Catalog & Search</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-bold">
            {totalFiles}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'audit'
              ? 'border-emerald-600 text-emerald-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>Recent Deletions</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-bold">
            {recentDeletions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('errors')}
          className={`pb-2.5 border-b-2 flex items-center gap-1.5 transition-colors ${
            activeTab === 'errors'
              ? 'border-rose-600 text-rose-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
          <span>Security / Denied Access Log</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold">
            {storageErrors.length}
          </span>
        </button>
      </div>

      {/* Tab Content 1: Files Catalog */}
      {activeTab === 'files' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <form onSubmit={handleSearchSubmit} className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by file name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedModule}
                onChange={(e) => setSelectedModule(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                <option value="ALL">All Modules</option>
                <option value="HR">HR Documents</option>
                <option value="PROJECT">Projects</option>
                <option value="CLIENT">Clients</option>
                <option value="WORKER">Workers</option>
                <option value="GENERAL">General</option>
              </select>

              <select
                value={selectedFileType}
                onChange={(e) => setSelectedFileType(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-medium text-slate-700 focus:border-emerald-500 focus:outline-none"
              >
                <option value="ALL">All File Types</option>
                <option value="PDF">PDF Documents</option>
                <option value="IMAGE">Images</option>
                <option value="DOCUMENT">Office Docs</option>
                <option value="ARCHIVE">Archives</option>
              </select>

              <Button size="sm" type="submit">
                <Filter className="w-3 h-3 mr-1" />
                <span>Filter</span>
              </Button>

              <Button size="sm" variant="secondary" type="button" onClick={handleResetFilters}>
                <span>Reset</span>
              </Button>
            </div>
          </form>

          {/* Files Ledger Table */}
          <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Stored Files & Document Catalog</h2>
                <p className="text-xs text-slate-500">Live MongoDB metadata index for Google Drive files</p>
              </div>
              <span className="text-xs text-slate-400 font-semibold">{totalFiles} total records</span>
            </div>

            <div className="overflow-x-auto">
              {filesLoading ? (
                <div className="py-12 text-center text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                  <p className="text-xs font-semibold">Loading files...</p>
                </div>
              ) : files.length === 0 ? (
                <div className="py-12 text-center text-slate-400">
                  <HardDrive className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">No files uploaded yet.</p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">
                    Upload documents to Google Drive or generate appointment PDFs in HR OfferFlow.
                  </p>
                  <Button size="sm" onClick={() => setUploadModalOpen(true)}>Upload Document</Button>
                </div>
              ) : (
                <table className="w-full text-left text-xs min-w-[750px]">
                  <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Document / Asset</th>
                      <th className="py-3 px-4">Module / Category</th>
                      <th className="py-3 px-4">Provider</th>
                      <th className="py-3 px-4">Security Tier</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4">Uploaded By</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {files.map((file) => (
                      <tr key={file._id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900 max-w-xs truncate">
                          <div className="flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate" title={file.fileName}>{file.fileName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-medium">
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 mr-1.5">
                            {file.module || 'PROJECT'}
                          </span>
                          <span className="text-[11px] text-slate-500">
                            {file.category?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getProviderBadge(file.storageProvider)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {file.isConfidential ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <Lock className="w-2.5 h-2.5 text-rose-600" />
                              CONFIDENTIAL
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              GENERAL
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {formatBytes(file.fileSize || 0)}
                        </td>
                        <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                          {file.uploadedBy?.name || 'System'}
                        </td>
                        <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                          {formatDate(file.createdAt)}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              title="Preview Document"
                              onClick={() => handleViewFile(file._id)}
                              className="p-1 rounded text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              title="Download Secure Stream"
                              onClick={() => handleDownloadFile(file._id, file.fileName)}
                              className="p-1 rounded text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              title="Replace with new version"
                              onClick={() => {
                                setTargetReplaceFile(file);
                                setReplaceModalOpen(true);
                              }}
                              className="p-1 rounded text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                            >
                              <FileUp className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              title="Delete File"
                              onClick={() => handleDeleteFile(file._id, file.fileName)}
                              className="p-1 rounded text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination Controls */}
            {totalFiles > 15 && (
              <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>Showing page {page} of {Math.ceil(totalFiles / 15)}</span>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page <= 1}
                    onClick={() => fetchFiles(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page >= Math.ceil(totalFiles / 15)}
                    onClick={() => fetchFiles(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 2: Recent Deletions Audit */}
      {activeTab === 'audit' && (
        <div className="rounded-xl border border-slate-200/80 bg-white overflow-hidden shadow-xs">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900">Deletion Audit Trail</h2>
            <p className="text-xs text-slate-500">Permanent record of files deleted from storage providers</p>
          </div>
          <div className="overflow-x-auto">
            {recentDeletions.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No recent file deletions recorded.
              </div>
            ) : (
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">File Name</th>
                    <th className="py-3 px-4">Module</th>
                    <th className="py-3 px-4">Performed By</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentDeletions.map((del) => (
                    <tr key={del._id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-bold text-slate-900">{del.fileName || 'Unnamed File'}</td>
                      <td className="py-3 px-4 text-slate-600">{del.relatedModule || 'GENERAL'}</td>
                      <td className="py-3 px-4 text-slate-700">{del.performedBy?.name || 'System'}</td>
                      <td className="py-3 px-4">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          {del.performedBy?.role || del.performedByRole || 'ADMIN'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{formatDate(del.timestamp || del.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Tab Content 3: Storage Security & Access Denied Log */}
      {activeTab === 'errors' && (
        <div className="rounded-xl border border-rose-200 bg-white overflow-hidden shadow-xs">
          <div className="p-4 border-b border-rose-100 bg-rose-50/30">
            <h2 className="text-sm font-bold text-rose-900 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              Security Barrier Log (FILE_ACCESS_DENIED)
            </h2>
            <p className="text-xs text-rose-600">
              Audit log of unauthorized direct download, view, or deletion attempts rejected by RBAC
            </p>
          </div>
          <div className="overflow-x-auto">
            {storageErrors.length === 0 ? (
              <div className="py-8 text-center text-emerald-600 text-xs font-semibold">
                <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-500" />
                Zero security access violations recorded. All operations authorized.
              </div>
            ) : (
              <table className="w-full text-left text-xs min-w-[650px]">
                <thead className="bg-rose-50/50 text-[10px] font-bold text-rose-700 uppercase tracking-wider border-b border-rose-100">
                  <tr>
                    <th className="py-3 px-4">Target File</th>
                    <th className="py-3 px-4">Module</th>
                    <th className="py-3 px-4">Attempted By</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Rejection Reason</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-rose-100/60">
                  {storageErrors.map((err) => (
                    <tr key={err._id} className="hover:bg-rose-50/40">
                      <td className="py-3 px-4 font-bold text-slate-900">{err.fileName || 'Protected Asset'}</td>
                      <td className="py-3 px-4 text-slate-600">{err.relatedModule || 'HR'}</td>
                      <td className="py-3 px-4 text-slate-700">{err.performedBy?.name || 'Unknown'}</td>
                      <td className="py-3 px-4">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                          {err.performedByRole || err.performedBy?.role || 'UNAUTHORIZED'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-rose-700 font-mono text-[11px]">
                        {err.metadata?.reason || 'CONFIDENTIAL_BARRIER'}
                      </td>
                      <td className="py-3 px-4 text-slate-500">{formatDate(err.timestamp || err.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      <Modal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Upload Document to Google Drive"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Select Document File <span className="text-rose-500">*</span>
            </label>
            <input
              type="file"
              required
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setUploadFile(e.target.files[0]);
                  if (!uploadFileName) setUploadFileName(e.target.files[0].name);
                }
              }}
              className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Supports PDF, DOCX, XLSX, Images, ZIP archives up to 25MB. Executables (.exe, .sh) are rejected.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">Display Name (Optional)</label>
            <input
              type="text"
              value={uploadFileName}
              onChange={(e) => setUploadFileName(e.target.value)}
              placeholder="e.g. Master-Service-Agreement.pdf"
              className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">Target Module</label>
              <select
                value={uploadModule}
                onChange={(e) => {
                  setUploadModule(e.target.value);
                  if (e.target.value === 'HR') setUploadConfidential(true);
                }}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs font-semibold text-slate-800 bg-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="GENERAL">General</option>
                <option value="HR">HR & OfferFlow</option>
                <option value="CLIENT">Client Documents</option>
                <option value="PROJECT">Project Assets</option>
                <option value="WORKER">Worker Documents</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">Category</label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs font-semibold text-slate-800 bg-white focus:border-emerald-500 focus:outline-none"
              >
                <option value="DOCUMENT">General Document</option>
                <option value="HR_DOCUMENT">HR Document / Resume</option>
                <option value="HR_APPOINTMENT">HR Appointment Letter</option>
                <option value="DELIVERABLE">Client Deliverable</option>
                <option value="DESIGN">Design Asset</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="confidentialCheck"
              checked={uploadConfidential}
              onChange={(e) => setUploadConfidential(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
            />
            <label htmlFor="confidentialCheck" className="font-semibold text-slate-800 cursor-pointer">
              Mark as Confidential (Restricted strictly to Admin & HR)
            </label>
          </div>

          {uploading && uploadProgress > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-500">
                <span>Uploading to Google Drive...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setUploadModalOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={uploading}>
              Upload to Drive
            </Button>
          </div>
        </form>
      </Modal>

      {/* Replace File Modal */}
      <Modal
        isOpen={replaceModalOpen}
        onClose={() => setReplaceModalOpen(false)}
        title="Replace File Version"
      >
        <form onSubmit={handleReplaceSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-600">
            <span className="font-bold text-slate-800 block">Current File:</span>
            <p className="truncate mt-0.5">{targetReplaceFile?.fileName}</p>
            <p className="text-[10px] text-slate-400 mt-1">
              Drive ID: {targetReplaceFile?.driveFileId || targetReplaceFile?.storageKey || 'Local'}
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Select New Version File <span className="text-rose-500">*</span>
            </label>
            <input
              type="file"
              required
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setReplacementFile(e.target.files[0]);
                }
              }}
              className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              The existing file will be securely archived or deleted from Google Drive only after the new version is successfully saved.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setReplaceModalOpen(false)}
              disabled={replacing}
            >
              Cancel
            </Button>
            <Button type="submit" loading={replacing}>
              Replace File
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminStorage;
