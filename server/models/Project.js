const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [120, 'Project name cannot exceed 120 characters']
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Client assignment is required']
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Creator is required']
    },
    startDate: {
      type: Date,
      default: Date.now
    },
    endDate: {
      type: Date
    },
    status: {
      type: String,
      enum: ['PLANNING', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED'],
      default: 'PLANNING'
    },
    stage: {
      type: String,
      enum: ['PLANNING', 'REQUIREMENTS', 'DESIGN', 'DEVELOPMENT', 'TESTING', 'CLIENT_REVIEW', 'DEPLOYMENT', 'COMPLETED', 'ON_HOLD'],
      default: 'PLANNING'
    },
    health: {
      type: String,
      enum: ['ON_TRACK', 'AT_RISK', 'OVERDUE_BLOCKED'],
      default: 'ON_TRACK'
    },
    assignedEmployees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    progress: {
      type: Number,
      default: 0,
      min: [0, 'Progress cannot be less than 0'],
      max: [100, 'Progress cannot exceed 100']
    },
    budget: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

projectSchema.index({ client: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ stage: 1 });
projectSchema.index({ health: 1 });
projectSchema.index({ assignedEmployees: 1 });

module.exports = mongoose.model('Project', projectSchema);
