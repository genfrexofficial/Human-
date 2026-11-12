import React, { useRef } from 'react';
import { X, Printer, Download, CheckCircle2, Clock, AlertTriangle, ShieldCheck } from 'lucide-react';
import Button from '../common/Button';

const LetterPreviewModal = ({ isOpen, onClose, appointment, candidate }) => {
  const printRef = useRef(null);

  if (!isOpen || !appointment) return null;

  const cand = candidate || appointment.candidateId || {};
  const formattedAppDate = new Date(appointment.appointmentDate || Date.now()).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const formattedJoiningDate = new Date(appointment.joiningDate || Date.now()).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const formattedDeadline = new Date(appointment.acceptanceDeadline || Date.now()).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const formatFrequency = (freq) => {
    if (!freq || freq === 'UNPAID') return 'Unpaid';
    if (freq === 'STIPEND_MONTHLY') return 'Month (Stipend)';
    if (freq === 'MONTHLY') return 'Month';
    if (freq === 'ANNUAL') return 'Per Annum';
    return freq.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getTrackDisplay = (track) => {
    if (!track) return 'Trainee';
    const norm = String(track).toUpperCase().trim();
    if (norm === 'FULL_TIME' || norm === 'FULL TIME' || norm === 'FULL-TIME') return 'Full-time';
    if (norm === 'PART_TIME' || norm === 'PART TIME' || norm === 'PART-TIME') return 'Part-time';
    if (norm === 'INTERNSHIP' || norm === 'INTERN') return 'Internship';
    if (norm === 'TRAINEE') return 'Trainee';
    if (norm === 'CONTRACT') return 'Contract';
    if (norm === 'FREELANCE') return 'Freelance';
    return String(track).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const getTrackDefaultTerms = (track) => {
    const norm = String(track || '').toUpperCase().trim();
    if (norm === 'PART_TIME' || norm === 'PART TIME' || norm === 'PART-TIME') {
      return [
        'Appointment Status: This appointment is for a Part-Time professional role within the GENFREX ecosystem. The appointee will commit to agreed part-time hours and project deliverables.',
        'Working Hours & Schedule: The part-time schedule, weekly hours, and delivery milestones shall be aligned directly with the project supervisor and department head.',
        'Compensation: Pro-rated compensation shall be disbursed on a monthly schedule in accordance with GENFREX payroll policies, subject to statutory deductions.',
        'Notice Period: Either party may terminate this part-time engagement by providing a written notice of 15 days or compensation in lieu thereof.'
      ];
    }
    if (norm === 'FULL_TIME' || norm === 'FULL TIME' || norm === 'FULL-TIME') {
      return [
        'Appointment Status: This appointment is for a Full-Time permanent position within the GENFREX ecosystem, subject to standard probation and performance review.',
        'Working Hours & Mode: The employee shall adhere to standard full-time working hours (40 hours/week) and the agreed workplace policies specified in the appointment details.',
        'Compensation & Benefits: Compensation shall be disbursed on a monthly basis in accordance with GENFREX payroll policies, subject to applicable statutory deductions.',
        'Notice Period: Either party may terminate this full-time employment by providing 30 days written notice or gross salary in lieu thereof following probation.'
      ];
    }
    if (norm === 'INTERNSHIP' || norm === 'INTERN') {
      return [
        'Appointment Status: This appointment is for an educational and skill-development Internship at GENFREX. Successful completion will be acknowledged with an official Certificate of Internship.',
        'Working Hours & Schedule: The intern agrees to commit required hours weekly as specified by the project mentor and academic curriculum guidelines.',
        'Stipend & Learning: A monthly stipend shall be disbursed to support the internship tenure, contingent on active project participation and milestone completion.',
        'Notice Period: Either party may terminate this internship by providing a written notice of 7 days.'
      ];
    }
    return [
      'Appointment Status: This appointment is for training and professional development within the GENFREX ecosystem. Successful completion of the trainee period may lead to performance-based full-time consideration.',
      'Working Hours & Mode: The appointee shall adhere to the agreed schedule and mode of engagement specified in the appointment details.',
      'Compensation: A monthly stipend/compensation shall be disbursed in accordance with GENFREX payroll schedules, subject to statutory deductions where applicable.',
      'Notice Period: Either party may terminate this engagement by providing a written notice of 15 days or compensation in lieu thereof during the term.'
    ];
  };

  const trackLabel = appointment.employmentType || getTrackDisplay(appointment.appointmentType);
  const letterTitle = (
    appointment.title ||
    `${(appointment.appointmentType || 'TRAINEE').replace(/_/g, ' ')} APPOINTMENT LETTER`
  ).toUpperCase();
  const candidateRoleLabel = trackLabel === 'Internship' ? 'Appointed Intern' :
    trackLabel === 'Part-time' ? 'Appointed Part-Time Employee' :
    trackLabel === 'Full-time' ? 'Appointed Full-Time Employee' :
    `Appointed ${trackLabel}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto sm:my-8 max-h-[90vh] flex flex-col">
        {/* Modal Top Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 bg-slate-50 gap-3 shrink-0 no-print">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-sm text-slate-800">A4 Document Preview</span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
              {appointment.referenceNumber || 'DRAFT'}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${appointment.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                appointment.status === 'PENDING_APPROVAL' ? 'bg-amber-100 text-amber-800' :
                  appointment.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                    appointment.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
              }`}>
              {appointment.status?.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 text-xs font-semibold shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Letter</span>
            </button>
            {appointment.pdfUrl && (
              <a
                href={appointment.pdfUrl}
                target="_blank"
                rel="noreferrer"
                download
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Letter Document (A4 styling) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-12 bg-slate-100">
          <div
            ref={printRef}
            className="mx-auto max-w-[760px] bg-white shadow-xl rounded-lg p-4 sm:p-10 md:p-14 border border-slate-200 text-slate-800 text-xs sm:text-[13px] leading-relaxed print:shadow-none print:border-none print:p-0"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            {/* Top Blue Brand Line */}
            <div className="w-full h-1 bg-blue-600 mb-6" />

            {/* Document Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200 mb-6">
              <div>
                <h1 className="text-2xl font-black text-blue-600 tracking-tight">GENFREX</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  DIGITAL SERVICES & TALENT ECOSYSTEM
                </p>
              </div>
              <div className="text-right text-[10px] text-slate-500 space-y-0.5">
                <p className="font-semibold text-slate-700">Official Sender: hr@genfrex.com</p>
                <p>Web: www.genfrex.com</p>
                <p className="text-blue-600 font-medium">Build. Grow. Connect.</p>
              </div>
            </div>

            {/* Title Banner */}
            <div className="bg-slate-50 border border-slate-200 rounded-md py-2.5 text-center mb-6">
              <h2 className="text-sm font-black text-slate-900 tracking-wider uppercase">
                {letterTitle}
              </h2>
            </div>

            {/* Ref No & Date */}
            <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-6">
              <p>
                Ref No: <span className="font-bold text-slate-900">{appointment.referenceNumber || 'GFX/HR/2026/0001'}</span>
              </p>
              <p>
                Date: <span className="text-slate-900 font-bold">{formattedAppDate}</span>
              </p>
            </div>

            {/* Candidate Box */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-lg p-3.5 mb-6 text-xs">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Appointed Candidate</p>
              <p className="text-sm font-bold text-slate-900">{cand.name || 'Candidate Name'}</p>
              <p className="text-slate-600">Email: {cand.email || 'N/A'} | Phone: {cand.phone || 'N/A'}</p>
              <p className="text-slate-600">Address: {cand.address || 'Bengaluru, Karnataka, India'}</p>
            </div>

            {/* Salutation & Intro */}
            <div className="mb-6 space-y-2">
              <p className="font-bold text-slate-900">Dear {cand.name || 'Candidate'},</p>
              <p className="text-justify text-slate-700">
                On behalf of <strong>GENFREX</strong>, we are pleased to issue this {trackLabel} Appointment Letter appointing you as{' '}
                <strong>{appointment.designation}</strong> ({trackLabel}) in our <strong>{appointment.department}</strong> department. We welcome you to our digital services and talent ecosystem and look forward to your valuable contributions.
              </p>
            </div>

            {/* 1. About GENFREX */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1.5">
                1. About GENFREX
              </h3>
              <p className="text-justify text-slate-600 text-xs">
                GENFREX is a next-generation digital services and talent ecosystem committed to empowering enterprises and innovators with cutting-edge engineering, scalable digital products, and high-impact talent solutions. We bridge industry demands with world-class technical capabilities to build robust, modern digital solutions.
              </p>
            </div>

            {/* 2. Appointment Details Grid */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">
                2. Appointment Details
              </h3>
              <div className="border border-slate-200 rounded-md overflow-hidden text-xs">
                <div className="grid grid-cols-2 bg-slate-50 border-b border-slate-200 p-2">
                  <span className="font-semibold text-slate-600">Designation / Role:</span>
                  <span className="font-bold text-slate-900">{appointment.designation}</span>
                </div>
                <div className="grid grid-cols-2 p-2 border-b border-slate-200">
                  <span className="font-semibold text-slate-600">Department:</span>
                  <span className="text-slate-900">{appointment.department}</span>
                </div>
                <div className="grid grid-cols-2 bg-slate-50 border-b border-slate-200 p-2">
                  <span className="font-semibold text-slate-600">Employment Track:</span>
                  <span className="font-bold text-blue-700">{trackLabel}</span>
                </div>
                <div className="grid grid-cols-2 p-2 border-b border-slate-200">
                  <span className="font-semibold text-slate-600">Date of Joining:</span>
                  <span className="font-bold text-blue-700">{formattedJoiningDate}</span>
                </div>
                <div className="grid grid-cols-2 bg-slate-50 border-b border-slate-200 p-2">
                  <span className="font-semibold text-slate-600">Work Location / Mode:</span>
                  <span className="text-slate-900">{appointment.workLocation || 'Remote / Hybrid'}</span>
                </div>
                <div className="grid grid-cols-2 p-2 border-b border-slate-200">
                  <span className="font-semibold text-slate-600">Reporting Manager:</span>
                  <span className="text-slate-900">{appointment.reportingManager || 'Engineering Lead'}</span>
                </div>
                <div className="grid grid-cols-2 bg-slate-50 border-b border-slate-200 p-2">
                  <span className="font-semibold text-slate-600">Fixed Compensation / Stipend:</span>
                  {Number(appointment.compensation || 0) > 0 ? (
                    <span className="font-bold text-emerald-700">
                      ₹ {Number(appointment.compensation).toLocaleString('en-IN')} / {formatFrequency(appointment.compensationFrequency)}
                    </span>
                  ) : (
                    <span className="font-bold text-amber-700">Unpaid</span>
                  )}
                </div>
                {appointment.variablePay?.isEnabled && Number(appointment.variablePay?.amount || 0) > 0 && (
                  <div className="grid grid-cols-2 p-2 border-b border-slate-200">
                    <span className="font-semibold text-slate-600">Performance-based Pay:</span>
                    <span className="font-bold text-blue-700">
                      ₹ {Number(appointment.variablePay.amount).toLocaleString('en-IN')} / {appointment.variablePay.frequency || 'ANNUAL'}
                      {appointment.variablePay.criteria ? ` (${appointment.variablePay.criteria})` : ''}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-2 p-2">
                  <span className="font-semibold text-slate-600">Acceptance Deadline:</span>
                  <span className="font-bold text-rose-600">{formattedDeadline}</span>
                </div>
              </div>
            </div>

            {/* 3. Role & Responsibilities */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">
                3. Role & Responsibilities
              </h3>
              <ul className="list-disc pl-5 space-y-1 text-slate-600 text-xs">
                {(appointment.responsibilities && appointment.responsibilities.length > 0 ? appointment.responsibilities : [
                  'Execute assigned technical tasks, modules, and software features in alignment with GENFREX quality standards.',
                  'Collaborate proactively with technical leads, cross-functional engineering teams, and project stakeholders.',
                  'Participate in sprint planning, architecture reviews, daily standups, and codebase documentation.',
                  'Continuously enhance technical proficiencies and adhere to best development and security practices.'
                ]).map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>

            {/* 4. Terms & Conditions */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">
                4. Terms & Conditions
              </h3>
              <ol className="list-decimal pl-5 space-y-1.5 text-slate-600 text-xs text-justify">
                {(appointment.terms && appointment.terms.length > 0
                  ? appointment.terms
                  : getTrackDefaultTerms(appointment.appointmentType || appointment.employmentType)
                ).map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ol>
            </div>

            {/* 5. Confidentiality & Data Protection */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1.5">
                5. Confidentiality & Data Protection
              </h3>
              <p className="text-justify text-slate-600 text-xs">
                {appointment.confidentialityTerms ||
                  `The ${trackLabel} appointee acknowledges that during the tenure of this appointment, they may have access to confidential, proprietary, trade secret, client data, and intellectual property belonging to GENFREX or its affiliated clients. The appointee agrees to hold all such information in strict confidence and shall not disclose, replicate, reverse-engineer, or misuse any proprietary data without prior written authorization from GENFREX. This obligation survives the termination or expiration of this appointment.`}
              </p>
            </div>

            {/* 6. Professional Conduct & Compliance */}
            <div className="mb-6">
              <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1.5">
                6. Professional Conduct & Compliance
              </h3>
              <p className="text-justify text-slate-600 text-xs">
                {appointment.professionalConductTerms ||
                  `The ${trackLabel} appointee agrees to maintain the highest standards of professional integrity, diligence, and ethical conduct. Non-compliance with company policies, willful misconduct, breach of client trust, or unauthorized external representation of GENFREX may result in immediate revocation of this appointment.`}
              </p>
            </div>

            {/* 7. Acceptance */}
            <div className="mb-8">
              <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1.5">
                7. Acceptance & Acknowledgement
              </h3>
              <p className="text-justify text-slate-600 text-xs">
                Please signify your acceptance of this {trackLabel} Appointment Letter and its incorporated terms by signing and returning the duplicate copy on or before <strong>{formattedDeadline}</strong>.
              </p>
            </div>

            {/* Signatories & Official Seal Grid */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-slate-200 mt-8">
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 flex flex-col justify-between">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Authorized Signatory</p>
                <div className="h-11 flex items-center mb-1">
                  <img
                    src="/anisha-signature.png"
                    alt="Signature of Anisha"
                    className="h-10 object-contain select-none"
                  />
                </div>
                <div>
                  <div className="border-b border-slate-200 pb-1 mb-1.5" />
                  <p className="font-bold text-slate-900 text-xs">Anisha</p>
                  <p className="text-[11px] text-slate-600">People Operations</p>
                  <p className="text-[10px] text-slate-400">GENFREX Ecosystem</p>
                </div>
              </div>

              {/* Company Seal */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50/50 flex flex-col items-center justify-between text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-full text-left">Company Seal</p>
                <div className="my-1 flex items-center justify-center">
                  <img
                    src="/company-seal.png"
                    alt="GENFREX Official Seal"
                    className="w-16 h-16 object-contain drop-shadow-sm select-none"
                  />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-700 leading-tight">GENFREX</p>
                  <p className="text-[10px] text-slate-400">Karur • 639113</p>
                </div>
              </div>
            </div>

            {/* Candidate Acceptance - Moved Below */}
            <div className="mt-4 border border-slate-200 rounded-lg p-4 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Candidate Acceptance</p>
                  <p className="text-xs text-slate-600">
                    I accept the appointment and agree to abide by the terms and conditions outlined in this letter.
                  </p>
                  <p className="text-xs font-bold text-slate-900 mt-2">{cand.name || 'Candidate Name'}</p>
                  <p className="text-[10px] text-slate-400">{candidateRoleLabel}</p>
                </div>
                <div className="sm:w-56 text-right sm:text-center shrink-0">
                  <div className="border-b border-dashed border-slate-400 pb-1 mb-1 mt-4 sm:mt-6">
                    <span className="text-[11px] text-slate-500 italic">Signature & Date</span>
                  </div>
                  <p className="text-[10px] text-slate-400">Authorized Candidate Signature</p>
                </div>
              </div>
            </div>

            {/* Document Footer */}
            <div className="mt-10 pt-4 border-t border-slate-200 flex justify-between text-[10px] text-slate-400">
              <span>GENFREX Confidential — Internal Appointment Document</span>
              <span>Generated via GENFREX Unified Platform</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LetterPreviewModal;
