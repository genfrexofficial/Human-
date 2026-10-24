const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const AuditLog = require('../models/AuditLog');
const Candidate = require('../models/Candidate');
const AppointmentLetter = require('../models/AppointmentLetter');

// @desc    Get all users across all roles (Admin only)
// @route   GET /api/users
// @access  Private (Admin only)
const getAllUsers = async (req, res, next) => {
  try {
    const { search, role, status } = req.query;

    const query = {};

    if (role && role !== 'ALL') {
      query.role = role.toUpperCase();
    }

    if (status && status !== 'ALL') {
      query.status = status.toUpperCase();
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [{ name: regex }, { email: regex }, { companyName: regex }, { title: regex }];
    }

    const users = await User.find(query).select('-password').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin creates HR, Employee, or Client (Strictly NO Admin creation)
// @route   POST /api/users
// @access  Private (Admin only)
const createUser = async (req, res, next) => {
  try {
    const { name, email, phone, role, password, title, companyName, skills, status } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and role are required.'
      });
    }

    const targetRole = role.toUpperCase();

    // STRICT: ADMIN cannot be created via standard user creation
    if (targetRole === 'ADMIN') {
      return res.status(400).json({
        success: false,
        message: 'Administrator accounts cannot be created through standard user management.'
      });
    }

    if (!['HR', 'Employee', 'CLIENT'].includes(targetRole)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role '${targetRole}'. Allowed roles are HR, Employee, or CLIENT.`
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists.'
      });
    }

    const tempPassword = password && password.trim() ? password.trim() : `${targetRole}@${Math.floor(100 + Math.random() * 900)}Pass!`;

    if (tempPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const userStatus = status && status.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';

    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? phone.trim() : '',
      role: targetRole,
      password: tempPassword, // Hashed by User pre-save bcrypt hook
      title: title ? title.trim() : targetRole === 'HR' ? 'HR Talent Lead' : targetRole === 'Employee' ? 'Software Engineer' : 'Client Representative',
      companyName: companyName ? companyName.trim() : targetRole === 'CLIENT' ? 'Client Organization' : 'GENFREX',
      skills: Array.isArray(skills) ? skills : skills ? skills.split(',').map((s) => s.trim()) : [],
      status: userStatus,
      isActive: userStatus === 'ACTIVE',
      tokenVersion: 0
    });

    // If created from an approved Candidate / Appointment, link them atomically
    let linkedCandidate = null;
    if (req.body.candidateId) {
      linkedCandidate = await Candidate.findById(req.body.candidateId);
    } else if (targetRole === 'Employee') {
      linkedCandidate = await Candidate.findOne({ email: normalizedEmail });
    }

    if (linkedCandidate) {
      newUser.candidateId = linkedCandidate._id;
      newUser.hiredFromCandidate = true;

      linkedCandidate.EmployeeId = newUser._id;
      linkedCandidate.assignedEmployee = newUser._id;
      linkedCandidate.candidateStatus = 'ONBOARDED';
      await linkedCandidate.save();

      const appQuery = req.body.appointmentId
        ? { _id: req.body.appointmentId }
        : { candidateId: linkedCandidate._id };

      const appointment = await AppointmentLetter.findOne(appQuery);
      if (appointment) {
        appointment.EmployeeId = newUser._id;
        appointment.assignedEmployee = newUser._id;
        await appointment.save();
        newUser.appointmentLetterId = appointment._id;
      }

      await newUser.save();
    }

    // Create Audit Log (Never log passwords)
    let actionType = 'CREATE_CLIENT';
    if (targetRole === 'HR') actionType = 'CREATE_HR';
    else if (targetRole === 'Employee') actionType = 'CREATE_Employee';

    await AuditLog.create({
      performedBy: req.user._id,
      action: actionType,
      targetUser: newUser._id,
      targetRole,
      targetEmail: newUser.email,
      metadata: {
        ip: req.ip || req.headers['x-forwarded-for'] || '',
        userAgent: req.headers['user-agent'] || '',
        candidateId: linkedCandidate?._id || null
      }
    });

    const userPayload = {
      id: newUser._id,
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      role: newUser.role,
      title: newUser.title,
      companyName: newUser.companyName,
      status: newUser.status,
      isActive: newUser.isActive,
      hiredFromCandidate: newUser.hiredFromCandidate,
      candidateId: newUser.candidateId,
      createdAt: newUser.createdAt
    };

    res.status(201).json({
      success: true,
      message: `${targetRole} account created successfully.`,
      temporaryPassword: tempPassword,
      user: userPayload,
      Employee: userPayload,
      client: userPayload,
      hr: userPayload
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile & status (Admin only)
// @route   PATCH /api/users/:id
// @access  Private (Admin only)
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, title, companyName, skills, status } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    if (name !== undefined) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (title !== undefined) user.title = title.trim();
    if (companyName !== undefined) user.companyName = companyName.trim();
    if (skills !== undefined) {
      user.skills = Array.isArray(skills) ? skills : skills ? skills.split(',').map((s) => s.trim()) : [];
    }

    let statusChanged = false;
    let oldStatus = user.status;

    if (status !== undefined) {
      const nextStatus = status.toUpperCase() === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
      if (user.status !== nextStatus) {
        user.status = nextStatus;
        user.isActive = nextStatus === 'ACTIVE';
        statusChanged = true;

        // Invalidate active sessions when deactivated
        if (nextStatus === 'INACTIVE') {
          user.tokenVersion = (user.tokenVersion || 0) + 1;
        }
      }
    }

    await user.save();

    if (statusChanged) {
      await AuditLog.create({
        performedBy: req.user._id,
        action: user.status === 'ACTIVE' ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
        targetUser: user._id,
        targetRole: user.role,
        targetEmail: user.email,
        metadata: {
          previousStatus: oldStatus,
          newStatus: user.status,
          ip: req.ip || req.headers['x-forwarded-for'] || ''
        }
      });
    } else {
      await AuditLog.create({
        performedBy: req.user._id,
        action: 'UPDATE_USER',
        targetUser: user._id,
        targetRole: user.role,
        targetEmail: user.email,
        metadata: { ip: req.ip || req.headers['x-forwarded-for'] || '' }
      });
    }

    const updatedUser = user.toObject();
    delete updatedUser.password;

    res.status(200).json({
      success: true,
      message: 'User details updated successfully.',
      user: updatedUser
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin changes a user's password (Admin only)
// @route   PATCH /api/users/:id/password
// @access  Private (Admin only)
const changeUserPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation do not match.'
      });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Set new password (User model pre-save bcrypt hook hashes it)
    targetUser.password = newPassword;
    // Invalidate that user's existing sessions
    targetUser.tokenVersion = (targetUser.tokenVersion || 0) + 1;
    await targetUser.save();

    // Audit log (NEVER store password in audit log)
    await AuditLog.create({
      performedBy: req.user._id,
      action: 'CHANGE_USER_PASSWORD',
      targetUser: targetUser._id,
      targetRole: targetUser.role,
      targetEmail: targetUser.email,
      metadata: {
        ip: req.ip || req.headers['x-forwarded-for'] || '',
        userAgent: req.headers['user-agent'] || ''
      }
    });

    res.status(200).json({
      success: true,
      message: `Password for ${targetUser.name} (${targetUser.role}) has been successfully updated.`
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin changes their own password (Admin only)
// @route   PATCH /api/users/admin/password
// @access  Private (Admin only)
const changeAdminPassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password, new password, and confirmation are all required.'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long.'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password and confirmation do not match.'
      });
    }

    const admin = await User.findById(req.user._id);
    if (!admin || admin.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Only the Platform Administrator can perform this action.'
      });
    }

    const isMatch = await admin.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.'
      });
    }

    // Set new password (User model pre-save hook hashes it via bcrypt)
    admin.password = newPassword;
    // Invalidate existing sessions
    admin.tokenVersion = (admin.tokenVersion || 0) + 1;
    await admin.save();

    // Audit log
    await AuditLog.create({
      performedBy: admin._id,
      action: 'CHANGE_ADMIN_PASSWORD',
      targetUser: admin._id,
      targetRole: 'ADMIN',
      targetEmail: admin.email,
      metadata: {
        ip: req.ip || req.headers['x-forwarded-for'] || '',
        userAgent: req.headers['user-agent'] || ''
      }
    });

    res.status(200).json({
      success: true,
      message: 'Administrator password updated successfully. Please log in again.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete/Deactivate user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Administrator cannot delete their own active account.'
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    // Deactivate and delete or mark inactive
    user.status = 'INACTIVE';
    user.isActive = false;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    await user.save();

    // Delete record
    await User.findByIdAndDelete(id);

    await AuditLog.create({
      performedBy: req.user._id,
      action: 'DELETE_USER',
      targetUser: user._id,
      targetRole: user.role,
      targetEmail: user.email,
      metadata: { ip: req.ip || req.headers['x-forwarded-for'] || '' }
    });

    res.status(200).json({
      success: true,
      message: 'User account deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Strict Rejection for Non-Admin Password Changes
// @access  Forbidden for HR, Employee, CLIENT
const rejectNonAdminPasswordChange = (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Forbidden. Password changes must be performed by the Platform Administrator.'
  });
};

// ================= Legacy Handlers for Backwards Compatibility =================

const getClients = async (req, res, next) => {
  try {
    const clients = await User.find({ role: 'CLIENT' }).select('-password').sort({ createdAt: -1 });
    const clientIds = clients.map((c) => c._id);
    const projects = await Project.find({ client: { $in: clientIds } }).select('client name status stage progress health');

    const clientsWithProjects = clients.map((client) => {
      const clientObj = client.toObject();
      clientObj.projects = projects.filter((p) => p.client.toString() === client._id.toString());
      clientObj.projectCount = clientObj.projects.length;
      return clientObj;
    });

    res.status(200).json({
      success: true,
      count: clientsWithProjects.length,
      clients: clientsWithProjects
    });
  } catch (error) {
    next(error);
  }
};

const getClientById = async (req, res, next) => {
  try {
    const client = await User.findOne({ _id: req.params.id, role: 'CLIENT' }).select('-password');
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found.' });
    }
    const projects = await Project.find({ client: client._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, client, projects });
  } catch (error) {
    next(error);
  }
};

const createClient = async (req, res, next) => {
  req.body.role = 'CLIENT';
  return createUser(req, res, next);
};

const getEmployees = async (req, res, next) => {
  try {
    const Employees = await User.find({ role: 'Employee' }).select('-password').sort({ createdAt: -1 });
    const now = new Date();

    const EmployeesWithWorkload = await Promise.all(
      Employees.map(async (Employee) => {
        const EmployeeObj = Employee.toObject();
        const [assigned, inProgress, awaitingReview, completed, blocked, overdue] = await Promise.all([
          Task.countDocuments({ assignedTo: Employee._id, status: { $in: ['ASSIGNED', 'TODO'] } }),
          Task.countDocuments({ assignedTo: Employee._id, status: 'IN_PROGRESS' }),
          Task.countDocuments({ assignedTo: Employee._id, status: 'IN_REVIEW' }),
          Task.countDocuments({ assignedTo: Employee._id, status: 'COMPLETED' }),
          Task.countDocuments({ assignedTo: Employee._id, status: 'BLOCKED' }),
          Task.countDocuments({
            assignedTo: Employee._id,
            status: { $ne: 'COMPLETED' },
            dueDate: { $lt: now, $ne: null }
          })
        ]);

        const totalActive = assigned + inProgress + awaitingReview + blocked;
        EmployeeObj.workload = { assigned, inProgress, awaitingReview, completed, blocked, overdue, totalActive };
        return EmployeeObj;
      })
    );

    // Find candidates whose appointment has been approved, sent, or accepted, but who do not have an active Employee account
    const existingEmployeeEmails = new Set(Employees.map((w) => w.email.toLowerCase()));
    const existingEmployeeIds = new Set(Employees.map((w) => w._id.toString()));

    const approvedAppointments = await AppointmentLetter.find({
      status: { $in: ['APPROVED', 'SENT', 'ACCEPTED'] }
    })
      .populate('candidateId')
      .populate('projectId', 'name')
      .populate('clientId', 'name')
      .sort({ updatedAt: -1 });

    const pendingSetupCandidates = [];
    const seenCandidateIds = new Set();

    for (const app of approvedAppointments) {
      const cand = app.candidateId;
      if (!cand) continue;
      if (seenCandidateIds.has(cand._id.toString())) continue;

      const hasEmployeeId = (cand.EmployeeId && existingEmployeeIds.has(cand.EmployeeId.toString())) ||
        (app.EmployeeId && existingEmployeeIds.has(app.EmployeeId.toString()));
      const hasEmployeeEmail = cand.email && existingEmployeeEmails.has(cand.email.toLowerCase());

      if (!hasEmployeeId && !hasEmployeeEmail) {
        seenCandidateIds.add(cand._id.toString());
        pendingSetupCandidates.push({
          candidateId: cand._id,
          appointmentId: app._id,
          referenceNumber: app.referenceNumber,
          name: cand.name,
          email: cand.email,
          phone: cand.phone || '',
          designation: app.designation || cand.designation,
          department: app.department || cand.department || 'Engineering',
          appointmentType: app.appointmentType || cand.employmentType,
          compensation: app.compensation || cand.compensation,
          compensationFrequency: app.compensationFrequency || cand.compensationFrequency,
          joiningDate: app.joiningDate || cand.joiningDate,
          project: app.projectId || null,
          client: app.clientId || null,
          status: app.status,
          approvedAt: app.approvedAt || app.updatedAt
        });
      }
    }

    res.status(200).json({
      success: true,
      count: EmployeesWithWorkload.length,
      Employees: EmployeesWithWorkload,
      pendingSetupCandidates
    });
  } catch (error) {
    next(error);
  }
};

const getEmployeeById = async (req, res, next) => {
  try {
    const Employee = await User.findOne({ _id: req.params.id, role: 'Employee' }).select('-password');
    if (!Employee) {
      return res.status(404).json({ success: false, message: 'Employee not found.' });
    }
    const tasks = await Task.find({ assignedTo: Employee._id }).populate('project', 'name status stage client').sort({ createdAt: -1 });
    res.status(200).json({ success: true, Employee, tasks });
  } catch (error) {
    next(error);
  }
};

const createEmployee = async (req, res, next) => {
  req.body.role = 'Employee';
  return createUser(req, res, next);
};

const getHRUsers = async (req, res, next) => {
  try {
    const hrUsers = await User.find({ role: 'HR' }).select('-password').sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: hrUsers.length, users: hrUsers });
  } catch (error) {
    next(error);
  }
};

const createHRUser = async (req, res, next) => {
  req.body.role = 'HR';
  return createUser(req, res, next);
};

const deleteHRUser = async (req, res, next) => {
  return deleteUser(req, res, next);
};

module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  changeUserPassword,
  changeAdminPassword,
  deleteUser,
  rejectNonAdminPasswordChange,
  getClients,
  getClientById,
  createClient,
  getEmployees,
  getEmployeeById,
  createEmployee,
  getHRUsers,
  createHRUser,
  deleteHRUser
};
