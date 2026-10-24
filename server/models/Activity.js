const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'Project reference is required']
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required']
    },
    action: {
      type: String,
      enum: [
        'USER_LOGIN',
        'PROJECT_CREATED',
        'PROJECT_UPDATED',
        'CLIENT_CREATED',
        'Employee_CREATED',
        'TASK_REQUEST_CREATED',
        'TASK_REQUEST_APPROVED',
        'TASK_REQUEST_REJECTED',
        'TASK_CREATED',
        'TASK_ASSIGNED',
        'TASK_STARTED',
        'TASK_PROGRESS_UPDATED',
        'TASK_BLOCKED',
        'TASK_SUBMITTED_FOR_REVIEW',
        'TASK_COMPLETED',
        'TASK_UPDATED',
        'MILESTONE_CREATED',
        'MILESTONE_COMPLETED',
        'FILE_UPLOADED',
        'FILE_DELETED',
        'DELIVERABLE_APPROVED',
        'CHANGES_REQUESTED',
        'COMMENT_ADDED',
        'FEEDBACK_RECEIVED',
        'PROJECT_COMPLETED'
      ],
      required: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    entityType: {
      type: String,
      enum: ['PROJECT', 'TASK', 'TASK_REQUEST', 'FILE', 'MILESTONE', 'COMMENT', 'USER'],
      default: 'PROJECT'
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId
    },
    clientVisible: {
      type: Boolean,
      default: true
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

activitySchema.index({ project: 1, createdAt: -1 });
activitySchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Activity', activitySchema);
