import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import {
  ShieldCheck,
  Mail,
  Lock,
  User,
  Building,
  Phone,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminSetup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: 'GENFREX',
    phone: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkSetupStatus = async () => {
      try {
        const res = await authService.getSetupStatus();
        if (res.success && !res.needsSetup) {
          toast('Administrator account is already configured. Please sign in.', { icon: 'ℹ️' });
          navigate('/login', { replace: true });
        }
      } catch (err) {
        console.error('Failed to verify setup status', err);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkSetupStatus();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (formData.password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter your password.');
      return;
    }

    try {
      setLoading(true);
      const res = await authService.setupAdmin({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        companyName: formData.companyName,
        phone: formData.phone
      });

      if (res.success) {
        toast.success('Primary Administrator configured successfully!');
        // Automatically log the admin in
        await login(formData.email, formData.password);
        navigate('/admin/dashboard', { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to initialize administrator.';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-[#040711] flex items-center justify-center text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Verifying Platform Initialization State...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-y-auto flex flex-col justify-center items-center p-4 bg-[#040711] text-slate-100 relative select-none">
      {/* Background Animated Tech Grid & Ambient Orbs */}
      <div className="absolute inset-0 bg-tech-grid opacity-25 pointer-events-none" />
      <div className="absolute top-[-10%] left-[-5%] w-[600px] h-[600px] bg-blue-600/15 blur-[160px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[650px] h-[650px] bg-indigo-600/15 blur-[160px] rounded-full pointer-events-none" />

      {/* Main Glassmorphic Setup Card */}
      <div className="w-full max-w-[480px] relative z-10 py-8">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/40 via-cyan-500/40 to-indigo-600/40 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition duration-700 pointer-events-none" />

          <div className="relative glass-panel rounded-2xl p-6 sm:p-8 shadow-2xl border border-white/15 backdrop-blur-3xl bg-[#090e1f]/90 overflow-hidden">
            {/* Top Glowing Laser Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-600" />

            {/* Logo & Header */}
            <div className="text-center mb-6">
              <div className="inline-flex p-2 px-4 rounded-xl bg-white/95 backdrop-blur-xl shadow-lg border border-white/40 mb-3">
                <img
                  src="/logo.png"
                  alt="GENFREX"
                  className="h-8 w-auto object-contain"
                />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-950/80 border border-blue-500/30 text-[10px] font-bold text-blue-300 mb-2">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>FIRST-TIME SYSTEM INITIALIZATION</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Create Primary Administrator
              </h2>
              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                Initialize your GENFREX Platform by creating your secure root Administrator credentials.
              </p>
            </div>

            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Administrator Full Name */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Administrator Full Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-cyan-400 transition-colors">
                    <User className="h-3.5 w-3.5" />
                  </div>
                  <input
                    type="text"
                    required
                    name="name"
                    placeholder="e.g. System Administrator"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:bg-slate-900 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Official Email */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Official Administrator Email <span className="text-rose-400">*</span>
                </label>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-cyan-400 transition-colors">
                    <Mail className="h-3.5 w-3.5" />
                  </div>
                  <input
                    type="email"
                    required
                    name="email"
                    placeholder="admin@yourcompany.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:bg-slate-900 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Organization Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Organization / Agency Name
                  </label>
                  <div className="relative group/input">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-cyan-400 transition-colors">
                      <Building className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type="text"
                      name="companyName"
                      placeholder="GENFREX"
                      value={formData.companyName}
                      onChange={handleChange}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:bg-slate-900 transition-all duration-200"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Phone (Optional)
                  </label>
                  <div className="relative group/input">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-cyan-400 transition-colors">
                      <Phone className="h-3.5 w-3.5" />
                    </div>
                    <input
                      type="text"
                      name="phone"
                      placeholder="+1 (555) 000-0000"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:bg-slate-900 transition-all duration-200"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Master Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-cyan-400 transition-colors">
                    <Lock className="h-3.5 w-3.5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    name="password"
                    placeholder="At least 6 characters"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:bg-slate-900 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-cyan-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Confirm Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-cyan-400 transition-colors">
                    <Lock className="h-3.5 w-3.5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    name="confirmPassword"
                    placeholder="Re-enter your master password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:bg-slate-900 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="relative w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:via-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 overflow-hidden transition-all duration-300 transform active:scale-[0.99] disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Configuring Primary Administrator...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-cyan-300" />
                      <span>Initialize Platform & Log In</span>
                      <ArrowRight className="w-3.5 h-3.5 ml-1" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-4 pt-3 border-t border-white/10 text-center">
              <p className="text-[10px] text-slate-500">
                After initialization, public Admin setup is automatically locked. Further accounts (HR, Employees, Clients) must be added through the Admin Workspace.
              </p>
            </div>
          </div>

          <div className="mt-4 text-center text-[10px] text-slate-500">
            &copy; {new Date().getFullYear()} GENFREX Unified Business Management Platform
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSetup;
