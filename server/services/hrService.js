const HRSettings = require('../models/HRSettings');
const HRAuditLog = require('../models/HRAuditLog');
const LetterTemplate = require('../models/LetterTemplate');
const Notification = require('../models/Notification');
const User = require('../models/User');

/**
 * Safely generate atomic reference number (e.g. GFX/HR/2026/0001)
 */
const generateReferenceNumber = async () => {
  let settings = await HRSettings.findOne();
  if (!settings) {
    settings = await HRSettings.create({
      companyName: 'GENFREX',
      referencePrefix: 'GFX/HR',
      referenceYear: new Date().getFullYear(),
      currentSequence: 1
    });
  }

  // Atomically increment sequence
  const updatedSettings = await HRSettings.findByIdAndUpdate(
    settings._id,
    { $inc: { currentSequence: 1 } },
    { new: true }
  );

  const prefix = updatedSettings.referencePrefix || 'GFX/HR';
  const year = updatedSettings.referenceYear || new Date().getFullYear();
  const sequenceNum = updatedSettings.currentSequence - 1; // Current one allocated
  const paddedSeq = String(sequenceNum).padStart(4, '0');

  return `${prefix}/${year}/${paddedSeq}`;
};

/**
 * Record immutable HR Audit Log entry
 */
const recordHRAudit = async ({
  actorId,
  action,
  appointmentLetterId = null,
  candidateId = null,
  previousStatus = '',
  newStatus = '',
  metadata = {}
}) => {
  try {
    const log = await HRAuditLog.create({
      actorId,
      action,
      appointmentLetterId,
      candidateId,
      previousStatus,
      newStatus,
      metadata,
      timestamp: new Date()
    });
    return log;
  } catch (err) {
    console.error(`[HR Audit Error] Failed to log event: ${err.message}`);
    return null;
  }
};

/**
 * Notify all admins of an HR event (e.g. Pending approval, Resubmission, Sent letter)
 */
const notifyAdmins = async ({ title, message, link = '/admin/hr/pending-approvals', type = 'HR' }) => {
  try {
    const admins = await User.find({ role: 'ADMIN' }).select('_id');
    for (const admin of admins) {
      await Notification.create({
        user: admin._id,
        title,
        message,
        type,
        link
      });
    }
  } catch (err) {
    console.error(`[HR Notification Error] Failed to notify admins: ${err.message}`);
  }
};

/**
 * Notify a specific HR user (e.g. Approved, Rejected, Sent)
 */
const notifyHRUser = async ({ userId, title, message, link = '/hr/appointments', type = 'HR' }) => {
  try {
    if (!userId) return;
    await Notification.create({
      user: userId,
      title,
      message,
      type,
      link
    });
  } catch (err) {
    console.error(`[HR Notification Error] Failed to notify HR user: ${err.message}`);
  }
};

/**
 * Master Role Templates Definitions for GENFREX
 */
