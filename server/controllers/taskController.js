const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const File = require('../models/File');
const Comment = require('../models/Comment');
const { recalculateProjectProgress } = require('../services/progressService');
const { logActivity } = require('../services/activityService');
const { sendNotification } = require('../services/notificationService');

// Allowed status transitions mapping
const Employee_ALLOWED_TRANSITIONS = {
  ASSIGNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['BLOCKED', 'IN_REVIEW', 'COMPLETED'],
  BLOCKED: ['IN_PROGRESS'],
  CHANGES_REQUESTED: ['IN_PROGRESS'],
  TODO: ['IN_PROGRESS'],
  PENDING_APPROVAL: ['ASSIGNED', 'REJECTED'],
  APPROVED: ['IN_PROGRESS', 'ASSIGNED'],
  REJECTED: ['TODO', 'IN_PROGRESS']
};

const ADMIN_ALLOWED_TRANSITIONS = {
  IN_REVIEW: ['COMPLETED', 'CHANGES_REQUESTED', 'IN_PROGRESS'],
  TODO: ['ASSIGNED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'],
  ASSIGNED: ['IN_PROGRESS', 'TODO', 'BLOCKED', 'COMPLETED'],
  IN_PROGRESS: ['IN_REVIEW', 'BLOCKED', 'COMPLETED', 'CHANGES_REQUESTED'],
  BLOCKED: ['IN_PROGRESS', 'TODO', 'COMPLETED'],
  CHANGES_REQUESTED: ['IN_PROGRESS', 'COMPLETED'],
  COMPLETED: ['IN_PROGRESS', 'IN_REVIEW'] // allows reopening if necessary
};

// Helper to normalize and deduplicate assignee IDs from both assignedEmployees array and legacy assignedTo
const normalizeAssigneeIds = (assignedEmployees, assignedTo) => {
  let ids = [];
  if (Array.isArray(assignedEmployees)) {
    ids = assignedEmployees.map((id) => (id?._id ? id._id : id)).filter(Boolean);
  } else if (typeof assignedEmployees === 'string' && assignedEmployees.trim()) {
    try {
      const parsed = JSON.parse(assignedEmployees);
      if (Array.isArray(parsed)) ids = parsed;
      else ids = [assignedEmployees];
    } catch {
      ids = [assignedEmployees];
    }
  }
  if (assignedTo) {
    const singleId = assignedTo?._id ? assignedTo._id : assignedTo;
    if (singleId && !ids.some((id) => id.toString() === singleId.toString())) {
      ids.push(singleId);
    }
  }
  // Deduplicate and ensure valid ObjectId strings
  const unique = [];
  const set = new Set();
  for (const rawId of ids) {
    if (!rawId) continue;
    const s = rawId.toString();
    if (mongoose.Types.ObjectId.isValid(s) && !set.has(s)) {
      set.add(s);
      unique.push(s);
    }
  }
  return unique;
};

// Helper to check if a user is assigned to a task (supports both assignedEmployees array and assignedTo)
const isUserAssignedToTask = (task, userId) => {
  if (!task || !userId) return false;
  const uIdStr = userId.toString();
  if (task.assignedTo) {
    const aId = task.assignedTo?._id ? task.assignedTo._id.toString() : task.assignedTo.toString();
    if (aId === uIdStr) return true;
  }
  if (Array.isArray(task.assignedEmployees)) {
    return task.assignedEmployees.some((emp) => {
      const empId = emp?._id ? emp._id.toString() : emp?.toString();
      return empId === uIdStr;
    });
  }
  return false;
};

