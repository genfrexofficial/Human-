const Task = require('../models/Task');
const Project = require('../models/Project');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');

/**
 * Calculates project health based on actual task statuses and deadlines
 * - OVERDUE_BLOCKED: Has overdue incomplete tasks OR high/urgent blocked tasks
 * - AT_RISK: Has any blocked tasks OR tasks due within 3 days
 * - ON_TRACK: Healthy deadlines and zero blockers
 */
const determineProjectHealth = async (projectId, projectEndDate = null) => {
  const now = new Date();
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  const blockedTasks = await Task.countDocuments({
    project: projectId,
    status: 'BLOCKED'
  });

  const overdueTasks = await Task.countDocuments({
    project: projectId,
    status: { $ne: 'COMPLETED' },
    dueDate: { $lt: now, $ne: null }
  });

  const urgentBlocked = await Task.countDocuments({
    project: projectId,
    status: 'BLOCKED',
    priority: { $in: ['HIGH', 'URGENT'] }
  });

  const projectOverdue = projectEndDate && new Date(projectEndDate) < now;

  if (overdueTasks > 0 || urgentBlocked > 0 || projectOverdue) {
    return 'OVERDUE_BLOCKED';
  }

  const approachingDeadlineTasks = await Task.countDocuments({
    project: projectId,
    status: { $ne: 'COMPLETED' },
    dueDate: { $gte: now, $lte: threeDaysFromNow }
  });

  if (blockedTasks > 0 || approachingDeadlineTasks > 0) {
    return 'AT_RISK';
  }

  return 'ON_TRACK';
};

/**
 * Automatically recalculates progress and health for a project based on real task data
 * Progress = (completedTasks / totalTasks) * 100 (Safe for 0 tasks)
 */
const recalculateProjectProgress = async (projectId, actingUserId = null) => {
  try {
    if (!projectId) return null;
    const totalTasks = await Task.countDocuments({ project: projectId });
    const completedTasks = await Task.countDocuments({ project: projectId, status: 'COMPLETED' });

    let progress = 0;
    if (totalTasks > 0) {
      progress = Math.min(100, Math.max(0, Math.round((completedTasks / totalTasks) * 100)));
    }

    const project = await Project.findById(projectId);
    if (!project) return null;

    const previousStatus = project.status;
    let newStatus = project.status;

    // If all tasks are completed and totalTasks > 0, complete project
    if (totalTasks > 0 && completedTasks === totalTasks) {
      newStatus = 'COMPLETED';
      project.stage = 'COMPLETED';
    } else if (project.status === 'COMPLETED' && completedTasks < totalTasks) {
      newStatus = 'IN_PROGRESS';
    } else if (project.status === 'PLANNING' && (completedTasks > 0 || totalTasks > 0)) {
      newStatus = 'IN_PROGRESS';
    }

    // Determine dynamic health
    const computedHealth = await determineProjectHealth(projectId, project.endDate);

    project.progress = progress;
    project.status = newStatus;
    project.health = computedHealth;
    await project.save();

    // If transitioned to COMPLETED, log activity and notify both parties
    if (previousStatus !== 'COMPLETED' && newStatus === 'COMPLETED') {
      if (actingUserId) {
        await Activity.create({
          project: projectId,
          user: actingUserId,
          action: 'PROJECT_COMPLETED',
          description: `Project "${project.name}" reached 100% completion.`,
          clientVisible: true
        });

        // Notify client
        if (project.client && project.client.toString() !== actingUserId.toString()) {
          await Notification.create({
            user: project.client,
            project: projectId,
            title: 'Project Completed',
            type: 'PROJECT',
            message: `Project "${project.name}" has reached 100% completion! All tasks are completed.`,
            link: `/client/projects/${project._id}`
          });
        }
        // Notify admin
        if (project.createdBy && project.createdBy.toString() !== actingUserId.toString()) {
          await Notification.create({
            user: project.createdBy,
            project: projectId,
            title: 'Project Completed',
            type: 'PROJECT',
            message: `Project "${project.name}" has reached 100% completion.`,
            link: `/admin/projects/${project._id}`
          });
        }
      }
    }

    return { progress, health: computedHealth, totalTasks, completedTasks, project };
  } catch (error) {
    console.error(`[Progress Service Error] ${error.message}`);
    throw error;
  }
};

/**
 * Batch compute health for multiple projects using aggregation
 * Eliminates N+1 query problem in admin analytics
 */
const determineProjectsHealthBatch = async (projectIds) => {
  if (!projectIds || projectIds.length === 0) return {};

  const now = new Date();
  const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  // Get all tasks for these projects in a single aggregation
  const taskStats = await Task.aggregate([
    {
      $match: {
        project: { $in: projectIds },
        status: { $ne: 'COMPLETED' }
      }
    },
    {
      $group: {
        _id: '$project',
        blockedCount: {
          $sum: { $cond: [{ $eq: ['$status', 'BLOCKED'] }, 1, 0] }
        },
        overdueCount: {
          $sum: {
            $cond: [
              { $and: [
                { $ne: ['$dueDate', null] },
                { $lt: ['$dueDate', now] }
              ]},
              1,
              0
            ]
          }
        },
        urgentBlockedCount: {
          $sum: {
            $cond: [
              { $and: [
                { $eq: ['$status', 'BLOCKED'] },
                { $in: ['$priority', ['HIGH', 'URGENT']] }
              ]},
              1,
              0
            ]
          }
        },
        approachingDeadlineCount: {
          $sum: {
            $cond: [
              { $and: [
                { $ne: ['$dueDate', null] },
                { $gte: ['$dueDate', now] },
                { $lte: ['$dueDate', threeDaysFromNow] }
              ]},
              1,
              0
            ]
          }
        }
      }
    }
  ]);

  // Convert to map for quick lookup
  const statsMap = {};
  taskStats.forEach(stat => {
    statsMap[stat._id.toString()] = stat;
  });

  // Get project end dates for project-overdue check
  const projects = await Project.find({ _id: { $in: projectIds } }).select('endDate');
  const endDateMap = {};
  projects.forEach(p => {
    endDateMap[p._id.toString()] = p.endDate;
  });

  // Compute health for each project
  const healthMap = {};
  for (const projectId of projectIds) {
    const pid = projectId.toString();
    const stats = statsMap[pid] || {
      blockedCount: 0,
      overdueCount: 0,
      urgentBlockedCount: 0,
      approachingDeadlineCount: 0
    };

    const projectEndDate = endDateMap[pid];
    const projectOverdue = projectEndDate && new Date(projectEndDate) < now;

    let health;
    if (stats.overdueCount > 0 || stats.urgentBlockedCount > 0 || projectOverdue) {
      health = 'OVERDUE_BLOCKED';
    } else if (stats.blockedCount > 0 || stats.approachingDeadlineCount > 0) {
      health = 'AT_RISK';
    } else {
      health = 'ON_TRACK';
    }

    healthMap[pid] = health;
  }

  return healthMap;
};

module.exports = {
  determineProjectHealth,
  recalculateProjectProgress,
  determineProjectsHealthBatch
};