const DEFAULT_ROLE_TEMPLATES = [
  {
    name: 'GENFREX Web Developer Trainee Template',
    roleCategory: 'WEB_DEV',
    targetRole: 'Web Developer Trainee',
    department: 'Engineering',
    appointmentType: 'TRAINEE',
    isDefault: true,
    title: 'WEB DEVELOPER TRAINEE APPOINTMENT LETTER',
    subtitle: 'DIGITAL SERVICES & TALENT ECOSYSTEM',
    aboutGenfrex:
      'GENFREX is a next-generation digital services and talent ecosystem committed to empowering enterprises and innovators with cutting-edge engineering, scalable digital products, and high-impact talent solutions. We bridge industry demands with world-class technical capabilities to build robust, modern digital solutions.',
    roleAndResponsibilities: [
      'Develop modern, responsive web user interfaces and robust APIs using React, Node.js, and modern frameworks.',
      'Translate wireframes, design mockups, and client product specifications into clean, scalable code.',
      'Integrate RESTful services, database schemas, and client state management according to GENFREX engineering benchmarks.',
      'Participate in sprint planning, architecture reviews, daily standups, and codebase documentation.'
    ],
    termsAndConditions: [
      'Appointment Status: This appointment is for training and professional development within the GENFREX ecosystem. Successful completion of the trainee period may lead to performance-based full-time consideration.',
      'Working Hours & Mode: The trainee shall adhere to the agreed schedule and mode of engagement (Remote, Hybrid, or On-site) specified in the appointment details.',
      'Compensation: A monthly stipend/compensation shall be disbursed in accordance with GENFREX payroll schedules, subject to statutory deductions where applicable.',
      'Notice Period: Either party may terminate this trainee engagement by providing a written notice of 15 days or compensation in lieu thereof during the trainee period.'
    ],
    confidentialityClause:
      'The Trainee acknowledges that during the tenure of this appointment, they may have access to confidential, proprietary, trade secret, client data, and intellectual property belonging to GENFREX or its affiliated clients. The Trainee agrees to hold all such information in strict confidence and shall not disclose, replicate, reverse-engineer, or misuse any proprietary data without prior written authorization from GENFREX. This obligation survives the termination or expiration of this appointment.',
    professionalConductClause:
      'The Trainee agrees to maintain the highest standards of professional integrity, diligence, and ethical conduct. Non-compliance with company policies, willful misconduct, breach of client trust, or unauthorized external representation of GENFREX may result in immediate revocation of this appointment.',
    acceptanceTerms:
      'Please signify your acceptance of this Trainee Appointment Letter and its incorporated terms by signing and returning the duplicate copy on or before the acceptance deadline mentioned herein.',
    signatories: [
      { name: 'Anisha', designation: 'People Operations', title: 'People Operations, GENFREX', signatureUrl: '/anisha-signature.png' }
    ]
  },
  {
    name: 'GENFREX DevOps & Cloud Infrastructure Trainee Template',
    roleCategory: 'DEVOPS',
    targetRole: 'DevOps & Cloud Trainee',
    department: 'DevOps & Infrastructure',
    appointmentType: 'TRAINEE',
    isDefault: false,
    title: 'DEVOPS & CLOUD TRAINEE APPOINTMENT LETTER',
    subtitle: 'DIGITAL SERVICES & TALENT ECOSYSTEM',
    aboutGenfrex:
      'GENFREX is a next-generation digital services and talent ecosystem committed to empowering enterprises and innovators with cutting-edge engineering, scalable digital products, and high-impact talent solutions.',
    roleAndResponsibilities: [
      'Implement and optimize automated CI/CD deployment pipelines, containerization (Docker), and cloud environments.',
      'Monitor system reliability, cloud server health, latency, database availability, and cloud storage assets.',
      'Automate infrastructure provisioning, environment security configurations, and credential management.',
      'Collaborate proactively with technical leads, cross-functional engineering teams, and project stakeholders.'
    ],
    termsAndConditions: [
      'Appointment Status: This appointment is for specialized cloud operations and technical training within GENFREX.',
      'Working Hours & Mode: Adherence to agreed shift schedules, incident on-call rotations, and remote/hybrid standards is mandatory.',
      'Compensation: Monthly stipend disbursed per GENFREX payroll cycles, subject to applicable statutory deductions.',
      'Notice Period: 15 days written notice by either party or compensation in lieu thereof during the trainee tenure.'
    ],
    confidentialityClause:
      'The Trainee acknowledges access to critical cloud configurations, infrastructure keys, and proprietary client architecture, agreeing to hold all information strictly confidential without unauthorized replication or disclosure.',
    professionalConductClause:
      'The Trainee agrees to maintain exemplary standards of infrastructure security, credential protection, and ethical adherence to cloud governance protocols.',
    acceptanceTerms:
      'Please sign and return this DevOps Appointment Letter on or before the acceptance deadline to formally secure your enrollment.',
    signatories: [
      { name: 'Anisha', designation: 'People Operations', title: 'People Operations, GENFREX', signatureUrl: '/anisha-signature.png' }
    ]
  },
  {
    name: 'GENFREX Full Stack Software Engineer Template',
    roleCategory: 'FULL_STACK',
    targetRole: 'Full Stack Software Engineer',
    department: 'Product Engineering',
    appointmentType: 'FULL_TIME',
    isDefault: false,
    title: 'FULL STACK SOFTWARE ENGINEER APPOINTMENT LETTER',
    subtitle: 'DIGITAL SERVICES & TALENT ECOSYSTEM',
    aboutGenfrex:
      'GENFREX is a next-generation digital services and talent ecosystem committed to empowering enterprises and innovators with cutting-edge engineering, scalable digital products, and high-impact talent solutions.',
    roleAndResponsibilities: [
      'Architect and build end-to-end full-stack software systems and client enterprise solutions.',
      'Design performant database schemas, microservice integrations, and secure backend endpoints.',
      'Lead technical modules, mentor trainee engineers, and review code quality against security standards.',
      'Work directly with clients and technical project managers to deliver mission-critical software milestones.'
    ],
    termsAndConditions: [
      'Employment Status: Full-time permanent engineering position subject to a standard 3-month probation period.',
      'Working Hours & Mode: Professional business engagement adhering to GENFREX product engineering schedule.',
      'Compensation & Benefits: Annual CTC package disbursed monthly with standard performance bonuses and health coverage.',
      'Notice Period: 30 days written notice during probation; 60 days following confirmation of employment.'
    ],
    confidentialityClause:
      'All source code, technical architectures, client data, and algorithms developed during employment remain the exclusive intellectual property of GENFREX and its clients.',
    professionalConductClause:
      'Full commitment to software craftsmanship, intellectual property integrity, and client confidentiality standards.',
    acceptanceTerms:
      'Kindly acknowledge receipt and return the signed duplicate copy on or before the acceptance deadline.',
    signatories: [
      { name: 'Anisha', designation: 'People Operations', title: 'People Operations, GENFREX', signatureUrl: '/anisha-signature.png' }
    ]
  },
  {
    name: 'GENFREX UI/UX & Product Design Trainee Template',
    roleCategory: 'UI_UX',
    targetRole: 'UI/UX Designer Trainee',
    department: 'Product Design & Creative',
    appointmentType: 'TRAINEE',
    isDefault: false,
    title: 'UI/UX DESIGNER TRAINEE APPOINTMENT LETTER',
    subtitle: 'DIGITAL SERVICES & TALENT ECOSYSTEM',
    aboutGenfrex:
      'GENFREX is a next-generation digital services and talent ecosystem committed to empowering enterprises and innovators with cutting-edge engineering, scalable digital products, and high-impact talent solutions.',
    roleAndResponsibilities: [
      'Conduct user flow analysis, customer journey mapping, wireframing, and interactive Figma prototyping.',
      'Establish and maintain consistent design systems, visual tokens, and responsive UI component libraries.',
      'Collaborate closely with frontend developers to ensure pixel-perfect design implementation.',
      'Incorporate client feedback into iterative design mockups and validate usability across viewports.'
    ],
    termsAndConditions: [
      'Appointment Status: Practical design apprenticeship and professional creative development within GENFREX.',
      'Working Hours & Mode: Creative design hours scheduled in accordance with project sprint deliverables.',
      'Compensation: Stipend disbursed monthly per GENFREX talent payment schedules.',
      'Notice Period: 15 days written notice by either party during the trainee engagement.'
    ],
    confidentialityClause:
      'All design assets, Figma files, branding sketches, and client visual assets are confidential and proprietary to GENFREX.',
    professionalConductClause:
      'Adherence to design originality, respect for intellectual property, and ethical representation of client brand guidelines.',
    acceptanceTerms:
      'Please sign and return the duplicate copy on or before the acceptance deadline to initiate your onboarding.',
    signatories: [
      { name: 'Anisha', designation: 'People Operations', title: 'People Operations, GENFREX', signatureUrl: '/anisha-signature.png' }
    ]
  },
  {
    name: 'GENFREX QA & Test Automation Trainee Template',
    roleCategory: 'QA_TESTING',
    targetRole: 'QA & Automation Engineer Trainee',
    department: 'Quality Assurance',
    appointmentType: 'TRAINEE',
    isDefault: false,
    title: 'QA & TEST AUTOMATION TRAINEE APPOINTMENT LETTER',
    subtitle: 'DIGITAL SERVICES & TALENT ECOSYSTEM',
    aboutGenfrex:
      'GENFREX is a next-generation digital services and talent ecosystem committed to empowering enterprises and innovators with cutting-edge engineering, scalable digital products, and high-impact talent solutions.',
    roleAndResponsibilities: [
      'Formulate comprehensive test cases, test suites, and regression testing protocols for web applications.',
      'Build and execute automated end-to-end test scripts for frontend and API endpoints.',
      'Identify, document, prioritize, and track software bugs and performance bottlenecks in ClientFlow.',
      'Verify deliverable milestones prior to client handover and ensure compliance with security criteria.'
    ],
    termsAndConditions: [
      'Appointment Status: Trainee engagement focused on quality assurance, manual/automated testing methodologies.',
      'Working Hours & Mode: Standard testing schedules aligned with sprint release cadences.',
      'Compensation: Monthly stipend disbursed in accordance with GENFREX talent policy.',
      'Notice Period: 15 days written notice by either party.'
    ],
    confidentialityClause:
      'All security reports, test data, vulnerability logs, and application builds are strictly confidential.',
    professionalConductClause:
      'Meticulous testing rigor, objective bug reporting, and unwavering commitment to client software quality.',
    acceptanceTerms:
      'Please sign and return this letter on or before the acceptance deadline to confirm your appointment.',
    signatories: [
      { name: 'Anisha', designation: 'People Operations', title: 'People Operations, GENFREX', signatureUrl: '/anisha-signature.png' }
    ]
  },
  {
    name: 'GENFREX Graduate Technology Internship Template',
    roleCategory: 'INTERNSHIP',
    targetRole: 'Software Engineering Intern',
    department: 'Engineering',
    appointmentType: 'INTERNSHIP',
    isDefault: false,
    title: 'TECHNOLOGY INTERNSHIP APPOINTMENT LETTER',
    subtitle: 'DIGITAL SERVICES & TALENT ECOSYSTEM',
    aboutGenfrex:
      'GENFREX is a next-generation digital services and talent ecosystem committed to empowering enterprises and innovators with cutting-edge engineering, scalable digital products, and high-impact talent solutions.',
    roleAndResponsibilities: [
      'Engage in hands-on foundational software engineering and collaborative agile team projects.',
      'Assist senior engineers in debugging, code documentation, and feature testing.',
      'Gain proficiency in the GENFREX technology stack, development workflow, and coding best practices.',
      'Deliver assigned weekly internship milestones and demonstrate key learning outcomes.'
    ],
    termsAndConditions: [
      'Internship Status: Fixed-term academic and practical internship for students or fresh graduates.',
      'Working Hours & Mode: Flexible hybrid/remote hours compatible with academic guidelines.',
      'Compensation: Educational monthly stipend disbursed during the tenure of internship.',
      'Notice Period: 7 days written notice by either party.'
    ],
    confidentialityClause:
      'All internal codebase access, training materials, and client assignments are confidential to GENFREX.',
    professionalConductClause:
      'High learning dedication, punctuality, and professional etiquette in all internal interactions.',
    acceptanceTerms:
      'Please sign and return this internship agreement on or before the stated deadline.',
    signatories: [
      { name: 'Anisha', designation: 'People Operations', title: 'People Operations, GENFREX', signatureUrl: '/anisha-signature.png' }
    ]
  }
];

