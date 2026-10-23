const mongoose = require('mongoose');

const salaryStructureSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      unique: true
    },
    salaryType: {
      type: String,
      enum: ['MONTHLY', 'STIPEND', 'HOURLY'],
      default: 'MONTHLY',
      required: true
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
      type: Date,
      default: Date.now
    },
    baseSalary: {
      type: Number,
      required: [true, 'Base salary is required'],
      min: [0, 'Base salary cannot be negative']
    },
    allowances: {
      hra: { type: Number, default: 0, min: 0 },
      conveyance: { type: Number, default: 0, min: 0 },
      specialAllowance: { type: Number, default: 0, min: 0 },
      medicalAllowance: { type: Number, default: 0, min: 0 },
      otherAllowance: { type: Number, default: 0, min: 0 }
    },
    deductions: {
      pf: { type: Number, default: 0, min: 0 }, // Provident Fund (Employee share)
      professionalTax: { type: Number, default: 0, min: 0 },
      tds: { type: Number, default: 0, min: 0 }, // Income tax TDS
      esi: { type: Number, default: 0, min: 0 },
      otherDeduction: { type: Number, default: 0, min: 0 }
    },
    bankDetails: {
      accountHolderName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      bankName: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      panNumber: { type: String, default: '' },
      upiId: { type: String, default: '' }
    },
    effectiveDate: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      default: ''
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

salaryStructureSchema.index({ user: 1 });

module.exports = mongoose.model('SalaryStructure', salaryStructureSchema);
