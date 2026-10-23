import React, { useRef } from 'react';
import {
  X,
  Printer,
  Download,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ShieldCheck,
  CreditCard,
  IndianRupee
} from 'lucide-react';

import { payrollService } from '../../services/payrollService';

// Number to words converter for Indian Rupees
function numberToWordsINR(amount) {
  if (!amount || isNaN(amount) || amount <= 0) return 'Zero';

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const twoDigits = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tensMultiple = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(num) {
    if (num < 10) return singleDigits[num];
    if (num >= 10 && num < 20) return twoDigits[num - 10];
    return tensMultiple[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + singleDigits[num % 10] : '');
  }

  function convertThreeDigits(num) {
    let str = '';
    if (Math.floor(num / 100) > 0) {
      str += singleDigits[Math.floor(num / 100)] + ' Hundred ';
    }
    const rem = num % 100;
    if (rem > 0) {
      str += convertTwoDigits(rem);
    }
    return str.trim();
  }

  const rounded = Math.round(amount);
  const crore = Math.floor(rounded / 10000000);
  const lakh = Math.floor((rounded % 10000000) / 100000);
  const thousand = Math.floor((rounded % 100000) / 1000);
  const hundreds = rounded % 1000;

  let res = '';
  if (crore > 0) res += convertThreeDigits(crore) + ' Crore ';
  if (lakh > 0) res += convertThreeDigits(lakh) + ' Lakh ';
  if (thousand > 0) res += convertThreeDigits(thousand) + ' Thousand ';
  if (hundreds > 0) res += convertThreeDigits(hundreds);

  return res.trim().replace(/\s+/g, ' ');
}

