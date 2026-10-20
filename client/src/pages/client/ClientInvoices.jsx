import React, { useState, useEffect } from 'react';
import { invoiceService } from '../../services/invoiceService';
import toast from 'react-hot-toast';
import {
  FileText,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  CreditCard,
  Send,
  HelpCircle
} from 'lucide-react';

const ClientInvoices = () => {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Submit offline payment modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [targetInvoice, setTargetInvoice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    paymentMethod: 'UPI',
    referenceId: '',
    notes: ''
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await invoiceService.getInvoices();
      if (res.success) {
        setInvoices(res.invoices || []);
        if (res.invoices?.length > 0 && !selectedInvoice) {
          setSelectedInvoice(res.invoices[0]);
        }
      }
    } catch (err) {
      toast.error('Failed to load your project invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDownloadPDF = async (inv) => {
    try {
      toast.loading(`Downloading ${inv.invoiceNumber} PDF...`, { id: 'pdf' });
      await invoiceService.downloadPDF(inv._id, inv.invoiceNumber);
      toast.success('Downloaded invoice PDF', { id: 'pdf' });
    } catch (err) {
      toast.error('Failed to download invoice PDF.', { id: 'pdf' });
    }
  };

  const handleSubmitPaymentRef = async (e) => {
    e.preventDefault();
    if (!targetInvoice || !paymentForm.referenceId.trim()) {
      return toast.error('Please enter the transaction / UTR reference number.');
    }

    try {
      setSubmitting(true);
      const res = await invoiceService.recordPayment(targetInvoice._id, paymentForm);
      if (res.success) {
        toast.success('Payment reference submitted successfully! Invoice updated.');
        setShowSubmitModal(false);
        setPaymentForm({ paymentMethod: 'UPI', referenceId: '', notes: '' });
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit payment reference.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Billing & Invoices
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review milestone invoices, download official tax receipts, and report wire/UPI transfers.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoices List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Project Invoices ({invoices.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[550px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold">
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-10 text-slate-400">
                      No invoices issued yet for your account.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr
                      key={inv._id}
                      onClick={() => setSelectedInvoice(inv)}
                      className={`cursor-pointer hover:bg-slate-50/80 transition ${selectedInvoice?._id === inv._id ? 'bg-blue-50/40' : ''
                        }`}
                    >
                      <td className="py-3 px-4 font-bold text-blue-600">{inv.invoiceNumber}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{inv.project?.name}</td>
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
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadPDF(inv);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg font-semibold text-[11px]"
                        >
                          <Download className="w-3.5 h-3.5" />
                          PDF
                        </button>

                        {inv.status !== 'PAID' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTargetInvoice(inv);
                              setShowSubmitModal(true);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold text-[11px]"
                          >
                            <Send className="w-3.5 h-3.5" />
                            Submit Ref
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoice Detail / Bank Payment Details */}
        <div className="space-y-4">
          {selectedInvoice ? (
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <img src="/logo.png" alt="GENFREX" className="h-7 w-auto object-contain" />
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${selectedInvoice.status === 'PAID'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                >
                  {selectedInvoice.status}
                </span>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">{selectedInvoice.invoiceNumber}</h3>
                <p className="text-xs text-slate-500">Project: {selectedInvoice.project?.name}</p>
                <div className="mt-2 text-2xl font-bold text-slate-900">
                  ₹ {Number(selectedInvoice.totalAmount).toLocaleString('en-IN')}
                </div>
                <p className="text-[11px] text-slate-400">Includes {selectedInvoice.taxRate}% GST</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-700">Line Items:</p>
                {selectedInvoice.items?.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs text-slate-600">
                    <span>
                      {item.description} (x{item.quantity})
                    </span>
                    <span className="font-semibold text-slate-900">
                      ₹ {Number(item.amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleDownloadPDF(selectedInvoice)}
                className="w-full inline-flex items-center justify-center gap-2 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl"
              >
                <Download className="w-4 h-4" /> Download Official PDF
              </button>
            </div>
          ) : null}

          {/* Bank Transfer Instructions Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Direct Payment Instructions
              </h3>
            </div>
            <p className="text-[11px] text-slate-300">
              Please transfer funds directly to GENFREX via NEFT, RTGS, or UPI:
            </p>

            <div className="bg-slate-800/80 p-3 rounded-xl space-y-1.5 text-xs text-slate-200 font-mono">
              <p>
                <span className="text-slate-400">Account:</span> GENFREX
              </p>
              <p>
                <span className="text-slate-400">A/C No:</span> 987654321098
              </p>
              <p>
                <span className="text-slate-400">IFSC:</span> HDFC0001234 (HDFC Bank)
              </p>
              <p>
                <span className="text-slate-400">UPI ID:</span> genfrex@hdfcbank
              </p>
            </div>

            <p className="text-[10px] text-slate-400 italic">
              After transferring, click "Submit Ref" on the invoice to provide your transaction/UTR number.
            </p>
          </div>
        </div>
      </div>

      {/* Submit Payment Ref Modal */}
      {showSubmitModal && targetInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md my-auto sm:my-8 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex shrink-0 items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                Submit Wire / UPI Transfer Reference
              </h3>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPaymentRef} className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
              <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-1">
                <p>
                  <strong>Invoice:</strong> {targetInvoice.invoiceNumber}
                </p>
                <p>
                  <strong>Total Amount:</strong> ₹{' '}
                  {Number(targetInvoice.totalAmount).toLocaleString('en-IN')}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none"
                >
                  <option value="UPI">Company UPI (GPay / PhonePe / Paytm)</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT / RTGS / IMPS)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transaction Reference / UTR Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR1234567890 or UPI Ref ID"
                  value={paymentForm.referenceId}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceId: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (Optional)</label>
                <textarea
                  rows="2"
                  placeholder="Transferred from HDFC Bank account..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50"
                >
                  {submitting ? 'Submitting...' : 'Submit Reference'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientInvoices;
