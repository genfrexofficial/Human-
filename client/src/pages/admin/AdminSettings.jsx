import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import Card from '../../components/common/Card';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import {
  ShieldCheck,
  Server,
  Database,
  Cloud,
  User,
  Building,
  Mail,
  CheckCircle2,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminSettings = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    companyName: user?.companyName || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });

  // Admin password change form
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      toast.error('Full Name is required.');
      return;
    }
    if (!formData.email?.trim()) {
      toast.error('Email Address is required.');
      return;
    }
    const adminId = user?._id || user?.id;
    if (!adminId) {
      toast.error('Admin user ID not found.');
      return;
    }
    try {
      setProfileLoading(true);
      const res = await userService.updateUser(adminId, {
        name: formData.name,
        email: formData.email,
        companyName: formData.companyName,
        phone: formData.phone
      });
      if (res.success) {
        toast.success('Agency settings updated successfully.');
        const updated = { ...user, ...res.user };
        localStorage.setItem('user', JSON.stringify(updated));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update agency settings.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAdminPasswordChange = async (e) => {
    e.preventDefault();

    if (!passwordData.currentPassword) {
      toast.error('Please enter your current master password.');
      return;
    }

    if (!passwordData.newPassword || passwordData.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long.');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match. Please verify.');
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await userService.changeAdminPassword(passwordData);
      if (res.success) {
        toast.success('Admin password updated successfully. Please log in again.');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        // Invalidate current session and require re-login
        setTimeout(() => {
          logout();
          navigate('/login');
        }, 1500);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update administrator password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Settings & Security</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure agency branding, manage master administrator credentials, and view system status.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Profile & Security */}
        <div className="md:col-span-2 space-y-6">
          {/* Agency Profile */}
          <Card title="Agency Profile" subtitle="Your corporate identity shown across dashboards">
            <form onSubmit={handleSave} className="space-y-4">
              <Input
                label="Full Name"
                name="name"
                icon={User}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <Input
                label="Agency / Studio Name"
                name="companyName"
                icon={Building}
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              />

              <Input
                label="Email Address"
                name="email"
                type="email"
                icon={Mail}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                helperText="Primary email used for administrator sign-in."
              />

              <div className="pt-2">
                <Button type="submit" size="sm" loading={profileLoading}>
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>

          {/* Change Admin Password Card */}
          <Card
            title="Change Admin Password"
            subtitle="Update the master authentication password for the Platform Administrator"
          >
            <form onSubmit={handleAdminPasswordChange} className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span className="text-[11px] leading-relaxed">
                  Changing your administrator password will invalidate active sessions. You will be redirected to log in with your new password.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter current master password"
                    value={passwordData.currentPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, currentPassword: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 p-2 pr-8 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    New Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      placeholder="Min 6 characters"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                      className="w-full rounded-lg border border-slate-200 p-2 pr-8 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Confirm New Password <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter new password"
                    value={passwordData.confirmPassword}
                    onChange={(e) =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button type="submit" size="sm" loading={passwordLoading}>
                  <KeyRound className="w-3.5 h-3.5 mr-1" />
                  <span>Update Admin Password</span>
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* System Health / Status */}
        <div className="space-y-4">
          <Card title="System Diagnostics" subtitle="Services & deployment status">
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium text-slate-800">MongoDB Database</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-600" />
                  <span className="font-medium text-slate-800">Backend API</span>
                </div>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                  Port 5000
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-slate-800">Storage Engine</span>
                </div>
                <span className="text-[10px] font-medium text-slate-600 bg-slate-200/70 px-2 py-0.5 rounded-full">
                  Cloudinary / Local
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  <span className="font-medium text-slate-800">Security Mode</span>
                </div>
                <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                  RBAC Strict
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
