const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    performedByRole: {
      type: String,
      enum: ['ADMIN', 'HR', 'Employee', 'CLIENT', 'SYSTEM', ''],
      default: ''
    },
    action: {
      type: String,
      required: true,
      enum: [
        // User Administration
        'CREATE_HR',
        'CREATE_Employee',
        'CREATE_CLIENT',
        'CHANGE_USER_PASSWORD',
        'CHANGE_ADMIN_PASSWORD',
        'ACTIVATE_USER',
        'DEACTIVATE_USER',
        'UPDATE_USER',
        'DELETE_USER',
        // Cloud & File Storage
        'FILE_UPLOAD',
        'FILE_VIEW',
        'FILE_DOWNLOAD',
        'FILE_DELETE',
        'FILE_REPLACE',
        'FILE_ACCESS_DENIED'
      ]
    },
    // User administration targets
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    targetRole: {
      type: String,
      enum: ['ADMIN', 'HR', 'Employee', 'CLIENT', '']
    },
    targetEmail: {
      type: String,
      default: ''
    },
    // Storage targets
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File'
    },
    fileName: {
      type: String,
      default: ''
    },
    relatedModule: {
      type: String,
      default: ''
    },
    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId
    },
    // Context details & metrics
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

auditLogSchema.index({ performedBy: 1, timestamp: -1 });
auditLogSchema.index({ targetUser: 1, timestamp: -1 });
auditLogSchema.index({ fileId: 1, timestamp: -1 });
auditLogSchema.index({ relatedModule: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
