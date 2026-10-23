const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    salaryStructure: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SalaryStructure'
    },
    month: {
      type: Number,
      required: [true, 'Month is required (1-12)'],
      min: 1,
      max: 12
    },
    year: {
      type: Number,
      required: [true, 'Year is required'],
      min: 2020
    },
    payrollCycle: {
      type: String, // e.g. "2026-10"
      required: true
    },
    voucherNumber: {
      type: String,
      default: ''
    },
    voucherDate: {
      type: Date,
      default: Date.now
    },
    payPeriod: {
      type: String,
      default: ''
    },
    engagementType: {
      type: String,
      default: 'Freelance – Monthly Retainer'
    },
    workingMode: {
      type: String,
      default: 'Remote (Freelance)'
    },
    paymentCycleNote: {
      type: String,
      default: 'Released after 30 days of placement as per engagement terms.'
    },
    dateOfJoining: {
      type: Date
    },
    leaveDates: {
      type: [String],
      default: []
    },
    leaveDeductionNote: {
      type: String,
      default: ''
    },
    // Attendance & Calendar
    totalDaysInMonth: {
      type: Number,
      default: 30
    },
    workingDays: {
      type: Number,
      default: 26
    },
    presentDays: {
      type: Number,
      default: 0
    },
    halfDays: {
      type: Number,
      default: 0
    },
    paidLeaves: {
      type: Number,
      default: 0
    },
    unpaidLeaves: {
      type: Number,
      default: 0
    },
    payableDays: {
      type: Number,
      default: 0
    },

    // Earnings
    baseSalary: {
      type: Number,
      required: true,
      default: 0
    },
    allowances: {
      hra: { type: Number, default: 0 },
      conveyance: { type: Number, default: 0 },
      specialAllowance: { type: Number, default: 0 },
      medicalAllowance: { type: Number, default: 0 },
      otherAllowance: { type: Number, default: 0 }
    },
    totalAllowances: {
      type: Number,
      default: 0
    },
    grossSalary: {
      type: Number,
      required: true,
      default: 0
    },

    // Deductions & Calculations
    perDayRate: {
      type: Number,
      default: 0
    },
    lopDeduction: {
      type: Number,
      default: 0
    },
    standardDeductions: {
      pf: { type: Number, default: 0 },
      professionalTax: { type: Number, default: 0 },
      tds: { type: Number, default: 0 },
      esi: { type: Number, default: 0 },
      otherDeduction: { type: Number, default: 0 }
    },
    totalStandardDeductions: {
      type: Number,
      default: 0
    },

    // Variable Adjustments
    bonuses: [
      {
        title: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 }
      }
    ],
    totalBonuses: {
      type: Number,
      default: 0
    },
    customDeductions: [
      {
        title: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 }
      }
    ],
    totalCustomDeductions: {
      type: Number,
      default: 0
    },

    totalDeductions: {
      type: Number,
      default: 0
    },
    netSalary: {
      type: Number,
      required: true,
      default: 0
    },

    // Bank Details Snapshot at run time
    bankDetails: {
      accountHolderName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      bankName: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      panNumber: { type: String, default: '' },
      upiId: { type: String, default: '' }
    },

    // Status & Payment Lifecycle
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PAID', 'CANCELLED'],
      default: 'DRAFT',
      required: true
    },
    paymentDate: {
      type: Date
    },
    paymentMethod: {
      type: String,
      enum: ['BANK_TRANSFER', 'UPI', 'NEFT_RTGS', 'CHEQUE', 'CASH'],
      default: 'BANK_TRANSFER'
    },
    paymentReference: {
      type: String,
      default: '' // UTR / IMPS Ref / Cheque No
    },
    paymentNotes: {
      type: String,
      default: ''
    },

    // Governance & Audit
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    submittedAt: {
      type: Date
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    approvedAt: {
      type: Date
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    paidAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

// One payroll record per user per month/year
payrollSchema.index({ user: 1, month: 1, year: 1 }, { unique: true });
payrollSchema.index({ payrollCycle: 1, status: 1 });

module.exports = mongoose.model('Payroll', payrollSchema);
