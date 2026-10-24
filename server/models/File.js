const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema(
  {
    // Relational references
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate'
    },
    appointmentLetter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AppointmentLetter'
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Uploader reference is required']
    },
    uploadedByRole: {
      type: String,
      enum: ['ADMIN', 'HR', 'Employee', 'CLIENT'],
      default: 'ADMIN'
    },

    // File naming & identification
    fileName: {
      type: String,
      required: [true, 'File name is required'],
      trim: true
    },
    originalFileName: {
      type: String,
      trim: true
    },

    // Google Drive & Cloud Storage IDs
    driveFileId: {
      type: String,
      default: '',
      trim: true
    },
    driveFolderId: {
      type: String,
      default: '',
      trim: true
    },
    folderId: {
      type: String,
      default: '',
      trim: true
    },

    // Storage tier provider
    storageProvider: {
      type: String,
      enum: ['GOOGLE_DRIVE', 'CLOUDINARY', 'S3', 'LOCAL'],
      default: 'GOOGLE_DRIVE',
      required: true
    },
    storageKey: {
      type: String,
      default: ''
    },
    fileUrl: {
      type: String,
      default: ''
    },
    publicId: {
      type: String,
      default: ''
    },

    // File specifications
    mimeType: {
      type: String,
      default: 'application/octet-stream'
    },
    fileType: {
      type: String,
      default: 'application/octet-stream'
    },
    fileSize: {
      type: Number,
      default: 0
    },

    // Module & Entity mapping
    module: {
      type: String,
      enum: ['CLIENT', 'PROJECT', 'TASK', 'HR', 'Employee', 'GENERAL'],
      default: 'PROJECT'
    },
    relatedModule: {
      type: String,
      enum: ['CLIENT', 'PROJECT', 'TASK', 'HR', 'Employee', 'GENERAL'],
      default: 'PROJECT'
    },
    entityType: {
      type: String,
      default: 'PROJECT'
    },
    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId
    },

    // Classification & Security
    category: {
      type: String,
      enum: ['DOCUMENT', 'DESIGN', 'DELIVERABLE', 'HR_APPOINTMENT', 'HR_DOCUMENT', 'PROFILE_MEDIA', 'OTHER'],
      default: 'DELIVERABLE'
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'DELETED', 'ARCHIVED'],
      default: 'ACTIVE'
    },
    isConfidential: {
      type: Boolean,
      default: false
    },
    isDeliverable: {
      type: Boolean,
      default: true
    },

    // Review & Approval Flow
    approvalStatus: {
      type: String,
      enum: ['PENDING_REVIEW', 'APPROVED', 'CHANGES_REQUESTED'],
      default: 'PENDING_REVIEW'
    },
    revisionNotes: {
      type: String,
      trim: true,
      default: ''
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: {
      type: Date
    },

    // Admin Gatekeeper Approval Flow (Controls release to Client)
    adminApprovalStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'CHANGES_REQUESTED'],
      default: 'PENDING'
    },
    adminApproved: {
      type: Boolean,
      default: false
    },
    adminApprovedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    adminApprovedAt: {
      type: Date
    },
    adminFeedback: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to synchronize aliases
fileSchema.pre('save', function (next) {
  if (!this.originalFileName && this.fileName) {
    this.originalFileName = this.fileName;
  }
  if (!this.fileName && this.originalFileName) {
    this.fileName = this.originalFileName;
  }
  if (!this.fileType && this.mimeType) {
    this.fileType = this.mimeType;
  }
  if (!this.mimeType && this.fileType) {
    this.mimeType = this.fileType;
  }
  if (!this.relatedModule && this.module) {
    this.relatedModule = this.module;
  }
  if (!this.module && this.relatedModule) {
    this.module = this.relatedModule;
  }
  if (!this.entityId && this.relatedEntityId) {
    this.entityId = this.relatedEntityId;
  }
  if (!this.relatedEntityId && this.entityId) {
    this.relatedEntityId = this.entityId;
  }
  if (!this.driveFolderId && this.folderId) {
    this.driveFolderId = this.folderId;
  }
  if (!this.folderId && this.driveFolderId) {
    this.folderId = this.driveFolderId;
  }
  next();
});

// Strategic Performance Indexes
fileSchema.index({ driveFileId: 1 });
fileSchema.index({ entityId: 1 });
fileSchema.index({ relatedEntityId: 1 });
fileSchema.index({ uploadedBy: 1 });
fileSchema.index({ module: 1 });
fileSchema.index({ relatedModule: 1 });
fileSchema.index({ status: 1 });
fileSchema.index({ project: 1, category: 1 });
fileSchema.index({ task: 1 });
fileSchema.index({ appointmentLetter: 1 });
fileSchema.index({ candidate: 1 });
fileSchema.index({ storageProvider: 1 });
fileSchema.index({ isConfidential: 1 });
fileSchema.index({ isDeliverable: 1, approvalStatus: 1 });
fileSchema.index({ adminApproved: 1, isDeliverable: 1 });
fileSchema.index({ adminApprovalStatus: 1 });
fileSchema.index({ createdAt: -1 });

module.exports = mongoose.model('File', fileSchema);
