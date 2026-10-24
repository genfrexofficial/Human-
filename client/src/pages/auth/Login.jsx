import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  Briefcase,
  HardHat,
  UserCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Cpu,
  Shield,
  FolderKanban,
  FileCheck,
  Zap
} from 'lucide-react';

/**
 * High-performance Interactive Particle Background
 * Canvas that creates interconnected constellations reacting to mouse movement
 */
const TechParticleCanvas = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const particleCount = Math.min(Math.floor(width / 28), 65);
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2 + 1,
      color: Math.random() > 0.4 ? 'rgba(56, 189, 248, ' : 'rgba(99, 102, 241, '
    }));

    let mouse = { x: null, y: null, maxDist: 150 };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    const handleMouseLeave = () => {
      mouse.x = null;
      mouse.y = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 135) {
            const alpha = (1 - dist / 135) * 0.18;
            ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }

        if (mouse.x !== null) {
          const mdx = particles[i].x - mouse.x;
          const mdy = particles[i].y - mouse.y;
          const mdist = Math.sqrt(mdx * mdx + mdy * mdy);
          if (mdist < mouse.maxDist) {
            const mAlpha = (1 - mdist / mouse.maxDist) * 0.4;
            ctx.strokeStyle = `rgba(34, 211, 238, ${mAlpha})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }

        ctx.beginPath();
        ctx.arc(particles[i].x, particles[i].y, particles[i].radius, 0, Math.PI * 2);
        ctx.fillStyle = particles[i].color + '0.75)';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;

        particles[i].x += particles[i].vx;
        particles[i].y += particles[i].vy;

        if (particles[i].x < 0 || particles[i].x > width) particles[i].vx *= -1;
        if (particles[i].y < 0 || particles[i].y > height) particles[i].vy *= -1;
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0 opacity-80"
    />
  );
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { login, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname;

  useEffect(() => {
    if (isAuthenticated && user) {
      let target = from;
      if (!target) {
        if (user.role === 'ADMIN') target = '/admin/dashboard';
        else if (user.role === 'HR') target = '/hr/dashboard';
        else if (user.role === 'Employee') target = '/Employee/dashboard';
        else target = '/client/dashboard';
      }
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, user, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    try {
      setLoading(true);
      const user = await login(email, password);
      let target = from;
      if (!target) {
        if (user.role === 'ADMIN') target = '/admin/dashboard';
        else if (user.role === 'HR') target = '/hr/dashboard';
        else if (user.role === 'Employee') target = '/Employee/dashboard';
        else target = '/client/dashboard';
      }
      navigate(target, { replace: true });
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen w-full lg:h-screen lg:max-h-screen lg:overflow-hidden flex flex-col lg:flex-row bg-[#040711] text-slate-100 relative select-none">
      {/* Background Animated Tech Grid */}
      <div className="absolute inset-0 bg-tech-grid opacity-25 pointer-events-none" />

      {/* Interactive Full Screen Neural Canvas */}
      <TechParticleCanvas />

      {/* Dynamic Animated Ambient Glow Orbs */}
      <div className="absolute top-[-10%] left-[-5%] w-[650px] h-[650px] bg-blue-600/15 blur-[160px] rounded-full pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[700px] h-[700px] bg-indigo-600/15 blur-[160px] rounded-full pointer-events-none animate-float-slow" />
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 blur-[140px] rounded-full pointer-events-none animate-float" />

      {/* ================= LEFT SHOWCASE PANEL (Widescreen Experience) ================= */}
      <div className="hidden lg:flex lg:w-[50%] xl:w-[54%] h-full max-h-screen p-6 xl:p-10 flex-col justify-between relative z-10 overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="group relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl blur-md opacity-40 group-hover:opacity-75 transition duration-500 animate-pulse-glow" />
            <div className="relative p-2 px-4 rounded-xl bg-white/95 backdrop-blur-xl shadow-xl border border-white/40 inline-flex items-center">
              <img
                src="/logo.png"
                alt="GENFREX - Empowering Your Digital Growth & Talent Connections"
                className="h-8 xl:h-10 w-auto object-contain drop-shadow"
              />
            </div>
          </div>
        </div>

        {/* Hero Section */}
        <div className="my-auto py-2 xl:py-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/60 border border-blue-500/30 text-[11px] font-semibold text-blue-300 mb-3 xl:mb-4 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '8s' }} />
            <span>Unified Platform • ClientFlow + OfferFlow</span>
          </div>

          <h1 className="text-2xl xl:text-4xl 2xl:text-5xl font-black text-white tracking-tight leading-tight mb-3 xl:mb-4">
            Digital Growth, <br />
            Engineering Delivery & <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-indigo-300 bg-clip-text text-transparent">
              Verified Talent Letters.
            </span>
          </h1>

          <p className="text-xs xl:text-sm text-slate-300/80 leading-relaxed max-w-lg mb-4 xl:mb-6">
            One unified operating system for GENFREX powering client milestone roadmaps, engineering tasks, candidate records, and verified Trainee Appointment Letters with mandatory Admin approval.
          </p>

          {/* Dynamic Floating Glass Cards */}
          <div className="grid grid-cols-2 gap-3 max-w-lg">
            {/* Glass Card 1 - ClientFlow Hub */}
            <div className="glass-panel p-3 rounded-xl border border-white/10 hover:border-cyan-500/40 transition-all duration-300 animate-float">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-inner">
                    <FolderKanban className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-white">ClientFlow Hub</h4>
                    <p className="text-[9px] text-slate-400">Milestones & Delivery</p>
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Live
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-slate-300">
                  <span>Sprint Velocity</span>
                  <span className="font-semibold text-cyan-400">98.4%</span>
                </div>
                <div className="w-full h-1 bg-slate-800/80 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full w-[98%]" />
                </div>
              </div>
            </div>

            {/* Glass Card 2 - OfferFlow HR */}
            <div className="glass-panel p-3 rounded-xl border border-white/10 hover:border-blue-500/40 transition-all duration-300 animate-float-delay-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-600/30 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
                    <FileCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-white">OfferFlow HR</h4>
                    <p className="text-[9px] text-slate-400">Verified Letters</p>
                  </div>
                </div>
                <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  Approved
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-slate-300">
                  <span>Tamper-Proof PDFs</span>
                  <span className="font-semibold text-cyan-400">100% Valid</span>
                </div>
                <div className="w-full h-1 bg-slate-800/80 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full w-[100%]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Platform Metrics Bar */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium text-slate-300">ISO 27001 Security</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-medium text-slate-300">Multi-Workspace</span>
          </div>
          <span>•</span>
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-medium text-slate-300">99.99% Uptime</span>
          </div>
        </div>
      </div>

      {/* ================= RIGHT AUTHENTICATION GLASS PORTAL ================= */}
      <div className="w-full lg:w-[50%] xl:w-[46%] min-h-screen lg:h-full lg:max-h-screen flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative z-20 overflow-y-auto">
        {/* Mobile Header (Visible only on small screens) */}
        <div className="lg:hidden text-center mb-3 animate-card-entrance">
          <div className="inline-flex p-2 px-4 rounded-xl bg-white/95 backdrop-blur-xl shadow-lg border border-white/40 mb-1">
            <img
              src="/logo.png"
              alt="GENFREX"
              className="h-8 w-auto object-contain"
            />
          </div>
          <h2 className="text-sm font-bold text-white tracking-tight">
            Unified Business Management Portal
          </h2>
        </div>

        {/* Main Glassmorphism Portal Card */}
        <div className="w-full max-w-[410px] relative group animate-card-entrance">
          {/* Animated Neon Border Glow */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/30 via-cyan-500/30 to-indigo-600/30 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition duration-700 pointer-events-none" />

          <div className="relative glass-panel rounded-2xl p-5 sm:p-7 shadow-2xl border border-white/15 backdrop-blur-3xl bg-[#090e1f]/85 overflow-hidden">
            {/* Top Glowing Laser Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-600" />

            {/* Form Header */}
            <div className="mb-4 text-center">
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Authorized Sign-In
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-400">
                Enter your verified credentials to access your GENFREX workspace
              </p>
            </div>


            {errorMsg && (
              <div className="mb-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2 animate-card-entrance">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 animate-ping" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Official Email Address <span className="text-rose-400">*</span>
                </label>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-cyan-400 transition-colors">
                    <Mail className="h-3.5 w-3.5" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="official@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:bg-slate-900 transition-all duration-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 group-focus-within/input:text-cyan-400 transition-colors">
                    <Lock className="h-3.5 w-3.5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-9 py-2 rounded-xl bg-slate-950/80 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 focus:bg-slate-900 transition-all duration-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-cyan-300 transition-colors focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center text-[11px] pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200 transition-colors">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-white/20 bg-slate-900 text-cyan-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span>Remember me</span>
                </label>
              </div>

              {/* High-tech Shimmering Submit Button */}
              <div className="pt-1.5">
                <button
                  type="submit"
                  disabled={loading}
                  className="relative w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:via-indigo-500 hover:to-cyan-500 text-white font-semibold text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 overflow-hidden transition-all duration-300 transform active:scale-[0.99] disabled:opacity-50"
                >
                  {/* Light Shimmer Sweep */}
                  <div className="absolute inset-0 w-1/2 h-full bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 animate-shimmer pointer-events-none" />

                  {loading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span className="tracking-wide">Authorize & Enter Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-3.5 pt-2.5 border-t border-white/10 text-center">
              <p className="text-[10px] text-slate-400">
                Platform accounts are provisioned and managed by your Administrator.
              </p>
            </div>
          </div>

          {/* Footer security tag */}
          <div className="mt-2.5 text-center text-[9px] text-slate-500 flex items-center justify-center gap-2">
            <span>&copy; {new Date().getFullYear()} GENFREX Business Management Platform</span>
            <span>•</span>
            <span className="text-cyan-400/80">All rights reserved</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;


