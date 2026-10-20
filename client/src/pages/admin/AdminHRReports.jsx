import React, { useState, useEffect } from 'react';
import { hrService } from '../../services/hrService';
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  FileCheck,
  TrendingUp,
  History,
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Skeleton from '../../components/common/Skeleton';
import toast from 'react-hot-toast';

const AdminHRReports = () => {
  const [reports, setReports] = useState(null);
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const [reportsRes, statsRes, logsRes] = await Promise.all([
        hrService.getHRReports(),
        hrService.getHRStats(),
        hrService.getHRAuditLogs({ limit: 50 })
      ]);

      if (reportsRes.success) setReports(reportsRes.reports);
      if (statsRes.success) setStats(statsRes.stats);
      if (logsRes.success) setLogs(logsRes.logs);
    } catch (err) {
      toast.error('Failed to load HR reports.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!logs || logs.length === 0) {
      toast.error('No audit records to export.');
      return;
    }

    const headers = ['Timestamp', 'Actor', 'Action', 'Reference/Entity', 'Previous Status', 'New Status'];
    const rows = logs.map((log) => [
      new Date(log.timestamp).toISOString(),
      log.actorId?.name || 'Unknown',
      log.action,
      log.appointmentLetterId?.referenceNumber || log.candidateId?.name || 'N/A',
      log.previousStatus || '',
      log.newStatus || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GENFREX_HR_Audit_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800">
              Administrative Intelligence
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            HR Analytics & Compliance Reports
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time breakdown of offer pipelines, track distributions, and immutable approval logs
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={handleExportCSV}>
          <Download className="w-3.5 h-3.5 mr-1" />
          <span>Export Audit Trail (CSV)</span>
        </Button>
      </div>

      {/* Overview Stat Numbers */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Offers', val: stats?.totalAppointments || 0, color: 'text-slate-900' },
          { label: 'Pending Approvals', val: stats?.pendingApprovals || 0, color: 'text-amber-600' },
          { label: 'Approved', val: stats?.approvedLetters || 0, color: 'text-emerald-600' },
          { label: 'Dispatched', val: stats?.sentLetters || 0, color: 'text-blue-600' },
          { label: 'Accepted', val: stats?.acceptedOffers || 0, color: 'text-purple-600' },
          { label: 'Rejected', val: stats?.rejectedLetters || 0, color: 'text-rose-600' }
        ].map((card, i) => (
          <div key={i} className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-sm text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              {card.label}
            </span>
            <span className={`text-2xl font-black ${card.color}`}>
              {loading ? '-' : card.val}
            </span>
          </div>
        ))}
      </div>

      {/* Visual Aggregation Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* By Employment Track */}
        <Card className="space-y-3">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Offers by Employment Track</span>
          </h2>
          <div className="space-y-2 mt-2 text-xs">
            {reports?.typeBreakdown?.length === 0 ? (
              <p className="text-slate-400 text-center py-4">No data available.</p>
            ) : (
              reports?.typeBreakdown?.map((item) => (
                <div key={item._id} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="font-semibold text-slate-700">{item._id || 'Standard'}</span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-xs">
                    {item.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* By Designation */}
        <Card className="space-y-3">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-cyan-600" />
            <span>Top Appointed Positions</span>
          </h2>
          <div className="space-y-2 mt-2 text-xs">
            {reports?.designationBreakdown?.length === 0 ? (
              <p className="text-slate-400 text-center py-4">No data available.</p>
            ) : (
              reports?.designationBreakdown?.map((item) => (
                <div key={item._id} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="font-semibold text-slate-700 truncate mr-2">{item._id}</span>
                  <span className="px-2 py-0.5 rounded bg-cyan-100 text-cyan-800 font-bold text-xs shrink-0">
                    {item.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* By HR Creator */}
        <Card className="space-y-3">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            <span>Activity by HR Creator</span>
          </h2>
          <div className="space-y-2 mt-2 text-xs">
            {reports?.creatorBreakdown?.length === 0 ? (
              <p className="text-slate-400 text-center py-4">No data available.</p>
            ) : (
              reports?.creatorBreakdown?.map((item) => (
                <div key={item.creatorId} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                  <div>
                    <p className="font-semibold text-slate-800">{item.name}</p>
                    <p className="text-[10px] text-slate-400">{item.email}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-bold text-xs">
                    {item.count} letters
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Audit Logs Table */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Immutable HR & OfferFlow Audit Log
            </h2>
          </div>
          <span className="text-[10px] text-slate-400 font-semibold">50 Most Recent Events</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Actor</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Entity / Reference</th>
                <th className="py-2.5 px-4">Status Transition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="p-4">
                    <Skeleton className="h-8 w-full rounded" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400">
                    No audit records available.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-800">
                      {log.actorId?.name || 'System'}
                      <span className="block text-[9px] text-slate-400 font-normal">
                        {log.actorId?.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">
                      {log.appointmentLetterId?.referenceNumber || log.candidateId?.name || '—'}
                    </td>
                    <td className="py-2.5 px-4 text-[11px]">
                      {log.previousStatus && (
                        <span className="text-slate-400">{log.previousStatus} &rarr; </span>
                      )}
                      <span className="font-semibold text-slate-800">{log.newStatus || log.action}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default AdminHRReports;
