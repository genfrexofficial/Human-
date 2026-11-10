import React, { useState, useEffect } from 'react';
import { fileService } from '../../services/fileService';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import { CardSkeleton } from '../../components/common/Skeleton';
import {
  FileCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
  Download,
  Eye,
  Search,
  Filter,
  RefreshCw,
  FolderKanban,
  CheckSquare,
  Globe,
  FileText,
  User,
  MessageSquare,
  Sparkles,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  HelpCircle,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminWorkReviews = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'PENDING' | 'WEBSITES' | 'DOCUMENTS' | 'APPROVED' | 'CHANGES'
  const [searchQuery, setSearchQuery] = useState('');
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [workerFilter, setWorkerFilter] = useState('ALL');

  // Review Modal State
  const [changeModalOpen, setChangeModalOpen] = useState(false);
  const [targetItem, setTargetItem] = useState(null);
  const [revisionReason, setRevisionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const fetchSubmissions = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await fileService.getWorkReviews();
      if (res.success) {
        setSubmissions(res.submissions || []);
      }
    } catch (err) {
      console.error('Failed to load work reviews:', err);
      toast.error('Failed to load worker submissions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, []);

  // Handle Approve
  const handleApprove = async (item) => {
    try {
      setActionLoading(true);
      const res = await fileService.reviewDeliverable(item._id, 'APPROVED');
      if (res.success) {
        toast.success(`🎉 Deliverable "${item?.fileName || item?.title || 'Work'}" approved!`);
        fetchSubmissions(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to approve deliverable.');
    } finally {
      setActionLoading(false);
    }
  };

  // Open Revision Modal
  const handleOpenRevisionModal = (item) => {
    setTargetItem(item);
    setRevisionReason(item.revisionNotes || item.adminFeedback || '');
    setChangeModalOpen(true);
  };

  // Submit Revision Request
  const handleSubmitRevision = async (e) => {
    e.preventDefault();
    if (!targetItem) return;
    if (!revisionReason.trim()) {
      toast.error('Please describe what changes the worker needs to make.');
      return;
    }

    try {
      setActionLoading(true);
      const res = await fileService.reviewDeliverable(targetItem._id, 'CHANGES_REQUESTED', revisionReason.trim());
      if (res.success) {
        toast.success('Revision request sent to the worker!');
        setChangeModalOpen(false);
        setTargetItem(null);
        setRevisionReason('');
        fetchSubmissions(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit revision request.');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Download / View
  const handleDownload = async (item) => {
    const isWebLink = item.isLink || item.storageProvider === 'EXTERNAL_LINK' || (item.fileUrl && item.fileUrl.startsWith('http') && !item.fileUrl.includes('/files/'));
    if (isWebLink) {
      const url = item.linkUrl || item.fileUrl;
      window.open(url, '_blank');
      return;
    }

    try {
      setDownloadingId(item._id);
      if (item?._id && !item._id.startsWith('task_')) {
        await fileService.downloadBlob(item._id, item?.fileName || 'deliverable');
      } else if (item.fileUrl) {
        window.open(item.fileUrl, '_blank');
      }
    } catch (err) {
      toast.error('Failed to download file.');
    } finally {
      setDownloadingId(null);
    }
  };

  // Unique projects & workers for dropdown filters
  const projectOptions = Array.from(
    new Map(
      submissions
        .filter((s) => s.project?._id && s.project?.name)
        .map((s) => [s.project._id, s.project.name])
    ).entries()
  );

  const workerOptions = Array.from(
    new Map(
      submissions
        .filter((s) => s.uploadedBy?._id && s.uploadedBy?.name)
        .map((s) => [s.uploadedBy._id, s.uploadedBy.name])
    ).entries()
  );

  // Statistics
  const totalCount = submissions.length;
  const pendingCount = submissions.filter((s) => {
    const isApproved = s.adminApproved === true || s.adminApprovalStatus === 'APPROVED' || (s.approvalStatus === 'APPROVED' && s.adminApprovalStatus !== 'CHANGES_REQUESTED');
    const isChanges = s.adminApprovalStatus === 'CHANGES_REQUESTED' || s.approvalStatus === 'CHANGES_REQUESTED';
    return !isApproved && !isChanges;
  }).length;

  const websiteCount = submissions.filter((s) => s.isLink || s.storageProvider === 'EXTERNAL_LINK' || (s.fileUrl && s.fileUrl.startsWith('http') && !s.fileUrl.includes('/files/'))).length;
  const documentCount = submissions.filter((s) => !(s.isLink || s.storageProvider === 'EXTERNAL_LINK' || (s.fileUrl && s.fileUrl.startsWith('http') && !s.fileUrl.includes('/files/')))).length;
  const approvedCount = submissions.filter((s) => s.adminApproved === true || s.adminApprovalStatus === 'APPROVED' || (s.approvalStatus === 'APPROVED' && s.adminApprovalStatus !== 'CHANGES_REQUESTED')).length;
  const changesCount = submissions.filter((s) => s.adminApprovalStatus === 'CHANGES_REQUESTED' || s.approvalStatus === 'CHANGES_REQUESTED').length;

  // Filtered List
  const filteredSubmissions = submissions.filter((item) => {
    const isWeb = item.isLink || item.storageProvider === 'EXTERNAL_LINK' || (item.fileUrl && item.fileUrl.startsWith('http') && !item.fileUrl.includes('/files/'));
    const isApproved = item.adminApproved === true || item.adminApprovalStatus === 'APPROVED' || (item.approvalStatus === 'APPROVED' && item.adminApprovalStatus !== 'CHANGES_REQUESTED');
    const isChanges = item.adminApprovalStatus === 'CHANGES_REQUESTED' || item.approvalStatus === 'CHANGES_REQUESTED';
    const isPending = !isApproved && !isChanges;

    // Tab filter
    if (activeTab === 'PENDING' && !isPending) return false;
    if (activeTab === 'WEBSITES' && !isWeb) return false;
    if (activeTab === 'DOCUMENTS' && isWeb) return false;
    if (activeTab === 'APPROVED' && !isApproved) return false;
    if (activeTab === 'CHANGES' && !isChanges) return false;

    // Dropdown filters
    if (projectFilter !== 'ALL' && item.project?._id !== projectFilter) return false;
    if (workerFilter !== 'ALL' && item.uploadedBy?._id !== workerFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.fileName?.toLowerCase().includes(q);
      const matchWorker = item.uploadedBy?.name?.toLowerCase().includes(q);
      const matchProject = item.project?.name?.toLowerCase().includes(q);
      const matchTask = item.task?.title?.toLowerCase().includes(q);
      const matchUrl = (item.linkUrl || item.fileUrl)?.toLowerCase().includes(q);
      return matchName || matchWorker || matchProject || matchTask || matchUrl;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800">
              Deliverables Gatekeeper
            </span>
            <span className="text-xs text-slate-400 font-medium">Quality Assurance & Release</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1 flex items-center gap-2">
            Worker Submissions & Reviews
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Dedicated review station for all deliverables, proof-of-work documents, and live website links uploaded by workers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchSubmissions(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-600' : 'text-slate-600'}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Submissions */}
        <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Work</span>
            <Layers className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-900">{totalCount}</span>
            <span className="text-[10px] text-slate-400">items</span>
          </div>
        </div>

        {/* Pending Review */}
        <div
          onClick={() => setActiveTab('PENDING')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
            activeTab === 'PENDING'
              ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/30'
              : 'bg-white border-slate-200/80 hover:border-amber-200 shadow-subtle'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Pending Review</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-amber-900">{pendingCount}</span>
            {pendingCount > 0 && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-200 text-amber-800 animate-pulse">
                Needs Review
              </span>
            )}
          </div>
        </div>

        {/* Live Websites / URLs */}
        <div
          onClick={() => setActiveTab('WEBSITES')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
            activeTab === 'WEBSITES'
              ? 'bg-cyan-50/70 border-cyan-300 ring-2 ring-cyan-400/30'
              : 'bg-white border-slate-200/80 hover:border-cyan-200 shadow-subtle'
          }`}
        >
          <div className="flex items-center justify-between text-cyan-700">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Websites & Links</span>
            <Globe className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-cyan-900">{websiteCount}</span>
            <span className="text-[10px] text-slate-400">live URLs</span>
          </div>
        </div>

        {/* Documents */}
        <div
          onClick={() => setActiveTab('DOCUMENTS')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
            activeTab === 'DOCUMENTS'
              ? 'bg-indigo-50/70 border-indigo-300 ring-2 ring-indigo-400/30'
              : 'bg-white border-slate-200/80 hover:border-indigo-200 shadow-subtle'
          }`}
        >
          <div className="flex items-center justify-between text-indigo-700">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Documents / Files</span>
            <FileText className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-indigo-900">{documentCount}</span>
            <span className="text-[10px] text-slate-400">files</span>
          </div>
        </div>

        {/* Approved */}
        <div
          onClick={() => setActiveTab('APPROVED')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
            activeTab === 'APPROVED'
              ? 'bg-emerald-50/70 border-emerald-300 ring-2 ring-emerald-400/30'
              : 'bg-white border-slate-200/80 hover:border-emerald-200 shadow-subtle'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Approved Work</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold text-emerald-900">{approvedCount}</span>
            <span className="text-[10px] text-emerald-600 font-medium">released</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-subtle space-y-3">
        {/* Top row: Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: 'ALL', label: 'All Submissions', count: totalCount },
            { id: 'PENDING', label: 'Pending Review', count: pendingCount, highlight: pendingCount > 0 },
            { id: 'WEBSITES', label: 'Websites & Links 🌐', count: websiteCount },
            { id: 'DOCUMENTS', label: 'Documents 📄', count: documentCount },
            { id: 'APPROVED', label: 'Approved ✅', count: approvedCount },
            { id: 'CHANGES', label: 'Revisions Requested ⚠️', count: changesCount }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === tab.id
                    ? 'bg-indigo-700 text-white'
                    : tab.highlight
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Bottom row: Search and Select Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by worker, task, project, or URL..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition"
            />
          </div>

          <div>
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white text-slate-700"
            >
              <option value="ALL">All Projects</option>
              {projectOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={workerFilter}
              onChange={(e) => setWorkerFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-slate-50 focus:bg-white text-slate-700"
            >
              <option value="ALL">All Workers / Submitters</option>
              {workerOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Submissions List */}
      {loading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <EmptyState
            icon={FileCheck}
            title={submissions.length === 0 ? 'No worker submissions yet.' : 'No submissions match your filters'}
            description={
              submissions.length === 0
                ? 'When workers submit task deliverables, attach documents, or provide live website URLs, they will appear here for your review and approval.'
                : 'Try adjusting your search query, status tab, or project filter to see more submissions.'
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSubmissions.map((item) => {
            const isWebLink =
              item.isLink ||
              item.storageProvider === 'EXTERNAL_LINK' ||
              (item.fileUrl && item.fileUrl.startsWith('http') && !item.fileUrl.includes('/files/'));

            const targetUrl = item.linkUrl || item.fileUrl;

            const isApproved =
              item.adminApproved === true ||
              item.adminApprovalStatus === 'APPROVED' ||
              (item.approvalStatus === 'APPROVED' && item.adminApprovalStatus !== 'CHANGES_REQUESTED');

            const isChangesRequested =
              item.adminApprovalStatus === 'CHANGES_REQUESTED' || item.approvalStatus === 'CHANGES_REQUESTED';

            const isPending = !isApproved && !isChangesRequested;

            return (
              <div
                key={item._id}
                className={`bg-white rounded-xl border p-4 sm:p-5 transition-all shadow-subtle hover:border-slate-300 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  isPending ? 'border-amber-200/90 bg-amber-50/10' : 'border-slate-200/90'
                }`}
              >
                {/* Left Section: Details */}
                <div className="space-y-2.5 min-w-0 flex-1">
                  {/* Top Bar: Submitter info and Status Badge */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Worker Info */}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                        {item.uploadedBy?.name?.charAt(0) || 'W'}
                      </div>
                      <span className="text-xs font-bold text-slate-800">
                        {item.uploadedBy?.name || 'Worker'}
                      </span>
                      {item.uploadedBy?.title && (
                        <span className="text-[10px] text-slate-400 hidden sm:inline">
                          ({item.uploadedBy.title})
                        </span>
                      )}
                    </div>

                    <span className="text-slate-300">•</span>

                    {/* Type Badge */}
                    {isWebLink ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200">
                        <Globe className="w-3 h-3 text-cyan-600" />
                        Website / URL
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        <FileText className="w-3 h-3 text-indigo-600" />
                        Document
                      </span>
                    )}

                    <span className="text-slate-300">•</span>

                    {/* Date */}
                    <span className="text-[10px] text-slate-400">
                      {new Date(item.createdAt || item.updatedAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>

                    {/* Approval Status Badge */}
                    {isApproved ? (
                      <span className="ml-auto sm:ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Approved
                      </span>
                    ) : isChangesRequested ? (
                      <span className="ml-auto sm:ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        Changes Requested
                      </span>
                    ) : (
                      <span className="ml-auto sm:ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                        <Clock className="w-3 h-3 text-amber-600" />
                        Pending Review
                      </span>
                    )}
                  </div>

                  {/* Title and URL/File Details */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      {item?.fileName || item?.title || 'Submitted Deliverable'}
                    </h3>

                    {/* Context: Project & Task badges */}
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      {item.project && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          <FolderKanban className="w-3 h-3 text-slate-400" />
                          Project: <strong className="text-slate-800">{item.project.name}</strong>
                        </span>
                      )}

                      {item.task && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          <CheckSquare className="w-3 h-3 text-slate-400" />
                          Task: <strong className="text-slate-800">{item.task.title}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Website link display or file size */}
                  {isWebLink && targetUrl && (
                    <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 min-w-0 font-mono text-[11px] text-indigo-600 truncate">
                        <ExternalLink className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="truncate">{targetUrl}</span>
                      </div>
                      <a
                        href={targetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 px-2.5 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition shadow-xs flex items-center gap-1"
                      >
                        <span>Open Website</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {/* Feedback or Notes Display if any */}
                  {item.revisionNotes && (
                    <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800">
                      <span className="font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        Revision Note for Worker:
                      </span>
                      <p className="mt-0.5 text-rose-700">{item.revisionNotes}</p>
                    </div>
                  )}
                </div>

                {/* Right Section: Action Buttons */}
                <div className="flex sm:flex-col md:flex-row items-center gap-2 shrink-0 md:self-center pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                  {/* Download / Open File Button */}
                  {!isWebLink && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleDownload(item)}
                      disabled={downloadingId === item._id}
                      className="flex items-center gap-1 text-xs"
                    >
                      {downloadingId === item._id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5 text-slate-600" />
                      )}
                      <span>Download / View</span>
                    </Button>
                  )}

                  {/* Request Revision Button */}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenRevisionModal(item)}
                    disabled={actionLoading}
                    className="flex items-center gap-1 text-xs text-rose-700 hover:bg-rose-50 hover:border-rose-300"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    <span>Request Changes</span>
                  </Button>

                  {/* Approve Button */}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleApprove(item)}
                    disabled={actionLoading || isApproved}
                    className={`flex items-center gap-1 text-xs ${
                      isApproved ? 'bg-emerald-600 hover:bg-emerald-600 cursor-default opacity-90' : ''
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isApproved ? 'Approved' : 'Approve Work'}</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Revisions Request Modal */}
      {changeModalOpen && targetItem && (
        <Modal
          isOpen={changeModalOpen}
          onClose={() => {
            setChangeModalOpen(false);
            setTargetItem(null);
          }}
          title="Request Deliverable Revisions"
        >
          <form onSubmit={handleSubmitRevision} className="space-y-4">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <span className="font-semibold">Reviewing: {targetItem?.fileName || targetItem?.title || 'Deliverable'}</span>
              <p className="mt-0.5 text-amber-700">
                Submitted by: <strong>{targetItem?.uploadedBy?.name || 'Worker'}</strong>. Provide clear instructions so the worker knows what adjustments to make.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Feedback & Required Changes <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={4}
                required
                placeholder="e.g. Please update the navigation font size, test mobile responsiveness, and re-upload."
                value={revisionReason}
                onChange={(e) => setRevisionReason(e.target.value)}
                className="w-full text-xs rounded-lg border border-slate-300 p-2.5 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                type="button"
                onClick={() => {
                  setChangeModalOpen(false);
                  setTargetItem(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" loading={actionLoading} variant="danger">
                Send Revision Request
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default AdminWorkReviews;

