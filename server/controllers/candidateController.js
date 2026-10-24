const Candidate = require('../models/Candidate');
const Project = require('../models/Project');
const { recordHRAudit } = require('../services/hrService');

/**
 * Get all candidates with search, filtering, and pagination
 */
const getCandidates = async (req, res, next) => {
  try {
    const {
      search,
      status,
      employmentType,
      department,
      source,
      projectId,
      clientId,
      page = 1,
      limit = 20
    } = req.query;

    const query = {};
    if (status) query.candidateStatus = status;
    if (employmentType) query.employmentType = employmentType;
    if (department) query.department = department;
    if (source) query.source = source;
    if (projectId) query.$or = [{ projectId }, { project: projectId }];
    if (clientId) query.$or = [{ clientId }, { client: clientId }];

    if (search) {
      const searchOr = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { designation: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const total = await Candidate.countDocuments(query);
    const candidates = await Candidate.find(query)
      .populate('createdBy', 'name email role')
      .populate('client', 'name email companyName phone')
      .populate('project', 'name status stage client')
      .populate('requirement', 'title description priority status')
      .populate('assignedEmployee', 'name email title avatar skills')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    res.status(200).json({
      success: true,
      count: candidates.length,
      total,
      page: parseInt(page, 10),
      pages: Math.ceil(total / parseInt(limit, 10)),
      candidates
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single candidate by ID
 */
const getCandidateById = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
      .populate('createdBy', 'name email role')
      .populate('client', 'name email companyName phone')
      .populate('project', 'name status stage client')
      .populate('requirement', 'title description priority status')
      .populate('assignedEmployee', 'name email title avatar skills');

    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found.' });
    }

    res.status(200).json({
      success: true,
      candidate
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new candidate
 */
const createCandidate = async (req, res, next) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      designation,
      department,
      employmentType,
      joiningDate,
      workLocation,
      reportingManager,
      compensation,
      compensationFrequency,
      probationPeriod,
      notes,
      source,
      client,
      clientId,
      project,
      projectId,
      requirement,
      requirementId,
      assignedEmployee,
      EmployeeId
    } = req.body;

    if (!name || !email || !phone || !designation) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, phone, and designation are required.'
      });
    }

    // Check for duplicate active candidate with same email
    const existing = await Candidate.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Candidate with email ${email} already exists.`
      });
    }

    const candidate = await Candidate.create({
      name,
      email,
      phone,
      address: address || '',
      designation,
      department: department || 'Engineering',
      employmentType: employmentType || 'Trainee',
      joiningDate: joiningDate || null,
      workLocation: workLocation || 'Remote / Bengaluru',
      reportingManager: reportingManager || 'Technical Lead',
      compensation: compensation || 0,
      compensationFrequency: compensationFrequency || 'STIPEND_MONTHLY',
      probationPeriod: probationPeriod || '3 Months',
      notes: notes || '',
      source: source || (projectId || project ? 'Client Project' : 'Direct HR'),
      client: client || clientId || null,
      clientId: clientId || client || null,
      project: project || projectId || null,
      projectId: projectId || project || null,
      requirement: requirement || requirementId || null,
      requirementId: requirementId || requirement || null,
      assignedEmployee: assignedEmployee || EmployeeId || null,
      EmployeeId: EmployeeId || assignedEmployee || null,
      createdBy: req.user._id
    });

    await recordHRAudit({
      actorId: req.user._id,
      action: 'CANDIDATE_CREATED',
      candidateId: candidate._id,
      metadata: { candidateName: candidate.name, email: candidate.email, designation: candidate.designation }
    });

    if (candidate.projectId || candidate.project) {
      await recordHRAudit({
        actorId: req.user._id,
        action: 'CANDIDATE_LINKED_TO_PROJECT',
        candidateId: candidate._id,
        metadata: {
          candidateName: candidate.name,
          projectId: candidate.projectId || candidate.project,
          clientId: candidate.clientId || candidate.client
        }
      });
    }

    if (candidate.requirementId || candidate.requirement) {
      await recordHRAudit({
        actorId: req.user._id,
        action: 'CANDIDATE_LINKED_TO_REQUIREMENT',
        candidateId: candidate._id,
        metadata: {
          candidateName: candidate.name,
          requirementId: candidate.requirementId || candidate.requirement
        }
      });
    }

    const populated = await Candidate.findById(candidate._id)
      .populate('createdBy', 'name email role')
      .populate('client', 'name email companyName phone')
      .populate('project', 'name status stage client')
      .populate('requirement', 'title description priority status')
      .populate('assignedEmployee', 'name email title avatar skills');

    res.status(201).json({
      success: true,
      message: 'Candidate created successfully.',
      candidate: populated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update candidate
 */
const updateCandidate = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found.' });
    }

    // If changing email, check for duplicate
    if (req.body.email && req.body.email.toLowerCase().trim() !== candidate.email) {
      const duplicate = await Candidate.findOne({ email: req.body.email.toLowerCase().trim() });
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Another candidate with email ${req.body.email} already exists.`
        });
      }
    }

    const prevProject = candidate.projectId || candidate.project;
    const prevReq = candidate.requirementId || candidate.requirement;

    const updated = await Candidate.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    })
      .populate('createdBy', 'name email role')
      .populate('client', 'name email companyName phone')
      .populate('project', 'name status stage client')
      .populate('requirement', 'title description priority status')
      .populate('assignedEmployee', 'name email title avatar skills');

    await recordHRAudit({
      actorId: req.user._id,
      action: 'CANDIDATE_UPDATED',
      candidateId: updated._id,
      metadata: { changes: Object.keys(req.body) }
    });

    const newProject = updated.projectId || updated.project;
    if (newProject && String(newProject) !== String(prevProject)) {
      await recordHRAudit({
        actorId: req.user._id,
        action: 'CANDIDATE_LINKED_TO_PROJECT',
        candidateId: updated._id,
        metadata: {
          candidateName: updated.name,
          projectId: newProject
        }
      });
    }

    const newReq = updated.requirementId || updated.requirement;
    if (newReq && String(newReq) !== String(prevReq)) {
      await recordHRAudit({
        actorId: req.user._id,
        action: 'CANDIDATE_LINKED_TO_REQUIREMENT',
        candidateId: updated._id,
        metadata: {
          candidateName: updated.name,
          requirementId: newReq
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Candidate updated successfully.',
      candidate: updated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Link candidate to ClientFlow project context (ADMIN / HR)
 */
const linkCandidateToProject = async (req, res, next) => {
  try {
    const { projectId, clientId, requirementId, EmployeeId, assignedEmployeeId, designation, role } = req.body;

    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found.' });
    }

    if (projectId) {
      candidate.projectId = projectId;
      candidate.project = projectId;
      candidate.source = 'Client Project';
    }

    if (clientId) {
      candidate.clientId = clientId;
      candidate.client = clientId;
    }

    if (requirementId) {
      candidate.requirementId = requirementId;
      candidate.requirement = requirementId;
    }

    const targetEmployee = assignedEmployeeId || EmployeeId;
    if (targetEmployee) {
      candidate.EmployeeId = targetEmployee;
      candidate.assignedEmployee = targetEmployee;
    }

    if (designation || role) {
      candidate.designation = designation || role;
    }

    await candidate.save();

    // If linking a Employee to the project, ensure Employee is assigned to project as well
    if (projectId && targetEmployee) {
      await Project.findByIdAndUpdate(projectId, {
        $addToSet: { assignedEmployees: targetEmployee }
      });
    }

    // Record cross-module audit logs
    if (projectId) {
      await recordHRAudit({
        actorId: req.user._id,
        action: 'CANDIDATE_LINKED_TO_PROJECT',
        candidateId: candidate._id,
        metadata: {
          candidateName: candidate.name,
          projectId,
          clientId: candidate.clientId || clientId,
          role: candidate.designation
        }
      });
    }

    if (requirementId) {
      await recordHRAudit({
        actorId: req.user._id,
        action: 'CANDIDATE_LINKED_TO_REQUIREMENT',
        candidateId: candidate._id,
        metadata: {
          candidateName: candidate.name,
          requirementId,
          projectId
        }
      });
    }

    const populated = await Candidate.findById(candidate._id)
      .populate('createdBy', 'name email role')
      .populate('client', 'name email companyName phone')
      .populate('project', 'name status stage client')
      .populate('requirement', 'title description priority status')
      .populate('assignedEmployee', 'name email title avatar skills');

    res.status(200).json({
      success: true,
      message: 'Candidate linked to project successfully.',
      candidate: populated
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete candidate
 */
const deleteCandidate = async (req, res, next) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found.' });
    }

    await Candidate.findByIdAndDelete(req.params.id);

    await recordHRAudit({
      actorId: req.user._id,
      action: 'CANDIDATE_DELETED',
      candidateId: candidate._id,
      metadata: { candidateName: candidate.name, email: candidate.email }
    });

    res.status(200).json({
      success: true,
      message: 'Candidate deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCandidates,
  getCandidateById,
  createCandidate,
  updateCandidate,
  linkCandidateToProject,
  deleteCandidate
};
