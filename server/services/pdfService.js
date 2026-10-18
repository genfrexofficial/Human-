const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function formatDisplayDate(val) {
  if (!val) return 'N/A';
  const d = new Date(val);
  if (isNaN(d.getTime())) return String(val);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getDate()).padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function sanitizeText(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/[^\x00-\x7F]/g, '');
}

function formatFrequency(freq) {
  if (!freq) return 'Month';
  if (freq === 'STIPEND_MONTHLY') return 'Month (Stipend)';
  if (freq === 'MONTHLY') return 'Month';
  if (freq === 'ANNUAL') return 'Per Annum';
  return freq.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Generates an executive 2-page Appointment Letter PDF that exactly matches
 * the layout, typography, color palette, and structure of the client-side
 * A4 Document Preview modal (LetterPreviewModal.jsx).
 */
const generateAppointmentPDF = async (appointment, candidate = {}, template = null) => {
  return new Promise((resolve, reject) => {
    try {
      const uploadsDir = path.join(__dirname, '../uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const safeRef = (appointment.referenceNumber || 'LETTER').replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `GENFREX_Appointment_${safeRef}_${Date.now()}.pdf`;
      const filePath = path.join(uploadsDir, fileName);

      // A4 page dimensions: 595.28 x 841.89 points
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 32, bottom: 32, left: 45, right: 45 },
        bufferPages: true,
        autoFirstPage: true
      });

      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // Colors exactly matching client LetterPreviewModal.jsx
      const cBlue600 = '#2563EB';       // Brand Blue Line / Header Logo (bg-blue-600)
      const cBlue700 = '#1D4ED8';       // Section Headings (text-blue-700)
      const cSlate900 = '#0F172A';      // Dark Headings & Values (text-slate-900)
      const cSlate700 = '#334155';      // Body Text (text-slate-700)
      const cSlate600 = '#475569';      // Secondary Text (text-slate-600)
      const cSlate500 = '#64748B';      // Muted Subtitles (text-slate-500)
      const cSlate400 = '#94A3B8';      // Card Labels & Headers (text-slate-400)
      const cBorder = '#E2E8F0';        // Border (border-slate-200)
      const cBgCard = '#F8FAFC';        // Card Background (bg-slate-50)
      const cEmerald700 = '#047857';    // Stipend highlight (text-emerald-700)
      const cRose600 = '#E11D48';       // Acceptance Deadline highlight (text-rose-600)
      const cWhite = '#FFFFFF';

      const leftMargin = 45;
      const contentWidth = 505;
      const rightEdge = leftMargin + contentWidth;

      const candidateName = sanitizeText(candidate.name || 'Candidate Name');
      const candidateEmail = sanitizeText(candidate.email || 'N/A');
      const candidatePhone = sanitizeText(candidate.phone || 'N/A');
      const candidateAddress = sanitizeText(candidate.address || 'Bengaluru, Karnataka, India');
      const designation = sanitizeText(appointment.designation || 'Web Developer');
      const department = sanitizeText(appointment.department || 'Engineering');
      const refNumber = sanitizeText(appointment.referenceNumber || 'GFX/HR/2026/0001');

      const appDateStr = formatDisplayDate(appointment.appointmentDate || Date.now());
      const joinDateStr = formatDisplayDate(appointment.joiningDate || Date.now());
      const deadlineDateStr = formatDisplayDate(appointment.acceptanceDeadline || Date.now());

      let curY = 32;

      // =========================================================================
      // PAGE 1: Header, Ref/Date, Candidate Box, Intro, 1.About, 2.Details, 3.Roles
      // =========================================================================

      // Top Blue Brand Line (matching w-full h-1 bg-blue-600 mb-6)
      doc.rect(leftMargin, curY, contentWidth, 3.5).fill(cBlue600);
      curY += 12;

      // Document Header
      const headerStartY = curY;
      const logoPath = path.join(__dirname, '../assets/logo.png');
      if (fs.existsSync(logoPath)) {
        try {
          doc.image(logoPath, leftMargin, curY - 2, { height: 38 });
        } catch {
          doc.fontSize(22).font('Helvetica-Bold').fillColor(cBlue600).text('GENFREX', leftMargin, curY);
          doc.fontSize(7.5).font('Helvetica-Bold').fillColor(cSlate400).text('DIGITAL SERVICES & TALENT ECOSYSTEM', leftMargin, curY + 23);
        }
      } else {
        doc.fontSize(22).font('Helvetica-Bold').fillColor(cBlue600).text('GENFREX', leftMargin, curY);
        doc.fontSize(7.5).font('Helvetica-Bold').fillColor(cSlate400).text('DIGITAL SERVICES & TALENT ECOSYSTEM', leftMargin, curY + 23);
      }

      // Right Header text (matching LetterPreviewModal.jsx header right)
      doc.fontSize(7.8).font('Helvetica-Bold').fillColor(cSlate700)
        .text('Official Sender: genfrexofficial@gmail.com', leftMargin, headerStartY, { width: contentWidth, align: 'right' });
      doc.fontSize(7.8).font('Helvetica').fillColor(cSlate500)
        .text('Web: www.genfrex.com', leftMargin, headerStartY + 11, { width: contentWidth, align: 'right' });
      doc.fontSize(7.8).font('Helvetica-Bold').fillColor(cBlue600)
        .text('Build. Grow. Connect.', leftMargin, headerStartY + 22, { width: contentWidth, align: 'right' });

      curY += 44;

      // Header bottom divider border
      doc.strokeColor(cBorder).lineWidth(0.75).moveTo(leftMargin, curY).lineTo(rightEdge, curY).stroke();
      curY += 10;

      // Title Banner (matching bg-slate-50 border border-slate-200 rounded-md py-2.5 text-center)
      const bannerH = 26;
      doc.roundedRect(leftMargin, curY, contentWidth, bannerH, 4).fill(cBgCard);
      doc.roundedRect(leftMargin, curY, contentWidth, bannerH, 4).strokeColor(cBorder).lineWidth(0.75).stroke();
      const letterTitle = sanitizeText(appointment.title || 'TRAINEE APPOINTMENT LETTER').toUpperCase();
      doc.fontSize(10).font('Helvetica-Bold').fillColor(cSlate900)
        .text(letterTitle, leftMargin, curY + 7.5, { width: contentWidth, align: 'center', characterSpacing: 0.5 });
      curY += bannerH + 11;

      // Ref No & Date bar (matching flex justify-between items-center text-xs font-semibold)
      doc.fontSize(8.2).font('Helvetica').fillColor(cSlate600).text('Ref No: ', leftMargin, curY, { continued: true });
      doc.font('Helvetica-Bold').fillColor(cSlate900).text(refNumber);
      doc.fontSize(8.2).font('Helvetica').fillColor(cSlate600).text(`Date: ${appDateStr}`, leftMargin, curY, { width: contentWidth, align: 'right' });
      curY += 15;

      // Appointed Candidate Card (matching bg-slate-50/80 border border-slate-200 rounded-lg p-3.5)
      const candBoxH = 54;
      doc.roundedRect(leftMargin, curY, contentWidth, candBoxH, 4).fill(cBgCard);
      doc.roundedRect(leftMargin, curY, contentWidth, candBoxH, 4).strokeColor(cBorder).lineWidth(0.75).stroke();

      doc.fontSize(7).font('Helvetica-Bold').fillColor(cSlate400)
        .text('APPOINTED CANDIDATE', leftMargin + 12, curY + 7, { characterSpacing: 0.5 });
      doc.fontSize(10.5).font('Helvetica-Bold').fillColor(cSlate900)
        .text(candidateName, leftMargin + 12, curY + 17);
      doc.fontSize(7.8).font('Helvetica').fillColor(cSlate600)
        .text(`Email: ${candidateEmail}   |   Phone: ${candidatePhone}   |   Address: ${candidateAddress}`, leftMargin + 12, curY + 34, { width: contentWidth - 24, lineBreak: false });

      curY += candBoxH + 11;

      // Salutation & Intro (matching LetterPreviewModal.jsx)
      doc.fontSize(8.8).font('Helvetica-Bold').fillColor(cSlate900).text(`Dear ${candidateName},`, leftMargin, curY);
      curY += 12;
      doc.fontSize(8.2).font('Helvetica').fillColor(cSlate700).lineGap(2.5)
        .text(
          `On behalf of GENFREX, we are pleased to issue this Trainee Appointment Letter appointing you as ${designation} in our ${department} department. We welcome you to our digital services and talent ecosystem and look forward to your valuable contributions.`,
          leftMargin,
          curY,
          { width: contentWidth, align: 'justify' }
        );
      curY = doc.y + 11;

      // 1. About GENFREX (matching text-xs font-bold text-blue-700)
      doc.fontSize(8.8).font('Helvetica-Bold').fillColor(cBlue700).text('1. ABOUT GENFREX', leftMargin, curY);
      curY = doc.y + 3.5;
      const aboutText = 'GENFREX is a next-generation digital services and talent ecosystem committed to empowering enterprises and innovators with cutting-edge engineering, scalable digital products, and high-impact talent solutions. We bridge industry demands with world-class technical capabilities to build robust, modern digital solutions.';
      doc.fontSize(8).font('Helvetica').fillColor(cSlate600).lineGap(2.5)
        .text(aboutText, leftMargin, curY, { width: contentWidth, align: 'justify' });
      curY = doc.y + 11;

      // 2. Appointment Details Grid (matching text-xs font-bold text-blue-700 and 8-row table)
      doc.fontSize(8.8).font('Helvetica-Bold').fillColor(cBlue700).text('2. APPOINTMENT DETAILS', leftMargin, curY);
      curY = doc.y + 4;

      const detailsRows = [
        { label: 'Designation / Role:', val: designation, isBold: true, color: cSlate900 },
        { label: 'Department:', val: department, isBold: false, color: cSlate900 },
        { label: 'Employment Type:', val: sanitizeText(appointment.appointmentType || 'TRAINEE'), isBold: false, color: cSlate900 },
        { label: 'Date of Joining:', val: joinDateStr, isBold: true, color: cBlue700 },
        { label: 'Work Location / Mode:', val: sanitizeText(appointment.workLocation || 'Remote / Hybrid'), isBold: false, color: cSlate900 },
        { label: 'Reporting Manager:', val: sanitizeText(appointment.reportingManager || 'Engineering Lead'), isBold: false, color: cSlate900 },
        {
          label: 'Stipend / Compensation:',
          val: `INR ${Number(appointment.compensation || 0).toLocaleString('en-IN')} / ${formatFrequency(appointment.compensationFrequency)}`,
          isBold: true,
          color: cEmerald700
        },
        { label: 'Acceptance Deadline:', val: deadlineDateStr, isBold: true, color: cRose600 }
      ];

      const rowH = 17;
      const colLabelW = 180;
      const colValW = contentWidth - colLabelW;

      // Table outer frame
      doc.roundedRect(leftMargin, curY, contentWidth, detailsRows.length * rowH, 3).strokeColor(cBorder).lineWidth(0.75).stroke();

      detailsRows.forEach((row, idx) => {
        const rowY = curY + idx * rowH;
        // Alternating background
        if (idx % 2 === 0) {
          doc.rect(leftMargin, rowY, contentWidth, rowH).fill(cBgCard);
        } else {
          doc.rect(leftMargin, rowY, contentWidth, rowH).fill(cWhite);
        }
        // Row divider
        if (idx < detailsRows.length - 1) {
          doc.strokeColor(cBorder).lineWidth(0.5).moveTo(leftMargin, rowY + rowH).lineTo(rightEdge, rowY + rowH).stroke();
        }

        // Label
        doc.fontSize(8).font('Helvetica').fillColor(cSlate600)
          .text(row.label, leftMargin + 10, rowY + 4.5, { width: colLabelW - 10, lineBreak: false });

        // Value
        doc.fontSize(8).font(row.isBold ? 'Helvetica-Bold' : 'Helvetica').fillColor(row.color)
          .text(row.val, leftMargin + colLabelW, rowY + 4.5, { width: colValW - 10, lineBreak: false });
      });

      curY += detailsRows.length * rowH + 13;

      // 3. Role & Responsibilities (matching text-xs font-bold text-blue-700)
      doc.fontSize(8.8).font('Helvetica-Bold').fillColor(cBlue700).text('3. ROLE & RESPONSIBILITIES', leftMargin, curY);
      curY = doc.y + 4;

      const rawResp = (appointment.responsibilities && appointment.responsibilities.length > 0)
        ? appointment.responsibilities
        : (template?.roleAndResponsibilities || [
          'Execute assigned technical tasks, modules, and software features in alignment with GENFREX quality standards.',
          'Collaborate proactively with technical leads, cross-functional engineering teams, and project stakeholders.',
          'Participate in sprint planning, architecture reviews, daily standups, and codebase documentation.',
          'Continuously enhance technical proficiencies and adhere to best development and security practices.'
        ]);

      rawResp.forEach((resp) => {
        const cleanResp = sanitizeText(resp);
        const bulletY = curY;
        doc.circle(leftMargin + 6, bulletY + 4.5, 2).fill(cBlue600);
        doc.fontSize(8).font('Helvetica').fillColor(cSlate600).lineGap(2)
          .text(cleanResp, leftMargin + 16, bulletY, { width: contentWidth - 18, align: 'justify' });
        curY = Math.max(bulletY + 14, doc.y + 3.5);
      });

      // =========================================================================
      // PAGE 2: 4. Terms, 5. Conf, 6. Conduct, 7. Acceptance, 3 Signatures Grid
      // =========================================================================
      doc.addPage();

      let p2Y = 32;

      // Top Blue Brand Line on Page 2
      doc.rect(leftMargin, p2Y, contentWidth, 3.5).fill(cBlue600);
      p2Y += 10;

      // Running Header on Page 2
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(cSlate400)
        .text('GENFREX  |  DIGITAL SERVICES & TALENT ECOSYSTEM  |  APPOINTMENT LETTER', leftMargin, p2Y)
        .text(`Ref: ${refNumber}`, 350, p2Y, { align: 'right', width: 200 });
      p2Y += 12;
      doc.strokeColor(cBorder).lineWidth(0.5).moveTo(leftMargin, p2Y).lineTo(rightEdge, p2Y).stroke();
      p2Y += 14;

      // 4. Terms & Conditions (matching text-xs font-bold text-blue-700 on Page 2)
      doc.fontSize(8.8).font('Helvetica-Bold').fillColor(cBlue700).text('4. TERMS & CONDITIONS', leftMargin, p2Y);
      p2Y = doc.y + 4;

      const rawTerms = (appointment.terms && appointment.terms.length > 0)
        ? appointment.terms
        : (template?.termsAndConditions || [
          'Appointment Status: This appointment is for training and professional development within the GENFREX ecosystem. Successful completion of the trainee period may lead to performance-based full-time consideration.',
          'Working Hours & Mode: The trainee shall adhere to the agreed schedule and mode of engagement specified in the appointment details.',
          'Compensation: A monthly stipend/compensation shall be disbursed in accordance with GENFREX payroll schedules, subject to statutory deductions where applicable.',
          'Notice Period: Either party may terminate this trainee engagement by providing a written notice of 15 days or compensation in lieu thereof during the trainee period.'
        ]);

      rawTerms.forEach((term, idx) => {
        const cleanTerm = sanitizeText(term);
        const termY = p2Y;
        doc.fontSize(8.2).font('Helvetica-Bold').fillColor(cSlate900).text(`${idx + 1}.`, leftMargin + 4, termY);
        doc.fontSize(8.2).font('Helvetica').fillColor(cSlate600).lineGap(2.5)
          .text(cleanTerm, leftMargin + 18, termY, { width: contentWidth - 20, align: 'justify' });
        p2Y = Math.max(termY + 16, doc.y + 5);
      });

      p2Y += 4;

      // 5. Confidentiality & Data Protection
      doc.fontSize(8.8).font('Helvetica-Bold').fillColor(cBlue700).text('5. CONFIDENTIALITY & DATA PROTECTION', leftMargin, p2Y);
      p2Y = doc.y + 3;
      const confDesc = sanitizeText(appointment.confidentialityTerms || template?.confidentialityClause ||
        'The Trainee acknowledges that during the tenure of this appointment, they may have access to confidential, proprietary, trade secret, client data, and intellectual property belonging to GENFREX or its affiliated clients. The Trainee agrees to hold all such information in strict confidence and shall not disclose, replicate, reverse-engineer, or misuse any proprietary data without prior written authorization from GENFREX. This obligation survives the termination or expiration of this appointment.'
      );
      doc.fontSize(8.2).font('Helvetica').fillColor(cSlate600).lineGap(2.5)
        .text(confDesc, leftMargin, p2Y, { width: contentWidth, align: 'justify' });
      p2Y = doc.y + 10;

      // 6. Professional Conduct & Compliance
      doc.fontSize(8.8).font('Helvetica-Bold').fillColor(cBlue700).text('6. PROFESSIONAL CONDUCT & COMPLIANCE', leftMargin, p2Y);
      p2Y = doc.y + 3;
      const conductDesc = sanitizeText(appointment.professionalConductTerms || template?.professionalConductClause ||
        'The Trainee agrees to maintain the highest standards of professional integrity, diligence, and ethical conduct. Non-compliance with company policies, willful misconduct, breach of client trust, or unauthorized external representation of GENFREX may result in immediate revocation of this appointment.'
      );
      doc.fontSize(8.2).font('Helvetica').fillColor(cSlate600).lineGap(2.5)
        .text(conductDesc, leftMargin, p2Y, { width: contentWidth, align: 'justify' });
      p2Y = doc.y + 10;

      // 7. Acceptance & Acknowledgement
      doc.fontSize(8.8).font('Helvetica-Bold').fillColor(cBlue700).text('7. ACCEPTANCE & ACKNOWLEDGEMENT', leftMargin, p2Y);
      p2Y = doc.y + 3;
      const acceptDesc = `Please signify your acceptance of this Trainee Appointment Letter and its incorporated terms by signing and returning the duplicate copy on or before ${deadlineDateStr}.`;
      doc.fontSize(8.2).font('Helvetica').fillColor(cSlate600).lineGap(2.5)
        .text(acceptDesc, leftMargin, p2Y, { width: contentWidth, align: 'justify' });
      p2Y = doc.y + 10;

      // Divider line before Signatories (matching pt-6 border-t border-slate-200 mt-8 in LetterPreviewModal.jsx)
      const dividerY = Math.max(p2Y + 8, 545);
      doc.strokeColor(cBorder).lineWidth(0.75).moveTo(leftMargin, dividerY).lineTo(rightEdge, dividerY).stroke();

      // Signatories & Candidate Acceptance Grid (matching 3-box grid in LetterPreviewModal.jsx)
      const sigCardY = dividerY + 16;
      const sigCardH = 145;
      const cardGap = 12;
      const cardW = (contentWidth - cardGap * 2) / 3;

      // Card 1: Authorized Signatory - P.S. Dharshan
      const x1 = leftMargin;
      doc.roundedRect(x1, sigCardY, cardW, sigCardH, 4).fill(cBgCard);
      doc.roundedRect(x1, sigCardY, cardW, sigCardH, 4).strokeColor(cBorder).lineWidth(0.75).stroke();
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(cSlate400).text('AUTHORIZED SIGNATORY', x1 + 12, sigCardY + 12);
      doc.strokeColor(cBorder).lineWidth(0.5).moveTo(x1 + 12, sigCardY + 80).lineTo(x1 + cardW - 12, sigCardY + 80).stroke();
      doc.fontSize(10).font('Helvetica-Bold').fillColor(cSlate900).text('P.S. Dharshan', x1 + 12, sigCardY + 92);
      doc.fontSize(8).font('Helvetica').fillColor(cSlate600).text('Founder', x1 + 12, sigCardY + 108);
      doc.fontSize(7.5).font('Helvetica').fillColor(cSlate400).text('GENFREX Ecosystem', x1 + 12, sigCardY + 122);

      // Card 2: Authorized Signatory - Deepak P
      const x2 = leftMargin + cardW + cardGap;
      doc.roundedRect(x2, sigCardY, cardW, sigCardH, 4).fill(cBgCard);
      doc.roundedRect(x2, sigCardY, cardW, sigCardH, 4).strokeColor(cBorder).lineWidth(0.75).stroke();
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(cSlate400).text('AUTHORIZED SIGNATORY', x2 + 12, sigCardY + 12);
      doc.strokeColor(cBorder).lineWidth(0.5).moveTo(x2 + 12, sigCardY + 80).lineTo(x2 + cardW - 12, sigCardY + 80).stroke();
      doc.fontSize(10).font('Helvetica-Bold').fillColor(cSlate900).text('Deepak P', x2 + 12, sigCardY + 92);
      doc.fontSize(8).font('Helvetica').fillColor(cSlate600).text('Chief Operating Officer', x2 + 12, sigCardY + 108);
      doc.fontSize(7.5).font('Helvetica').fillColor(cSlate400).text('GENFREX Ecosystem', x2 + 12, sigCardY + 122);

      // Card 3: Candidate Acceptance
      const x3 = leftMargin + (cardW + cardGap) * 2;
      doc.roundedRect(x3, sigCardY, cardW, sigCardH, 4).fill(cBgCard);
      doc.roundedRect(x3, sigCardY, cardW, sigCardH, 4).strokeColor(cBorder).lineWidth(0.75).stroke();
      doc.fontSize(7.5).font('Helvetica-Bold').fillColor(cSlate400).text('CANDIDATE ACCEPTANCE', x3 + 12, sigCardY + 12);
      doc.fontSize(7.5).font('Helvetica-Oblique').fillColor(cSlate500).text('Signature & Date', x3 + 12, sigCardY + 68);
      doc.save();
      doc.strokeColor(cSlate400).lineWidth(0.75).dash(2.5, { space: 2.5 })
        .moveTo(x3 + 12, sigCardY + 80).lineTo(x3 + cardW - 12, sigCardY + 80).stroke();
      doc.restore();
      doc.fontSize(10).font('Helvetica-Bold').fillColor(cSlate900).text(candidateName, x3 + 12, sigCardY + 92);
      doc.fontSize(7.5).font('Helvetica').fillColor(cSlate400).text('Appointed Trainee', x3 + 12, sigCardY + 108);

      // Document Footers on All Pages (matching LetterPreviewModal.jsx bottom footer)
      const range = doc.bufferedPageRange();
      const totalPages = range.count;

      for (let i = range.start; i < range.start + totalPages; i++) {
        doc.switchToPage(i);
        const originalBottomMargin = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;

        doc.strokeColor(cBorder).lineWidth(0.5).moveTo(leftMargin, 796).lineTo(rightEdge, 796).stroke();
        doc.fontSize(7.5).font('Helvetica').fillColor(cSlate400)
          .text('GENFREX Confidential  |  Internal Appointment Document', leftMargin, 804, { lineBreak: false });
        doc.text(`Page ${i + 1} of ${totalPages}`, 350, 804, { align: 'right', width: 200, lineBreak: false });

        doc.page.margins.bottom = originalBottomMargin;
      }

      doc.end();

      writeStream.on('finish', () => {
        resolve({
          filePath,
          fileName,
          fileUrl: `/uploads/${fileName}`,
          pageCount: totalPages
        });
      });

      writeStream.on('error', (err) => {
        reject(err);
      });
    } catch (err) {
      reject(err);
    }
  });
};

module.exports = {
  generateAppointmentPDF,
  sanitizeText,
  formatDisplayDate
};
