const Project = require('../models/Project');
const Task = require('../models/Task');
const TaskRequest = require('../models/TaskRequest');
const Milestone = require('../models/Milestone');
const File = require('../models/File');
const Comment = require('../models/Comment');

// @desc    Generate AI project executive summary
// @route   GET /api/ai/project/:id/summary
// @access  Private
const generateProjectSummary = async (req, res, next) => {
  try {
    const { id: projectId } = req.params;

    const project = await Project.findById(projectId)
      .populate('client', 'name companyName')
      .populate('createdBy', 'name')
      .populate('assignedEmployees', 'name email title');

    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found.'
      });
    }

    // Role check
    if (req.user.role === 'CLIENT' && project.client._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized.'
      });
    }

    if (req.user.role === 'Employee') {
      const isAssigned = project.assignedEmployees && project.assignedEmployees.some(
        (w) => (w._id ? w._id.toString() : w.toString()) === req.user._id.toString()
      );
      const hasTask = await Task.exists({ project: project._id, assignedTo: req.user._id });
      if (!isAssigned && !hasTask) {
        return res.status(403).json({
          success: false,
          message: 'Unauthorized.'
        });
      }
    }

    const now = new Date();
    const tasks = await Task.find({ project: projectId }).populate('assignedTo', 'name');
    const milestones = await Milestone.find({ project: projectId }).sort({ dueDate: 1 });
    const files = await File.find({ project: projectId });
    const taskRequests = await TaskRequest.find({ project: projectId });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');
    const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS');
    const blockedTasks = tasks.filter((t) => t.status === 'BLOCKED');
    const inReviewTasks = tasks.filter((t) => t.status === 'IN_REVIEW');
    const overdueTasks = tasks.filter(
      (t) => t.status !== 'COMPLETED' && t.dueDate && new Date(t.dueDate) < now
    );

    const totalMilestones = milestones.length;
    const completedMilestones = milestones.filter((m) => m.status === 'COMPLETED');
    const upcomingMilestones = milestones.filter((m) => m.status !== 'COMPLETED');

    const deliverables = files.filter((f) => f.category === 'DELIVERABLE');
    const pendingReviewFiles = deliverables.filter((f) => f.approvalStatus === 'PENDING_REVIEW');
    const changesRequestedFiles = deliverables.filter((f) => f.approvalStatus === 'CHANGES_REQUESTED');
    const approvedFiles = deliverables.filter((f) => f.approvalStatus === 'APPROVED');

    const pendingRequests = taskRequests.filter((r) => r.status === 'PENDING_APPROVAL');

    // Synthesize structured executive intelligence
    let currentStatus = project.health || 'ON_TRACK';
    if (blockedTasks.length > 0 || overdueTasks.length > 0) {
      currentStatus = 'OVERDUE_BLOCKED';
    } else if (changesRequestedFiles.length > 0 || pendingRequests.length > 0) {
      currentStatus = 'AT_RISK';
    } else if (project.progress === 100) {
      currentStatus = 'COMPLETED';
    }

    let executiveSummary = `Project "${project.name}" is currently in the ${project.stage.replace('_', ' ')} stage with an overall completion rate of ${project.progress}%. `;
    if (project.progress === 100) {
      executiveSummary += `All ${totalTasks} planned tasks have been delivered and signed off. Milestones have been fully achieved.`;
    } else {
      executiveSummary += `${completedTasks.length} of ${totalTasks} engineering tasks are completed. `;
      if (inProgressTasks.length > 0) {
        executiveSummary += `Active execution is underway on ${inProgressTasks.length} task(s). `;
      }
      if (pendingReviewFiles.length > 0) {
        executiveSummary += `Client attention is requested for ${pendingReviewFiles.length} deliverable(s) awaiting approval. `;
      }
      if (blockedTasks.length > 0) {
        executiveSummary += `⚠️ Alert: ${blockedTasks.length} task(s) currently report blocked progress. `;
      }
    }

    const keyProgress = [
      `Overall Progress: ${project.progress}% completed (${completedTasks.length}/${totalTasks} tasks)`,
      `Stage: ${project.stage.replace('_', ' ')}`,
      `Milestones Achieved: ${completedMilestones.length}/${totalMilestones}`,
      `Approved Deliverables: ${approvedFiles.length}/${deliverables.length}`
    ];

    const risks = [];
    if (blockedTasks.length > 0) {
      risks.push(`${blockedTasks.length} task(s) blocked: ${blockedTasks.map((t) => `"${t.title}"`).join(', ')}`);
    }
    if (overdueTasks.length > 0) {
      risks.push(`${overdueTasks.length} task(s) past target deadline: ${overdueTasks.map((t) => `"${t.title}"`).join(', ')}`);
    }
    if (changesRequestedFiles.length > 0) {
      risks.push(`Deliverable revision pending: ${changesRequestedFiles.map((f) => `"${f.fileName}"`).join(', ')}`);
    }
    if (risks.length === 0) {
      risks.push('Zero active blockers identified; project execution is tracking normally against schedule.');
    }

    const pendingActions = [];
    if (pendingRequests.length > 0) {
      pendingActions.push(`Admin: Review ${pendingRequests.length} pending client task request(s).`);
    }
    if (inReviewTasks.length > 0) {
      pendingActions.push(`Admin: Review ${inReviewTasks.length} task submission(s) from team members.`);
    }
    if (pendingReviewFiles.length > 0) {
      pendingActions.push(`Client: Review and sign off on ${pendingReviewFiles.length} submitted deliverable(s).`);
    }
    if (changesRequestedFiles.length > 0) {
      pendingActions.push(`Team: Address revision feedback on ${changesRequestedFiles.length} deliverable(s).`);
    }
    if (pendingActions.length === 0) {
      pendingActions.push('No pending approvals or sign-offs required at this time.');
    }

    const recommendedNextSteps = [];
    if (upcomingMilestones.length > 0) {
      recommendedNextSteps.push(`Focus team bandwidth on milestone: "${upcomingMilestones[0].title}" (Target: ${upcomingMilestones[0].dueDate ? new Date(upcomingMilestones[0].dueDate).toLocaleDateString() : 'Scheduled'}).`);
    }
    if (blockedTasks.length > 0) {
      recommendedNextSteps.push(`Clear dependencies for blocked task "${blockedTasks[0].title}".`);
    }
    if (inProgressTasks.length > 0) {
      recommendedNextSteps.push(`Continue execution on active task "${inProgressTasks[0].title}".`);
    }
    if (recommendedNextSteps.length === 0) {
      recommendedNextSteps.push('Conduct final project retrospective and hand off sign-off documentation.');
    }

    res.status(200).json({
      success: true,
      data: {
        projectName: project.name,
        healthStatus: currentStatus,
        stage: project.stage,
        progress: project.progress,
        executiveSummary,
        currentStatus,
        keyProgress,
        risks,
        pendingActions,
        recommendedNextSteps,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateProjectSummary
};
