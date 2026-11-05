const mongoose = require('mongoose');

const hrSettingsSchema = new mongoose.Schema(
  {
    companyName: {
      type: String,
      default: 'GENFREX'
    },
    tagline: {
      type: String,
      default: 'Build. Grow. Connect.'
    },
    officialEmail: {
      type: String,
      default: 'genfrexofficial@gmail.com'
    },
    companyAddress: {
      type: String,
      default: 'GENFREX Digital Services HQ, Tech Park, Bengaluru, India'
    },
    logoUrl: {
      type: String,
      default: ''
    },
    brandColor: {
      type: String,
      default: '#0052FF'
    },
    referencePrefix: {
      type: String,
      default: 'GFX/HR'
    },
    referenceYear: {
      type: Number,
      default: 2026
    },
    currentSequence: {
      type: Number,
      default: 1
    },
    defaultAppointmentType: {
      type: String,
      default: 'TRAINEE'
    },
    defaultAcceptanceDays: {
      type: Number,
      default: 7
    },
    signatories: [
      {
        name: { type: String, default: 'Anisha' },
        designation: { type: String, default: 'People Operations' },
        title: { type: String, default: 'People Operations, GENFREX' },
        signatureUrl: { type: String, default: '' },
        isDefault: { type: Boolean, default: true }
      }
    ],
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('HRSettings', hrSettingsSchema);
