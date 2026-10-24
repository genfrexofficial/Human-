const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: function () {
        return this.taskType === 'PROJECT';
      }
    },
    taskType: {
      type: String,
      enum: ['PROJECT', 'PERSONAL'],
      default: 'PROJECT'
    },
    personalCategory: {
      type: String,
      enum: ['INTERNAL_WORK', 'TRAINING', 'MAINTENANCE', 'RESEARCH', 'HR_COMPLIANCE', 'OTHER'],
      default: 'INTERNAL_WORK'
    },
    milestone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Milestone'
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [150, 'Task title cannot exceed 150 characters']
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    taskRequest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskRequest'
    },
    status: {
      type: String,
      enum: [
        'PENDING_APPROVAL',
        'APPROVED',
        'REJECTED',
        'ASSIGNED',
        'TODO',
        'IN_PROGRESS',
        'BLOCKED',
        'IN_REVIEW',
        'CHANGES_REQUESTED',
        'COMPLETED'
      ],
      default: 'TODO'
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM'
    },
    progress: {
      type: Number,
      default: 0,
      min: [0, 'Progress cannot be less than 0'],
      max: [100, 'Progress cannot exceed 100']
    },
    dueDate: {
      type: Date
    },
    estimatedHours: {
      type: Number,
      default: 0
    },
    actualHours: {
      type: Number,
      default: 0
    },
    clientVisible: {
      type: Boolean,
      default: true
    },
    attachments: [
      {
        fileName: { type: String, required: true },
        fileUrl: { type: String, required: true },
        fileSize: { type: Number, default: 0 },
        fileType: { type: String, default: 'application/octet-stream' }
      }
    ],
    startedAt: {
      type: Date
    },
    completedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

taskSchema.index({ taskType: 1 });
taskSchema.index({ project: 1, status: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ clientVisible: 1 });

module.exports = mongoose.model('Task', taskSchema);
