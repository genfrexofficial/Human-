import React, { useState, useEffect } from 'react';
import { invoiceService } from '../../services/invoiceService';
import { projectService } from '../../services/projectService';
import { userService } from '../../services/userService';
import toast from 'react-hot-toast';
import {
  FileText,
  Plus,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  IndianRupee,
  Search,
  Filter,
  Trash2,
  CreditCard,
  Building2,
  Calendar,
  Send,
  Eye
} from 'lucide-react';

const AdminInvoices = () => {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState({
    totalInvoiced: 0,
    totalCollected: 0,
    totalPending: 0,
    totalInvoices: 0
  });
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Invoice Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    project: '',
    client: '',
    dueDate: '',
    taxRate: 18,
    notes: 'Payment due within 15 days of issue.',
    items: [{ description: '', quantity: 1, rate: 0 }]
  });

  // Record Payment Modal State
  const [recordPaymentModalData, setRecordPaymentModalData] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: 'UPI',
    referenceId: '',
    notes: ''
  });
  const [recordingPayment, setRecordingPayment] = useState(false);
  const [previewInvoiceModalData, setPreviewInvoiceModalData] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [invRes, statsRes, projRes, clientRes] = await Promise.all([
        invoiceService.getInvoices(filterStatus ? { status: filterStatus } : {}).catch((e) => ({ success: false, invoices: [] })),
        invoiceService.getFinanceStats().catch((e) => ({ success: false, stats: {} })),
        projectService.getProjects().catch((e) => ({ success: false, projects: [] })),
        userService.getAllUsers({ role: 'CLIENT' }).catch((e) => ({ success: false, users: [] }))
      ]);

      if (invRes?.success) setInvoices(invRes.invoices || []);
      if (statsRes?.success) setStats(statsRes.stats || {});
      if (projRes?.success) setProjects(projRes.projects || []);
      if (clientRes?.success) setClients(clientRes.users || []);
    } catch (err) {
      console.error('Invoice fetch error:', err);
      toast.error('Failed to load financial invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  // Handle adding line item
  const handleAddItem = () => {
    setInvoiceForm({
      ...invoiceForm,
      items: [...invoiceForm.items, { description: '', quantity: 1, rate: 0 }]
    });
  };

  const handleRemoveItem = (index) => {
    if (invoiceForm.items.length === 1) return;
    const newItems = invoiceForm.items.filter((_, i) => i !== index);
    setInvoiceForm({ ...invoiceForm, items: newItems });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...invoiceForm.items];
    newItems[index][field] = value;
    setInvoiceForm({ ...invoiceForm, items: newItems });
  };

  // Calculate live modal total
  const modalSubtotal = invoiceForm.items.reduce(
    (sum, item) => sum + Number(item.quantity || 1) * Number(item.rate || 0),
    0
  );
  const modalTax = parseFloat(((modalSubtotal * Number(invoiceForm.taxRate || 18)) / 100).toFixed(2));
  const modalTotal = modalSubtotal + modalTax;

  const handleCreateInvoice = async (e) => {
    e.preventDefault();
    if (!invoiceForm.project || !invoiceForm.client || !invoiceForm.dueDate) {
      return toast.error('Please select project, client, and due date.');
    }
    if (invoiceForm.items.some((i) => !i.description.trim() || Number(i.rate) <= 0)) {
      return toast.error('Please enter valid descriptions and rates for all items.');
    }

    try {
      setCreating(true);
      const res = await invoiceService.createInvoice(invoiceForm);
      if (res.success) {
        toast.success(`Invoice ${res.invoice?.invoiceNumber} created successfully!`);
        setShowCreateModal(false);
        setInvoiceForm({
          project: '',
          client: '',
          dueDate: '',
          taxRate: 18,
          notes: 'Payment due within 15 days of issue.',
          items: [{ description: '', quantity: 1, rate: 0 }]
        });
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create invoice.');
    } finally {
      setCreating(false);
    }
  };

  const handleDownloadPDF = async (inv) => {
    try {
      toast.loading(`Downloading ${inv.invoiceNumber} PDF...`, { id: 'pdf' });
      await invoiceService.downloadPDF(inv._id, inv.invoiceNumber);
      toast.success('Downloaded invoice PDF', { id: 'pdf' });
    } catch (err) {
      toast.error('Failed to download invoice PDF.', { id: 'pdf' });
    }
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!recordPaymentModalData) return;
    try {
      setRecordingPayment(true);
      const res = await invoiceService.recordPayment(recordPaymentModalData._id, paymentForm);
      if (res.success) {
        toast.success(`Payment recorded! Invoice marked as PAID.`);
        setRecordPaymentModalData(null);
        setPaymentForm({ paymentMethod: 'UPI', referenceId: '', notes: '' });
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to record payment.');
    } finally {
      setRecordingPayment(false);
    }
  };

  const handleDeleteInvoice = async (id) => {
    if (!window.confirm('Are you sure you want to delete this invoice?')) return;
    try {
      const res = await invoiceService.deleteInvoice(id);
      if (res.success) {
        toast.success('Invoice deleted.');
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete invoice.');
    }
  };

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.project?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.client?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Finance & Invoicing Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise milestone invoicing, PDF generation, and offline payment tracking.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Invoice
        </button>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Invoiced</span>
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <FileText className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              ₹ {Number(stats.totalInvoiced || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">{stats.totalInvoices || 0} total invoices generated</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Collected</span>
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-600">
              ₹ {Number(stats.totalCollected || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Confirmed offline / UPI receipts</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Receivables</span>
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-600">
              ₹ {Number(stats.totalPending || 0).toLocaleString('en-IN')}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Awaiting client payment</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Payment Collection Rate</span>
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {stats.totalInvoiced > 0
                ? Math.round((stats.totalCollected / stats.totalInvoiced) * 100)
                : 100}
              %
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Collection efficiency</p>
          </div>
        </div>
      </div>

      {/* Filter and Invoices List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by invoice #, project, client..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-300 pl-9 pr-3 py-2 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs rounded-xl border border-slate-300 px-3 py-2 focus:outline-none"
            >
              <option value="">All Invoices</option>
              <option value="UNPAID">Unpaid Only</option>
              <option value="PAID">Paid Only</option>
              <option value="OVERDUE">Overdue Only</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold">
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Project & Client</th>
                <th className="py-3 px-4">Issue Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-10 text-slate-400">
                    No invoices matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-bold text-blue-600">{inv.invoiceNumber}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{inv.project?.name}</div>
                      <div className="text-[11px] text-slate-400">{inv.client?.name}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(inv.issueDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(inv.dueDate).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      ₹ {Number(inv.totalAmount).toLocaleString('en-IN')}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${inv.status === 'PAID'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : inv.status === 'OVERDUE'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                      >
                        {inv.status}
                      </span>
                      {inv.paymentDetails?.referenceId && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Ref: {inv.paymentDetails.referenceId}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right space-x-2">
                      <button
                        onClick={() => setPreviewInvoiceModalData(inv)}
                        title="Preview with Logo"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg font-semibold text-[11px]"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </button>

                      <button
                        onClick={() => handleDownloadPDF(inv)}
                        title="Download PDF"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-[11px]"
                      >
                        <Download className="w-3.5 h-3.5" />
                        PDF
                      </button>

                      {inv.status !== 'PAID' && (
                        <button
                          onClick={() => {
                            setRecordPaymentModalData(inv);
                            setPaymentForm({ paymentMethod: 'UPI', referenceId: '', notes: '' });
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg font-semibold text-[11px]"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Record Pay
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteInvoice(inv._id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded"
                        title="Delete Invoice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" /> Create New Invoice
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Project</label>
                  <select
                    required
                    value={invoiceForm.project}
                    onChange={(e) => {
                      const proj = projects.find((p) => p._id === e.target.value);
                      setInvoiceForm({
                        ...invoiceForm,
                        project: e.target.value,
                        client: proj?.client?._id || proj?.client || invoiceForm.client
                      });
                    }}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select Project</option>
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Client</label>
                  <select
                    required
                    value={invoiceForm.client}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, client: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Select Client</option>
                    {clients.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name} ({c.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">GST / Tax (%)</label>
                  <input
                    type="number"
                    value={invoiceForm.taxRate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, taxRate: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700">Line Items</label>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {invoiceForm.items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Description (e.g. Milestone 1 - Backend APIs)"
                        required
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                        className="flex-1 text-xs rounded-xl border border-slate-300 p-2 focus:outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Qty"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="w-16 text-xs rounded-xl border border-slate-300 p-2 text-center focus:outline-none"
                      />
                      <input
                        type="number"
                        placeholder="Rate (₹)"
                        min="0"
                        value={item.rate}
                        onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                        className="w-28 text-xs rounded-xl border border-slate-300 p-2 text-right focus:outline-none"
                      />
                      {invoiceForm.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Real-time Calculation Summary */}
              <div className="bg-slate-50 p-3.5 rounded-xl text-xs space-y-1 text-right">
                <p className="text-slate-600">
                  Subtotal: <strong className="text-slate-900">₹ {modalSubtotal.toLocaleString('en-IN')}</strong>
                </p>
                <p className="text-slate-600">
                  GST ({invoiceForm.taxRate}%): <strong className="text-slate-900">₹ {modalTax.toLocaleString('en-IN')}</strong>
                </p>
                <p className="text-sm font-bold text-blue-600 pt-1 border-t border-slate-200">
                  Total Payable: ₹ {modalTotal.toLocaleString('en-IN')}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Instructions</label>
                <textarea
                  rows="2"
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Generate & Issue Invoice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {recordPaymentModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Record Offline Payment
              </h3>
              <button
                onClick={() => setRecordPaymentModalData(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-xl text-xs space-y-1">
                <p>
                  <strong className="text-slate-700">Invoice:</strong> {recordPaymentModalData.invoiceNumber}
                </p>
                <p>
                  <strong className="text-slate-700">Client:</strong> {recordPaymentModalData.client?.name}
                </p>
                <p className="text-emerald-600 font-bold">
                  Amount Due: ₹ {Number(recordPaymentModalData.totalAmount).toLocaleString('en-IN')}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none"
                >
                  <option value="UPI">Company UPI (GPay / PhonePe)</option>
                  <option value="BANK_TRANSFER">Bank Wire / NEFT / RTGS</option>
                  <option value="CHEQUE">Cheque / Demand Draft</option>
                  <option value="CASH">Cash</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transaction / UTR Reference ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR202610134981"
                  value={paymentForm.referenceId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceId: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (Optional)</label>
                <textarea
                  rows="2"
                  placeholder="Confirmed in HDFC Current account..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRecordPaymentModalData(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordingPayment}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                >
                  {recordingPayment ? 'Recording...' : 'Mark as PAID'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Executive Invoice Preview Modal with Official Logo */}
      {previewInvoiceModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl my-8 overflow-hidden">
            {/* Modal Top Bar */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-bold">Tax Invoice: {previewInvoiceModalData.invoiceNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPDF(previewInvoiceModalData)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PDF
                </button>
                <button
                  onClick={() => setPreviewInvoiceModalData(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Document Sheet */}
            <div className="p-8 space-y-6 bg-white text-slate-800 text-xs">
              {/* Header with Official Logo */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 border-b border-slate-100">
                <div>
                  <img
                    src="/logo.png"
                    alt="GENFREX"
                    className="h-10 w-auto object-contain"
                  />
                  <p className="text-[10px] font-bold text-slate-500 mt-2 tracking-wider">
                    DIGITAL SERVICES & TALENT ECOSYSTEM
                  </p>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    56, Periyapudhur,Orathai Post , Karur -639113
                  </p>
                  <p className="text-[11px] text-slate-500">
                    genfrexofficial@gmail.com | www.genfrex.com
                  </p>
                </div>

                <div className="text-right">
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">TAX INVOICE</h2>
                  <p className="text-sm font-bold text-blue-600 mt-0.5">{previewInvoiceModalData.invoiceNumber}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Date: {new Date(previewInvoiceModalData.issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  <p className="text-xs text-slate-500">
                    Due: {new Date(previewInvoiceModalData.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              </div>

              {/* Status Ribbon */}
              <div className={`p-3 rounded-xl flex items-center justify-between ${previewInvoiceModalData.status === 'PAID' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}>
                <span className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Status: {previewInvoiceModalData.status}
                </span>
                {previewInvoiceModalData.paymentDetails?.referenceId && (
                  <span className="text-[11px] font-mono">UTR: {previewInvoiceModalData.paymentDetails.referenceId}</span>
                )}
              </div>

              {/* Dual Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">BILLED TO (CLIENT)</p>
                  <p className="text-sm font-bold text-slate-900">{previewInvoiceModalData.client?.companyName || previewInvoiceModalData.client?.name}</p>
                  <p className="text-slate-600">Attn: {previewInvoiceModalData.client?.name}</p>
                  <p className="text-slate-500">{previewInvoiceModalData.client?.email}</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">PROJECT SCOPE</p>
                  <p className="text-sm font-bold text-slate-900">{previewInvoiceModalData.project?.name}</p>
                  <p className="text-slate-600">Billing: Milestone Deliverable</p>
                  <p className="text-slate-500">Currency: Indian Rupee (INR)</p>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-900 text-white font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Item & Description</th>
                      <th className="py-2.5 px-4 text-center">Qty</th>
                      <th className="py-2.5 px-4 text-right">Rate (₹)</th>
                      <th className="py-2.5 px-4 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewInvoiceModalData.items?.map((item, idx) => (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                        <td className="py-2.5 px-4 font-medium text-slate-900">{item.description}</td>
                        <td className="py-2.5 px-4 text-center">{item.quantity}</td>
                        <td className="py-2.5 px-4 text-right">{Number(item.rate).toLocaleString('en-IN')}</td>
                        <td className="py-2.5 px-4 text-right font-semibold text-slate-900">{Number(item.amount).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-right">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-900">₹ {Number(previewInvoiceModalData.subtotal).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>GST ({previewInvoiceModalData.taxRate}%):</span>
                    <span className="font-semibold text-slate-900">₹ {Number(previewInvoiceModalData.taxAmount).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm">
                    <span>Total Due:</span>
                    <span>₹ {Number(previewInvoiceModalData.totalAmount).toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* Bank Details & Signatory */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                <div className="bg-slate-50 p-3.5 rounded-xl space-y-1 font-mono text-[11px] text-slate-700">
                  <p className="font-bold text-slate-900 font-sans">Payment Instructions:</p>
                  <p>A/C: {previewInvoiceModalData.bankDetails?.accountName || 'GENFREX'}</p>
                  <p>A/C No: {previewInvoiceModalData.bankDetails?.accountNumber || '987654321098'}</p>
                  <p>IFSC: {previewInvoiceModalData.bankDetails?.ifscCode || 'HDFC0001234'} ({previewInvoiceModalData.bankDetails?.bankName || 'HDFC Bank'})</p>
                  <p>UPI: {previewInvoiceModalData.bankDetails?.upiId || 'genfrex@hdfcbank'}</p>
                </div>

                <div className="flex flex-col justify-end items-end text-right p-3.5">
                  <p className="text-[11px] font-bold text-slate-700">For GENFREX</p>
                  <p className="text-[10px] text-slate-400 mt-6">[ Digitally Certified Tax Invoice ]</p>
                  <p className="text-xs font-bold text-slate-900 mt-1">Authorized Signatory</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInvoices;
