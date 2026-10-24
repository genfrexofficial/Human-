const TaskRequest = require('../models/TaskRequest');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const { recalculateProjectProgress } = require('../services/progressService');
const { logActivity } = require('../services/activityService');
const { sendNotification } = require('../services/notificationService');

// @desc    Get all task requests (Admin: all, Client: own)
// @route   GET /api/task-requests
// @access  Private (Admin & Client)
const getTaskRequests = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'CLIENT') {
      query = { requestedBy: req.user._id };
    } else if (req.user.role === 'Employee') {
      return res.status(403).json({
        success: false,
        message: 'Employees do not have access to task requests.'
      });
    }

    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.projectId) {
      query.project = req.query.projectId;
    }

    const taskRequests = await TaskRequest.find(query)
      .populate('requestedBy', 'name email companyName avatar')
      .populate('project', 'name status stage client')
      .populate('reviewedBy', 'name email')
      .populate({
        path: 'createdTask',
        populate: { path: 'assignedTo', select: 'name email avatar title' }
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: taskRequests.length,
      taskRequests
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single task request by ID
// @route   GET /api/task-requests/:id
// @access  Private (Admin or Requester Client)
const getTaskRequestById = async (req, res, next) => {
  try {
    const taskRequest = await TaskRequest.findById(req.params.id)
      .populate('requestedBy', 'name email companyName avatar')
      .populate('project', 'name status stage client')
      .populate('reviewedBy', 'name email')
      .populate({
        path: 'createdTask',
        populate: { path: 'assignedTo', select: 'name email avatar title' }
      });

    if (!taskRequest) {
      return res.status(404).json({
        success: false,
        message: 'Task request not found.'
      });
    }

    if (req.user.role === 'CLIENT' && taskRequest.requestedBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own task requests.'
      });
    }

    res.status(200).json({
      success: true,
      taskRequest
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new task request
// @route   POST /api/task-requests
// @access  Private (Client only)
const createTaskRequest = async (req, res, next) => {
  try {
    const { title, description, project: projectId, priority, requestedDeadline, attachments } = req.body;

    if (!title || !description || !projectId) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, and project are required.'
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    // Ensure client owns the project
    if (project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only create task requests for your assigned projects.'
      });
    }

    const taskRequest = await TaskRequest.create({
      title: title.trim(),
      description: description.trim(),
      project: projectId,
      requestedBy: req.user._id,
      priority: priority || 'MEDIUM',
      requestedDeadline: requestedDeadline || null,
      attachments: Array.isArray(attachments) ? attachments : [],
      status: 'PENDING_APPROVAL'
    });

    const populatedRequest = await TaskRequest.findById(taskRequest._id)
      .populate('requestedBy', 'name email companyName avatar')
      .populate('project', 'name client');

    // Audit log
    await logActivity({
      projectId,
      userId: req.user._id,
      action: 'TASK_REQUEST_CREATED',
      description: `${req.user.name} submitted task request "${taskRequest.title}".`,
      entityType: 'TASK_REQUEST',
      entityId: taskRequest._id,
      clientVisible: true
    });

    // Notify project creator / Admin
    if (project.createdBy) {
      await sendNotification({
        userId: project.createdBy,
        projectId,
        title: 'New Task Request',
        type: 'TASK_REQUEST',
        message: `Client ${req.user.name} submitted task request "${taskRequest.title}".`,
        link: '/admin/task-requests'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Task request submitted successfully. Awaiting admin review.',
      taskRequest: populatedRequest
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve task request & assign Employee to new task
// @route   POST /api/task-requests/:id/approve
// @access  Private (Admin only)
const approveTaskRequest = async (req, res, next) => {
  try {
    const { assignedTo: EmployeeId, priority, dueDate, adminNotes } = req.body;

    const taskRequest = await TaskRequest.findById(req.params.id);
    if (!taskRequest) {
      return res.status(404).json({
        success: false,
        message: 'Task request not found.'
      });
    }

    if (taskRequest.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve request with status '${taskRequest.status}'. Only PENDING_APPROVAL requests can be approved.`
      });
    }

    if (!EmployeeId) {
      return res.status(400).json({
        success: false,
        message: 'A Employee must be assigned when approving a task request.'
      });
    }

    // Validate Employee
    const Employee = await User.findOne({ _id: EmployeeId, role: 'Employee' });
    if (!Employee) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Employee selected. The user must exist and have the Employee role.'
      });
    }

    const project = await Project.findById(taskRequest.project);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Associated project not found.'
      });
    }

    // Create the task atomically
    const newTask = await Task.create({
      project: taskRequest.project,
      title: taskRequest.title,
      description: taskRequest.description,
      createdBy: req.user._id,
      requestedBy: taskRequest.requestedBy,
      assignedBy: req.user._id,
      assignedTo: Employee._id,
      taskRequest: taskRequest._id,
      priority: priority || taskRequest.priority || 'MEDIUM',
      dueDate: dueDate || taskRequest.requestedDeadline || null,
      status: 'ASSIGNED',
      progress: 0,
      clientVisible: true,
      attachments: taskRequest.attachments || []
    });

    // Update TaskRequest status to APPROVED
    taskRequest.status = 'APPROVED';
    taskRequest.reviewedBy = req.user._id;
    taskRequest.reviewedAt = new Date();
    taskRequest.adminNotes = adminNotes || '';
    taskRequest.createdTask = newTask._id;
    await taskRequest.save();

    // Ensure Employee is registered in project.assignedEmployees
    if (!project.assignedEmployees.some((w) => w.toString() === Employee._id.toString())) {
      project.assignedEmployees.push(Employee._id);
      await project.save();
    }

    // Recalculate project progress & health
    await recalculateProjectProgress(project._id, req.user._id);

    // Audit logs
    await logActivity({
      projectId: project._id,
      userId: req.user._id,
      action: 'TASK_REQUEST_APPROVED',
      description: `Admin ${req.user.name} approved task request "${taskRequest.title}".`,
      entityType: 'TASK_REQUEST',
      entityId: taskRequest._id,
      clientVisible: true
    });

    await logActivity({
      projectId: project._id,
      userId: req.user._id,
      action: 'TASK_ASSIGNED',
      description: `Task "${newTask.title}" assigned to ${Employee.name}.`,
      entityType: 'TASK',
      entityId: newTask._id,
      clientVisible: true
    });

    // Notify Employee
    await sendNotification({
      userId: Employee._id,
      projectId: project._id,
      title: 'New Task Assigned',
      type: 'TASK',
      message: `You have been assigned to task "${newTask.title}" in project "${project.name}".`,
      link: `/Employee/tasks/${newTask._id}`
    });

    // Notify Client
    await sendNotification({
      userId: taskRequest.requestedBy,
      projectId: project._id,
      title: 'Task Request Approved',
      type: 'TASK_REQUEST',
      message: `Your task request "${taskRequest.title}" has been approved and assigned to the team.`,
      link: `/client/task-requests`
    });

    const populatedTask = await Task.findById(newTask._id)
      .populate('assignedTo', 'name email avatar title')
      .populate('project', 'name');

    res.status(200).json({
      success: true,
      message: `Task request approved and assigned to ${Employee.name}.`,
      task: populatedTask,
      taskRequest
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject task request
// @route   POST /api/task-requests/:id/reject
// @access  Private (Admin only)
const rejectTaskRequest = async (req, res, next) => {
  try {
    const { rejectionReason, adminNotes } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A rejection reason is required when rejecting a task request.'
      });
    }

    const taskRequest = await TaskRequest.findById(req.params.id);
    if (!taskRequest) {
      return res.status(404).json({
        success: false,
        message: 'Task request not found.'
      });
    }

    if (taskRequest.status !== 'PENDING_APPROVAL') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject request with status '${taskRequest.status}'. Only PENDING_APPROVAL requests can be rejected.`
      });
    }

    taskRequest.status = 'REJECTED';
    taskRequest.rejectionReason = rejectionReason.trim();
    taskRequest.adminNotes = adminNotes ? adminNotes.trim() : '';
    taskRequest.reviewedBy = req.user._id;
    taskRequest.reviewedAt = new Date();
    await taskRequest.save();

    // Audit log
    await logActivity({
      projectId: taskRequest.project,
      userId: req.user._id,
      action: 'TASK_REQUEST_REJECTED',
      description: `Admin ${req.user.name} rejected task request "${taskRequest.title}": ${rejectionReason.trim()}`,
      entityType: 'TASK_REQUEST',
      entityId: taskRequest._id,
      clientVisible: true
    });

    // Notify Client
    await sendNotification({
      userId: taskRequest.requestedBy,
      projectId: taskRequest.project,
      title: 'Task Request Rejected',
      type: 'TASK_REQUEST',
      message: `Your task request "${taskRequest.title}" was not approved: ${rejectionReason.trim()}`,
      link: `/client/task-requests`
    });

    res.status(200).json({
      success: true,
      message: 'Task request rejected.',
      taskRequest
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTaskRequests,
  getTaskRequestById,
  createTaskRequest,
  approveTaskRequest,
  rejectTaskRequest
};
