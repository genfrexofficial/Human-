const Project = require('../models/Project');
const Task = require('../models/Task');
const TaskRequest = require('../models/TaskRequest');
const Milestone = require('../models/Milestone');
const File = require('../models/File');
const Comment = require('../models/Comment');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { determineProjectHealth, recalculateProjectProgress } = require('../services/progressService');
const { logActivity } = require('../services/activityService');
const { sendNotification } = require('../services/notificationService');

// @desc    Get all projects (admin: all, Employee: assigned, client: assigned)
// @route   GET /api/projects
// @access  Private
const getProjects = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'CLIENT') {
      query = { client: req.user._id };
    } else if (req.user.role === 'Employee') {
      // Find projects where Employee is assigned directly or has assigned tasks
      const taskProjectIds = await Task.distinct('project', { assignedTo: req.user._id });
      query = {
        $or: [
          { assignedEmployees: req.user._id },
          { _id: { $in: taskProjectIds } }
        ]
      };
    }

    const projects = await Project.find(query)
      .populate('client', 'name email companyName avatar')
      .populate('createdBy', 'name email')
      .populate('assignedEmployees', 'name email avatar title')
      .sort({ updatedAt: -1 });

    // Attach real live stats and health to each project
    const enrichedProjects = await Promise.all(
      projects.map(async (project) => {
        const [
          totalTasks,
          completedTasks,
          inProgressTasks,
          blockedTasks,
          awaitingReviewTasks,
          totalMilestones,
          completedMilestones,
          pendingApprovals,
          pendingRequests
        ] = await Promise.all([
          Task.countDocuments({ project: project._id }),
          Task.countDocuments({ project: project._id, status: 'COMPLETED' }),
          Task.countDocuments({ project: project._id, status: 'IN_PROGRESS' }),
          Task.countDocuments({ project: project._id, status: 'BLOCKED' }),
          Task.countDocuments({ project: project._id, status: 'IN_REVIEW' }),
          Milestone.countDocuments({ project: project._id }),
          Milestone.countDocuments({ project: project._id, status: 'COMPLETED' }),
          File.countDocuments(
            req.user.role === 'CLIENT'
              ? {
                  project: project._id,
                  $or: [{ isDeliverable: true }, { category: 'DELIVERABLE' }],
                  adminApproved: true,
                  approvalStatus: 'PENDING_REVIEW'
                }
              : {
                  project: project._id,
                  $or: [{ isDeliverable: true }, { category: 'DELIVERABLE' }],
                  adminApproved: { $ne: true }
                }
          ),
          TaskRequest.countDocuments({ project: project._id, status: 'PENDING_APPROVAL' })
        ]);

        const health = await determineProjectHealth(project._id, project.endDate);

        const pObj = project.toObject();
        pObj.health = health;
        pObj.stats = {
          totalTasks,
          completedTasks,
          inProgressTasks,
          blockedTasks,
          awaitingReviewTasks,
          totalMilestones,
          completedMilestones,
          pendingApprovals,
          pendingRequests
        };
        return pObj;
      })
    );

    res.status(200).json({
      success: true,
      count: enrichedProjects.length,
      projects: enrichedProjects
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single project by ID
// @route   GET /api/projects/:id
// @access  Private
const getProjectById = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client', 'name email companyName phone avatar')
      .populate('createdBy', 'name email')
      .populate('assignedEmployees', 'name email avatar title phone skills');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    // Role check: client can only access assigned project
    if (req.user.role === 'CLIENT' && project.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view this project.'
      });
    }

    // Role check: Employee must be assigned
    if (req.user.role === 'Employee') {
      const isAssigned = project.assignedEmployees && project.assignedEmployees.some(
        (w) => w._id.toString() === req.user._id.toString()
      );
      const hasTask = await Task.exists({ project: project._id, assignedTo: req.user._id });
      if (!isAssigned && !hasTask) {
        return res.status(403).json({
          success: false,
          message: 'You are not authorized to view this project.'
        });
      }
    }

    // Summary statistics
    const [
      totalTasks,
      completedTasks,
      inProgressTasks,
      blockedTasks,
      awaitingReviewTasks,
      totalMilestones,
      completedMilestones,
      pendingApprovals,
      totalDeliverables,
      approvedDeliverables,
      pendingRequests
    ] = await Promise.all([
      Task.countDocuments({ project: project._id }),
      Task.countDocuments({ project: project._id, status: 'COMPLETED' }),
      Task.countDocuments({ project: project._id, status: 'IN_PROGRESS' }),
      Task.countDocuments({ project: project._id, status: 'BLOCKED' }),
      Task.countDocuments({ project: project._id, status: 'IN_REVIEW' }),
      Milestone.countDocuments({ project: project._id }),
      Milestone.countDocuments({ project: project._id, status: 'COMPLETED' }),
      File.countDocuments(
        req.user.role === 'CLIENT'
          ? {
              project: project._id,
              $or: [{ isDeliverable: true }, { category: 'DELIVERABLE' }],
              adminApproved: true,
              approvalStatus: 'PENDING_REVIEW'
            }
          : {
              project: project._id,
              $or: [{ isDeliverable: true }, { category: 'DELIVERABLE' }],
              adminApproved: { $ne: true }
            }
      ),
      File.countDocuments(
        req.user.role === 'CLIENT'
          ? {
              project: project._id,
              $or: [{ isDeliverable: true }, { category: 'DELIVERABLE' }],
              $or: [{ adminApproved: true }, { adminApprovalStatus: 'APPROVED' }]
            }
          : {
              project: project._id,
              $or: [{ isDeliverable: true }, { category: 'DELIVERABLE' }]
            }
      ),
      File.countDocuments({
        project: project._id,
        $or: [{ isDeliverable: true }, { category: 'DELIVERABLE' }],
        $or: [{ adminApproved: true }, { adminApprovalStatus: 'APPROVED' }]
      }),
      TaskRequest.countDocuments({ project: project._id, status: 'PENDING_APPROVAL' })
    ]);

    const health = await determineProjectHealth(project._id, project.endDate);

    const pObj = project.toObject();
    pObj.health = health;
    pObj.stats = {
      totalTasks,
      completedTasks,
      inProgressTasks,
      blockedTasks,
      awaitingReviewTasks,
      totalMilestones,
      completedMilestones,
      pendingApprovals,
      totalDeliverables,
      approvedDeliverables,
      pendingRequests
    };

    res.status(200).json({
      success: true,
      project: pObj
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new project
// @route   POST /api/projects
// @access  Private (Admin only)
const createProject = async (req, res, next) => {
  try {
    const { name, description, client, startDate, endDate, budget, status, stage, assignedEmployees } = req.body;

    if (!name || !client) {
      return res.status(400).json({
        success: false,
        message: 'Project name and assigned client are required.'
      });
    }

    const project = await Project.create({
      name: name.trim(),
      description: description || '',
      client,
      createdBy: req.user._id,
      startDate: startDate || Date.now(),
      endDate: endDate || null,
      budget: budget || 0,
      status: status || 'PLANNING',
      stage: stage || 'PLANNING',
      health: 'ON_TRACK',
      assignedEmployees: Array.isArray(assignedEmployees) ? assignedEmployees : [],
      progress: 0
    });

    const populatedProject = await Project.findById(project._id)
      .populate('client', 'name email companyName avatar')
      .populate('createdBy', 'name email')
      .populate('assignedEmployees', 'name email avatar title');

    // Log activity
    await logActivity({
      projectId: project._id,
      userId: req.user._id,
      action: 'PROJECT_CREATED',
      description: `${req.user.name} created project "${project.name}".`,
      entityType: 'PROJECT',
      entityId: project._id,
      clientVisible: true
    });

    // Notify client
    await sendNotification({
      userId: client,
      projectId: project._id,
      title: 'New Project Created',
      message: `You have been invited to collaborate on project "${project.name}".`,
      type: 'PROJECT',
      link: `/client/projects/${project._id}`
    });

    res.status(201).json({
      success: true,
      message: 'Project created successfully.',
      project: populatedProject
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private (Admin only)
const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    const { name, description, client, startDate, endDate, budget, status, stage, assignedEmployees } = req.body;

    if (name) project.name = name.trim();
    if (description !== undefined) project.description = description;
    if (client) project.client = client;
    if (startDate) project.startDate = startDate;
    if (endDate !== undefined) project.endDate = endDate;
    if (budget !== undefined) project.budget = budget;
    if (status) project.status = status;
    if (stage) project.stage = stage;
    if (assignedEmployees) project.assignedEmployees = assignedEmployees;

    await project.save();

    await recalculateProjectProgress(project._id, req.user._id);

    const updated = await Project.findById(project._id)
      .populate('client', 'name email companyName avatar')
      .populate('createdBy', 'name email')
      .populate('assignedEmployees', 'name email avatar title');

    await logActivity({
      projectId: project._id,
      userId: req.user._id,
      action: 'PROJECT_UPDATED',
      description: `${req.user.name} updated project details.`,
      entityType: 'PROJECT',
      entityId: project._id,
      clientVisible: true
    });

    res.status(200).json({
      success: true,
      message: 'Project updated successfully.',
      project: updated
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update project stage (Roadmap progression)
// @route   PUT /api/projects/:id/stage
// @access  Private (Admin only)
const updateProjectStage = async (req, res, next) => {
  try {
    const { stage } = req.body;
    const validStages = [
      'PLANNING',
      'REQUIREMENTS',
      'DESIGN',
      'DEVELOPMENT',
      'TESTING',
      'CLIENT_REVIEW',
      'DEPLOYMENT',
      'COMPLETED',
      'ON_HOLD'
    ];

    if (!validStages.includes(stage)) {
      return res.status(400).json({
        success: false,
        message: `Invalid stage. Must be one of: ${validStages.join(', ')}`
      });
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }

    const previousStage = project.stage;
    project.stage = stage;
    if (stage === 'COMPLETED') {
      project.status = 'COMPLETED';
    }
    await project.save();

    await logActivity({
      projectId: project._id,
      userId: req.user._id,
      action: 'PROJECT_UPDATED',
      description: `Project stage moved from ${previousStage} to ${stage}.`,
      entityType: 'PROJECT',
      entityId: project._id,
      clientVisible: true
    });

    // Notify client
    if (project.client) {
      await sendNotification({
        userId: project.client,
        projectId: project._id,
        title: 'Project Stage Updated',
        type: 'PROJECT',
        message: `Project "${project.name}" progressed to the ${stage.replace('_', ' ')} stage.`,
        link: `/client/projects/${project._id}`
      });
    }

    res.status(200).json({
      success: true,
      message: `Project stage updated to ${stage}.`,
      stage,
      project
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private (Admin only)
const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    // Cascade delete related records
    await Task.deleteMany({ project: project._id });
    await TaskRequest.deleteMany({ project: project._id });
    await Milestone.deleteMany({ project: project._id });
    await File.deleteMany({ project: project._id });
    await Comment.deleteMany({ project: project._id });
    await Activity.deleteMany({ project: project._id });
    await Notification.deleteMany({ project: project._id });
    await project.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Project and all associated records deleted successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get comprehensive admin operational analytics
// @route   GET /api/projects/analytics/overview
// @access  Private (Admin only)
const getAdminOverviewAnalytics = async (req, res, next) => {
  try {
    const now = new Date();

    const [
      totalProjects,
      activeProjects,
      completedProjects,
      totalClients,
      totalEmployees,
      pendingRequests,
      tasksInProgress,
      tasksAwaitingReview,
      overdueTasks,
      totalTasks,
      completedTasks,
      pendingApprovals,
      approvedDeliverables
    ] = await Promise.all([
      Project.countDocuments({}),
      Project.countDocuments({ status: { $ne: 'COMPLETED' } }),
      Project.countDocuments({ status: 'COMPLETED' }),
      User.countDocuments({ role: 'CLIENT' }),
      User.countDocuments({ role: 'Employee' }),
      TaskRequest.countDocuments({ status: 'PENDING_APPROVAL' }),
      Task.countDocuments({ status: 'IN_PROGRESS' }),
      Task.countDocuments({ status: 'IN_REVIEW' }),
      Task.countDocuments({ status: { $ne: 'COMPLETED' }, dueDate: { $lt: now, $ne: null } }),
      Task.countDocuments({}),
      Task.countDocuments({ status: 'COMPLETED' }),
      File.countDocuments({ approvalStatus: 'PENDING_REVIEW' }),
      File.countDocuments({ approvalStatus: 'APPROVED' })
    ]);

    // Health breakdown of active projects
    const allProjects = await Project.find({ status: { $ne: 'COMPLETED' } }).select('endDate');
    let onTrackCount = 0;
    let atRiskCount = 0;
    let overdueBlockedCount = 0;

    for (const p of allProjects) {
      const h = await determineProjectHealth(p._id, p.endDate);
      if (h === 'ON_TRACK') onTrackCount++;
      else if (h === 'AT_RISK') atRiskCount++;
      else if (h === 'OVERDUE_BLOCKED') overdueBlockedCount++;
    }

    res.status(200).json({
      success: true,
      analytics: {
        projects: {
          total: totalProjects,
          active: activeProjects,
          completed: completedProjects,
          health: {
            onTrack: onTrackCount,
            atRisk: atRiskCount,
            overdueBlocked: overdueBlockedCount
          }
        },
        users: {
          clients: totalClients,
          Employees: totalEmployees
        },
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          inProgress: tasksInProgress,
          awaitingReview: tasksAwaitingReview,
          overdue: overdueTasks
        },
        taskRequests: {
          pendingApproval: pendingRequests
        },
        deliverables: {
          pendingReview: pendingApprovals,
          approved: approvedDeliverables
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get project completion summary
// @route   GET /api/projects/:id/summary
// @access  Private
const getProjectSummary = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client', 'name email companyName phone')
      .populate('createdBy', 'name email companyName');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    if (req.user.role === 'CLIENT' && project.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized to view project summary.'
      });
    }

    const [
      totalTasks,
      completedTasks,
      totalMilestones,
      completedMilestones,
      totalDeliverables,
      approvedDeliverables,
      changesRequested
    ] = await Promise.all([
      Task.countDocuments({ project: project._id }),
      Task.countDocuments({ project: project._id, status: 'COMPLETED' }),
      Milestone.countDocuments({ project: project._id }),
      Milestone.countDocuments({ project: project._id, status: 'COMPLETED' }),
      File.countDocuments({ project: project._id, category: 'DELIVERABLE' }),
      File.countDocuments({ project: project._id, approvalStatus: 'APPROVED' }),
      File.countDocuments({ project: project._id, approvalStatus: 'CHANGES_REQUESTED' })
    ]);

    res.status(200).json({
      success: true,
      summary: {
        projectName: project.name,
        description: project.description,
        status: project.status,
        stage: project.stage,
        health: project.health,
        progress: project.progress,
        client: project.client,
        createdBy: project.createdBy,
        startDate: project.startDate,
        endDate: project.endDate || project.updatedAt,
        tasks: {
          total: totalTasks,
          completed: completedTasks,
          pending: totalTasks - completedTasks
        },
        milestones: {
          total: totalMilestones,
          completed: completedMilestones
        },
        deliverables: {
          total: totalDeliverables,
          approved: approvedDeliverables,
          changesRequested
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProjects,
  getProjectById,
  createProject,
  updateProject,
  updateProjectStage,
  deleteProject,
  getAdminOverviewAnalytics,
  getProjectSummary
};