let isMasterRoleTemplatesSeeded = false;

/**
 * Seed or verify master role templates
 */
const seedMasterRoleTemplates = async () => {
  if (isMasterRoleTemplatesSeeded) return;
  try {
    for (const tmpl of DEFAULT_ROLE_TEMPLATES) {
      const existing = await LetterTemplate.findOne({
        $or: [{ name: tmpl.name }, { roleCategory: tmpl.roleCategory }]
      });
      if (!existing) {
        await LetterTemplate.create({
          ...tmpl,
          active: true
        });
      } else {
        const hasAnisha = existing.signatories?.some(
          (s) => s.name === 'Anisha' && s.signatureUrl === '/anisha-signature.png'
        );
        if (!hasAnisha) {
          await LetterTemplate.updateOne(
            { _id: existing._id },
            { $set: { signatories: tmpl.signatories } }
          );
        }
      }
    }
    isMasterRoleTemplatesSeeded = true;
  } catch (err) {
    console.error('Error seeding master role templates:', err.message);
  }
};

/**
 * Get all active role templates
 */
const getMasterRoleTemplates = async () => {
  await seedMasterRoleTemplates();
  return LetterTemplate.find({ active: true }).sort({ isDefault: -1, createdAt: 1 });
};

/**
 * Get active letter template matching role or appointment type
 */
