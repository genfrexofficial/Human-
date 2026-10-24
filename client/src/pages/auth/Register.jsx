import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import Button from '../../components/common/Button';
import { ShieldAlert, ArrowRight, Lock } from 'lucide-react';

const Register = () => {
  const [checking, setChecking] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await authService.getSetupStatus();
        if (res.success && res.needsSetup) {
          setNeedsSetup(true);
          navigate('/setup-admin', { replace: true });
        }
      } catch (err) {
        console.error('Failed to check setup status', err);
      } finally {
        setChecking(false);
      }
    };
    checkStatus();
  }, [navigate]);

  if (checking) {
    return (
      <div className="min-h-screen bg-[#040711] flex items-center justify-center text-slate-400">
        <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#040711] text-slate-100 flex flex-col justify-center items-center py-12 px-4 relative select-none">
      <div className="absolute inset-0 bg-tech-grid opacity-25 pointer-events-none" />

      <div className="w-full max-w-md text-center relative z-10">
        <div className="inline-flex p-2 px-4 rounded-xl bg-white/95 backdrop-blur-xl shadow-lg border border-white/40 mb-3">
          <img
            src="/logo.png"
            alt="GENFREX"
            className="h-8 w-auto object-contain"
          />
        </div>

        <div className="glass-panel p-8 rounded-2xl border border-white/15 bg-[#090e1f]/90 shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold text-white tracking-tight">
            Public Registration Closed
          </h2>

          <p className="text-xs text-slate-300 leading-relaxed">
            Self-registration is disabled for enterprise security. All accounts for HR Officers, Employees, and Clients are provisioned directly by the Platform Administrator.
          </p>

          <div className="pt-2">
            <Link to="/login">
              <Button size="md" className="w-full">
                <span>Go to Authorized Sign-In</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>

        <p className="mt-4 text-[10px] text-slate-500">
          &copy; {new Date().getFullYear()} GENFREX Business Management Platform
        </p>
      </div>
    </div>
  );
};

export default Register;
