const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Candidate name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Candidate email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/\S+@\S+\.\S+/, 'Please provide a valid email address']
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    address: {
      type: String,
      trim: true,
      default: ''
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true,
      default: 'Engineering'
    },
    employmentType: {
      type: String,
      enum: ['Full-time', 'Internship', 'Trainee', 'FULL_TIME', 'INTERNSHIP', 'TRAINEE'],
      default: 'Trainee',
      required: true
    },
    candidateStatus: {
      type: String,
      enum: ['ACTIVE', 'APPOINTED', 'ONBOARDED', 'ARCHIVED'],
      default: 'ACTIVE'
    },
    joiningDate: {
      type: Date
    },
    workLocation: {
      type: String,
      trim: true,
      default: 'Remote / Bengaluru'
    },
    reportingManager: {
      type: String,
      trim: true,
      default: 'Technical Lead'
    },
    compensation: {
      type: Number,
      default: 0
    },
    compensationFrequency: {
      type: String,
      enum: ['MONTHLY', 'ANNUAL', 'STIPEND_MONTHLY'],
      default: 'STIPEND_MONTHLY'
    },
    probationPeriod: {
      type: String,
      default: '3 Months'
    },
    notes: {
      type: String,
      default: ''
    },
    source: {
      type: String,
      enum: ['Direct HR', 'Client Project', 'Talent Pool', 'Internal'],
      default: 'Direct HR'
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project'
    },
    requirementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskRequest'
    },
    requirement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TaskRequest'
    },
    EmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    assignedEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to synchronize aliases
candidateSchema.pre('save', function (next) {
  if (this.client && !this.clientId) this.clientId = this.client;
  if (this.clientId && !this.client) this.client = this.clientId;

  if (this.project && !this.projectId) this.projectId = this.project;
  if (this.projectId && !this.project) this.project = this.projectId;

  if (this.requirement && !this.requirementId) this.requirementId = this.requirement;
  if (this.requirementId && !this.requirement) this.requirement = this.requirementId;

  if (this.assignedEmployee && !this.EmployeeId) this.EmployeeId = this.assignedEmployee;
  if (this.EmployeeId && !this.assignedEmployee) this.assignedEmployee = this.EmployeeId;

  next();
});

candidateSchema.index({ designation: 1 });
candidateSchema.index({ candidateStatus: 1 });
candidateSchema.index({ source: 1 });
candidateSchema.index({ projectId: 1 });
candidateSchema.index({ project: 1 });
candidateSchema.index({ clientId: 1 });
candidateSchema.index({ client: 1 });

module.exports = mongoose.model('Candidate', candidateSchema);
