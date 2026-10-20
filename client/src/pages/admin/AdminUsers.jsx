import React, { useState, useEffect } from 'react';
import { userService } from '../../services/userService';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import { CardSkeleton } from '../../components/common/Skeleton';
import { formatDate } from '../../utils/formatters';
import {
  Users,
  UserPlus,
  Search,
  KeyRound,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Copy,
  Shield,
  Briefcase,
  HardHat,
  UserCheck,
  AlertTriangle,
  Lock,
  Phone,
  Mail,
  User,
  Building,
  Eye,
  EyeOff
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminUsers = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form states
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'HR',
    password: '',
    confirmPassword: '',
    status: 'ACTIVE'
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);

  // Password reset modal state
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Edit user state
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    title: '',
    companyName: '',
    status: 'ACTIVE'
  });
  const [editLoading, setEditLoading] = useState(false);

  // Provisioned credentials banner
  const [provisionedCredential, setProvisionedCredential] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {};
      if (roleFilter !== 'ALL') params.role = roleFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchTerm.trim()) params.search = searchTerm.trim();

      const res = await userService.getAllUsers(params);
      if (res.success) {
        setUsers(res.users || []);
      }
    } catch (err) {
      toast.error('Failed to load users list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchUsers();
  };

  // Open Change Password Modal
  const openPasswordModal = (user) => {
    setSelectedUser(user);
    setPasswordForm({ newPassword: '', confirmPassword: '' });
    setPasswordModalOpen(true);
  };

  // Submit Password Change
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      toast.error('New password must be at least 6 characters long.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('Passwords do not match. Please verify.');
      return;
    }

    try {
      setPasswordLoading(true);
      const res = await userService.changeUserPassword(selectedUser._id, {
        newPassword: passwordForm.newPassword,
        confirmPassword: passwordForm.confirmPassword
      });

      if (res.success) {
        toast.success(res.message || 'Password changed successfully!');
        setPasswordModalOpen(false);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Open Edit User Modal
  const openEditModal = (user) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name || '',
      phone: user.phone || '',
      title: user.title || '',
      companyName: user.companyName || '',
      status: user.status || 'ACTIVE'
    });
    setEditModalOpen(true);
  };

  // Submit Edit User
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setEditLoading(true);
      const res = await userService.updateUser(selectedUser._id, editForm);
      if (res.success) {
        toast.success('User updated successfully.');
        setEditModalOpen(false);
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user.');
    } finally {
      setEditLoading(false);
    }
  };

  // Toggle Status (Activate / Deactivate)
  const handleToggleStatus = async (user) => {
    if (user._id === currentUser?.id || user.role === 'ADMIN') {
      toast.error('Primary Administrator account status cannot be deactivated.');
      return;
    }

    const nextStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      const res = await userService.updateUser(user._id, { status: nextStatus });
      if (res.success) {
        toast.success(`Account for ${user.name} is now ${nextStatus}.`);
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to toggle account status.');
    }
  };

  // Submit New User
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.name || !createForm.email || !createForm.role) {
      toast.error('Full Name, Email, and Role are required.');
      return;
    }

    if (createForm.password && createForm.password.length < 6) {
      toast.error('Temporary password must be at least 6 characters long.');
      return;
    }

    if (createForm.password && createForm.password !== createForm.confirmPassword) {
      toast.error('Temporary password and confirmation do not match.');
      return;
    }

    try {
      setCreateLoading(true);
      const res = await userService.createUser({
        name: createForm.name,
        email: createForm.email,
        phone: createForm.phone,
        role: createForm.role,
        password: createForm.password,
        status: createForm.status
      });

      if (res.success) {
        toast.success(`${createForm.role} account created successfully!`);
        setProvisionedCredential({
          name: res.user.name,
          email: res.user.email,
          role: res.user.role,
          password: res.temporaryPassword
        });
        setCreateModalOpen(false);
        setCreateForm({
          name: '',
          email: '',
          phone: '',
          role: 'HR',
          password: '',
          confirmPassword: '',
          status: 'ACTIVE'
        });
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create account.');
    } finally {
      setCreateLoading(false);
    }
  };

  // Delete User
  const handleDeleteUser = async (user) => {
    if (user.role === 'ADMIN' || user._id === currentUser?.id) {
      toast.error('Administrator accounts cannot be deleted.');
      return;
    }

    if (!window.confirm(`Are you sure you want to delete the user account for ${user.name}?`)) {
      return;
    }

    try {
      const res = await userService.deleteUser(user._id);
      if (res.success) {
        toast.success('User account removed.');
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Credentials copied to clipboard!');
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
            <Shield className="w-3 h-3 text-blue-600" />
            ADMIN
          </span>
        );
      case 'HR':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-cyan-100 text-cyan-800 border border-cyan-200">
            <UserCheck className="w-3 h-3 text-cyan-600" />
            HR
          </span>
        );
      case 'WORKER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
            <HardHat className="w-3 h-3 text-amber-600" />
            WORKER
          </span>
        );
      case 'CLIENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Briefcase className="w-3 h-3 text-emerald-600" />
            CLIENT
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800">
              Security & Access Control
            </span>
            <span className="text-xs text-slate-400 font-medium">RBAC Central</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            User Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Administer authenticated accounts across HR, Engineering Workers, and Clients. Centralized credential management.
          </p>
        </div>

        <Button onClick={() => setCreateModalOpen(true)}>
          <UserPlus className="h-4 w-4 mr-1.5" />
          <span>Add User</span>
        </Button>
      </div>

      {/* Provisioned Credentials Banner */}
      {provisionedCredential && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm animate-in fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-emerald-950">
                New Account Provisioned: {provisionedCredential.name} ({provisionedCredential.role})
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                Email: <strong>{provisionedCredential.email}</strong> • Temporary Password:{' '}
                <code className="bg-white px-2 py-0.5 rounded border border-emerald-300 font-mono font-bold text-emerald-900">
                  {provisionedCredential.password}
                </code>
              </p>
              <p className="text-[10px] text-emerald-700 mt-1">
                Share these credentials directly with the user. Passwords are never sent over unencrypted email.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="outline"
              onClick={() =>
                copyToClipboard(
                  `GENFREX Portal Credentials:\nEmail: ${provisionedCredential.email}\nPassword: ${provisionedCredential.password}\nLogin: ${window.location.origin}/login`
                )
              }
              icon={Copy}
            >
              Copy Credentials
            </Button>
            <Button size="xs" variant="ghost" onClick={() => setProvisionedCredential(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="w-full md:w-80 flex gap-2">
          <Input
            placeholder="Search by name, email, company..."
            icon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </form>

        {/* Role and Status Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Role Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {['ALL', 'ADMIN', 'HR', 'WORKER', 'CLIENT'].map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setRoleFilter(role)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  roleFilter === role
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {role}
              </button>
            ))}
          </div>

          <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <CardSkeleton />
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Users className="mx-auto h-10 w-10 text-slate-300 mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No users created yet.</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
            Provision HR Officers, Engineering Workers, or Client accounts using the Add User button.
          </p>
          <Button onClick={() => setCreateModalOpen(true)}>
            <UserPlus className="h-3.5 w-3.5 mr-1" />
            Add First User
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden bg-white rounded-xl border border-slate-200/80 shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-[750px] w-full divide-y divide-slate-200 text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4 text-left">User</th>
                  <th className="py-3 px-4 text-left">Role</th>
                  <th className="py-3 px-4 text-left">Status</th>
                  <th className="py-3 px-4 text-left">Phone</th>
                  <th className="py-3 px-4 text-left">Title / Affiliation</th>
                  <th className="py-3 px-4 text-left">Created Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {users.map((u) => {
                  const isSelf = u._id === currentUser?.id;
                  const isDeactivated = u.status === 'INACTIVE' || u.isActive === false;

                  return (
                    <tr
                      key={u._id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isDeactivated ? 'bg-slate-50/40 opacity-70' : ''
                      }`}
                    >
                      {/* User Info */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center border border-slate-200 shrink-0">
                            {u.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{u.name}</span>
                              {isSelf && (
                                <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500">{u.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Role Label */}
                      <td className="py-3 px-4 whitespace-nowrap">{getRoleBadge(u.role)}</td>

                      {/* Account Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {isDeactivated ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            INACTIVE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ACTIVE
                          </span>
                        )}
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                        {u.phone || '—'}
                      </td>

                      {/* Title / Affiliation */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-medium text-slate-800 block">
                          {u.title || (u.role === 'ADMIN' ? 'Platform Administrator' : '—')}
                        </span>
                        {u.companyName && (
                          <span className="text-[10px] text-slate-400 block">{u.companyName}</span>
                        )}
                      </td>

                      {/* Created Date */}
                      <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                        {formatDate(u.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Change Password (Admin only) */}
                          <button
                            type="button"
                            onClick={() => openPasswordModal(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Change User Password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Details */}
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Edit User Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active / Inactive Status */}
                          {u.role !== 'ADMIN' && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u)}
                              className={`p-1.5 rounded-lg transition-colors ${
                                isDeactivated
                                  ? 'text-emerald-600 hover:bg-emerald-50'
                                  : 'text-amber-600 hover:bg-amber-50'
                              }`}
                              title={isDeactivated ? 'Activate User' : 'Deactivate User'}
                            >
                              {isDeactivated ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {/* Delete User */}
                          {u.role !== 'ADMIN' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete User"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ================= ADD USER MODAL ================= */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add New User Account"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="p-3 rounded-lg bg-blue-50/70 border border-blue-200 text-blue-900 flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Admin-Only User Provisioning</p>
              <p className="text-[11px] text-blue-700 mt-0.5">
                Create accounts for HR, Engineering Workers, or Clients. Public registration is closed.
              </p>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Rachel Adams"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">
              Official Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="rachel@genfrex.com"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Role <span className="text-rose-500">*</span>
              </label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs font-semibold text-slate-800 bg-white focus:border-blue-500 focus:outline-none"
              >
                <option value="HR">HR Officer</option>
                <option value="WORKER">Worker (Engineer)</option>
                <option value="CLIENT">Client Stakeholder</option>
              </select>
              <p className="text-[10px] text-slate-400 mt-1">ADMIN accounts cannot be created here.</p>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">Phone Number</label>
              <input
                type="text"
                placeholder="+1 (555) 000-0000"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Temporary Password & Confirm */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Temporary Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCreatePassword ? 'text' : 'password'}
                  required
                  placeholder="Min 6 characters"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 p-2 pr-8 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowCreatePassword(!showCreatePassword)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showCreatePassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <input
                type={showCreatePassword ? 'text' : 'password'}
                required
                placeholder="Re-enter password"
                value={createForm.confirmPassword}
                onChange={(e) => setCreateForm({ ...createForm, confirmPassword: e.target.value })}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-800 mb-1">Initial Account Status</label>
            <select
              value={createForm.status}
              onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
              className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 bg-white focus:border-blue-500 focus:outline-none"
            >
              <option value="ACTIVE">ACTIVE (Authorized to log in)</option>
              <option value="INACTIVE">INACTIVE (Access blocked)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button
              variant="secondary"
              type="button"
              onClick={() => setCreateModalOpen(false)}
              disabled={createLoading}
            >
              Cancel
            </Button>
            <Button type="submit" loading={createLoading}>
              Create User Account
            </Button>
          </div>
        </form>
      </Modal>

      {/* ================= CHANGE USER PASSWORD MODAL ================= */}
      <Modal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        title="Admin Password Reset for User"
      >
        {selectedUser && (
          <form onSubmit={handlePasswordSubmit} className="space-y-4 text-xs">
            {/* Display Target User Identity */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">User Name:</span>
                <span className="font-bold text-slate-900">{selectedUser.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Email:</span>
                <span className="font-mono text-slate-700">{selectedUser.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Role:</span>
                <span>{getRoleBadge(selectedUser.role)}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Setting a new password will immediately invalidate existing sessions for this user. They must sign in with this new password.
              </span>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                New Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showResetPassword ? 'text' : 'password'}
                  required
                  placeholder="Min 6 characters"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 p-2 pr-8 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowResetPassword(!showResetPassword)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  {showResetPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-800 mb-1">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <input
                type={showResetPassword ? 'text' : 'password'}
                required
                placeholder="Re-enter new password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                disabled={passwordLoading}
              >
                Cancel
              </Button>
              <Button type="submit" loading={passwordLoading}>
                Update Password
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* ================= EDIT USER MODAL ================= */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit User Information"
      >
        {selectedUser && (
          <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-800 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">Account Status</label>
                <select
                  disabled={selectedUser.role === 'ADMIN'}
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 bg-white focus:border-blue-500 focus:outline-none disabled:bg-slate-100"
                >
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-800 mb-1">Job Title</label>
                <input
                  type="text"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-800 mb-1">Organization / Company</label>
                <input
                  type="text"
                  value={editForm.companyName}
                  onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setEditModalOpen(false)}
                disabled={editLoading}
              >
                Cancel
              </Button>
              <Button type="submit" loading={editLoading}>
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default AdminUsers;