const getActiveTemplate = async (appointmentType = null, designation = null) => {
  await seedMasterRoleTemplates();

  let query = { active: true };

  if (designation) {
    const des = designation.toLowerCase();
    if (des.includes('devops') || des.includes('cloud') || des.includes('infra') || des.includes('sre')) {
      query.roleCategory = 'DEVOPS';
    } else if (des.includes('ui') || des.includes('ux') || des.includes('design') || des.includes('product design')) {
      query.roleCategory = 'UI_UX';
    } else if (des.includes('qa') || des.includes('test') || des.includes('automation') || des.includes('quality')) {
      query.roleCategory = 'QA_TESTING';
    } else if (des.includes('full stack') || des.includes('fullstack') || des.includes('senior')) {
      query.roleCategory = 'FULL_STACK';
    } else if (des.includes('web') || des.includes('frontend') || des.includes('backend') || des.includes('developer')) {
      query.roleCategory = 'WEB_DEV';
    } else if (des.includes('intern')) {
      query.roleCategory = 'INTERNSHIP';
    }
  }

  if (appointmentType && !query.roleCategory) {
    query.appointmentType = appointmentType;
  }

  let template = await LetterTemplate.findOne(query);

  if (!template && query.roleCategory) {
    template = await LetterTemplate.findOne({ active: true, roleCategory: query.roleCategory });
  }

  if (!template && appointmentType) {
    template = await LetterTemplate.findOne({ active: true, appointmentType });
  }

  if (!template) {
    template = await LetterTemplate.findOne({ active: true, isDefault: true }) ||
               await LetterTemplate.findOne({ active: true });
  }

  return template;
};

module.exports = {
  generateReferenceNumber,
  recordHRAudit,
  notifyAdmins,
  notifyHRUser,
  getActiveTemplate,
  getMasterRoleTemplates,
  seedMasterRoleTemplates
};

