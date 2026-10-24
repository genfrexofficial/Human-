const mongoose = require('mongoose');

const appointmentLetterSchema = new mongoose.Schema(
  {
    referenceNumber: {
      type: String,
      required: [true, 'Reference number is required'],
      unique: true,
      trim: true
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate',
      required: [true, 'Candidate reference is required']
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Candidate'
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
    employmentType: {
      type: String,
      default: 'Trainee'
    },
    appointmentType: {
      type: String,
      enum: ['TRAINEE', 'INTERNSHIP', 'FULL_TIME'],
      default: 'TRAINEE',
      required: true
    },
    title: {
      type: String,
      default: 'TRAINEE APPOINTMENT LETTER'
    },
    designation: {
      type: String,
      required: [true, 'Designation is required'],
      trim: true
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true
    },
    appointmentDate: {
      type: Date,
      default: Date.now
    },
    joiningDate: {
      type: Date,
      required: [true, 'Joining date is required']
    },
    workLocation: {
      type: String,
      default: 'Remote / Bengaluru'
    },
    reportingManager: {
      type: String,
      default: 'Technical Lead'
    },
    compensation: {
      type: Number,
      required: [true, 'Compensation / stipend is required']
    },
    compensationFrequency: {
      type: String,
      enum: ['MONTHLY', 'ANNUAL', 'STIPEND_MONTHLY'],
      default: 'STIPEND_MONTHLY'
    },
    responsibilities: {
      type: [String],
      default: []
    },
    terms: {
      type: [String],
      default: []
    },
    confidentialityTerms: {
      type: String,
      default: ''
    },
    professionalConductTerms: {
      type: String,
      default: ''
    },
    acceptanceDeadline: {
      type: Date,
      required: [true, 'Acceptance deadline is required']
    },
    status: {
      type: String,
      enum: [
        'DRAFT',
        'PENDING_APPROVAL',
        'APPROVED',
        'REJECTED',
        'SENT',
        'ACCEPTED',
        'DECLINED',
        'EXPIRED'
      ],
      default: 'DRAFT',
      required: true
    },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LetterTemplate'
    },
    templateVersion: {
      type: Number,
      default: 1
    },
    letterContentSnapshot: {
      type: mongoose.Schema.Types.Mixed,
      default: null
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
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
    approvalComment: {
      type: String,
      default: ''
    },
    rejectionReason: {
      type: String,
      default: ''
    },
    rejectedAt: {
      type: Date
    },
    pdfFileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File'
    },
    pdfUrl: {
      type: String,
      default: ''
    },
    pdfGeneratedAt: {
      type: Date
    },
    sentAt: {
      type: Date
    },
    sentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emailStatus: {
      type: String,
      enum: ['NOT_SENT', 'PENDING', 'SENT', 'FAILED'],
      default: 'NOT_SENT'
    },
    emailHistory: [
      {
        sentAt: { type: Date, default: Date.now },
        sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        recipient: String,
        subject: String,
        status: { type: String, enum: ['SENT', 'FAILED'] },
        providerMessageId: String,
        error: String
      }
    ],
    acceptanceStatus: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED'],
      default: 'PENDING'
    },
    acceptedAt: {
      type: Date
    },
    declinedAt: {
      type: Date
    },
    declineReason: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Pre-save hook to synchronize aliases
appointmentLetterSchema.pre('save', function (next) {
  if (this.client && !this.clientId) this.clientId = this.client;
  if (this.clientId && !this.client) this.client = this.clientId;

  if (this.project && !this.projectId) this.projectId = this.project;
  if (this.projectId && !this.project) this.project = this.projectId;

  if (this.candidate && !this.candidateId) this.candidateId = this.candidate;
  if (this.candidateId && !this.candidate) this.candidate = this.candidateId;

  if (this.requirement && !this.requirementId) this.requirementId = this.requirement;
  if (this.requirementId && !this.requirement) this.requirement = this.requirementId;

  if (this.assignedEmployee && !this.EmployeeId) this.EmployeeId = this.assignedEmployee;
  if (this.EmployeeId && !this.assignedEmployee) this.assignedEmployee = this.EmployeeId;

  next();
});

appointmentLetterSchema.index({ candidateId: 1 });
appointmentLetterSchema.index({ candidate: 1 });
appointmentLetterSchema.index({ projectId: 1 });
appointmentLetterSchema.index({ project: 1 });
appointmentLetterSchema.index({ clientId: 1 });
appointmentLetterSchema.index({ client: 1 });
appointmentLetterSchema.index({ status: 1 });
appointmentLetterSchema.index({ createdBy: 1 });
appointmentLetterSchema.index({ joiningDate: 1 });

module.exports = mongoose.model('AppointmentLetter', appointmentLetterSchema);
