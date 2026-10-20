const Invoice = require('../models/Invoice');
const Project = require('../models/Project');
const User = require('../models/User');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// Helper to format currency
const formatCurrency = (amt, currency = 'INR') => {
  if (currency === 'INR') {
    return `Rs. ${Number(amt).toLocaleString('en-IN')}`;
  }
  return `${currency} ${Number(amt).toLocaleString()}`;
};

// @desc    Get all invoices (Admin gets all, Client gets own)
// @route   GET /api/invoices
// @access  Private
const getInvoices = async (req, res, next) => {
  try {
    const { status, project, client } = req.query;
    let query = {};

    if (req.user.role !== 'ADMIN' && req.user.role !== 'CLIENT') {
      return res.status(403).json({ success: false, message: 'Forbidden. Role not authorized to access invoices.' });
    }

    if (req.user.role === 'CLIENT') {
      query.client = req.user._id;
    } else {
      if (client) query.client = client;
    }

    if (project) query.project = project;
    if (status) query.status = status;

    const invoices = await Invoice.find(query)
      .populate('project', 'name client')
      .populate('client', 'name email companyName phone')
      .populate('milestone', 'title targetDate')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: invoices.length,
      invoices
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single invoice details
// @route   GET /api/invoices/:id
// @access  Private
const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('project', 'name client')
      .populate('client', 'name email companyName phone')
      .populate('milestone', 'title targetDate');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    if (req.user.role !== 'ADMIN' && req.user.role !== 'CLIENT') {
      return res.status(403).json({ success: false, message: 'Forbidden. Role not authorized to access invoices.' });
    }

    if (req.user.role === 'CLIENT' && invoice.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied to this invoice.' });
    }

    res.status(200).json({
      success: true,
      invoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new invoice
// @route   POST /api/invoices
// @access  Private (ADMIN)
const createInvoice = async (req, res, next) => {
  try {
    const { project, client, milestone, dueDate, items, taxRate = 18, bankDetails, notes } = req.body;

    if (!project || !client || !dueDate || !items || !items.length) {
      return res.status(400).json({
        success: false,
        message: 'Please provide project, client, due date, and at least one line item.'
      });
    }

    // Auto-generate invoice number: GFX-INV-YYYY-XXXX
    const year = new Date().getFullYear();
    const count = await Invoice.countDocuments();
    const invoiceNumber = `GFX-INV-${year}-${String(count + 1).padStart(4, '0')}`;

    // Calculate item amounts & subtotal
    let subtotal = 0;
    const computedItems = items.map(item => {
      const amt = Number(item.quantity || 1) * Number(item.rate || 0);
      subtotal += amt;
      return {
        description: item.description,
        quantity: Number(item.quantity || 1),
        rate: Number(item.rate || 0),
        amount: amt
      };
    });

    const taxAmount = parseFloat(((subtotal * Number(taxRate)) / 100).toFixed(2));
    const totalAmount = parseFloat((subtotal + taxAmount).toFixed(2));

    const invoice = new Invoice({
      invoiceNumber,
      project,
      client,
      milestone: milestone || undefined,
      dueDate: new Date(dueDate),
      items: computedItems,
      subtotal,
      taxRate: Number(taxRate),
      taxAmount,
      totalAmount,
      status: 'UNPAID',
      bankDetails: bankDetails || undefined,
      notes: notes || undefined
    });

    await invoice.save();
    const populated = await Invoice.findById(invoice._id).populate('project client milestone');

    res.status(201).json({
      success: true,
      message: 'Invoice generated successfully.',
      invoice: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Record an offline payment (Bank Transfer / UPI)
// @route   POST /api/invoices/:id/record-payment
// @access  Private (ADMIN or CLIENT)
const recordPayment = async (req, res, next) => {
  try {
    const { paymentMethod, referenceId, notes, paidAt } = req.body;
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    if (req.user.role !== 'ADMIN' && req.user.role !== 'CLIENT') {
      return res.status(403).json({ success: false, message: 'Forbidden. Only Admins and Clients can record payments.' });
    }

    if (req.user.role === 'CLIENT' && invoice.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized for this invoice.' });
    }

    invoice.status = 'PAID';
    invoice.paymentDetails = {
      paidAt: paidAt ? new Date(paidAt) : new Date(),
      paymentMethod: paymentMethod || 'BANK_TRANSFER',
      referenceId: referenceId || 'REF-' + Date.now(),
      notes: notes || '',
      recordedBy: req.user._id
    };

    await invoice.save();

    res.status(200).json({
      success: true,
      message: 'Payment recorded and invoice marked as PAID.',
      invoice
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete invoice (Admin only)
// @route   DELETE /api/invoices/:id
// @access  Private (ADMIN)
const deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    await Invoice.findByIdAndDelete(req.params.id);
    res.status(200).json({
      success: true,
      message: 'Invoice deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Generate and download professional Invoice PDF
// @route   GET /api/invoices/:id/pdf
// @access  Private (ADMIN, CLIENT)
const generateInvoicePDF = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('project', 'name')
      .populate('client', 'name email companyName phone');

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found.' });
    }

    if (req.user.role === 'CLIENT' && invoice.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=Invoice_${invoice.invoiceNumber}.pdf`);
      res.setHeader('Content-Length', pdfBuffer.length);
      res.status(200).send(pdfBuffer);
    });
    doc.on('error', (err) => {
      if (!res.headersSent) {
        next(err);
      }
    });

    // --- 1. Logo & Branding Header ---
    const logoPath = path.join(__dirname, '../assets/logo.png');
    const logoWidth = 125;
    const logoHeight = 54; // Aspect ratio ~2.33
    const logoX = 40;
    const logoY = 35;

    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, logoX, logoY, { width: logoWidth });
    } else {
      doc.fontSize(22).fillColor('#0052FF').text('GENFREX', logoX, logoY, { bold: true });
    }

    // Company info comfortably BELOW the logo (starts at y = 97)
    const companyTextY = logoY + logoHeight + 8;
    doc.fontSize(7.5).fillColor('#64748B').text('DIGITAL SERVICES & TALENT ECOSYSTEM', logoX, companyTextY, { bold: true });
    doc.fontSize(7.5).fillColor('#475569').text('56, Periyapudhur,Orathai Post , Karur -639113', logoX, companyTextY + 11);
    doc.fontSize(7.5).fillColor('#64748B').text('genfrexofficial@gmail.com | www.genfrex.com', logoX, companyTextY + 22);

    // Invoice Title on Right (Top alignment)
    doc.fontSize(22).fillColor('#0F172A').text('TAX INVOICE', 330, 35, { align: 'right', bold: true });
    doc.fontSize(10).fillColor('#0052FF').text(`Invoice #: ${invoice.invoiceNumber}`, 330, 62, { align: 'right', bold: true });
    doc.fontSize(8.5).fillColor('#475569').text(`Date of Issue: ${new Date(invoice.issueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 330, 78, { align: 'right' });
    doc.fontSize(8.5).fillColor('#475569').text(`Payment Due: ${new Date(invoice.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, 330, 92, { align: 'right' });

    // Status Banner Ribbon comfortably BELOW both header columns (y = 138)
    const ribbonY = 138;
    const isPaid = invoice.status === 'PAID';
    doc.roundedRect(40, ribbonY, 515, 26, 4).fill(isPaid ? '#ECFDF5' : '#FFFBEB');
    doc.fontSize(9).fillColor(isPaid ? '#047857' : '#B45309')
      .text(`PAYMENT STATUS: ${invoice.status.toUpperCase()}${isPaid && invoice.paymentDetails?.referenceId ? '   |   Transaction UTR: ' + invoice.paymentDetails.referenceId : '   |   Direct Wire/UPI Transfer Pending'}`, 52, ribbonY + 8, { bold: true });

    // Dual Info Cards (y = 175)
    const cardY = 175;
    const cardHeight = 70;

    // Billed to
    doc.roundedRect(40, cardY, 250, cardHeight, 4).fill('#F8FAFC');
    doc.fontSize(8).fillColor('#0052FF').text('BILLED TO (CLIENT)', 52, cardY + 8, { bold: true });
    doc.fontSize(10).fillColor('#0F172A').text(invoice.client?.companyName || invoice.client?.name || 'Valued Client', 52, cardY + 20, { bold: true });
    doc.fontSize(8).fillColor('#475569').text(`Attn: ${invoice.client?.name || 'Client Representative'}`, 52, cardY + 36);
    doc.text(`Email: ${invoice.client?.email || ''}  |  Ph: ${invoice.client?.phone || 'N/A'}`, 52, cardY + 49);

    // Project & Scope
    doc.roundedRect(305, cardY, 250, cardHeight, 4).fill('#F8FAFC');
    doc.fontSize(8).fillColor('#0052FF').text('PROJECT & BILLING SCOPE', 317, cardY + 8, { bold: true });
    doc.fontSize(10).fillColor('#0F172A').text(invoice.project?.name || 'Client Project', 317, cardY + 20, { bold: true });
    doc.fontSize(8).fillColor('#475569').text('Billing Cycle: Milestone Deliverable', 317, cardY + 36);
    doc.text('Currency: Indian Rupee (INR)', 317, cardY + 49);

    // --- Line Items Table Header (y = 260) ---
    let y = 260;
    doc.roundedRect(40, y, 515, 22, 3).fill('#0F172A');
    doc.fontSize(8.5).fillColor('#FFFFFF');
    doc.text('ITEM & DESCRIPTION', 50, y + 6, { bold: true });
    doc.text('QTY', 330, y + 6, { width: 40, align: 'center', bold: true });
    doc.text('RATE (INR)', 380, y + 6, { width: 70, align: 'right', bold: true });
    doc.text('AMOUNT (INR)', 460, y + 6, { width: 85, align: 'right', bold: true });

    y += 24;

    // --- Items ---
    invoice.items.forEach((item, idx) => {
      const bg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
      doc.rect(40, y, 515, 24).fill(bg);
      doc.fontSize(8.5).fillColor('#1E293B');
      doc.text(item.description, 50, y + 7, { width: 270 });
      doc.text(String(item.quantity), 330, y + 7, { width: 40, align: 'center' });
      doc.text(Number(item.rate).toLocaleString('en-IN'), 380, y + 7, { width: 70, align: 'right' });
      doc.text(Number(item.amount).toLocaleString('en-IN'), 460, y + 7, { width: 85, align: 'right' });
      y += 24;
    });

    y += 12;

    // --- Totals Box ---
    const totalsX = 350;
    doc.fontSize(9).fillColor('#475569').text('Subtotal:', totalsX, y, { width: 90, align: 'left' });
    doc.fontSize(9).fillColor('#0F172A').text(`Rs. ${Number(invoice.subtotal).toLocaleString('en-IN')}`, 450, y, { width: 95, align: 'right' });
    y += 16;

    doc.fontSize(9).fillColor('#475569').text(`GST / Tax (${invoice.taxRate}%):`, totalsX, y, { width: 90, align: 'left' });
    doc.fontSize(9).fillColor('#0F172A').text(`Rs. ${Number(invoice.taxAmount).toLocaleString('en-IN')}`, 450, y, { width: 95, align: 'right' });
    y += 18;

    doc.roundedRect(totalsX - 10, y - 2, 215, 26, 4).fill('#0052FF');
    doc.fontSize(10).fillColor('#FFFFFF').text('TOTAL DUE:', totalsX, y + 6, { width: 90, align: 'left', bold: true });
    doc.fontSize(10).fillColor('#FFFFFF').text(`Rs. ${Number(invoice.totalAmount).toLocaleString('en-IN')}`, 440, y + 6, { width: 95, align: 'right', bold: true });

    // --- Bottom Section ---
    const bottomY = Math.max(y + 36, 480);

    // Terms Box on left
    doc.roundedRect(40, bottomY, 320, 85, 4).fill('#F8FAFC');
    doc.fontSize(8).fillColor('#0052FF').text('TERMS & PAYMENT INSTRUCTIONS', 52, bottomY + 10, { bold: true });
    doc.fontSize(7.5).fillColor('#64748B').text('1. Payment is due within 15 days of invoice date.\n2. Invoices are payable via Direct Bank Wire Transfer / NEFT / RTGS / UPI.\n3. Please quote the invoice reference number in payment advice.', 52, bottomY + 25, { width: 295, lineGap: 3 });

    // Authorized Signatory Stamp Box on right
    const signX = 380;
    doc.roundedRect(signX, bottomY, 175, 85, 4).fill('#F8FAFC');
    doc.fontSize(8).fillColor('#475569').text('For GENFREX', signX + 10, bottomY + 10, { align: 'center', width: 155, bold: true });
    doc.fontSize(7.5).fillColor('#94A3B8').text('[ Digitally Certified Tax Invoice ]', signX + 10, bottomY + 45, { align: 'center', width: 155 });
    doc.fontSize(8).fillColor('#0F172A').text('Authorized Signatory', signX + 10, bottomY + 68, { align: 'center', width: 155, bold: true });

    // --- Footer Notes ---
    doc.fontSize(7.5).fillColor('#94A3B8').text(
      'This is a computer-generated tax invoice issued by GENFREX. No physical signature is required. Thank you for your partnership!',
      40,
      770,
      { align: 'center', width: 515 }
    );

    doc.end();
  } catch (error) {
    if (!res.headersSent) {
      next(error);
    }
  }
};

// @desc    Get Financial Overview & Analytics
// @route   GET /api/invoices/stats/overview
// @access  Private (ADMIN)
const getFinanceStats = async (req, res, next) => {
  try {
    const invoices = await Invoice.find();

    let totalInvoiced = 0;
    let totalCollected = 0;
    let totalPending = 0;
    let paidCount = 0;
    let unpaidCount = 0;

    invoices.forEach(inv => {
      totalInvoiced += (inv.totalAmount || 0);
      if (inv.status === 'PAID') {
        totalCollected += (inv.totalAmount || 0);
        paidCount++;
      } else {
        totalPending += (inv.totalAmount || 0);
        unpaidCount++;
      }
    });

    res.status(200).json({
      success: true,
      stats: {
        totalInvoiced: parseFloat(totalInvoiced.toFixed(2)),
        totalCollected: parseFloat(totalCollected.toFixed(2)),
        totalPending: parseFloat(totalPending.toFixed(2)),
        totalInvoices: invoices.length,
        paidCount,
        unpaidCount
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInvoices,
  getInvoiceById,
  createInvoice,
  recordPayment,
  deleteInvoice,
  generateInvoicePDF,
  getFinanceStats
};
