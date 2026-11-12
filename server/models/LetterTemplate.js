const mongoose = require('mongoose');

const letterTemplateSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      default: 'GENFREX Trainee Appointment Letter'
    },
    roleCategory: {
      type: String,
      enum: ['WEB_DEV', 'DEVOPS', 'FULL_STACK', 'UI_UX', 'QA_TESTING', 'FULL_TIME_ENG', 'INTERNSHIP', 'GENERAL', 'CUSTOM'],
      default: 'GENERAL'
    },
    targetRole: {
      type: String,
      default: 'Web Developer Trainee'
    },
    department: {
      type: String,
      default: 'Engineering'
    },
    appointmentType: {
      type: String,
      default: 'TRAINEE',
      trim: true
    },
    isDefault: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: 'TRAINEE APPOINTMENT LETTER'
    },
    subtitle: {
      type: String,
      default: 'DIGITAL SERVICES & TALENT ECOSYSTEM'
    },
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
      default: 'hr@genfrex.com'
    },
    website: {
      type: String,
      default: 'www.genfrex.com'
    },
    aboutGenfrex: {
      type: String,
      default:
        'GENFREX is a next-generation digital services and talent ecosystem committed to empowering enterprises and innovators with cutting-edge engineering, scalable digital products, and high-impact talent solutions. We bridge industry demands with world-class technical capabilities to build robust, modern digital solutions.'
    },
    roleAndResponsibilities: {
      type: [String],
      default: [
        'Execute assigned technical tasks, modules, and software features in alignment with GENFREX quality standards.',
        'Collaborate proactively with technical leads, cross-functional engineering teams, and project stakeholders.',
        'Participate in sprint planning, architecture reviews, daily standups, and codebase documentation.',
        'Continuously enhance technical proficiencies and adhere to best development and security practices.'
      ]
    },
    termsAndConditions: {
      type: [String],
      default: [
        'Appointment Status: This appointment is for training and professional development within the GENFREX ecosystem. Successful completion of the trainee period may lead to performance-based full-time consideration.',
        'Working Hours & Mode: The trainee shall adhere to the agreed schedule and mode of engagement (Remote, Hybrid, or On-site) specified in the appointment details.',
        'Compensation: A monthly stipend/compensation shall be disbursed in accordance with GENFREX payroll schedules, subject to statutory deductions where applicable.',
        'Notice Period: Either party may terminate this trainee engagement by providing a written notice of 15 days or compensation in lieu thereof during the trainee period.'
      ]
    },
    confidentialityClause: {
      type: String,
      default:
        'The Trainee acknowledges that during the tenure of this appointment, they may have access to confidential, proprietary, trade secret, client data, and intellectual property belonging to GENFREX or its affiliated clients. The Trainee agrees to hold all such information in strict confidence and shall not disclose, replicate, reverse-engineer, or misuse any proprietary data without prior written authorization from GENFREX. This obligation survives the termination or expiration of this appointment.'
    },
    professionalConductClause: {
      type: String,
      default:
        'The Trainee agrees to maintain the highest standards of professional integrity, diligence, and ethical conduct. Non-compliance with company policies, willful misconduct, breach of client trust, or unauthorized external representation of GENFREX may result in immediate revocation of this appointment.'
    },
    acceptanceTerms: {
      type: String,
      default:
        'Please signify your acceptance of this Trainee Appointment Letter and its incorporated terms by signing and returning the duplicate copy on or before the acceptance deadline mentioned herein.'
    },
    signatories: [
      {
        name: { type: String, default: 'Anisha' },
        designation: { type: String, default: 'People Operations' },
        title: { type: String, default: 'People Operations, GENFREX' },
        signatureUrl: { type: String, default: '/anisha-signature.png' }
      }
    ],
    version: {
      type: Number,
      default: 1
    },
    active: {
      type: Boolean,
      default: true
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('LetterTemplate', letterTemplateSchema);