// @desc    Get all tasks for a project
// @route   GET /api/tasks/project/:projectId
// @access  Private (Admin, Employee assigned, Client of project)
const getProjectTasks = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    if (!projectId || projectId === 'undefined' || !mongoose.Types.ObjectId.isValid(projectId)) {
      return res.status(200).json({
        success: true,
        count: 0,
        tasks: []
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    let query = { project: projectId };

    // Role-specific scoping
    if (req.user.role === 'CLIENT') {
      if (project.client.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to view tasks for this project.'
        });
      }
      query.clientVisible = true; // Client only sees clientVisible tasks
    } else if (req.user.role === 'Employee' || req.user.role === 'HR') {
      // Employee or HR can see all project tasks if assigned to project, or just their assigned tasks
      const isAssigned = project.assignedEmployees && project.assignedEmployees.some(
        (w) => w.toString() === req.user._id.toString()
      );
      if (!isAssigned && req.user.role === 'Employee') {
        query.$or = [{ assignedEmployees: req.user._id }, { assignedTo: req.user._id }];
      }
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    let tasks = await Task.find(query)
      .populate('assignedTo', 'name email avatar title role')
      .populate('assignedEmployees', 'name email avatar title role phone')
      .populate('createdBy', 'name email')
      .populate('milestone', 'title dueDate status')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      tasks
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all personal company tasks
// @route   GET /api/tasks/personal
// @access  Private (ADMIN, HR, Employee)
const getPersonalTasks = async (req, res, next) => {
  try {
    let query = { taskType: 'PERSONAL' };

    if (req.user.role === 'Employee' || req.query.assignedTo === 'me') {
      query.$or = [{ assignedEmployees: req.user._id }, { assignedTo: req.user._id }];
    } else if (req.query.assignedTo && req.query.assignedTo !== 'ALL') {
      query.$or = [
        { assignedEmployees: req.query.assignedTo },
        { assignedTo: req.query.assignedTo }
      ];
    }

    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.personalCategory || req.query.category) {
      query.personalCategory = req.query.personalCategory || req.query.category;
    }
    if (req.query.priority) {
      query.priority = req.query.priority;
    }

    let tasks = await Task.find(query)
      .populate('assignedTo', 'name email avatar title phone')
      .populate('assignedEmployees', 'name email avatar title role phone')
      .populate('createdBy', 'name email role')
      .populate('assignedBy', 'name email role')
      .sort({ dueDate: 1, createdAt: -1 })
      .lean();

    const taskIds = tasks.map((t) => t._id);
    const files = await File.find({ task: { $in: taskIds }, status: { $ne: 'DELETED' } })
      .select('_id task fileName fileUrl fileType mimeType fileSize storageProvider isLink linkUrl createdAt')
      .lean();

    const filesByTask = {};
    files.forEach((f) => {
      const tId = f.task ? f.task.toString() : '';
      if (tId) {
        if (!filesByTask[tId]) filesByTask[tId] = [];
        filesByTask[tId].push(f);
      }
    });

    const tasksWithFiles = tasks.map((t) => {
      const linkedFiles = filesByTask[t._id.toString()] || [];
      const attachments = (t.attachments && t.attachments.length > 0)
        ? t.attachments
        : linkedFiles.filter(Boolean).map((lf) => ({
            _id: lf._id,
            fileName: lf?.fileName || lf?.originalFileName || 'Attached Document',
            fileUrl: lf?.fileUrl || lf?.linkUrl,
            fileSize: lf?.fileSize || 0,
            fileType: lf?.fileType || lf?.mimeType || 'application/octet-stream',
            isLink: lf?.isLink
          }));

      return {
        ...t,
        attachments,
        files: linkedFiles
      };
    });

    res.status(200).json({
      success: true,
      count: tasksWithFiles.length,
      tasks: tasksWithFiles
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my assigned tasks (Employee portal)
// @route   GET /api/tasks/my-tasks
// @access  Private (Employee)
const getMyTasks = async (req, res, next) => {
  try {
    let query = {
      $or: [{ assignedEmployees: req.user._id }, { assignedTo: req.user._id }]
    };

    if (req.query.taskType) {
      query.taskType = req.query.taskType;
    }
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.projectId) {
      query.project = req.query.projectId;
    }

    let tasks = await Task.find(query)
      .populate('project', 'name status stage client health')
      .populate('milestone', 'title dueDate status')
      .populate('assignedTo', 'name email avatar title role')
      .populate('assignedEmployees', 'name email avatar title role phone')
      .populate('createdBy', 'name email role')
      .populate('assignedBy', 'name email role')
      .sort({ dueDate: 1, createdAt: -1 })
      .lean();

    const taskIds = tasks.map((t) => t._id);
    const files = await File.find({ task: { $in: taskIds }, status: { $ne: 'DELETED' } })
      .select('_id task fileName fileUrl fileType mimeType fileSize storageProvider isLink linkUrl createdAt')
      .lean();

    const filesByTask = {};
    files.forEach((f) => {
      const tId = f.task ? f.task.toString() : '';
      if (tId) {
        if (!filesByTask[tId]) filesByTask[tId] = [];
        filesByTask[tId].push(f);
      }
    });

    const tasksWithFiles = tasks.map((t) => {
      const linkedFiles = filesByTask[t._id.toString()] || [];
      const attachments = (t.attachments && t.attachments.length > 0)
        ? t.attachments
        : linkedFiles.filter(Boolean).map((lf) => ({
            _id: lf._id,
            fileName: lf?.fileName || lf?.originalFileName || 'Attached Document',
            fileUrl: lf?.fileUrl || lf?.linkUrl,
            fileSize: lf?.fileSize || 0,
            fileType: lf?.fileType || lf?.mimeType || 'application/octet-stream',
            isLink: lf?.isLink
          }));

      return {
        ...t,
        attachments,
        files: linkedFiles
      };
    });

    res.status(200).json({
      success: true,
      count: tasksWithFiles.length,
      tasks: tasksWithFiles
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single task by ID
// @route   GET /api/tasks/:id
// @access  Private (Admin, HR, Assigned Employee, Client if visible)
const getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'name status stage client health createdBy')
      .populate('assignedTo', 'name email avatar title phone')
      .populate('assignedEmployees', 'name email avatar title role phone')
      .populate('createdBy', 'name email role')
      .populate('assignedBy', 'name email role')
      .populate('requestedBy', 'name email companyName')
      .populate('milestone', 'title dueDate status')
      .populate('taskRequest', 'title description priority');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.'
      });
    }

    // Safe string ID resolver
    const toIdStr = (val) => {
      if (!val) return null;
      if (val._id) return val._id.toString();
      if (typeof val.toString === 'function') return val.toString();
      return String(val);
    };

    const currentUserId = toIdStr(req.user._id);

    // Personal Task Access Rules
    if (task.taskType === 'PERSONAL') {
      if (req.user.role === 'CLIENT') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Personal company tasks are internal only.'
        });
      }
      if (req.user.role === 'Employee') {
        const isAssigned = isUserAssignedToTask(task, currentUserId);
        if (!isAssigned) {
          return res.status(403).json({
            success: false,
            message: 'Access denied. You are not assigned to this personal task.'
          });
        }
      }
      return res.status(200).json({
        success: true,
        task
      });
    }

    // Project Task Access Rules
    if (req.user.role === 'CLIENT') {
      const projectClientId = toIdStr(task.project?.client);
      if (!task.project || (projectClientId && projectClientId !== currentUserId) || !task.clientVisible) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You cannot view this task.'
        });
      }
    } else if (req.user.role === 'Employee') {
      const isAssigned = isUserAssignedToTask(task, currentUserId);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not assigned to this task.'
        });
      }
    }

    res.status(200).json({
      success: true,
      task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new task (Project or Personal Company Task)
// @route   POST /api/tasks
// @access  Private (Admin only)
const createTask = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Admin can create and assign tasks.'
      });
    }

    const {
      project: projectId,
      taskType = 'PROJECT',
      personalCategory = 'INTERNAL_WORK',
      title,
      description,
      assignedTo,
      assignedEmployees,
      status,
      priority,
      dueDate,
      milestone,
      estimatedHours,
      clientVisible
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Task title is required.'
      });
    }

    const assigneeIds = normalizeAssigneeIds(assignedEmployees, assignedTo);

    // PERSONAL TASK FLOW
    if (taskType === 'PERSONAL') {
      if (assigneeIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'At least one team member must be assigned to a personal task.'
        });
      }

      const assignedUsers = await User.find({ _id: { $in: assigneeIds } });
      if (assignedUsers.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Assigned employee(s) not found.'
        });
      }

      const task = await Task.create({
        taskType: 'PERSONAL',
        personalCategory: personalCategory || 'INTERNAL_WORK',
        project: null,
        title: title.trim(),
        description: description || '',
        createdBy: req.user._id,
        assignedBy: req.user._id,
        assignedEmployees: assigneeIds,
        assignedTo: assigneeIds[0],
        status: status || 'ASSIGNED',
        priority: priority || 'MEDIUM',
        dueDate: dueDate || null,
        estimatedHours: Number(estimatedHours) || 0,
        clientVisible: false,
        progress: 0
      });

      const populatedTask = await Task.findById(task._id)
        .populate('assignedTo', 'name email avatar title phone')
        .populate('assignedEmployees', 'name email avatar title role phone')
        .populate('createdBy', 'name email role')
        .populate('assignedBy', 'name email role');

      // Dispatch in-app notifications to all assigned employees
      for (const assignedUser of assignedUsers) {
        await sendNotification({
          userId: assignedUser._id,
          title: 'New Personal Task Assigned',
          type: 'TASK',
          message: `${req.user.name} (${req.user.role}) assigned you a personal task: "${task.title}".`,
          link: `/Employee/tasks`
        });
      }

      return res.status(201).json({
        success: true,
        message: 'Personal task created and assigned successfully.',
        task: populatedTask
      });
    }

    // PROJECT TASK FLOW
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID and task title are required.'
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    if (assigneeIds.length > 0) {
      const assignedUsers = await User.find({ _id: { $in: assigneeIds } });
      let projectModified = false;
      assignedUsers.forEach((usr) => {
        if (usr.role === 'Employee') {
          if (!project.assignedEmployees.some((w) => w.toString() === usr._id.toString())) {
            project.assignedEmployees.push(usr._id);
            projectModified = true;
          }
        }
      });
      if (projectModified) {
        await project.save();
      }
    }

    const task = await Task.create({
      taskType: 'PROJECT',
      project: projectId,
      title: title.trim(),
      description: description || '',
      createdBy: req.user._id,
      assignedBy: req.user._id,
      assignedEmployees: assigneeIds,
      assignedTo: assigneeIds.length > 0 ? assigneeIds[0] : null,
      milestone: milestone || null,
      status: status || (assigneeIds.length > 0 ? 'ASSIGNED' : 'TODO'),
      priority: priority || 'MEDIUM',
      dueDate: dueDate || null,
      estimatedHours: Number(estimatedHours) || 0,
      clientVisible: clientVisible !== undefined ? clientVisible : true,
      progress: 0
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email avatar title')
      .populate('assignedEmployees', 'name email avatar title role phone')
      .populate('milestone', 'title dueDate')
      .populate('createdBy', 'name email role');

    // Recalculate progress & health
    await recalculateProjectProgress(projectId, req.user._id);

    // Audit log
    await logActivity({
      projectId,
      userId: req.user._id,
      action: 'TASK_CREATED',
      description: `${req.user.name} created task "${task.title}".`,
      entityType: 'TASK',
      entityId: task._id,
      clientVisible: task.clientVisible
    });

    // Notify all assigned Employees
    for (const empId of assigneeIds) {
      await sendNotification({
        userId: empId,
        projectId,
        title: 'New Task Assigned',
        type: 'TASK',
        message: `You were assigned to task "${task.title}".`,
        link: `/Employee/tasks/${task._id}`
      });
    }

    res.status(201).json({
      success: true,
      message: 'Task created successfully.',
      task: populatedTask
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task details / status
// @route   PUT /api/tasks/:id
// @access  Private (Admin or assigned Employee)
const ALL_VALID_STATUSES = [
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'ASSIGNED',
  'TODO',
  'IN_PROGRESS',
  'BLOCKED',
  'IN_REVIEW',
  'CHANGES_REQUESTED',
  'COMPLETED'
];

const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.'
      });
    }

    const {
      title,
      description,
      assignedTo,
      assignedEmployees,
      status,
      priority,
      dueDate,
      milestone,
      estimatedHours,
      actualHours,
      clientVisible,
      progress,
      personalCategory,
      category
    } = req.body;

    const oldStatus = task.status;
    const oldProgress = task.progress;
    let newlyAddedAssigneeIds = [];

    // ASSIGNEE ACCESS CHECK & MANAGER ROLE CHECK
    const isAssignee = isUserAssignedToTask(task, req.user._id);
    const isManager = req.user.role === 'ADMIN' || (req.user.role === 'HR' && task.taskType === 'PERSONAL');

    if (!isManager) {
      if (!isAssignee) {
        return res.status(403).json({
          success: false,
          message: 'You are only authorized to update your own assigned tasks.'
        });
      }

      // If updating status, validate state machine for employee
      if (status && status !== oldStatus) {
        const allowedNext = Employee_ALLOWED_TRANSITIONS[oldStatus] || [];
        if (!allowedNext.includes(status)) {
          return res.status(400).json({
            success: false,
            message: `Invalid state transition from '${oldStatus}' to '${status}' for role Employee. Allowed transitions: ${allowedNext.join(', ') || 'None'}.`
          });
        }

        if (status === 'COMPLETED' && task.taskType === 'PERSONAL') {
          const hasExistingAttachments = Array.isArray(task.attachments) && task.attachments.length > 0;
          const hasExistingFiles = await File.exists({ task: task._id, status: { $ne: 'DELETED' } });
          if (!hasExistingAttachments && !hasExistingFiles && !req.body.fileId && !req.body.attachment) {
            return res.status(400).json({
              success: false,
              message: 'Please attach a completion document or proof of work before marking this company task as completed.'
            });
          }
          task.completedAt = new Date();
          task.progress = 100;
        }

        task.status = status;
        if (status === 'IN_PROGRESS' && !task.startedAt) {
          task.startedAt = new Date();
        }
      }

      // Employee can update progress
      if (progress !== undefined) {
        const pNum = Number(progress);
        if (isNaN(pNum) || pNum < 0 || pNum > 100) {
          return res.status(400).json({
            success: false,
            message: 'Progress must be a number between 0 and 100.'
          });
        }
        task.progress = pNum;
      }

      if (actualHours !== undefined) task.actualHours = Number(actualHours) || task.actualHours;
      if (description !== undefined) task.description = description;

    } else {
      // Manager update (Admin or HR for personal tasks)
      if (title) task.title = title.trim();
      if (description !== undefined) task.description = description;
      if (personalCategory || category) task.personalCategory = personalCategory || category;
      if (milestone !== undefined) task.milestone = milestone || null;
      if (priority) task.priority = priority;
      if (dueDate !== undefined) task.dueDate = dueDate || null;
      if (estimatedHours !== undefined) task.estimatedHours = Number(estimatedHours) || 0;
      if (actualHours !== undefined) task.actualHours = Number(actualHours) || 0;
      if (clientVisible !== undefined && task.taskType !== 'PERSONAL') task.clientVisible = clientVisible;

      // Multi-Assignee & Dynamic Re-assignment handling
      if (assignedEmployees !== undefined || assignedTo !== undefined) {
        const newAssigneeIds = normalizeAssigneeIds(
          assignedEmployees !== undefined ? assignedEmployees : task.assignedEmployees,
          assignedTo
        );

        // Previous assignees list
        const oldAssigneeIds = [];
        if (Array.isArray(task.assignedEmployees)) {
          task.assignedEmployees.forEach((id) => {
            const s = id?._id ? id._id.toString() : id?.toString();
            if (s && !oldAssigneeIds.includes(s)) oldAssigneeIds.push(s);
          });
        }
        if (task.assignedTo) {
          const s = task.assignedTo?._id ? task.assignedTo._id.toString() : task.assignedTo.toString();
          if (s && !oldAssigneeIds.includes(s)) oldAssigneeIds.push(s);
        }

        newlyAddedAssigneeIds = newAssigneeIds.filter((id) => !oldAssigneeIds.includes(id));

        task.assignedEmployees = newAssigneeIds;
        task.assignedTo = newAssigneeIds.length > 0 ? newAssigneeIds[0] : null;
        task.assignedBy = req.user._id;

        if (newAssigneeIds.length > 0 && task.status === 'TODO') {
          task.status = 'ASSIGNED';
        }

        // If project task, ensure newly assigned employees are added to project.assignedEmployees
        if (task.project && newlyAddedAssigneeIds.length > 0) {
          const projectDoc = await Project.findById(task.project);
          if (projectDoc) {
            let pChanged = false;
            newlyAddedAssigneeIds.forEach((newEmpId) => {
              if (!projectDoc.assignedEmployees.some((w) => w.toString() === newEmpId)) {
                projectDoc.assignedEmployees.push(newEmpId);
                pChanged = true;
              }
            });
            if (pChanged) await projectDoc.save();
          }
        }
      }

      if (progress !== undefined) {
        const pNum = Number(progress);
        if (isNaN(pNum) || pNum < 0 || pNum > 100) {
          return res.status(400).json({
            success: false,
            message: 'Progress must be a number between 0 and 100.'
          });
        }
        task.progress = pNum;
      }

      if (status && status !== oldStatus) {
        if (!ALL_VALID_STATUSES.includes(status)) {
          return res.status(400).json({
            success: false,
            message: `Invalid task status '${status}'. Allowed statuses: ${ALL_VALID_STATUSES.join(', ')}.`
          });
        }
        task.status = status;
        if (status === 'COMPLETED') {
          task.completedAt = new Date();
          task.progress = 100;
        } else if (status === 'IN_PROGRESS' && !task.startedAt) {
          task.startedAt = new Date();
        } else if (oldStatus === 'COMPLETED' && status !== 'COMPLETED') {
          task.completedAt = null;
        }
      }
    }

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email avatar title phone')
      .populate('assignedEmployees', 'name email avatar title role phone')
      .populate('milestone', 'title dueDate')
      .populate('project', 'name client')
      .populate('createdBy', 'name email role')
      .populate('assignedBy', 'name email role');

    // Dispatch instant notification ONLY to newly added assignees
    if (newlyAddedAssigneeIds && newlyAddedAssigneeIds.length > 0) {
      for (const newEmpId of newlyAddedAssigneeIds) {
        await sendNotification({
          userId: newEmpId,
          projectId: task.project || undefined,
          title: 'New Task Assigned to You',
          type: 'TASK',
          message: `${req.user.name} assigned you to task: "${task.title}".`,
          link: task.taskType === 'PERSONAL' ? `/Employee/tasks` : `/Employee/tasks/${task._id}`
        });
      }
    }

    // Recalculate project progress if project task
    let progressResult = null;
    if (task.project) {
      progressResult = await recalculateProjectProgress(task.project, req.user._id);
    }

    // Activity & notifications
    if (oldStatus !== task.status) {
      let action = 'TASK_UPDATED';
      if (task.status === 'IN_PROGRESS' && oldStatus !== 'IN_PROGRESS') action = 'TASK_STARTED';
      if (task.status === 'BLOCKED') action = 'TASK_BLOCKED';
      if (task.status === 'IN_REVIEW') action = 'TASK_SUBMITTED_FOR_REVIEW';
      if (task.status === 'COMPLETED') action = 'TASK_COMPLETED';

      if (task.project) {
        await logActivity({
          projectId: task.project,
          userId: req.user._id,
          action,
          description: `${req.user.name} transitioned task "${task.title}" from ${oldStatus} to ${task.status}.`,
          entityType: 'TASK',
          entityId: task._id,
          clientVisible: task.clientVisible
        });
      }

      // If Employee or HR submitted for review, notify Admin or assigner
      if (task.status === 'IN_REVIEW' && req.user.role !== 'ADMIN') {
        let recipientId = null;
        if (task.project) {
          const project = await Project.findById(task.project);
          recipientId = project?.createdBy;
        } else {
          recipientId = task.assignedBy || task.createdBy;
        }

        if (recipientId) {
          await sendNotification({
            userId: recipientId,
            projectId: task.project || undefined,
            title: 'Task Awaiting Review',
            type: 'TASK',
            message: `Employee ${req.user.name} submitted task "${task.title}" for review.`,
            link: task.taskType === 'PERSONAL' ? `/admin/tasks` : `/admin/tasks`
          });
        }
      }

      // If admin or HR completed task, notify all assigned Employees and client (if applicable)
      if (task.status === 'COMPLETED' && (req.user.role === 'ADMIN' || req.user.role === 'HR')) {
        const notifyTargetIds = [];
        if (Array.isArray(task.assignedEmployees) && task.assignedEmployees.length > 0) {
          task.assignedEmployees.forEach((e) => {
            const sid = e?._id ? e._id.toString() : e.toString();
            if (sid && !notifyTargetIds.includes(sid)) notifyTargetIds.push(sid);
          });
        } else if (task.assignedTo) {
          notifyTargetIds.push(task.assignedTo.toString());
        }

        for (const empId of notifyTargetIds) {
          await sendNotification({
            userId: empId,
            projectId: task.project || undefined,
            title: 'Task Approved & Completed',
            type: 'TASK',
            message: `${req.user.role} approved and completed your task "${task.title}".`,
            link: `/Employee/tasks`
          });
        }

        if (task.project) {
          const project = await Project.findById(task.project);
          if (project && project.client && task.clientVisible) {
            await sendNotification({
              userId: project.client,
              projectId: project._id,
              title: 'Task Completed',
              type: 'TASK',
              message: `Task "${task.title}" has been completed!`,
              link: `/client/projects/${project._id}`
            });
          }
        }
      }
    } else if (oldProgress !== task.progress) {
      if (task.project) {
        await logActivity({
          projectId: task.project,
          userId: req.user._id,
          action: 'TASK_PROGRESS_UPDATED',
          description: `${req.user.name} updated progress on "${task.title}" to ${task.progress}%.`,
          entityType: 'TASK',
          entityId: task._id,
          clientVisible: task.clientVisible
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Task updated successfully.',
      task: populatedTask,
      progress: progressResult ? progressResult.progress : undefined
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Employee starts assigned task (ASSIGNED -> IN_PROGRESS)
// @route   POST /api/tasks/:id/start
// @access  Private (Employee)
const startTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    if (!isUserAssignedToTask(task, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only an assigned team member can start this task.' });
    }

    if (!['ASSIGNED', 'TODO', 'BLOCKED', 'CHANGES_REQUESTED'].includes(task.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot start task with status '${task.status}'.`
      });
    }

    task.status = 'IN_PROGRESS';
    if (!task.startedAt) task.startedAt = new Date();
    await task.save();

    if (task.project) {
      await logActivity({
        projectId: task.project,
        userId: req.user._id,
        action: 'TASK_STARTED',
        description: `${req.user.name} started working on "${task.title}".`,
        entityType: 'TASK',
        entityId: task._id,
        clientVisible: task.clientVisible
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task started successfully.',
      task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Employee updates progress
// @route   POST /api/tasks/:id/progress
// @access  Private (Employee or Admin)
const updateTaskProgress = async (req, res, next) => {
  try {
    const { progress } = req.body;
    const pNum = Number(progress);

    if (isNaN(pNum) || pNum < 0 || pNum > 100) {
      return res.status(400).json({
        success: false,
        message: 'Progress must be an integer between 0 and 100.'
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    if (req.user.role !== 'ADMIN') {
      if (!isUserAssignedToTask(task, req.user._id)) {
        return res.status(403).json({ success: false, message: 'Only an assigned team member can update progress.' });
      }
    }

    task.progress = pNum;
    await task.save();

    if (task.project) {
      await recalculateProjectProgress(task.project, req.user._id);
      await logActivity({
        projectId: task.project,
        userId: req.user._id,
        action: 'TASK_PROGRESS_UPDATED',
        description: `${req.user.name} updated progress on "${task.title}" to ${pNum}%.`,
        entityType: 'TASK',
        entityId: task._id,
        clientVisible: task.clientVisible
      });
    }

    res.status(200).json({
      success: true,
      message: `Task progress updated to ${pNum}%.`,
      progress: pNum,
      task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Employee submits task for review (IN_PROGRESS -> IN_REVIEW)
// @route   POST /api/tasks/:id/submit-review
// @access  Private (Employee)
const submitTaskForReview = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    if (req.user.role !== 'ADMIN') {
      if (!isUserAssignedToTask(task, req.user._id)) {
        return res.status(403).json({ success: false, message: 'Only an assigned team member can submit this task for review.' });
      }
    }

    if (!['IN_PROGRESS', 'CHANGES_REQUESTED'].includes(task.status)) {
      return res.status(400).json({
        success: false,
        message: `Task with status '${task.status}' cannot be submitted for review.`
      });
    }

    task.status = 'IN_REVIEW';
    task.progress = 100;
    await task.save();

    if (task.project) {
      await logActivity({
        projectId: task.project,
        userId: req.user._id,
        action: 'TASK_SUBMITTED_FOR_REVIEW',
        description: `Employee ${req.user.name} submitted task "${task.title}" for review.`,
        entityType: 'TASK',
        entityId: task._id,
        clientVisible: false
      });
    }

    let recipientId = null;
    if (task.project) {
      const project = await Project.findById(task.project);
      recipientId = project?.createdBy;
    } else {
      recipientId = task.assignedBy || task.createdBy;
    }

    if (recipientId) {
      await sendNotification({
        userId: recipientId,
        projectId: task.project || undefined,
        title: 'Task Submitted for Review',
        type: 'TASK',
        message: `Employee ${req.user.name} completed and submitted task "${task.title}" for review.`,
        link: `/admin/tasks`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task submitted for review successfully.',
      task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin / HR / Employee marks task as completed
// @route   POST /api/tasks/:id/complete
// @access  Private (Admin, HR, or assigned Employee)
const completeTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const { notes, fileId, attachment } = req.body;

    // Check assignee permissions
    if (req.user.role !== 'ADMIN') {
      const isAssigned = isUserAssignedToTask(task, req.user._id);
      if (!isAssigned) {
        return res.status(403).json({
          success: false,
          message: 'Only an assigned team member can complete this task.'
        });
      }

      // If it's a personal company task, require explicit document attachment in this request
      if (task.taskType === 'PERSONAL') {
        if (!fileId && !attachment) {
          return res.status(400).json({
            success: false,
            message: 'Please attach a completion document or proof of work before completing this company task.'
          });
        }
      }
    }

    // Attach file if provided
    let attachedDocName = '';
    if (fileId) {
      const fileDoc = await File.findById(fileId);
      if (fileDoc) {
        attachedDocName = fileDoc.fileName;
        task.attachments = task.attachments || [];
        const alreadyIn = task.attachments.some(
          (a) => a.fileUrl === fileDoc.fileUrl
        );
        if (!alreadyIn) {
          task.attachments.push({
            fileName: fileDoc.fileName,
            fileUrl: fileDoc.fileUrl,
            fileSize: fileDoc.fileSize || 0,
            fileType: fileDoc.fileType || fileDoc.mimeType || 'application/octet-stream'
          });
        }
      }
    } else if (attachment && attachment.fileName && attachment.fileUrl) {
      attachedDocName = attachment.fileName;
      task.attachments = task.attachments || [];
      // Check for duplicate by fileUrl only
      const alreadyIn = task.attachments.some(
        (a) => a.fileUrl === attachment.fileUrl
      );
      if (!alreadyIn) {
        task.attachments.push({
          fileName: attachment.fileName,
          fileUrl: attachment.fileUrl,
          fileSize: attachment.fileSize || 0,
          fileType: attachment.fileType || 'application/octet-stream'
        });
      }
    } else if (task.attachments && task.attachments.length > 0) {
      const lastAtt = task.attachments[task.attachments.length - 1];
      attachedDocName = lastAtt?.fileName || 'Attached Document';
    }

    task.status = 'COMPLETED';
    task.progress = 100;
    task.completedAt = new Date();
    await task.save();

    // Log completion comment if notes provided
    if (notes && typeof notes === 'string' && notes.trim()) {
      try {
        await Comment.create({
          task: task._id,
          project: task.project || null,
          user: req.user._id,
          message: `Task completed. Completion Note: ${notes.trim()}`,
          isInternal: true
        });
      } catch (err) {
        console.error('Error creating completion comment:', err);
      }
    }

    let progressResult = null;
    if (task.project) {
      progressResult = await recalculateProjectProgress(task.project, req.user._id);

      await logActivity({
        projectId: task.project,
        userId: req.user._id,
        action: 'TASK_COMPLETED',
        description: `${req.user.role} ${req.user.name} marked task "${task.title}" as completed.`,
        entityType: 'TASK',
        entityId: task._id,
        clientVisible: task.clientVisible
      });
    }

    // Notifications
    if (req.user.role !== 'ADMIN') {
      // Notify assigner or Admins that worker/HR completed the company task with document
      const recipientId = task.assignedBy || task.createdBy;
      const docMsg = attachedDocName ? ` with attached document "${attachedDocName}"` : '';

      // Use Set to deduplicate recipients
      const recipientIds = new Set();

      if (recipientId && recipientId.toString() !== req.user._id.toString()) {
        recipientIds.add(recipientId.toString());
      } else {
        // Fallback: notify all active admins
        const adminUsers = await User.find({ role: 'ADMIN', status: 'ACTIVE' }).select('_id');
        for (const admin of adminUsers) {
          recipientIds.add(admin._id.toString());
        }
      }

      // Send notifications to unique recipients
      for (const userId of recipientIds) {
        await sendNotification({
          userId,
          projectId: task.project || undefined,
          title: 'Company Task Completed',
          type: 'TASK',
          message: `${req.user.name} (${req.user.role}) completed company task "${task.title}"${docMsg}.`,
          link: '/admin/tasks'
        });
      }
    } else {
      // Admin / HR completed task -> Notify all assigned Employees
      const notifyTargetIds = [];
      if (Array.isArray(task.assignedEmployees) && task.assignedEmployees.length > 0) {
        task.assignedEmployees.forEach((e) => {
          const sid = e?._id ? e._id.toString() : e.toString();
          if (sid && !notifyTargetIds.includes(sid)) notifyTargetIds.push(sid);
        });
      } else if (task.assignedTo) {
        notifyTargetIds.push(task.assignedTo.toString());
      }

      for (const empId of notifyTargetIds) {
        await sendNotification({
          userId: empId,
          projectId: task.project || undefined,
          title: 'Task Approved & Completed',
          type: 'TASK',
          message: `Your task "${task.title}" has been approved and marked as completed!`,
          link: '/Employee/tasks'
        });
      }
    }

    if (task.project) {
      const project = await Project.findById(task.project);
      if (project && project.client && task.clientVisible) {
        await sendNotification({
          userId: project.client,
          projectId: project._id,
          title: 'Task Completed',
          type: 'TASK',
          message: `Task "${task.title}" is now complete.`,
          link: `/client/projects/${project._id}`
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Task completed successfully.',
      task,
      projectProgress: progressResult ? progressResult.progress : 100
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Employee marks task as blocked
// @route   POST /api/tasks/:id/block
// @access  Private (Employee)
const blockTask = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    if (!isUserAssignedToTask(task, req.user._id)) {
      return res.status(403).json({ success: false, message: 'Only an assigned team member can report a blocker.' });
    }

    task.status = 'BLOCKED';
    await task.save();

    if (task.project) {
      await recalculateProjectProgress(task.project, req.user._id);

      await logActivity({
        projectId: task.project,
        userId: req.user._id,
        action: 'TASK_BLOCKED',
        description: `${req.user.role} ${req.user.name} marked task "${task.title}" as blocked: ${reason || 'Technical obstacle'}`,
        entityType: 'TASK',
        entityId: task._id,
        clientVisible: false
      });
    }

    let recipientId = null;
    if (task.project) {
      const project = await Project.findById(task.project);
      recipientId = project?.createdBy;
    } else {
      recipientId = task.assignedBy || task.createdBy;
    }

    if (recipientId) {
      await sendNotification({
        userId: recipientId,
        projectId: task.project || undefined,
        title: 'Task Blocked Alert',
        type: 'TASK',
        message: `Employee ${req.user.name} reported task "${task.title}" is BLOCKED: ${reason || 'Immediate attention needed.'}`,
        link: `/admin/tasks`
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task marked as blocked. Supervisors notified.',
      task
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private (Admin only)
const deleteTask = async (req, res, next) => {
  try {
    if (req.user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only Admin can delete tasks.'
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.'
      });
    }

    const projectId = task.project;
    await task.deleteOne();

    if (projectId) {
      await recalculateProjectProgress(projectId, req.user._id);
    }

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjectTasks,
  getMyTasks,
  getPersonalTasks,
  getTaskById,
  createTask,
  updateTask,
  startTask,
  updateTaskProgress,
  submitTaskForReview,
  completeTask,
  blockTask,
  deleteTask
};
