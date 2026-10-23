const SalaryStructure = require('../models/SalaryStructure');
const User = require('../models/User');
const AppointmentLetter = require('../models/AppointmentLetter');

/**
 * Get all active workers with their salary structures (Admin & HR)
 */
const getAllSalaryStructures = async (req, res, next) => {
  try {
    const workers = await User.find({
      role: { $in: ['WORKER'] },
      isActive: true
    }).select('name email phone title companyName role status candidateId appointmentLetterId');

    const structures = await SalaryStructure.find();
    const structureMap = {};
    structures.forEach((st) => {
      structureMap[st.user.toString()] = st;
    });

    // Also look up accepted/approved appointment letters to extract initial compensation if not configured
    const letters = await AppointmentLetter.find({
      status: { $in: ['ACCEPTED', 'APPROVED', 'SENT'] }
    }).select('workerId candidateId compensation compensationFrequency designation');

    const letterMap = {};
    letters.forEach((letDoc) => {
      if (letDoc.workerId) {
        letterMap[letDoc.workerId.toString()] = letDoc;
      }
    });

    const result = workers.map((worker) => {
      const wId = worker._id.toString();
      const existingStructure = structureMap[wId];
      const appointment = letterMap[wId];

      return {
        worker,
        salaryStructure: existingStructure || null,
        suggestedBaseSalary: appointment ? appointment.compensation : 0,
        appointmentDetails: appointment || null
      };
    });

    res.status(200).json({
      success: true,
      count: result.length,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get salary structure by user ID
 */
const getSalaryStructureByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    let structure = await SalaryStructure.findOne({ user: userId }).populate('user', 'name email role title');

    if (!structure) {
      // Check appointment letter to provide default proposal
      const letter = await AppointmentLetter.findOne({
        workerId: userId,
        status: { $in: ['ACCEPTED', 'APPROVED', 'SENT'] }
      });

      return res.status(200).json({
        success: true,
        data: null,
        suggestedBaseSalary: letter ? letter.compensation : 0
      });
    }

    res.status(200).json({
      success: true,
      data: structure
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create or update salary structure (Admin & HR)
 */
const upsertSalaryStructure = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const {
      salaryType = 'MONTHLY',
      baseSalary,
      allowances = {},
      deductions = {},
      bankDetails = {},
      effectiveDate,
      notes,
      isActive = true
    } = req.body;

    if (baseSalary === undefined || baseSalary === null || isNaN(baseSalary) || baseSalary < 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid non-negative base salary is required.'
      });
    }

    const worker = await User.findById(userId);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found.'
      });
    }

    const structure = await SalaryStructure.findOneAndUpdate(
      { user: userId },
      {
        user: userId,
        salaryType,
        engagementType: req.body.engagementType || 'Freelance – Monthly Retainer',
        workingMode: req.body.workingMode || 'Remote (Freelance)',
        paymentCycleNote: req.body.paymentCycleNote || 'Released after 30 days of placement as per engagement terms.',
        dateOfJoining: req.body.dateOfJoining || Date.now(),
        baseSalary: Number(baseSalary),
        allowances: {
          hra: Number(allowances.hra) || 0,
          conveyance: Number(allowances.conveyance) || 0,
          specialAllowance: Number(allowances.specialAllowance) || 0,
          medicalAllowance: Number(allowances.medicalAllowance) || 0,
          otherAllowance: Number(allowances.otherAllowance) || 0
        },
        deductions: {
          pf: Number(deductions.pf) || 0,
          professionalTax: Number(deductions.professionalTax) || 0,
          tds: Number(deductions.tds) || 0,
          esi: Number(deductions.esi) || 0,
          otherDeduction: Number(deductions.otherDeduction) || 0
        },
        bankDetails: {
          accountHolderName: bankDetails.accountHolderName || worker.name,
          accountNumber: bankDetails.accountNumber || '',
          bankName: bankDetails.bankName || '',
          ifscCode: bankDetails.ifscCode || '',
          panNumber: bankDetails.panNumber || '',
          upiId: bankDetails.upiId || ''
        },
        effectiveDate: effectiveDate || Date.now(),
        notes: notes || '',
        isActive
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Salary structure configured successfully.',
      data: structure
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Worker's view of their own salary structure
 */
const getMySalaryStructure = async (req, res, next) => {
  try {
    const structure = await SalaryStructure.findOne({ user: req.user._id });
    res.status(200).json({
      success: true,
      data: structure
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllSalaryStructures,
  getSalaryStructureByUser,
  upsertSalaryStructure,
  getMySalaryStructure
};
