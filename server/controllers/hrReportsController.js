const AppointmentLetter = require('../models/AppointmentLetter');
const Candidate = require('../models/Candidate');
const HRAuditLog = require('../models/HRAuditLog');
const HRSettings = require('../models/HRSettings');
const LetterTemplate = require('../models/LetterTemplate');

/**
 * Get comprehensive HR metrics and dashboard stats
 */
const getHRStats = async (req, res, next) => {
  try {
    const totalAppointments = await AppointmentLetter.countDocuments();
    const pendingApprovals = await AppointmentLetter.countDocuments({ status: 'PENDING_APPROVAL' });
    const approvedLetters = await AppointmentLetter.countDocuments({ status: 'APPROVED' });
    const sentLetters = await AppointmentLetter.countDocuments({ status: 'SENT' });
    const rejectedLetters = await AppointmentLetter.countDocuments({ status: 'REJECTED' });
    const acceptedOffers = await AppointmentLetter.countDocuments({ acceptanceStatus: 'ACCEPTED' });
    const declinedOffers = await AppointmentLetter.countDocuments({ acceptanceStatus: 'DECLINED' });
    const totalCandidates = await Candidate.countDocuments();

    // Upcoming joining dates (next 30 days)
    const now = new Date();
    const thirtyDaysAhead = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const upcomingJoining = await AppointmentLetter.find({
      joiningDate: { $gte: now, $lte: thirtyDaysAhead },
      status: { $in: ['APPROVED', 'SENT', 'ACCEPTED'] }
    })
      .populate('candidateId', 'name email phone designation')
      .sort({ joiningDate: 1 })
      .limit(10);

    // Recent activity & recent appointment letters
    const recentAppointments = await AppointmentLetter.find()
      .populate('candidateId', 'name email designation')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentPending = await AppointmentLetter.find({ status: 'PENDING_APPROVAL' })
      .populate('candidateId', 'name email designation employmentType joiningDate')
      .populate('createdBy', 'name email')
      .sort({ submittedAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      stats: {
        totalAppointments,
        pendingApprovals,
        approvedLetters,
        sentLetters,
        rejectedLetters,
        acceptedOffers,
        declinedOffers,
        totalCandidates,
        upcomingJoiningCount: upcomingJoining.length
      },
      upcomingJoining,
      recentAppointments,
      recentPending
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Aggregated HR analytics and report summaries
 */
const getHRReports = async (req, res, next) => {
  try {
    // Breakdown by Status
    const statusBreakdown = await AppointmentLetter.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Breakdown by Employment Type
    const typeBreakdown = await AppointmentLetter.aggregate([
      { $group: { _id: '$appointmentType', count: { $sum: 1 } } }
    ]);

    // Breakdown by Designation
    const designationBreakdown = await AppointmentLetter.aggregate([
      { $group: { _id: '$designation', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Breakdown by HR Creator
    const creatorBreakdown = await AppointmentLetter.aggregate([
      { $group: { _id: '$createdBy', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'creator'
        }
      },
      { $unwind: '$creator' },
      {
        $project: {
          creatorId: '$_id',
          name: '$creator.name',
          email: '$creator.email',
          count: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      reports: {
        statusBreakdown,
        typeBreakdown,
        designationBreakdown,
        creatorBreakdown
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get HR Audit Logs
 */
const getHRAuditLogs = async (req, res, next) => {
  try {
    const { action, appointmentId, candidateId, page = 1, limit = 25 } = req.query;

    const query = {};
    if (action) query.action = action;
    if (appointmentId) query.appointmentLetterId = appointmentId;
    if (candidateId) query.candidateId = candidateId;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await HRAuditLog.countDocuments(query);
    const logs = await HRAuditLog.find(query)
      .populate('actorId', 'name email role')
      .populate('appointmentLetterId', 'referenceNumber designation')
      .populate('candidateId', 'name email')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      count: logs.length,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
      logs
    });
  } catch (error) {
    next(error);
  }
};

const { getMasterRoleTemplates } = require('../services/hrService');

/**
 * Get / Update HR Settings
 */
const getHRSettings = async (req, res, next) => {
  try {
    let settings = await HRSettings.findOne();
    if (!settings) {
      settings = await HRSettings.create({
        companyName: 'GENFREX',
        referencePrefix: 'GFX/HR',
        referenceYear: new Date().getFullYear(),
        currentSequence: 1,
        signatories: [
          {
            name: 'Anisha',
            designation: 'People Operations',
            title: 'People Operations, GENFREX',
            signatureUrl: '/anisha-signature.png',
            isDefault: true
          }
        ]
      });
    } else if (
      !settings.signatories ||
      settings.signatories.length === 0 ||
      settings.signatories.some((s) => s.name === 'P.S. Dharshan' || s.name === 'Deepak P' || !s.signatureUrl)
    ) {
      const updatedSignatories = [
        {
          name: 'Anisha',
          designation: 'People Operations',
          title: 'People Operations, GENFREX',
          signatureUrl: '/anisha-signature.png',
          isDefault: true
        }
      ];
      await HRSettings.updateOne(
        { _id: settings._id },
        { $set: { signatories: updatedSignatories } }
      );
      settings.signatories = updatedSignatories;
    }

    const templates = await getMasterRoleTemplates();
    const template = templates.find((t) => t.isDefault) || templates[0];

    res.status(200).json({
      success: true,
      settings,
      template,
      templates
    });
  } catch (error) {
    next(error);
  }
};

const updateHRSettings = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only Admins can update HR Settings.' });
    }

    let settings = await HRSettings.findOne();
    if (!settings) {
      settings = new HRSettings(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    settings.updatedBy = req.user._id;
    await settings.save();

    res.status(200).json({
      success: true,
      message: 'HR settings updated successfully.',
      settings
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get All Master Role Letter Templates
 */
const getLetterTemplates = async (req, res, next) => {
  try {
    const templates = await getMasterRoleTemplates();
    res.status(200).json({
      success: true,
      templates
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create Master Role Letter Template
 */
const createLetterTemplate = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'HR') {
      return res.status(403).json({ success: false, message: 'Only Admins and HR can create Letter Templates.' });
    }

    const newTemplate = await LetterTemplate.create({
      ...req.body,
      active: true,
      updatedBy: req.user._id
    });

    res.status(201).json({
      success: true,
      message: 'Role-based letter template created successfully.',
      template: newTemplate
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Letter Template
 */
const updateLetterTemplate = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'HR') {
      return res.status(403).json({ success: false, message: 'Only Admins and HR can modify Letter Templates.' });
    }

    const templateId = req.params.id;
    let target;

    if (templateId) {
      target = await LetterTemplate.findByIdAndUpdate(
        templateId,
        { ...req.body, updatedBy: req.user._id },
        { new: true }
      );
    } else {
      const first = await LetterTemplate.findOne({ active: true });
      if (first) {
        target = await LetterTemplate.findByIdAndUpdate(
          first._id,
          { ...req.body, updatedBy: req.user._id },
          { new: true }
        );
      } else {
        target = await LetterTemplate.create({
          ...req.body,
          active: true,
          updatedBy: req.user._id
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Letter template updated successfully.',
      template: target
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Letter Template
 */
const deleteLetterTemplate = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Only Admins can remove Letter Templates.' });
    }

    await LetterTemplate.findByIdAndUpdate(req.params.id, { active: false });

    res.status(200).json({
      success: true,
      message: 'Role template deactivated successfully.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHRStats,
  getHRReports,
  getHRAuditLogs,
  getHRSettings,
  updateHRSettings,
  getLetterTemplates,
  createLetterTemplate,
  updateLetterTemplate,
  deleteLetterTemplate
};
