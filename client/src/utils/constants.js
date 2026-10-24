export const ROLES = {
  ADMIN: 'ADMIN',
  CLIENT: 'CLIENT'
};

export const PROJECT_STATUS = {
  PLANNING: { label: 'Planning', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  ON_HOLD: { label: 'On Hold', color: 'bg-slate-100 text-slate-700 border-slate-300' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
};

export const TASK_STATUS = {
  ASSIGNED: { label: 'Assigned', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  TODO: { label: 'To Do', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  IN_REVIEW: { label: 'In Review', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  CHANGES_REQUESTED: { label: 'Changes Requested', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  BLOCKED: { label: 'Blocked', color: 'bg-rose-50 text-rose-700 border-rose-200' }
};

export const TASK_PRIORITY = {
  LOW: { label: 'Low', color: 'bg-slate-100 text-slate-600' },
  MEDIUM: { label: 'Medium', color: 'bg-amber-100 text-amber-800' },
  HIGH: { label: 'High', color: 'bg-rose-100 text-rose-800' }
};

export const MILESTONE_STATUS = {
  PENDING: { label: 'Pending', color: 'bg-slate-100 text-slate-700' },
  IN_PROGRESS: { label: 'In Progress', color: 'bg-blue-50 text-blue-700' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-50 text-emerald-700' }
};

export const FILE_CATEGORY = {
  DOCUMENT: { label: 'Document', icon: 'FileText' },
  DESIGN: { label: 'Design Asset', icon: 'Palette' },
  DELIVERABLE: { label: 'Deliverable', icon: 'Package' },
  OTHER: { label: 'Other', icon: 'File' }
};

export const APPROVAL_STATUS = {
  PENDING_REVIEW: { label: 'Pending Review', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  APPROVED: { label: 'Approved', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CHANGES_REQUESTED: { label: 'Changes Requested', color: 'bg-rose-50 text-rose-700 border-rose-200' }
};
