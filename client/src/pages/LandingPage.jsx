import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import {
  Layers,
  CheckCircle2,
  FolderKanban,
  Files,
  ArrowRight,
  ShieldCheck,
  Briefcase,
  Inbox,
  HardHat,
  Users,
  Check,
  Lock,
  BarChart3,
  UserCheck,
  FileCheck,
  Mail,
  Send
} from 'lucide-react';

const LandingPage = () => {
  const { isAuthenticated, user, login } = useAuth();
  const navigate = useNavigate();

  const handleQuickDemo = async (role) => {
    try {
      if (role === 'ADMIN') {
        await login('admin@genfrex.com', 'Admin@123');
        navigate('/admin/dashboard');
      } else if (role === 'HR') {
        await login('hr@genfrex.com', 'Hr@123');
        navigate('/hr/dashboard');
      } else if (role === 'Employee') {
        await login('arun@clientportal.com', 'Employee@123');
        navigate('/Employee/dashboard');
      } else {
        await login('client@clientportal.com', 'Client@123');
        navigate('/client/dashboard');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const dashboardRoute =
    user?.role === 'ADMIN'
      ? '/admin/dashboard'
      : user?.role === 'HR'
        ? '/hr/dashboard'
        : user?.role === 'Employee'
          ? '/Employee/dashboard'
          : '/client/dashboard';

  return (
    <div className="min-h-screen bg-[#080B14] text-slate-100 flex flex-col font-sans relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-blue-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Navigation */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-white/10 bg-[#080B14]/90 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="bg-white/95 px-3 py-1 rounded-xl shadow-md border border-white/20">
            <img src="/logo.png" alt="GENFREX" className="h-7 w-auto object-contain" />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link to={dashboardRoute}>
              <Button size="sm" variant="primary">
                <span>Go to Workspace ({user.role})</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                  Sign In
                </Button>
              </Link>
              <Link to="/login">
                <Button size="sm" variant="primary">
                  Launch Platform
                </Button>
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 pt-16 pb-14 text-center max-w-4xl mx-auto relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-950/50 border border-blue-500/30 text-xs font-semibold text-blue-300 mb-6">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Unified Business Management Platform • ClientFlow + OfferFlow</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
          Client collaboration, project delivery, & <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            HR talent management — all in one place.
          </span>
        </h1>

        <p className="mt-5 text-sm sm:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
          One unified system for GENFREX powering client project roadmaps, deliverables, engineering execution, candidate records, and verified Trainee Appointment Letters with mandatory Admin approval.
        </p>

        {/* 1-Click Role Switcher Demo */}
        <div className="mt-8 rounded-2xl border border-white/10 bg-[#111827] p-5 shadow-2xl max-w-2xl mx-auto text-left backdrop-blur-xl">
          <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-1 text-center">
            One-Click Quick Evaluation Access
          </p>
          <p className="text-[11px] text-slate-500 text-center mb-4">
            Select a verified role to test instant authorization and dedicated workspaces
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              type="button"
              onClick={() => handleQuickDemo('ADMIN')}
              className="flex flex-col items-center p-3 rounded-xl border border-blue-500/30 bg-blue-950/30 hover:bg-blue-900/50 transition-all text-center group"
            >
              <div className="p-1.5 rounded-lg bg-blue-600 text-white mb-1.5 shadow-sm">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">Admin</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Alex Rivera</span>
              <span className="text-[9px] text-blue-400 font-semibold mt-1">Full Management</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('HR')}
              className="flex flex-col items-center p-3 rounded-xl border border-cyan-500/30 bg-cyan-950/30 hover:bg-cyan-900/50 transition-all text-center group"
            >
              <div className="p-1.5 rounded-lg bg-cyan-600 text-white mb-1.5 shadow-sm">
                <UserCheck className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">HR Lead</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Meera Nambiar</span>
              <span className="text-[9px] text-cyan-400 font-semibold mt-1">Offers & Letters</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('Employee')}
              className="flex flex-col items-center p-3 rounded-xl border border-amber-500/30 bg-amber-950/30 hover:bg-amber-900/50 transition-all text-center group"
            >
              <div className="p-1.5 rounded-lg bg-amber-600 text-white mb-1.5 shadow-sm">
                <HardHat className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">Employee</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Arun Kumar</span>
              <span className="text-[9px] text-amber-400 font-semibold mt-1">Task Delivery</span>
            </button>

            <button
              type="button"
              onClick={() => handleQuickDemo('CLIENT')}
              className="flex flex-col items-center p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/30 hover:bg-emerald-900/50 transition-all text-center group"
            >
              <div className="p-1.5 rounded-lg bg-emerald-600 text-white mb-1.5 shadow-sm">
                <Briefcase className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white">Client</span>
              <span className="text-[10px] text-slate-400 mt-0.5">Sarah Jenkins</span>
              <span className="text-[9px] text-emerald-400 font-semibold mt-1">Portal Sign-Off</span>
            </button>
          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section className="py-14 bg-[#0B0F19] border-y border-white/10 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-cyan-400">
              Complete Business Operations
            </span>
            <h2 className="text-2xl font-black text-white mt-1">
              Two Integrated Engines in One Master Platform
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Engineered with strict backend RBAC, zero data leakage, and real MongoDB audit logs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ClientFlow Card */}
            <div className="p-6 rounded-2xl bg-[#111827] border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600 text-white">
                  <FolderKanban className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">ClientFlow Engine</h3>
                  <p className="text-xs text-slate-400">Client Portal & Project Delivery</p>
                </div>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Real-time milestone roadmaps & auto-calculated project health</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Interactive deliverable review (Approve / Request Changes)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Client requirement requests and engineer task assignments</span>
                </li>
              </ul>
            </div>

            {/* OfferFlow Card */}
            <div className="p-6 rounded-2xl bg-[#111827] border border-white/10 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-cyan-600 text-white">
                  <FileCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">OfferFlow HR Engine</h3>
                  <p className="text-xs text-slate-400">Appointment Letters & Verification</p>
                </div>
              </div>
              <ul className="space-y-2 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Candidate directory & multi-step trainee letter generator</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Mandatory Admin review: Approve or Return for Revision</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Automated A4 vector PDF generation & official email dispatch</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-white/10 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} GENFREX Unified Business Management Platform. All rights reserved.</p>
        <p className="text-[10px] text-slate-600 mt-1">Official Communications: genfrexofficial@gmail.com</p>
      </footer>
    </div>
  );
};

export default LandingPage;