function formatDateDisplay(d) {
  if (!d) return '—';
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return String(d);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
}

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const PayslipModal = ({ isOpen, onClose, payroll }) => {
  const printRef = useRef();

  if (!isOpen || !payroll) return null;

  const handlePrint = () => {
    window.print();
  };

  const monthLabel = monthNames[(payroll.month || 1) - 1];
  const netInWords = numberToWordsINR(payroll.netSalary);

  const voucherDateFormatted = formatDateDisplay(payroll.voucherDate || payroll.createdAt || new Date());
  const joiningDateFormatted = formatDateDisplay(payroll.dateOfJoining || payroll.user?.createdAt || new Date());
  const payPeriodText = payroll.payPeriod || `01 ${monthLabel.slice(0, 3)} ${payroll.year} – ${payroll.totalDaysInMonth || 30} ${monthLabel.slice(0, 3)} ${payroll.year}`;

  const grossCompensation = payroll.grossSalary || payroll.baseSalary || 0;
  const totalDeductions = payroll.totalDeductions || 0;
  const netPayable = payroll.netSalary || (grossCompensation - totalDeductions);

  // Leave deduction title
  let leaveDeductionLabel = payroll.leaveDeductionNote;
  if (!leaveDeductionLabel && payroll.unpaidLeaves > 0) {
    leaveDeductionLabel = `Less: Deduction for ${payroll.unpaidLeaves} Days Leave`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Outer Card */}
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden my-6 border border-slate-200">
        {/* Top Control Bar (Hidden during Print) */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-blue-600/30 text-blue-400 rounded-lg">
              <Building2 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">Payment Voucher & Payslip</h3>
              <p className="text-xs text-slate-400">
                {payroll.user?.name} • Ref: {payroll.voucherNumber || payroll._id.slice(-8).toUpperCase()}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700 shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Preview</span>
            </button>
            <button
              onClick={async () => {
                try {
                  const safeRef = (payroll.voucherNumber || payroll._id).replace(/[^a-zA-Z0-9_-]/g, '_');
                  await payrollService.downloadPayslipPDF(payroll._id, `GENFREX_Voucher_${safeRef}.pdf`);
                } catch (e) {
                  window.print();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-sm"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Document Body matching exact PDF layout */}
        <div className="p-6 sm:p-12 bg-white text-slate-800 text-xs sm:text-[13px] print:p-0 max-h-[85vh] overflow-y-auto print:max-h-none print:overflow-visible">
          <div
            ref={printRef}
            className="mx-auto max-w-[760px] bg-white p-4 sm:p-10 border border-slate-300 rounded-lg print:border-none print:p-0 shadow-sm print:shadow-none"
            style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}
          >
            {/* Header: Centered Logo & Company Details */}
            <div className="text-center pb-4">
              <img
                src="/logo.png"
                alt="GENFREX"
                className="h-12 sm:h-14 w-auto object-contain mx-auto mb-1.5"
              />
              <p className="text-xs text-slate-600 font-medium">Remote Digital Services and Talent Ecosystem</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Karur – 639113</p>
            </div>

            {/* Document Title Banner */}
            <div className="border border-slate-300 bg-slate-50/70 py-2.5 px-4 text-center my-4">
              <h2 className="text-sm sm:text-base font-extrabold tracking-wide text-[#0B2545] uppercase">
                FREELANCE PAYMENT VOUCHER / PAYSLIP
              </h2>
            </div>

            {/* Metadata Table Grid (Bordered 2-column layout) */}
            <table className="w-full border-collapse border border-slate-300 text-xs my-4">
              <tbody>
                <tr>
                  <td className="w-1/4 p-2.5 font-bold text-slate-900 border border-slate-300 bg-slate-50/40">
                    Freelancer Name
                  </td>
                  <td className="w-1/4 p-2.5 font-semibold text-slate-800 border border-slate-300">
                    {payroll.user?.name || 'N/A'}
                  </td>
                  <td className="w-1/4 p-2.5 font-bold text-slate-900 border border-slate-300 bg-slate-50/40">
                    Voucher Date
                  </td>
                  <td className="w-1/4 p-2.5 text-slate-800 border border-slate-300">
                    {voucherDateFormatted}
                  </td>
                </tr>

                <tr>
                  <td className="p-2.5 font-bold text-slate-900 border border-slate-300 bg-slate-50/40">
                    Designation
                  </td>
                  <td className="p-2.5 text-slate-800 border border-slate-300">
                    {payroll.user?.title || 'SEO Analyst (Freelance)'}
                  </td>
                  <td className="p-2.5 font-bold text-slate-900 border border-slate-300 bg-slate-50/40">
                    Pay Period
                  </td>
                  <td className="p-2.5 text-slate-800 border border-slate-300 font-medium">
                    {payPeriodText}
                  </td>
                </tr>

                <tr>
                  <td className="p-2.5 font-bold text-slate-900 border border-slate-300 bg-slate-50/40">
                    Date of Joining
                  </td>
                  <td className="p-2.5 text-slate-800 border border-slate-300">
                    {joiningDateFormatted}
                  </td>
                  <td className="p-2.5 font-bold text-slate-900 border border-slate-300 bg-slate-50/40">
                    Working Mode
                  </td>
                  <td className="p-2.5 text-slate-800 border border-slate-300">
                    {payroll.workingMode || 'Remote (Freelance)'}
                  </td>
                </tr>

                <tr>
                  <td className="p-2.5 font-bold text-slate-900 border border-slate-300 bg-slate-50/40">
                    Engagement Type
                  </td>
                  <td className="p-2.5 text-slate-800 border border-slate-300">
                    {payroll.engagementType || 'Freelance – Monthly Retainer'}
                  </td>
                  <td className="p-2.5 font-bold text-slate-900 border border-slate-300 bg-slate-50/40">
                    Payment Cycle
                  </td>
                  <td className="p-2.5 text-slate-800 border border-slate-300">
                    Released after 30 days of placement
                  </td>
                </tr>

                <tr>
                  <td className="p-2.5 font-bold text-slate-900 border border-slate-300 bg-slate-50/40">
                    Payment Method
                  </td>
                  <td className="p-2.5 text-slate-800 border border-slate-300">
                    {payroll.paymentMethod === 'BANK_TRANSFER' ? 'Bank Transfer' : payroll.paymentMethod || 'Bank Transfer'}
                  </td>
                  <td className="p-2.5 font-bold text-slate-900 border border-slate-300 bg-slate-50/40">
                    Status / Ref
                  </td>
                  <td className="p-2.5 font-mono text-slate-800 border border-slate-300">
                    {payroll.paymentReference ? `UTR: ${payroll.paymentReference}` : payroll.status}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Particulars & Financial Breakdown Table */}
            <table className="w-full border-collapse border border-slate-300 text-xs mt-6">
              <thead>
                <tr className="bg-[#0B2545] text-white">
                  <th className="p-2.5 text-left font-bold border border-slate-400">Particulars</th>
                  <th className="p-2.5 text-right font-bold w-48 border border-slate-400">Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {/* Main Compensation */}
                <tr>
                  <td className="p-2.5 border border-slate-300 text-slate-800">
                    Monthly Retainer Compensation ({payPeriodText})
                  </td>
                  <td className="p-2.5 border border-slate-300 text-right font-mono font-medium text-slate-900">
                    {grossCompensation.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>

                {/* Leave Deductions / LOP if any */}
                {totalDeductions > 0 && (
                  <tr>
                    <td className="p-2.5 border border-slate-300 text-rose-700">
                      {leaveDeductionLabel || `Less: Deduction for ${payroll.unpaidLeaves || 0} Days Leave`}
                    </td>
                    <td className="p-2.5 border border-slate-300 text-right font-mono font-medium text-rose-700">
                      - {totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                )}

                {/* Additional bonuses if any */}
                {payroll.bonuses?.map((b, i) => (
                  <tr key={i}>
                    <td className="p-2.5 border border-slate-300 text-emerald-700 font-medium">
                      Add: {b.title}
                    </td>
                    <td className="p-2.5 border border-slate-300 text-right font-mono font-medium text-emerald-700">
                      + {Number(b.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}

                {/* Net Payable Row */}
                <tr className="bg-slate-50 font-bold border-t-2 border-slate-400">
                  <td className="p-2.5 border border-slate-300 text-slate-900 font-extrabold text-xs uppercase tracking-wide">
                    Net Payable Amount
                  </td>
                  <td className="p-2.5 border border-slate-300 text-right font-mono font-extrabold text-sm text-slate-900">
                    ₹{netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
            </table>

            {/* Notes Section */}
            <div className="mt-4 space-y-1.5 text-xs text-slate-700">
              <p>
                <strong className="text-slate-900">Amount in Words:</strong> Indian Rupees {netInWords} Only.
              </p>
              <p>
                <strong className="text-slate-900">Payment Cycle Note:</strong>{' '}
                {payroll.paymentCycleNote || 'Released after 30 days of placement as per engagement terms.'}
              </p>
            </div>

            {/* Signatures & Official Seal (Left: For GENFREX, Right: Official Stamp & Acknowledgement) */}
            <div className="grid grid-cols-2 gap-8 pt-8 mt-8 border-t border-slate-200 items-start">
              {/* Left Signatory */}
              <div>
                <p className="font-bold text-slate-900 text-xs">For GENFREX</p>
                
                {/* Official Signatory Box */}
                <div className="my-2.5 pl-1">
                  <p className="text-[11px] font-bold text-slate-700">For M/S GENFREX,</p>
                  <p
                    className="italic text-xl font-bold text-blue-900 tracking-wider -my-0.5 select-none"
                    style={{ fontFamily: 'Georgia, cursive, serif' }}
                  >
                    P.S. Dharshan
                  </p>
                  <p className="text-[11px] font-bold text-slate-700">Proprietor.</p>
                </div>

                <p className="font-bold text-slate-900 text-xs mt-3">Dharshan</p>
                <p className="text-[11px] text-slate-500">Founder & Authorized Signatory</p>
              </div>

              {/* Right: Round Official Seal & Freelancer Acknowledgement */}
              <div className="flex flex-col items-end text-right">
                {/* Official Circular Stamp */}
                <div className="mb-2">
                  <img
                    src="/company-seal.png"
                    alt="GENFREX Official Seal"
                    className="w-20 sm:w-24 h-auto object-contain select-none"
                  />
                </div>

                <div>
                  <p className="font-bold text-slate-900 text-xs">Freelancer Acknowledgement</p>
                  <p className="text-xs text-slate-800 font-semibold mt-2">
                    {payroll.user?.name || 'Freelancer'}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Designation: {payroll.user?.title || 'Freelance Specialist'} &nbsp;|&nbsp; Date: {payroll.status === 'PAID' && payroll.paymentDate ? formatDateDisplay(payroll.paymentDate) : '____________'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PayslipModal;
