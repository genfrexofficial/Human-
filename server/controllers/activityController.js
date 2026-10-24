const Activity = require('../models/Activity');
const Project = require('../models/Project');
const Task = require('../models/Task');

// @desc    Get activities for a project
// @route   GET /api/activities/project/:projectId
// @access  Private
const getProjectActivities = async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    let query = { project: projectId };

    if (req.user.role === 'CLIENT') {
      if (project.client.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized to view activities for this project.'
        });
      }
      query.clientVisible = true;
    }

    const activities = await Activity.find(query)
      .populate('user', 'name email role avatar title')
      .sort({ createdAt: -1 })
      .limit(60);

    res.status(200).json({
      success: true,
      count: activities.length,
      activities
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get recent activities (Role-scoped)
// @route   GET /api/activities/recent
// @access  Private
const getRecentActivities = async (req, res, next) => {
  try {
    let query = {};

    if (req.user.role === 'CLIENT') {
      const clientProjects = await Project.find({ client: req.user._id }).select('_id');
      query = {
        project: { $in: clientProjects.map((p) => p._id) },
        clientVisible: true
      };
    } else if (req.user.role === 'Employee') {
      const EmployeeProjectIds = await Task.distinct('project', { assignedTo: req.user._id });
      const assignedProjects = await Project.find({ assignedEmployees: req.user._id }).select('_id');
      const allIds = Array.from(new Set([...EmployeeProjectIds, ...assignedProjects.map((p) => p._id.toString())]));

      query = { project: { $in: allIds } };
    }

    const activities = await Activity.find(query)
      .populate('user', 'name email role avatar title')
      .populate('project', 'name status stage')
      .sort({ createdAt: -1 })
      .limit(30);

    res.status(200).json({
      success: true,
      count: activities.length,
      activities
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get full audit log (Admin only)
// @route   GET /api/activities/audit
// @access  Private (Admin only)
const getAuditLogs = async (req, res, next) => {
  try {
    let query = {};
    if (req.query.projectId) {
      query.project = req.query.projectId;
    }
    if (req.query.action) {
      query.action = req.query.action;
    }
    if (req.query.userId) {
      query.user = req.query.userId;
    }

    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    const [total, activities] = await Promise.all([
      Activity.countDocuments(query),
      Activity.find(query)
        .populate('user', 'name email role avatar title')
        .populate('project', 'name client')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
    ]);

    res.status(200).json({
      success: true,
      total,
      page,
      pages: Math.ceil(total / limit),
      activities
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjectActivities,
  getRecentActivities,
  getAuditLogs
};
