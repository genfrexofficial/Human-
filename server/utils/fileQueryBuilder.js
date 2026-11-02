/**
 * File Query Builder - Centralized query logic for file access control
 * Ensures consistent RBAC across all file endpoints
 */

/**
 * Build query for client-accessible files
 * Clients can only see:
 * - Non-deliverable files (category !== 'DELIVERABLE' and isDeliverable !== true)
 * - Deliverables that have been admin-approved (adminApproved === true)
 */
const buildClientFileQuery = (userId, baseQuery = {}) => {
  const query = { ...baseQuery, status: { $ne: 'DELETED' } };

  // Client deliverable access control
  query.$and = [
    {
      $or: [
        // Non-deliverable files
        {
          $and: [
            { isDeliverable: { $ne: true } },
            { category: { $nin: ['DELIVERABLE'] } }
          ]
        },
        // Admin-approved deliverables only
        {
          $and: [
            { $or: [{ isDeliverable: true }, { category: 'DELIVERABLE' }] },
            { adminApproved: true }
          ]
        }
      ]
    }
  ];

  // Ensure client owns the project/client
  query.$or = [
    { client: userId },
    { project: { $in: [] } } // Will be populated by caller if needed
  ];

  return query;
};

/**
 * Build query for employee-accessible files
 * Employees can see:
 * - Files in projects they're assigned to
 * - Files in tasks assigned to them
 * - Non-confidential files only
 */
const buildEmployeeFileQuery = (userId, baseQuery = {}) => {
  const query = { ...baseQuery, status: { $ne: 'DELETED' } };

  // Hide confidential files
  query.isConfidential = { $ne: true };

  // Hide HR module files
  query.module = { $ne: 'HR' };

  return query;
};

/**
 * Build query for HR-accessible files
 * HR can see HR and general files
 */
const buildHRFileQuery = (baseQuery = {}) => {
  const query = { ...baseQuery, status: { $ne: 'DELETED' } };
  // HR has broad access, no additional restrictions
  return query;
};

/**
 * Build query for admin-accessible files
 * Admin sees everything
 */
const buildAdminFileQuery = (baseQuery = {}) => {
  const query = { ...baseQuery, status: { $ne: 'DELETED' } };
  // Admin has full access
  return query;
};

/**
 * Get the appropriate query builder for a user role
 */
const getFileQueryBuilder = (role) => {
  switch (role) {
    case 'CLIENT':
      return buildClientFileQuery;
    case 'Employee':
      return buildEmployeeFileQuery;
    case 'HR':
      return buildHRFileQuery;
    case 'ADMIN':
      return buildAdminFileQuery;
    default:
      return buildAdminFileQuery;
  }
};

/**
 * Apply role-based query filters to a base query
 */
const applyRoleFilters = (query, user, projectId = null) => {
  const builder = getFileQueryBuilder(user.role);
  let filteredQuery = builder(user._id, query);

  // For clients, ensure they only see their own projects
  if (user.role === 'CLIENT') {
    filteredQuery.$or = [
      { client: user._id },
      ...(projectId ? [{ project: projectId }] : [])
    ];
  }

  return filteredQuery;
};

/**
 * Check if a client can access a specific file
 * Used for per-file access control in download/view endpoints
 */
const canClientAccessFile = (file, userId) => {
  // Must not access Employee, HR, or other internal modules
  if (file.module === 'Employee' || file.module === 'HR') {
    return { allowed: false, reason: 'CLIENT_MODULE_BARRIER' };
  }

  // If file has client ownership, must match
  if (file.client && file.client.toString() !== userId.toString()) {
    return { allowed: false, reason: 'CROSS_CLIENT_BARRIER' };
  }

  // If attached to project, must be client's project
  if (file.project) {
    const projectClient = file.project.client ? file.project.client.toString() : '';
    if (projectClient !== userId.toString()) {
      return { allowed: false, reason: 'CROSS_PROJECT_CLIENT_BARRIER' };
    }

    // Check task visibility
    if (file.task && file.task.clientVisible === false) {
      return { allowed: false, reason: 'INTERNAL_TASK_FILE' };
    }
  }

  // Client Deliverable Release Check: Only admin-approved deliverables
  const isDeliverableFile = file.isDeliverable === true || file.category === 'DELIVERABLE';
  const isAdminApproved = file.adminApproved === true;

  if (isDeliverableFile && !isAdminApproved) {
    return { allowed: false, reason: 'DELIVERABLE_NOT_ADMIN_APPROVED' };
  }

  return { allowed: true };
};

/**
 * Check if an employee can access a specific file
 */
const canEmployeeAccessFile = (file, userId) => {
  // Cannot access HR files
  if (file.module === 'HR') {
    return { allowed: false, reason: 'EMPLOYEE_HR_BARRIER' };
  }

  // For Employee/TASK module files, check ownership
  if (file.module === 'Employee' || file.module === 'TASK') {
    const isEmployeeOwner = (file.relatedEntityId && file.relatedEntityId.toString() === userId.toString()) ||
      (file.uploadedBy && file.uploadedBy.toString() === userId.toString());
    const isTaskAssigned = file.task && file.task.assignedTo && file.task.assignedTo.toString() === userId.toString();
    const isTaskCreator = file.task && file.task.createdBy && file.task.createdBy.toString() === userId.toString();

    if (!isEmployeeOwner && !isTaskAssigned && !isTaskCreator) {
      return { allowed: false, reason: 'CROSS_EMPLOYEE_BARRIER' };
    }
  }

  // For project files, check project assignment
  if (file.project) {
    const isAssigned = file.project.assignedEmployees && file.project.assignedEmployees.some(
      (w) => w.toString() === userId.toString()
    );
    const isTaskAssigned = file.task && file.task.assignedTo && file.task.assignedTo.toString() === userId.toString();

    if (!isAssigned && !isTaskAssigned) {
      return { allowed: false, reason: 'EMPLOYEE_UNASSIGNED_PROJECT' };
    }
  }

  return { allowed: true };
};

module.exports = {
  buildClientFileQuery,
  buildEmployeeFileQuery,
  buildHRFileQuery,
  buildAdminFileQuery,
  getFileQueryBuilder,
  applyRoleFilters,
  canClientAccessFile,
  canEmployeeAccessFile
};