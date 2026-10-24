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

// @desc    Add comment / feedback
// @route   POST /api/comments
// @access  Private
const createComment = async (req, res, next) => {
  try {
    const { project: projectId, file: fileId, task: taskId, message, isInternal } = req.body;

    if (!projectId || !message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Project ID and message are required.'
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
        message: 'Unauthorized to comment on this project.'
      });
    }

    // Clients cannot post internal notes
    const internalFlag = req.user.role === 'CLIENT' ? false : Boolean(isInternal);

    const comment = await Comment.create({
      project: projectId,
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

    // Log activity
    await logActivity({
      projectId,
      userId: req.user._id,
      action: isClient ? 'FEEDBACK_RECEIVED' : 'COMMENT_ADDED',
      description: `${req.user.name} added ${isClient ? 'client feedback' : internalFlag ? 'an internal note' : 'a comment'}.`,
      entityType: taskId ? 'TASK' : fileId ? 'FILE' : 'PROJECT',
      entityId: taskId || fileId || projectId,
      clientVisible: !internalFlag
    });

    // Notifications
    if (!internalFlag) {
      // If client posted, notify admin
      if (isClient && project.createdBy) {
        await sendNotification({
          userId: project.createdBy,
          projectId,
          title: 'Client Comment',
          type: 'FEEDBACK',
          message: `${req.user.name} posted feedback on "${project.name}".`,
          link: `/admin/projects/${project._id}`
        });
      } else if (!isClient && project.client) {
        // If admin or Employee posted a client-visible comment, notify client
        await sendNotification({
          userId: project.client,
          projectId,
          title: 'New Project Comment',
          type: 'FEEDBACK',
          message: `${req.user.name} posted a message on "${project.name}".`,
          link: `/client/projects/${project._id}`
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
  createComment,
  deleteComment
};
