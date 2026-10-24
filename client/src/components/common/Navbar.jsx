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
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 sm:px-8 backdrop-blur-md">
      {/* Left side: Hamburger button + Search */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden transition-colors"
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global Search Bar */}
        <div className="relative hidden sm:block w-72 md:w-96">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search projects, tasks, employees..."
            className="block w-full rounded-xl border border-slate-200/90 bg-slate-50/80 py-2 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all duration-200"
          />
        </div>
      </div>

      {/* Right side: Notifications & Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        <NotificationDropdown />

        <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />

        {/* User Profile Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-slate-100 transition-colors text-left"
          >
            <div className="h-9 w-9 rounded-full overflow-hidden bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm shrink-0">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
              ) : (
                <span>{user?.name?.charAt(0) || 'U'}</span>
              )}
            </div>
            <div className="hidden md:block">
              <p className="text-sm font-bold text-slate-900 leading-none">{user?.name}</p>
              <div className="flex items-center gap-1 mt-1">
                {isAdmin ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                    <ShieldCheck className="w-3 h-3" /> Agency Admin
                  </span>
                ) : isHR ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
                    <UserCheck className="w-3 h-3" /> HR Talent Lead
                  </span>
                ) : isEmployee ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                    <Briefcase className="w-3 h-3" /> Team Engineer
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    <Briefcase className="w-3 h-3" /> Client
                  </span>
                )}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400 hidden md:block" />
          </button>

          {/* Profile Dropdown */}
          {userMenuOpen && (
            <div
              className="absolute right-0 mt-2 w-64 rounded-2xl bg-white shadow-floating border border-slate-200/90 py-2 z-50 animate-in fade-in zoom-in-95 duration-150"
              onMouseLeave={() => setUserMenuOpen(false)}
            >
              <div className="px-5 py-3 border-b border-slate-100">
                <p className="text-sm font-bold text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
                {user?.title && (
                  <p className="text-xs text-indigo-600 font-semibold mt-1">{user.title}</p>
                )}
                {user?.companyName && (
                  <p className="text-xs text-slate-500 font-medium mt-0.5">{user.companyName}</p>
                )}
              </div>

              <div className="py-1 px-1">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate(getProfileRoute());
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                >
                  <User className="h-4 w-4 text-slate-400" />
                  Profile & Settings
                </button>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
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
