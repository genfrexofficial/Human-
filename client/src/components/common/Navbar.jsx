import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import NotificationDropdown from '../notifications/NotificationDropdown';
import { Menu, Search, User, LogOut, ChevronDown, ShieldCheck, Briefcase, UserCheck } from 'lucide-react';

const Navbar = ({ onMobileMenuToggle }) => {
  const { user, logout, isAdmin, isHR, isEmployee, isClient } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    navigate('/login');
  };

  const getProfileRoute = () => {
    if (isAdmin) return '/admin/settings';
    if (isHR) return '/hr/settings';
    if (isEmployee) return '/Employee/profile';
    return '/client/profile';
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 sm:px-6 backdrop-blur-md">
      {/* Left side: Hamburger button + Search */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global Search Bar */}
        <div className="relative hidden sm:block w-64 md:w-80">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search projects, tasks, deliverables..."
            className="block w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>
      </div>

      {/* Right side: Notifications & Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        <NotificationDropdown />

        <div className="h-5 w-[1px] bg-slate-200" />

        {/* User Profile Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2.5 rounded-lg p-1 hover:bg-slate-100 transition-colors text-left"
          >
            <div className="h-8 w-8 rounded-full overflow-hidden bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-xs border border-indigo-200 shrink-0">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <span>{user?.name?.charAt(0) || 'U'}</span>
              )}
            </div>
            <div className="hidden md:block">
              <p className="text-xs font-semibold text-slate-800 leading-none">{user?.name}</p>
              <div className="flex items-center gap-1 mt-1">
                {isAdmin ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                    <ShieldCheck className="w-2.5 h-2.5" /> Agency Admin
                  </span>
                ) : isHR ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200">
                    <UserCheck className="w-2.5 h-2.5" /> HR Talent Lead
                  </span>
                ) : isEmployee ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    <Briefcase className="w-2.5 h-2.5" /> Team Engineer
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                    <Briefcase className="w-2.5 h-2.5" /> Client
                  </span>
                )}
              </div>
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden md:block" />
          </button>

          {/* Profile Dropdown */}
          {userMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-floating border border-slate-200/80 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
              onMouseLeave={() => setUserMenuOpen(false)}
            >
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-semibold text-slate-900">{user?.name}</p>
                <p className="text-[11px] text-slate-500 truncate">{user?.email}</p>
                {user?.title && (
                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">{user.title}</p>
                )}
                {user?.companyName && (
                  <p className="text-[10px] text-indigo-600 font-medium mt-0.5">{user.companyName}</p>
                )}
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate(getProfileRoute());
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                >
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  Profile & Settings
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
