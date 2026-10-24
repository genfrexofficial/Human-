const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');

/**
 * Authenticate incoming JWT token
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null) || req.query.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authentication token provided.'
      });
    }

    const secret = process.env.JWT_SECRET || 'clientflow_jwt_secret_super_secure_key_2026_hackathon';
    const decoded = jwt.verify(token, secret);

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists.'
      });
    }

    // Check account status
    if (user.status === 'INACTIVE' || user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact the Administrator.'
      });
    }

    // Invalidate session if tokenVersion does not match user's tokenVersion
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== (user.tokenVersion || 0)) {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired or was invalidated. Please log in again.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Your session has expired. Please log in again.'
      });
    }
    return res.status(403).json({
      success: false,
      message: 'Invalid or malformed authentication token.'
    });
  }
};

/**
 * Role-based access control
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user ? req.user.role : 'GUEST'}' is not authorized to access this resource.`
      });
    }
    next();
  };
};

/**
 * Check if the user has access to the requested project
 */
const requireProjectAccess = async (req, res, next) => {
  try {
    const projectId = req.params.projectId || req.params.id || req.body.project || req.body.projectId;
    if (!projectId) {
      return res.status(400).json({
        success: false,
        message: 'Project ID is required.'
      });
    }

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    // Admin has unrestricted access
    if (req.user.role === 'ADMIN') {
      req.project = project;
      return next();
    }

    // Client can only access if they are the assigned client
    if (req.user.role === 'CLIENT') {
      if (project.client.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized for this project.'
        });
      }
      req.project = project;
      return next();
    }

    // Employee can access if explicitly assigned to project or has tasks in the project
    if (req.user.role === 'Employee') {
      const isAssigned = project.assignedEmployees && project.assignedEmployees.some(
        (w) => w.toString() === req.user._id.toString()
      );
      if (isAssigned) {
        req.project = project;
        return next();
      }

      const hasTask = await Task.exists({
        project: project._id,
        assignedTo: req.user._id
      });
      if (hasTask) {
        req.project = project;
        return next();
      }

      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not assigned to this project or its tasks.'
      });
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Check if user has access to the requested task
 */
const requireTaskAccess = async (req, res, next) => {
  try {
    const taskId = req.params.taskId || req.params.id;
    if (!taskId) {
      return res.status(400).json({
        success: false,
        message: 'Task ID is required.'
      });
    }

    const task = await Task.findById(taskId).populate('project');
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.'
      });
    }

    // Admin has full access
    if (req.user.role === 'ADMIN') {
      req.task = task;
      return next();
    }

    // Employee can access if assigned to the task
    if (req.user.role === 'Employee') {
      if (task.assignedTo && task.assignedTo.toString() === req.user._id.toString()) {
        req.task = task;
        return next();
      }
      return res.status(403).json({
        success: false,
        message: 'Access denied. You are not assigned to this task.'
      });
    }

    // Client can access if client of project AND task is clientVisible
    if (req.user.role === 'CLIENT') {
      const project = task.project;
      if (!project || project.client.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You are not authorized for this project.'
        });
      }
      if (!task.clientVisible) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. This task is marked as internal.'
        });
      }
      req.task = task;
      return next();
    }

    return res.status(403).json({
      success: false,
      message: 'Access denied.'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authenticateToken,
  requireAuth: authenticateToken,
  authorizeRoles,
  requireRole: authorizeRoles,
  requireProjectAccess,
  requireTaskAccess
};
