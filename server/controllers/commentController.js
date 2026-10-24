const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Project = require('../models/Project');
const Task = require('../models/Task');
const { logActivity } = require('../services/activityService');
const { sendNotification } = require('../services/notificationService');

// @desc    Get comments for a project, task, or deliverable file
// @route   GET /api/comments/project/:projectId
// @access  Private
const getProjectComments = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const { fileId, taskId } = req.query;

    if (!projectId || projectId === 'undefined' || !mongoose.Types.ObjectId.isValid(projectId)) {
      if (taskId && mongoose.Types.ObjectId.isValid(taskId)) {
        let query = { task: taskId };
        if (req.user.role === 'CLIENT') {
          query.isInternal = { $ne: true };
        }
        const comments = await Comment.find(query)
          .populate('user', 'name email role avatar title')
          .populate('file', 'fileName')
          .populate('task', 'title')
          .sort({ createdAt: 1 });

        return res.status(200).json({
          success: true,
          count: comments.length,
          comments
        });
      }

      return res.status(200).json({
        success: true,
        count: 0,
        comments: []
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    if (req.user.role === 'CLIENT' && project.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view comments for this project.'
      });
    }

    let query = { project: projectId };

    if (fileId) {
      query.file = fileId;
    }
    if (taskId) {
      query.task = taskId;
    }

    // CRITICAL: NEVER return internal comments to clients
    if (req.user.role === 'CLIENT') {
      query.isInternal = { $ne: true };
    }

    const comments = await Comment.find(query)
      .populate('user', 'name email role avatar title')
      .populate('file', 'fileName')
      .populate('task', 'title')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: comments.length,
      comments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get comments for a specific task (Project task or Personal task)
// @route   GET /api/comments/task/:taskId
// @access  Private
const getTaskComments = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    if (!taskId || !mongoose.Types.ObjectId.isValid(taskId)) {
      return res.status(200).json({
        success: true,
        count: 0,
        comments: []
      });
    }

    const task = await Task.findById(taskId).populate('project');
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.'
      });
    }

    if (req.user.role === 'CLIENT') {
      if (!task.project || task.clientVisible === false) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to view comments for this task.'
        });
      }
      if (task.project.client && task.project.client.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to view comments for this project task.'
        });
      }
    }

    let query = { task: taskId };
    if (req.user.role === 'CLIENT') {
      query.isInternal = { $ne: true };
    }

    const comments = await Comment.find(query)
      .populate('user', 'name email role avatar title')
      .populate('file', 'fileName')
      .populate('task', 'title')
      .sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: comments.length,
      comments
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add comment / feedback
// @route   POST /api/comments
// @access  Private
const createComment = async (req, res, next) => {
  try {
    let { project: projectId, file: fileId, task: taskId, message, isInternal } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Message cannot be empty.'
      });
    }

    if (!projectId && !taskId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID or Task ID is required.'
      });
    }

    let project = null;
    let task = null;

    if (taskId) {
      task = await Task.findById(taskId);
      if (task && !projectId && task.project) {
        projectId = task.project.toString();
      }
    }

    if (projectId) {
      project = await Project.findById(projectId);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Project not found.'
        });
      }

      if (req.user.role === 'CLIENT' && project.client.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to comment on this project.'
        });
      }
    } else if (task) {
      if (req.user.role === 'CLIENT') {
        return res.status(403).json({
          success: false,
          message: 'Clients cannot comment on internal company tasks.'
        });
      }

      if (req.user.role === 'Employee') {
        const isAssigned = task.assignedTo && task.assignedTo.toString() === req.user._id.toString();
        const isCreator = task.createdBy && task.createdBy.toString() === req.user._id.toString();
        if (!isAssigned && !isCreator && req.user.role !== 'ADMIN' && req.user.role !== 'HR') {
          return res.status(403).json({
            success: false,
            message: 'Unauthorized to comment on this task.'
          });
        }
      }
    }

    // Clients cannot post internal notes
    // Personal task comments are always internal team notes
    const internalFlag = req.user.role === 'CLIENT'
      ? false
      : (!project ? true : Boolean(isInternal));

    const comment = await Comment.create({
      project: project ? project._id : null,
      file: fileId || null,
      task: taskId || null,
      user: req.user._id,
      message: message.trim(),
      isInternal: internalFlag
    });

    const populated = await Comment.findById(comment._id)
      .populate('user', 'name email role avatar title')
      .populate('file', 'fileName')
      .populate('task', 'title');

    const isClient = req.user.role === 'CLIENT';

    // Log activity if project exists
    if (project) {
      await logActivity({
        projectId: project._id,
        userId: req.user._id,
        action: isClient ? 'FEEDBACK_RECEIVED' : 'COMMENT_ADDED',
        description: `${req.user.name} added ${isClient ? 'client feedback' : internalFlag ? 'an internal note' : 'a comment'}.`,
        entityType: taskId ? 'TASK' : fileId ? 'FILE' : 'PROJECT',
        entityId: taskId || fileId || project._id,
        clientVisible: !internalFlag
      });
    }

    // Notifications
    if (project && !internalFlag) {
      // If client posted, notify admin
      if (isClient && project.createdBy) {
        await sendNotification({
          userId: project.createdBy,
          projectId: project._id,
          title: 'Client Comment',
          type: 'FEEDBACK',
          message: `${req.user.name} posted feedback on "${project.name}".`,
          link: `/admin/projects/${project._id}`
        });
      } else if (!isClient && project.client) {
        // If admin or Employee posted a client-visible comment, notify client
        await sendNotification({
          userId: project.client,
          projectId: project._id,
          title: 'New Project Comment',
          type: 'FEEDBACK',
          message: `${req.user.name} posted a message on "${project.name}".`,
          link: `/client/projects/${project._id}`
        });
      }
    } else if (!project && task) {
      const isAdmin = req.user.role === 'ADMIN';
      if (!isAdmin) {
        const adminUsers = await User.find({ role: 'ADMIN', status: 'ACTIVE' }).select('_id');
        for (const admin of adminUsers) {
          await sendNotification({
            userId: admin._id,
            title: 'Personal Task Note Added',
            message: `${req.user.name} commented on personal task "${task.title}".`,
            type: 'TASK',
            entityId: task._id
          });
        }
      } else if (task.assignedTo && task.assignedTo.toString() !== req.user._id.toString()) {
        await sendNotification({
          userId: task.assignedTo,
          title: 'New Note on Personal Task',
          message: `Admin added a note to your task "${task.title}".`,
          type: 'TASK',
          entityId: task._id
        });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Comment posted successfully.',
      comment: populated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete comment
// @route   DELETE /api/comments/:id
// @access  Private (Author or Admin)
const deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found.'
      });
    }

    const isAuthor = comment.user.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'ADMIN';

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to delete this comment.'
      });
    }

    await comment.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Comment deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjectComments,
  getTaskComments,
  createComment,
  deleteComment
};
