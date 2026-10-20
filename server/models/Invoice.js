const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      unique: true,
      required: true,
      trim: true
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    milestone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Milestone'
    },
    issueDate: {
      type: Date,
      default: Date.now
    },
    dueDate: {
      type: Date,
      required: true
    },
    items: [
      {
        description: { type: String, required: true },
        quantity: { type: Number, default: 1 },
        rate: { type: Number, required: true },
        amount: { type: Number, required: true }
      }
    ],
    subtotal: {
      type: Number,
      required: true
    },
    taxRate: {
      type: Number,
      default: 18 // GST percentage
    },
    taxAmount: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      default: 'INR'
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SENT', 'UNPAID', 'PAID', 'OVERDUE', 'CANCELLED'],
      default: 'UNPAID'
    },
    bankDetails: {
      accountName: { type: String, default: 'GENFREX' },
      accountNumber: { type: String, default: '987654321098' },
      ifscCode: { type: String, default: 'HDFC0001234' },
      bankName: { type: String, default: 'HDFC Bank, Karur' },
      upiId: { type: String, default: 'genfrex@hdfcbank' }
    },
    paymentDetails: {
      paidAt: { type: Date },
      paymentMethod: {
        type: String,
        enum: ['BANK_TRANSFER', 'UPI', 'CASH', 'CHEQUE', 'OTHER']
      },
      referenceId: { type: String }, // Transaction ID / UTR
      notes: { type: String },
      recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    },
    notes: {
      type: String,
      default: 'Thank you for your business. Please include the invoice number in your wire/UPI transfer reference.'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Invoice', invoiceSchema);
