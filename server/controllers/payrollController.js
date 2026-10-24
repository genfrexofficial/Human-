const Payroll = require('../models/Payroll');
const SalaryStructure = require('../models/SalaryStructure');
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const AppointmentLetter = require('../models/AppointmentLetter');
const { sendNotification } = require('../services/notificationService');

/**
 * Generate or recalculate monthly payroll batch for active Employees
 */
const generateMonthlyPayroll = async (req, res, next) => {
  try {
    const { month, year, defaultWorkingDays = 26 } = req.body;

    const m = Number(month);
    const y = Number(year);

    if (!m || !y || m < 1 || m > 12) {
      return res.status(400).json({
        success: false,
        message: 'Valid month (1-12) and year are required.'
      });
    }

    const payrollCycle = `${y}-${String(m).padStart(2, '0')}`;
    const daysInMonth = new Date(y, m, 0).getDate();
    const workingDays = Number(defaultWorkingDays) || 26;

    // Get all active Employees
    const Employees = await User.find({
      role: 'Employee',
      isActive: true
    });

    if (!Employees.length) {
      return res.status(404).json({
        success: false,
        message: 'No active Employees found to generate payroll.'
      });
    }

    // Prefetch salary structures and appointment letters
    const structures = await SalaryStructure.find({
      user: { $in: Employees.map((w) => w._id) }
    });
    const structureMap = {};
    structures.forEach((st) => {
      structureMap[st.user.toString()] = st;
    });

    const appointmentLetters = await AppointmentLetter.find({
      EmployeeId: { $in: Employees.map((w) => w._id) },
      status: { $in: ['ACCEPTED', 'APPROVED', 'SENT'] }
    });
    const letterMap = {};
    appointmentLetters.forEach((lt) => {
      if (lt.EmployeeId) letterMap[lt.EmployeeId.toString()] = lt;
    });

    const datePattern = new RegExp(`^${y}-${String(m).padStart(2, '0')}`);

    const generatedPayrolls = [];

    for (const Employee of Employees) {
      const wId = Employee._id.toString();
      let struct = structureMap[wId];

      // Auto-bootstrap salary structure if missing using appointment letter or sensible base
      if (!struct) {
        const letter = letterMap[wId];
        const base = letter?.compensation || 25000;
        const hra = Math.round(base * 0.4); // Standard 40% HRA
        const conv = 1600;
        const pf = Math.round(base * 0.12); // Standard 12% PF
        const pt = 200;

        struct = await SalaryStructure.create({
          user: Employee._id,
          salaryType: letter?.compensationFrequency === 'STIPEND_MONTHLY' ? 'STIPEND' : 'MONTHLY',
          baseSalary: base,
          allowances: {
            hra,
            conveyance: conv,
            specialAllowance: 0,
            medicalAllowance: 1250,
            otherAllowance: 0
          },
          deductions: {
            pf,
            professionalTax: pt,
            tds: 0,
            esi: 0,
            otherDeduction: 0
          },
          bankDetails: {
            accountHolderName: Employee.name,
            accountNumber: 'XXXX' + Math.floor(1000 + Math.random() * 9000),
            bankName: 'HDFC Bank',
            ifscCode: 'HDFC0001234',
            panNumber: 'ABCDE' + Math.floor(1000 + Math.random() * 9000) + 'F',
            upiId: `${Employee.email.split('@')[0]}@okhdfcbank`
          }
        });
      }

      // Fetch attendance in target month
      const attendanceList = await Attendance.find({
        user: Employee._id,
        date: { $regex: datePattern }
      });

      let presentCount = 0;
      let halfDayCount = 0;

      attendanceList.forEach((att) => {
        if (att.status === 'PRESENT') presentCount += 1;
        else if (att.status === 'HALF_DAY') halfDayCount += 1;
      });

      // Approved leaves in this month
      const monthStart = new Date(y, m - 1, 1);
      const monthEnd = new Date(y, m, 0, 23, 59, 59);

      const approvedLeaves = await LeaveRequest.find({
        user: Employee._id,
        status: 'APPROVED',
        startDate: { $lte: monthEnd },
        endDate: { $gte: monthStart }
      });

      let paidLeaves = 0;
      let unpaidLeavesFromRequest = 0;

      approvedLeaves.forEach((lv) => {
        if (lv.leaveType === 'UNPAID') {
          unpaidLeavesFromRequest += lv.totalDays;
        } else {
          paidLeaves += lv.totalDays;
        }
      });

      // If the attendance records are empty (e.g. for demo or fresh month), assume full working days
      let payableDays = presentCount + halfDayCount * 0.5 + paidLeaves;
      let unpaidLeaves = 0;

      if (attendanceList.length === 0) {
        // Default to full working days so the demo slip is ready
        presentCount = workingDays;
        payableDays = workingDays;
        unpaidLeaves = 0;
      } else {
        unpaidLeaves = Math.max(0, workingDays - payableDays) + unpaidLeavesFromRequest;
      }

      // Calculations
      const baseSalary = struct.baseSalary || 0;
      const allowances = struct.allowances || {};
      const totalAllowances =
        (allowances.hra || 0) +
        (allowances.conveyance || 0) +
        (allowances.specialAllowance || 0) +
        (allowances.medicalAllowance || 0) +
        (allowances.otherAllowance || 0);

      const grossSalary = baseSalary + totalAllowances;
      const perDayRate = workingDays > 0 ? Math.round((grossSalary / workingDays) * 100) / 100 : 0;
      const lopDeduction = Math.round(unpaidLeaves * perDayRate);

      const standardDeductions = struct.deductions || {};
      const totalStandardDeductions =
        (standardDeductions.pf || 0) +
        (standardDeductions.professionalTax || 0) +
        (standardDeductions.tds || 0) +
        (standardDeductions.esi || 0) +
        (standardDeductions.otherDeduction || 0);

      // Check if existing record already has custom bonuses or deductions
      const existingRecord = await Payroll.findOne({
        user: Employee._id,
        month: m,
        year: y
      });

      let bonuses = existingRecord ? existingRecord.bonuses : [];
      let totalBonuses = bonuses.reduce((acc, b) => acc + (b.amount || 0), 0);

      let customDeductions = existingRecord ? existingRecord.customDeductions : [];
      let totalCustomDeductions = customDeductions.reduce((acc, d) => acc + (d.amount || 0), 0);

      const totalDeductions = lopDeduction + totalStandardDeductions + totalCustomDeductions;
      const netSalary = Math.max(0, Math.round(grossSalary - totalDeductions + totalBonuses));

      // Format Pay Period string & Voucher metadata matching GENFREX voucher PDF
      const monthAbbr = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const payPeriod = `01 ${monthAbbr[m - 1]} ${y} – ${daysInMonth} ${monthAbbr[m - 1]} ${y}`;
      const voucherDate = new Date(y, m - 1, Math.min(28, daysInMonth));
      const voucherNumber = `GFX-PV-${y}-${String(m).padStart(2, '0')}-${Employee._id.toString().slice(-4).toUpperCase()}`;

      // Extract absent dates from attendance if available
      const leaveDates = [];
      attendanceList.forEach((att) => {
        if (att.status === 'ABSENT' || att.status === 'ON_LEAVE') {
          const parts = att.date.split('-');
          if (parts.length === 3) {
            leaveDates.push(`${parseInt(parts[2], 10)} ${monthAbbr[parseInt(parts[1], 10) - 1]}`);
          }
        }
      });

      let leaveDeductionNote = '';
      if (unpaidLeaves > 0) {
        if (leaveDates.length > 0) {
          leaveDeductionNote = `Less: Deduction for ${unpaidLeaves} Days Leave (${leaveDates.slice(0, 4).join(', ')} ${y})`;
        } else {
          leaveDeductionNote = `Less: Deduction for ${unpaidLeaves} Days Leave`;
        }
      }

      const payrollData = {
        user: Employee._id,
        salaryStructure: struct._id,
        month: m,
        year: y,
        payrollCycle,
        voucherNumber: existingRecord?.voucherNumber || voucherNumber,
        voucherDate: existingRecord?.voucherDate || voucherDate,
        payPeriod: existingRecord?.payPeriod || payPeriod,
        engagementType: existingRecord?.engagementType || struct.engagementType || 'Freelance – Monthly Retainer',
        workingMode: existingRecord?.workingMode || struct.workingMode || 'Remote (Freelance)',
        paymentCycleNote: existingRecord?.paymentCycleNote || struct.paymentCycleNote || 'Released after 30 days of placement as per engagement terms.',
        dateOfJoining: struct.dateOfJoining || letterMap[wId]?.joiningDate || Employee.createdAt || new Date(),
        leaveDates,
        leaveDeductionNote: existingRecord?.leaveDeductionNote || leaveDeductionNote,

        totalDaysInMonth: daysInMonth,
        workingDays,
        presentDays: presentCount,
        halfDays: halfDayCount,
        paidLeaves,
        unpaidLeaves,
        payableDays,

        baseSalary,
        allowances,
        totalAllowances,
        grossSalary,

        perDayRate,
        lopDeduction,
        standardDeductions,
        totalStandardDeductions,

        bonuses,
        totalBonuses,
        customDeductions,
        totalCustomDeductions,

        totalDeductions,
        netSalary,

        bankDetails: {
          accountHolderName: struct.bankDetails?.accountHolderName || Employee.name,
          accountNumber: struct.bankDetails?.accountNumber || '',
          bankName: struct.bankDetails?.bankName || '',
          ifscCode: struct.bankDetails?.ifscCode || '',
          panNumber: struct.bankDetails?.panNumber || '',
          upiId: struct.bankDetails?.upiId || ''
        },
        status: existingRecord?.status === 'PAID' ? 'PAID' : 'DRAFT',
        generatedBy: req.user._id
      };

      const updatedRecord = await Payroll.findOneAndUpdate(
        { user: Employee._id, month: m, year: y },
        payrollData,
        { upsert: true, new: true, runValidators: true }
      ).populate('user', 'name email role title avatar');

      generatedPayrolls.push(updatedRecord);
    }

    res.status(200).json({
      success: true,
      message: `Payroll cycle ${payrollCycle} generated successfully for ${generatedPayrolls.length} Employees.`,
      count: generatedPayrolls.length,
      data: generatedPayrolls
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payroll slips with optional filters
 */
const getPayrolls = async (req, res, next) => {
  try {
    const { month, year, status, userId, search } = req.query;
    const filter = {};

    if (month) filter.month = Number(month);
    if (year) filter.year = Number(year);
    if (status && status !== 'ALL') filter.status = status;
    if (userId) filter.user = userId;

    let query = Payroll.find(filter)
      .populate('user', 'name email role title avatar companyName phone')
      .populate('approvedBy', 'name email')
      .populate('paidBy', 'name email')
      .populate('generatedBy', 'name email')
      .sort({ createdAt: -1 });

    const records = await query;

    // Filter by search query if present
    let filteredRecords = records;
    if (search) {
      const s = search.toLowerCase();
      filteredRecords = records.filter(
        (rec) =>
          rec.user?.name?.toLowerCase().includes(s) ||
          rec.user?.email?.toLowerCase().includes(s) ||
          rec.user?.title?.toLowerCase().includes(s)
      );
    }

    res.status(200).json({
      success: true,
      count: filteredRecords.length,
      data: filteredRecords
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get payroll high-level statistics for dashboard widgets
 */
const getPayrollStats = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    const filter = {};

    const targetMonth = month ? Number(month) : new Date().getMonth() + 1;
    const targetYear = year ? Number(year) : new Date().getFullYear();

    filter.month = targetMonth;
    filter.year = targetYear;

    const records = await Payroll.find(filter);

    let totalGross = 0;
    let totalNetPayable = 0;
    let totalDisbursed = 0;
    let totalPending = 0;

    let draftCount = 0;
    let pendingApprovalCount = 0;
    let approvedCount = 0;
    let paidCount = 0;

    records.forEach((rec) => {
      totalGross += rec.grossSalary || 0;
      totalNetPayable += rec.netSalary || 0;

      if (rec.status === 'PAID') {
        totalDisbursed += rec.netSalary || 0;
        paidCount++;
      } else {
        totalPending += rec.netSalary || 0;
        if (rec.status === 'DRAFT') draftCount++;
        else if (rec.status === 'PENDING_APPROVAL') pendingApprovalCount++;
        else if (rec.status === 'APPROVED') approvedCount++;
      }
    });

    res.status(200).json({
      success: true,
      stats: {
        month: targetMonth,
        year: targetYear,
        totalEmployees: records.length,
        totalGross,
        totalNetPayable,
        totalDisbursed,
        totalPending,
        draftCount,
        pendingApprovalCount,
        approvedCount,
        paidCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single payroll slip by ID
 */
const getPayrollById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const slip = await Payroll.findById(id)
      .populate('user', 'name email role title avatar phone companyName')
      .populate('approvedBy', 'name email')
      .populate('paidBy', 'name email')
      .populate('generatedBy', 'name email');

    if (!slip) {
      return res.status(404).json({
        success: false,
        message: 'Payroll slip not found.'
      });
    }

    // Role check: Employee can only access their own slip
    if (req.user.role === 'Employee' && slip.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this payslip.'
      });
    }

    res.status(200).json({
      success: true,
      data: slip
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update payroll slip details (bonuses, deductions, attendance override)
 */
const updatePayrollSlip = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      bonuses,
      customDeductions,
      payableDays,
      notes,
      engagementType,
      workingMode,
      payPeriod,
      paymentCycleNote,
      leaveDeductionNote,
      voucherDate,
      dateOfJoining
    } = req.body;

    const slip = await Payroll.findById(id);
    if (!slip) {
      return res.status(404).json({ success: false, message: 'Payroll record not found.' });
    }

    if (slip.status === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify a payroll slip that has already been paid.'
      });
    }

    if (engagementType !== undefined) slip.engagementType = engagementType;
    if (workingMode !== undefined) slip.workingMode = workingMode;
    if (payPeriod !== undefined) slip.payPeriod = payPeriod;
    if (paymentCycleNote !== undefined) slip.paymentCycleNote = paymentCycleNote;
    if (leaveDeductionNote !== undefined) slip.leaveDeductionNote = leaveDeductionNote;
    if (voucherDate !== undefined) slip.voucherDate = voucherDate;
    if (dateOfJoining !== undefined) slip.dateOfJoining = dateOfJoining;

    if (bonuses !== undefined) {
      slip.bonuses = bonuses;
      slip.totalBonuses = bonuses.reduce((acc, b) => acc + (Number(b.amount) || 0), 0);
    }

    if (customDeductions !== undefined) {
      slip.customDeductions = customDeductions;
      slip.totalCustomDeductions = customDeductions.reduce((acc, d) => acc + (Number(d.amount) || 0), 0);
    }

    if (payableDays !== undefined) {
      slip.payableDays = Number(payableDays);
      slip.unpaidLeaves = Math.max(0, slip.workingDays - slip.payableDays);
      slip.lopDeduction = Math.round(slip.unpaidLeaves * slip.perDayRate);
    }

    // Recalculate totals
    slip.totalDeductions = slip.lopDeduction + slip.totalStandardDeductions + slip.totalCustomDeductions;
    slip.netSalary = Math.max(0, Math.round(slip.grossSalary - slip.totalDeductions + slip.totalBonuses));

    if (notes) slip.paymentNotes = notes;

    await slip.save();

    const populated = await Payroll.findById(id).populate('user', 'name email role title avatar');

    res.status(200).json({
      success: true,
      message: 'Payroll slip updated successfully.',
      data: populated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit payroll slip or batch for Admin approval (HR Maker role)
 */
const submitForApproval = async (req, res, next) => {
  try {
    const { ids } = req.body; // Array of payroll IDs or single ID

    if (!ids || !ids.length) {
      return res.status(400).json({ success: false, message: 'No payroll records specified.' });
    }

    const updated = await Payroll.updateMany(
      { _id: { $in: ids }, status: 'DRAFT' },
      { status: 'PENDING_APPROVAL', submittedAt: new Date() }
    );

    // Notify all Admins
    const admins = await User.find({ role: 'ADMIN', isActive: true });
    for (const admin of admins) {
      await sendNotification({
        userId: admin._id,
        title: 'Payroll Awaiting Approval',
        message: `${req.user.name} (HR) submitted ${ids.length} payroll slips for approval.`,
        type: 'HR',
        link: '/admin/payroll'
      });
    }

    res.status(200).json({
      success: true,
      message: `Submitted ${updated.modifiedCount} payroll records for Admin approval.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Approve payroll slip or batch (Admin Checker role)
 */
const approvePayroll = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!ids || !ids.length) {
      return res.status(400).json({ success: false, message: 'No payroll records specified.' });
    }

    const updated = await Payroll.updateMany(
      { _id: { $in: ids }, status: { $in: ['DRAFT', 'PENDING_APPROVAL'] } },
      {
        status: 'APPROVED',
        approvedBy: req.user._id,
        approvedAt: new Date()
      }
    );

    res.status(200).json({
      success: true,
      message: `Approved ${updated.modifiedCount} payroll records. Ready for disbursement.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Record payment / Mark as Paid (Admin or HR)
 */
const recordPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { paymentMethod = 'BANK_TRANSFER', paymentReference = '', paymentNotes = '', paymentDate } = req.body;

    const slip = await Payroll.findById(id).populate('user', 'name email');
    if (!slip) {
      return res.status(404).json({ success: false, message: 'Payroll slip not found.' });
    }

    slip.status = 'PAID';
    slip.paymentMethod = paymentMethod;
    slip.paymentReference = paymentReference;
    slip.paymentNotes = paymentNotes;
    slip.paymentDate = paymentDate || new Date();
    slip.paidBy = req.user._id;
    slip.paidAt = new Date();

    await slip.save();

    // Send in-app notification to the employee
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const monthName = monthNames[slip.month - 1];

    await sendNotification({
      userId: slip.user._id,
      title: 'Salary Disbursed',
      message: `Your salary of ₹${slip.netSalary.toLocaleString('en-IN')} for ${monthName} ${slip.year} has been credited. View your payslip now.`,
      type: 'GENERAL',
      link: '/Employee/payroll'
    });

    res.status(200).json({
      success: true,
      message: 'Payment recorded and marked as PAID.',
      data: slip
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk record payment for all approved slips
 */
const bulkRecordPayment = async (req, res, next) => {
  try {
    const { ids, paymentMethod = 'BANK_TRANSFER', paymentReference = '' } = req.body;

    if (!ids || !ids.length) {
      return res.status(400).json({ success: false, message: 'No records specified.' });
    }

    const slips = await Payroll.find({
      _id: { $in: ids },
      status: { $in: ['APPROVED', 'PENDING_APPROVAL', 'DRAFT'] }
    }).populate('user', 'name email');

    for (const slip of slips) {
      slip.status = 'PAID';
      slip.paymentMethod = paymentMethod;
      slip.paymentReference = paymentReference;
      slip.paymentDate = new Date();
      slip.paidBy = req.user._id;
      slip.paidAt = new Date();
      await slip.save();

      // In-app alert
      await sendNotification({
        userId: slip.user._id,
        title: 'Salary Disbursed',
        message: `Your salary of ₹${slip.netSalary.toLocaleString('en-IN')} has been disbursed.`,
        type: 'GENERAL',
        link: '/Employee/payroll'
      });
    }

    res.status(200).json({
      success: true,
      message: `Successfully marked ${slips.length} payroll records as PAID.`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Employee's view of their own payslips
 */
const getMyPayrolls = async (req, res, next) => {
  try {
    const records = await Payroll.find({
      user: req.user._id,
      status: { $in: ['APPROVED', 'PAID'] } // Employees only see approved or paid slips
    })
      .sort({ year: -1, month: -1 })
      .populate('user', 'name email role title');

    res.status(200).json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a draft payroll record
 */
const deletePayroll = async (req, res, next) => {
  try {
    const { id } = req.params;
    const slip = await Payroll.findById(id);

    if (!slip) {
      return res.status(404).json({ success: false, message: 'Payroll slip not found.' });
    }

    if (slip.status === 'PAID') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a completed payment record.'
      });
    }

    await Payroll.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Payroll record removed.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Download official Payment Voucher PDF (matches the PDF layout)
 */
const downloadPaymentVoucher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const slip = await Payroll.findById(id).populate('user', 'name email role title avatar phone');

    if (!slip) {
      return res.status(404).json({ success: false, message: 'Payroll record not found.' });
    }

    if (req.user.role === 'Employee' && slip.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied to this voucher.' });
    }

    const { generatePaymentVoucherPDF } = require('../services/pdfService');
    const { filePath, fileName } = await generatePaymentVoucherPDF(slip);

    res.download(filePath, fileName);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateMonthlyPayroll,
  getPayrolls,
  getPayrollStats,
  getPayrollById,
  updatePayrollSlip,
  submitForApproval,
  approvePayroll,
  recordPayment,
  bulkRecordPayment,
  getMyPayrolls,
  deletePayroll,
  downloadPaymentVoucher
};
