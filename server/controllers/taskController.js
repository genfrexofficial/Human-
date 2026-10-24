const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');
const User = require('../models/User');
const { recalculateProjectProgress } = require('../services/progressService');
const { logActivity } = require('../services/activityService');
const { sendNotification } = require('../services/notificationService');

// Allowed status transitions mapping
const Employee_ALLOWED_TRANSITIONS = {
  ASSIGNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['BLOCKED', 'IN_REVIEW'],
  BLOCKED: ['IN_PROGRESS'],
  CHANGES_REQUESTED: ['IN_PROGRESS'],
  TODO: ['IN_PROGRESS']
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
    } else if (req.user.role === 'Employee') {
      // Employee can see all project tasks if assigned to project, or just assigned tasks
      const isAssigned = project.assignedEmployees && project.assignedEmployees.some(
        (w) => w.toString() === req.user._id.toString()
      );
      if (!isAssigned) {
        query.assignedTo = req.user._id;
      }
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email avatar title')
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

    if (req.user.role === 'Employee') {
      query.assignedTo = req.user._id;
    } else if (req.query.assignedTo) {
      query.assignedTo = req.query.assignedTo;
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

    const tasks = await Task.find(query)
      .populate('assignedTo', 'name email avatar title phone')
      .populate('createdBy', 'name email role')
      .populate('assignedBy', 'name email role')
      .sort({ dueDate: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      tasks
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
    let query = { assignedTo: req.user._id };

    if (req.query.taskType) {
      query.taskType = req.query.taskType;
    }
    if (req.query.status) {
      query.status = req.query.status;
    }
    if (req.query.projectId) {
      query.project = req.query.projectId;
    }

    const tasks = await Task.find(query)
      .populate('project', 'name status stage client health')
      .populate('milestone', 'title dueDate status')
      .populate('createdBy', 'name email role')
      .populate('assignedBy', 'name email role')
      .sort({ dueDate: 1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      tasks
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

    // Personal Task Access Rules
    if (task.taskType === 'PERSONAL') {
      if (req.user.role === 'CLIENT') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Personal company tasks are internal only.'
        });
      }
      if (req.user.role === 'Employee') {
        const isAssigned = task.assignedTo && task.assignedTo._id.toString() === req.user._id.toString();
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
      if (!task.project || task.project.client?.toString() !== req.user._id.toString() || !task.clientVisible) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You cannot view this task.'
        });
      }
    } else if (req.user.role === 'Employee') {
      const isAssigned = task.assignedTo && task.assignedTo._id.toString() === req.user._id.toString();
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
// @access  Private (Admin, HR)
const createTask = async (req, res, next) => {
  try {
    const {
      project: projectId,
      taskType = 'PROJECT',
      personalCategory = 'INTERNAL_WORK',
      title,
      description,
      assignedTo,
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

    // PERSONAL TASK FLOW
    if (taskType === 'PERSONAL') {
      if (!assignedTo) {
        return res.status(400).json({
          success: false,
          message: 'An Employee must be assigned to a personal task.'
        });
      }

      const assignedEmployee = await User.findById(assignedTo);
      if (!assignedEmployee) {
        return res.status(404).json({
          success: false,
          message: 'Assigned employee not found.'
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
        assignedTo: assignedEmployee._id,
        status: status || 'ASSIGNED',
        priority: priority || 'MEDIUM',
        dueDate: dueDate || null,
        estimatedHours: Number(estimatedHours) || 0,
        clientVisible: false,
        progress: 0
      });

      const populatedTask = await Task.findById(task._id)
        .populate('assignedTo', 'name email avatar title phone')
        .populate('createdBy', 'name email role')
        .populate('assignedBy', 'name email role');

      // Dispatch in-app notification to the assigned employee
      await sendNotification({
        userId: assignedEmployee._id,
        title: 'New Personal Task Assigned',
        type: 'TASK',
        message: `${req.user.name} (${req.user.role}) assigned you a personal task: "${task.title}".`,
        link: `/Employee/tasks`
      });

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

    let assignedEmployee = null;
    if (assignedTo) {
      assignedEmployee = await User.findById(assignedTo);
      if (assignedEmployee && assignedEmployee.role === 'Employee') {
        if (!project.assignedEmployees.some((w) => w.toString() === assignedEmployee._id.toString())) {
          project.assignedEmployees.push(assignedEmployee._id);
          await project.save();
        }
      }
    }

    const task = await Task.create({
      taskType: 'PROJECT',
      project: projectId,
      title: title.trim(),
      description: description || '',
      createdBy: req.user._id,
      assignedBy: req.user._id,
      assignedTo: assignedTo || null,
      milestone: milestone || null,
      status: status || (assignedTo ? 'ASSIGNED' : 'TODO'),
      priority: priority || 'MEDIUM',
      dueDate: dueDate || null,
      estimatedHours: Number(estimatedHours) || 0,
      clientVisible: clientVisible !== undefined ? clientVisible : true,
      progress: 0
    });

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email avatar title')
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

    // Notify assigned Employee
    if (assignedEmployee) {
      await sendNotification({
        userId: assignedEmployee._id,
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
      status,
      priority,
      dueDate,
      milestone,
      estimatedHours,
      actualHours,
      clientVisible,
      progress
    } = req.body;

    const oldStatus = task.status;
    const oldProgress = task.progress;

    // Employee ACCESS CHECK & STATE MACHINE VALIDATION
    if (req.user.role === 'Employee') {
      if (!task.assignedTo || task.assignedTo.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You are only authorized to update your own assigned tasks.'
        });
      }

      // If updating status, validate state machine
      if (status && status !== oldStatus) {
        const allowedNext = Employee_ALLOWED_TRANSITIONS[oldStatus] || [];
        if (!allowedNext.includes(status)) {
          return res.status(400).json({
            success: false,
            message: `Invalid state transition from '${oldStatus}' to '${status}' for role Employee. Allowed transitions: ${allowedNext.join(', ') || 'None'}.`
          });
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

    } else if (req.user.role === 'ADMIN' || req.user.role === 'HR') {
      // Admin / HR update
      if (title) task.title = title.trim();
      if (description !== undefined) task.description = description;
      if (personalCategory) task.personalCategory = personalCategory;
      if (milestone !== undefined) task.milestone = milestone || null;
      if (priority) task.priority = priority;
      if (dueDate !== undefined) task.dueDate = dueDate || null;
      if (estimatedHours !== undefined) task.estimatedHours = Number(estimatedHours) || 0;
      if (actualHours !== undefined) task.actualHours = Number(actualHours) || 0;
      if (clientVisible !== undefined && task.taskType !== 'PERSONAL') task.clientVisible = clientVisible;

      if (assignedTo !== undefined && assignedTo !== (task.assignedTo ? task.assignedTo.toString() : null)) {
        task.assignedTo = assignedTo || null;
        task.assignedBy = req.user._id;
        if (assignedTo && task.status === 'TODO') {
          task.status = 'ASSIGNED';
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
        const allowedNext = ADMIN_ALLOWED_TRANSITIONS[oldStatus] || [];
        if (!allowedNext.includes(status)) {
          return res.status(400).json({
            success: false,
            message: `Invalid state transition from '${oldStatus}' to '${status}'. Allowed transitions: ${allowedNext.join(', ')}.`
          });
        }
        task.status = status;
        if (status === 'COMPLETED') {
          task.completedAt = new Date();
          task.progress = 100;
        }
      }
    } else {
      return res.status(403).json({
        success: false,
        message: 'Clients are not authorized to update tasks directly.'
      });
    }

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'name email avatar title phone')
      .populate('milestone', 'title dueDate')
      .populate('project', 'name client')
      .populate('createdBy', 'name email role')
      .populate('assignedBy', 'name email role');

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

      // If Employee submitted for review, notify Admin or assigner
      if (task.status === 'IN_REVIEW' && req.user.role === 'Employee') {
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

      // If admin or HR completed task, notify Employee and client (if applicable)
      if (task.status === 'COMPLETED' && (req.user.role === 'ADMIN' || req.user.role === 'HR')) {
        if (task.assignedTo) {
          await sendNotification({
            userId: task.assignedTo,
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

    if (!task.assignedTo || task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only the assigned Employee can start this task.' });
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

    if (req.user.role === 'Employee') {
      if (!task.assignedTo || task.assignedTo.toString() !== req.user._id.toString()) {
        return res.status(403).json({ success: false, message: 'Only the assigned Employee can update progress.' });
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

    if (!task.assignedTo || task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only assigned Employee can submit this task for review.' });
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

// @desc    Admin / HR marks task as completed (IN_REVIEW -> COMPLETED)
// @route   POST /api/tasks/:id/complete
// @access  Private (Admin, HR)
const completeTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    task.status = 'COMPLETED';
    task.progress = 100;
    task.completedAt = new Date();
    await task.save();

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

    if (task.assignedTo) {
      await sendNotification({
        userId: task.assignedTo,
        projectId: task.project || undefined,
        title: 'Task Approved',
        type: 'TASK',
        message: `Your task "${task.title}" has been approved and marked as completed!`,
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

    if (!task.assignedTo || task.assignedTo.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Only assigned Employee can report a blocker.' });
    }

    task.status = 'BLOCKED';
    await task.save();

    if (task.project) {
      await recalculateProjectProgress(task.project, req.user._id);

      await logActivity({
        projectId: task.project,
        userId: req.user._id,
        action: 'TASK_BLOCKED',
        description: `Employee ${req.user.name} marked task "${task.title}" as blocked: ${reason || 'Technical obstacle'}`,
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
// @access  Private (Admin, HR)
const deleteTask = async (req, res, next) => {
  try {
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
