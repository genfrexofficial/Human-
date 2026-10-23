import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  CheckSquare,
  Files,
  Bell,
  Settings,
  LogOut,
  X,
  Layers,
  User,
  Inbox,
  HardHat,
  BarChart3,
  History,
  FileText,
  UserPlus,
  Clock,
  CheckCircle2,
  Send,
  XCircle,
  FileCheck,
  ChevronDown,
  ChevronRight,
  UserCheck,
  HardDrive,
  Banknote
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { user, isAdmin, isHR, isWorker, isClient, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Grouped Admin navigation
  const adminSections = [
    {
      group: 'OVERVIEW',
      items: [
        { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard }
      ]
    },
    {
      group: 'PROJECT MANAGEMENT',
      items: [
        { label: 'Projects', path: '/admin/projects', icon: FolderKanban },
        { label: 'Tasks & Milestones', path: '/admin/tasks', icon: CheckSquare },
        { label: 'Task Requests', path: '/admin/task-requests', icon: Inbox },
        { label: 'Deliverables', path: '/admin/files', icon: Files },
        { label: 'Invoices & Finance', path: '/admin/invoices', icon: FileText }
      ]
    },
    {
      group: 'PEOPLE',
      items: [
        { label: 'User Management', path: '/admin/users', icon: Users },
        { label: 'Attendance & Leaves', path: '/admin/attendance-leaves', icon: Clock },
        { label: 'Payroll & Salaries', path: '/admin/payroll', icon: Banknote },
        { label: 'Workers', path: '/admin/workers', icon: HardHat },
        { label: 'Clients', path: '/admin/clients', icon: Users },
        { label: 'HR Team', path: '/admin/hr-team', icon: UserCheck }
      ]
    },
    {
      group: 'HR & APPOINTMENTS',
      items: [
        { label: 'HR Overview', path: '/admin/hr/dashboard', icon: BarChart3 },
        { label: 'Candidates', path: '/admin/hr/candidates', icon: UserPlus },
        { label: 'All Letters', path: '/admin/hr/appointments', icon: FileText },
        { label: 'Pending Approvals', path: '/admin/hr/pending-approvals', icon: Clock },
        { label: 'Approved Letters', path: '/admin/hr/approved', icon: CheckCircle2 },
        { label: 'Sent Letters', path: '/admin/hr/sent', icon: Send },
        { label: 'Rejected Letters', path: '/admin/hr/rejected', icon: XCircle },
        { label: 'HR Reports', path: '/admin/hr/reports', icon: FileCheck }
      ]
    },
    {
      group: 'SYSTEM',
      items: [
        { label: 'Storage & Cloud', path: '/admin/storage', icon: HardDrive },
        { label: 'Reports & Analytics', path: '/admin/reports', icon: BarChart3 },
        { label: 'Audit Logs', path: '/admin/activities', icon: History },
        { label: 'Notifications', path: '/admin/notifications', icon: Bell },
        { label: 'Settings', path: '/admin/settings', icon: Settings }
      ]
    }
  ];

  // Dedicated HR navigation
  const hrSections = [
    {
      group: 'HR WORKSPACE',
      items: [
        { label: 'Dashboard', path: '/hr/dashboard', icon: LayoutDashboard },
        { label: 'Attendance & Leaves', path: '/hr/attendance-leaves', icon: Clock },
        { label: 'Payroll & Salaries', path: '/hr/payroll', icon: Banknote },
        { label: 'Candidates', path: '/hr/candidates', icon: UserPlus },
        { label: 'Create Appointment', path: '/hr/appointments/create', icon: FilePlusIcon },
        { label: 'My Drafts', path: '/hr/appointments?status=DRAFT', icon: FileText },
        { label: 'Submitted Letters', path: '/hr/approvals-status', icon: Clock },
        { label: 'Approved Letters', path: '/hr/appointments?status=APPROVED', icon: CheckCircle2 },
        { label: 'Sent Letters', path: '/hr/sent-letters', icon: Send },
        { label: 'Rejected Letters', path: '/hr/appointments?status=REJECTED', icon: XCircle },
        { label: 'Settings', path: '/hr/settings', icon: Settings }
      ]
    }
  ];

  // Worker navigation
  const workerSections = [
    {
      group: 'ENGINEERING',
      items: [
        { label: 'Dashboard', path: '/worker/dashboard', icon: LayoutDashboard },
        { label: 'Attendance & Leaves', path: '/worker/attendance', icon: Clock },
        { label: 'My Payslips', path: '/worker/payroll', icon: Banknote },
        { label: 'My Tasks', path: '/worker/tasks', icon: CheckSquare },
        { label: 'Assigned Projects', path: '/worker/projects', icon: FolderKanban },
        { label: 'Deliverables & Files', path: '/worker/files', icon: Files },
        { label: 'Activity Feed', path: '/worker/activity', icon: History },
        { label: 'My Profile', path: '/worker/profile', icon: User }
      ]
    }
  ];

  // Client navigation
  const clientSections = [
    {
      group: 'CLIENT PORTAL',
      items: [
        { label: 'Dashboard', path: '/client/dashboard', icon: LayoutDashboard },
        { label: 'Billing & Invoices', path: '/client/invoices', icon: FileText },
        { label: 'My Projects', path: '/client/projects', icon: FolderKanban },
        { label: 'Task Requests', path: '/client/task-requests', icon: Inbox },
        { label: 'Project Tasks', path: '/client/tasks', icon: CheckSquare },
        { label: 'Deliverables', path: '/client/files', icon: Files },
        { label: 'Activity', path: '/client/activity', icon: History },
        { label: 'My Profile', path: '/client/profile', icon: User }
      ]
    }
  ];

  function FilePlusIcon(props) {
    return <FileText {...props} />;
  }

  let sections = clientSections;
  let workspaceLabel = 'Client Portal';
  let badgeColor = 'bg-emerald-500';

  if (isAdmin) {
    sections = adminSections;
    workspaceLabel = 'Admin Command Center';
    badgeColor = 'bg-blue-600';
  } else if (isHR) {
    sections = hrSections;
    workspaceLabel = 'HR Talent Operations';
    badgeColor = 'bg-cyan-500';
  } else if (isWorker) {
    sections = workerSections;
    workspaceLabel = 'Engineering Workspace';
    badgeColor = 'bg-amber-500';
  }

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 h-[100dvh] lg:h-full flex-col justify-between border-r border-slate-200/80 bg-white transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top brand header */}
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex h-16 shrink-0 items-center justify-between px-5 border-b border-slate-100 bg-slate-50/50">
            <div className="flex items-center">
              <img
                src="/logo.png"
                alt="GENFREX"
                className="h-9 w-auto max-w-[175px] object-contain"
              />
            </div>

            {/* Close button on mobile */}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation links - scrollable */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
            <div className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>{workspaceLabel}</span>
              <span className={`w-2 h-2 rounded-full ${badgeColor}`} />
            </div>

            {sections.map((section) => (
              <div key={section.group} className="space-y-1">
                <p className="px-2 pt-1 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  {section.group}
                </p>
                {section.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => onClose && onClose()}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          isActive
                            ? 'bg-blue-50 text-blue-700 font-semibold border-r-2 border-blue-600'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0 text-slate-500" />
                      <span className="truncate">{item.label}</span>
                    </NavLink>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom user summary & logout */}
        <div className="p-3 border-t border-slate-100 shrink-0 bg-slate-50/50">
          <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/60 mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="h-7 w-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 truncate">{user?.name}</p>
                <div className="flex items-center gap-1">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${badgeColor}`} />
                  <p className="text-[10px] text-slate-500 truncate font-semibold uppercase">
                    {user?.role}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
