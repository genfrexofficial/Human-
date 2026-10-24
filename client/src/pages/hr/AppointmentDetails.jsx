import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { hrService } from '../../services/hrService';
import { useAuth } from '../../context/AuthContext';
import {
  FileText,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Send,
  Download,
  Printer,
  Edit,
  ArrowLeft,
  FileCheck,
  ShieldCheck,
  Mail,
  History,
  Check,
  RefreshCw,
  HardHat,
  KeyRound
} from 'lucide-react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Skeleton from '../../components/common/Skeleton';
import LetterPreviewModal from '../../components/hr/LetterPreviewModal';
import ApprovalModal from '../../components/hr/ApprovalModal';
import SendEmailModal from '../../components/hr/SendEmailModal';
import toast from 'react-hot-toast';

const AppointmentDetails = () => {
  const { id } = useParams();
  const { user, isAdmin, isHR } = useAuth();
  const navigate = useNavigate();

  const [appointment, setAppointment] = useState(null);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);

  // Modals
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [approvalMode, setApprovalMode] = useState('APPROVE');
  const [isSendEmailModalOpen, setIsSendEmailModalOpen] = useState(false);

  useEffect(() => {
    fetchAppointment();
  }, [id]);

  const fetchAppointment = async () => {
    try {
      setLoading(true);
      const res = await hrService.getAppointmentById(id);
      if (res.success) {
        setAppointment(res.appointment);
        setApprovals(res.approvals || []);
      }
    } catch (err) {
      toast.error('Failed to load appointment letter.');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    try {
      setGeneratingPDF(true);
      const res = await hrService.generatePDF(id);
      if (res.success) {
        toast.success('Official A4 PDF generated successfully.');
        fetchAppointment();
      }
    } catch (err) {
      toast.error('Failed to generate PDF.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleSubmitForApproval = async () => {
    try {
      const res = await hrService.submitForApproval(id, 'Submitted for Admin approval');
      if (res.success) {
        toast.success('Appointment letter submitted for Admin review.');
        fetchAppointment();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit for approval.');
    }
  };

  const handleAdminApprovalConfirm = async (comment) => {
    try {
      setApprovalLoading(true);
      if (approvalMode === 'APPROVE') {
        const res = await hrService.approveAppointment(id, comment);
        if (res.success) {
          toast.success('Appointment letter approved successfully.');
        }
      } else {
        const res = await hrService.rejectAppointment(id, comment);
        if (res.success) {
          toast.success('Appointment letter returned for revision.');
        }
      }
      setIsApprovalModalOpen(false);
      fetchAppointment();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Approval action failed.');
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleSendEmail = async (confirmResend) => {
    try {
      setSendingEmail(true);
      const res = await hrService.sendAppointment(id, confirmResend);
      if (res.success) {
        if (res.emailResult?.simulated) {
          toast.warning(
            '⚠️ Simulated Dispatch: Real email was not delivered because SMTP credentials are not configured in server/.env.',
            { autoClose: 7000 }
          );
        } else {
          toast.success(res.message || 'Appointment letter dispatched successfully to candidate inbox!');
        }
        setIsSendEmailModalOpen(false);
        fetchAppointment();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send appointment letter.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleUpdateAcceptance = async (status) => {
    try {
      const res = await hrService.updateAcceptanceStatus(id, status);
      if (res.success) {
        toast.success(`Candidate acceptance status marked as ${status}.`);
        fetchAppointment();
      }
    } catch (err) {
      toast.error('Failed to update acceptance status.');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 rounded" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="text-center py-16 text-slate-500">
        <p className="text-sm">Appointment record not found.</p>
        <Button variant="secondary" size="sm" onClick={() => navigate(-1)} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const candidate = appointment.candidateId || {};
  const isApproved = appointment.status === 'APPROVED';
  const isPending = appointment.status === 'PENDING_APPROVAL';
  const isDraft = appointment.status === 'DRAFT';
  const isRejected = appointment.status === 'REJECTED';
  const isSent = appointment.status === 'SENT';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900">{appointment.referenceNumber}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isApproved ? 'bg-emerald-100 text-emerald-800' :
                  isPending ? 'bg-amber-100 text-amber-800' :
                    isSent ? 'bg-blue-100 text-blue-800' :
                      isRejected ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                }`}>
                {appointment.status?.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {candidate.name} • {appointment.designation}
            </p>
          </div>
        </div>

        {/* Action Buttons Header */}
        <div className="flex flex-wrap items-center gap-2">
          {/* A4 Preview button */}
          <Button variant="secondary" size="sm" onClick={() => setIsPreviewOpen(true)}>
            <FileText className="w-3.5 h-3.5 mr-1" />
            <span>Full A4 Preview</span>
          </Button>

          {/* Download PDF button if generated */}
          {appointment.pdfUrl && (
            <a
              href={appointment.pdfUrl}
              target="_blank"
              rel="noreferrer"
              download
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold shadow-sm transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </a>
          )}

          {/* HR Actions */}
          {(isDraft || isRejected) && (
            <Button variant="primary" size="sm" onClick={handleSubmitForApproval}>
              <Send className="w-3.5 h-3.5 mr-1" />
              <span>Submit for Admin Approval</span>
            </Button>
          )}

          {/* If Approved, HR can generate PDF and Send */}
          {isApproved && (
            <>
              {!appointment.pdfUrl && (
                <Button variant="secondary" size="sm" onClick={handleGeneratePDF} loading={generatingPDF}>
                  <FileCheck className="w-3.5 h-3.5 mr-1" />
                  <span>Generate Final PDF</span>
                </Button>
              )}
              <Button variant="primary" size="sm" onClick={() => setIsSendEmailModalOpen(true)}>
                <Send className="w-3.5 h-3.5 mr-1" />
                <span>Send Letter to Candidate</span>
              </Button>
            </>
          )}

          {/* If Sent, HR can resend */}
          {isSent && (
            <Button variant="secondary" size="sm" onClick={() => setIsSendEmailModalOpen(true)}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
              <span>Resend Letter</span>
            </Button>
          )}

          {/* Admin Approval & Rejection buttons */}
          {isAdmin && isPending && (
            <>
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setApprovalMode('REJECT');
                  setIsApprovalModalOpen(true);
                }}
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                <span>Return / Reject</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setApprovalMode('APPROVE');
                  setIsApprovalModalOpen(true);
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                <span>Approve Letter</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status Callout Banners */}
      {isRejected && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-rose-900">Returned for Revision by Admin</p>
            <p className="text-rose-700 mt-0.5">
              Reason: <span className="font-semibold">"{appointment.rejectionReason}"</span>
            </p>
            <p className="text-rose-600 mt-1 text-[11px]">
              You can make required adjustments and resubmit this appointment letter for approval.
            </p>
          </div>
        </div>
      )}

      {isPending && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800">
            <p className="font-bold">Awaiting Admin Approval</p>
            <p className="text-amber-700 mt-0.5">
              Submitted on {new Date(appointment.submittedAt || appointment.createdAt).toLocaleString()}.
              The letter is locked against modifications while under review.
            </p>
          </div>
        </div>
      )}

      {isApproved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900">
              <p className="font-bold">Approved by Admin ({appointment.approvedBy?.name || 'Admin'})</p>
              <p className="text-emerald-700 mt-0.5">
                Approved on {new Date(appointment.approvedAt).toLocaleString()}.
                {appointment.approvalComment && ` "${appointment.approvalComment}"`}
              </p>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={() => setIsSendEmailModalOpen(true)}>
            <Send className="w-3.5 h-3.5 mr-1" />
            <span>Send to Candidate</span>
          </Button>
        </div>
      )}

      {isSent && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900">
              <p className="font-bold">Letter Sent to Candidate ({candidate.email})</p>
              <p className="text-blue-700 mt-0.5">
                Dispatched on {new Date(appointment.sentAt).toLocaleString()} via genfrexofficial@gmail.com.
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="font-semibold text-slate-700">Acceptance Status:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${appointment.acceptanceStatus === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-800' :
                    appointment.acceptanceStatus === 'DECLINED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                  {appointment.acceptanceStatus}
                </span>
                {appointment.acceptanceStatus === 'PENDING' && (
                  <div className="inline-flex gap-1 ml-2">
                    <button
                      onClick={() => handleUpdateAcceptance('ACCEPTED')}
                      className="px-2 py-0.5 rounded bg-emerald-600 text-white font-semibold text-[10px] hover:bg-emerald-700"
                    >
                      Mark Accepted
                    </button>
                    <button
                      onClick={() => handleUpdateAcceptance('DECLINED')}
                      className="px-2 py-0.5 rounded bg-rose-600 text-white font-semibold text-[10px] hover:bg-rose-700"
                    >
                      Mark Declined
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Employee Account Link / Setup Status */}
      {(appointment.EmployeeId || candidate.EmployeeId) ? (
        <div className="p-4 bg-emerald-50/80 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-sm">
              <HardHat className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <div className="flex items-center gap-2">
                <p className="font-bold text-emerald-950">Active Employee Workspace Linked</p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200/60 text-emerald-800">
                  Onboarded
                </span>
              </div>
              <p className="text-emerald-700 mt-0.5">
                Employee account active for <strong>{appointment.EmployeeId?.name || candidate.name}</strong> ({appointment.EmployeeId?.email || candidate.email}).
              </p>
            </div>
          </div>
          {isAdmin && (
            <Link
              to="/admin/Employees"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors shadow-sm self-start sm:self-center"
            >
              <HardHat className="w-3.5 h-3.5" />
              <span>View Employees Roster</span>
            </Link>
          )}
        </div>
      ) : (isApproved || isSent || appointment.status === 'ACCEPTED') && (
        <div className="p-4 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border border-blue-200/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm">
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="text-xs">
              <div className="flex items-center gap-2">
                <p className="font-bold text-blue-950">Approved Candidate Ready for Employee Setup</p>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                  Action Available
                </span>
              </div>
              <p className="text-blue-700 mt-0.5">
                Candidate is approved. Admin can configure their login email ID and initial password to activate their Employee workspace.
              </p>
            </div>
          </div>
          {isAdmin && (
            <Link
              to="/admin/Employees"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm transition-colors self-start sm:self-center"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Setup Employee in Admin</span>
            </Link>
          )}
        </div>
      )}

      {/* Main Grid: Details & Workflow History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Appointment Terms & Candidate */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="space-y-4">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Appointment Summary
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Position / Designation:</span>
                <span className="font-bold text-slate-900">{appointment.designation}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Department:</span>
                <span className="font-semibold text-slate-800">{appointment.department}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Employment Track:</span>
                <span className="font-semibold text-slate-800">{appointment.appointmentType}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Work Location:</span>
                <span className="font-semibold text-slate-800">{appointment.workLocation}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Date of Joining:</span>
                <span className="font-bold text-blue-600">
                  {new Date(appointment.joiningDate).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Offer Acceptance Deadline:</span>
                <span className="font-bold text-rose-600">
                  {new Date(appointment.acceptanceDeadline).toLocaleDateString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Stipend / Compensation:</span>
                <span className="font-bold text-emerald-700 text-sm">
                  ₹ {Number(appointment.compensation).toLocaleString('en-IN')} / {appointment.compensationFrequency}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Reporting Manager:</span>
                <span className="font-semibold text-slate-800">{appointment.reportingManager}</span>
              </div>
            </div>
          </Card>

          {/* Candidate Profile Details */}
          <Card className="space-y-3">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100">
              Candidate Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Candidate Name:</span>
                <span className="font-bold text-slate-900">{candidate.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Email Address:</span>
                <span className="font-semibold text-blue-600">{candidate.email}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Phone Number:</span>
                <span className="font-semibold text-slate-800">{candidate.phone}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Residential Address:</span>
                <span className="text-slate-700">{candidate.address || 'N/A'}</span>
              </div>
            </div>
          </Card>

          {/* Client & Project Context Card */}
          {(appointment.projectId || appointment.project || appointment.clientId || appointment.client) && (
            <Card className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                    Cross-Module
                  </span>
                  <span>ClientFlow Project Context</span>
                </h2>
                {(appointment.projectId?._id || appointment.projectId || appointment.project?._id || appointment.project) && (
                  <Link
                    to={`/admin/projects/${appointment.projectId?._id || appointment.projectId || appointment.project?._id || appointment.project}`}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                  >
                    <span>View Project</span> &rarr;
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Client:</span>
                  <span className="font-bold text-slate-900">
                    {appointment.clientId?.companyName || appointment.clientId?.name || appointment.client?.name || 'Internal'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Linked Project:</span>
                  <span className="font-bold text-slate-900">
                    {appointment.projectId?.name || appointment.project?.name || 'Internal GENFREX Project'}
                  </span>
                </div>
                {appointment.requirementId && (
                  <div>
                    <span className="text-slate-500 block text-[11px]">Requirement / Task:</span>
                    <span className="font-semibold text-slate-800">
                      {appointment.requirementId?.title || appointment.requirement?.title || 'Linked Requirement'}
                    </span>
                  </div>
                )}
                {appointment.EmployeeId && (
                  <div>
                    <span className="text-slate-500 block text-[11px]">Assigned Employee / Mentor:</span>
                    <span className="font-semibold text-slate-800">
                      {appointment.EmployeeId?.name || appointment.assignedEmployee?.name || 'Assigned Engineer'}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

        {/* Right Col: Timeline & Approval Trail */}
        <div className="space-y-6">
          <Card className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-slate-500" />
                <span>Approval Audit Trail</span>
              </h2>
            </div>

            <div className="space-y-3 text-xs">
              {approvals.length === 0 ? (
                <p className="text-slate-400 text-center py-4">No approval events logged yet.</p>
              ) : (
                approvals.map((appr, idx) => (
                  <div key={idx} className="relative pl-6 pb-2 border-l border-slate-200 last:border-l-0">
                    <span className={`absolute -left-1.5 top-0.5 w-3 h-3 rounded-full border-2 border-white ${appr.action === 'APPROVE' ? 'bg-emerald-600' :
                        appr.action === 'REJECT' ? 'bg-rose-600' : 'bg-blue-600'
                      }`} />
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{appr.action}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(appr.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      By {appr.reviewedBy?.name || appr.submittedBy?.name || 'System User'}
                    </p>
                    {appr.comments && (
                      <p className="text-[11px] text-slate-500 italic mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                        "{appr.comments}"
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* Email Dispatch History */}
          {appointment.emailHistory?.length > 0 && (
            <Card className="space-y-3">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-slate-500" />
                <span>Email Sending Log</span>
              </h2>
              <div className="space-y-2 text-xs">
                {appointment.emailHistory.map((log, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/80 text-[11px] space-y-1">
                    <div className="flex justify-between font-bold">
                      <span className="text-emerald-700">STATUS: {log.status}</span>
                      <span className="text-slate-400">{new Date(log.sentAt).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-600">To: {log.recipient}</p>
                    {log.providerMessageId && (
                      <p className="text-[10px] text-slate-400 font-mono truncate">ID: {log.providerMessageId}</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Modals */}
      <LetterPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        appointment={appointment}
        candidate={candidate}
      />

      <ApprovalModal
        isOpen={isApprovalModalOpen}
        onClose={() => setIsApprovalModalOpen(false)}
        mode={approvalMode}
        appointment={appointment}
        onConfirm={handleAdminApprovalConfirm}
        loading={approvalLoading}
      />

      <SendEmailModal
        isOpen={isSendEmailModalOpen}
        onClose={() => setIsSendEmailModalOpen(false)}
        appointment={appointment}
        onSend={handleSendEmail}
        loading={sendingEmail}
      />
    </div>
  );
};

export default AppointmentDetails;
