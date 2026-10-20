import React, { useState, useEffect } from 'react';
import { userService } from '../../services/userService';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import EmptyState from '../../components/common/EmptyState';
import { CardSkeleton } from '../../components/common/Skeleton';
import { formatDate } from '../../utils/formatters';
import {
  UserCheck,
  Plus,
  Mail,
  Phone,
  Briefcase,
  Copy,
  CheckCircle2,
  Trash2,
  ShieldAlert,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminHRTeam = () => {
  const [hrUsers, setHrUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // New HR Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    title: '',
    phone: '',
    password: ''
  });

  // Display newly created temporary credentials
  const [createdHRInfo, setCreatedHRInfo] = useState(null);

  const fetchHRUsers = async () => {
    try {
      setLoading(true);
      const res = await userService.getHRUsers();
      if (res.success) {
        setHrUsers(res.users || []);
      }
    } catch (err) {
      toast.error('Failed to load HR roster.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHRUsers();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateHR = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await userService.createHRUser(formData);
      if (res.success) {
        toast.success(`HR Officer "${res.user.name}" created successfully!`);
        setCreatedHRInfo({
          name: res.user.name,
          email: res.user.email,
          temporaryPassword: res.temporaryPassword
        });
        setFormData({
          name: '',
          email: '',
          title: '',
          phone: '',
          password: ''
        });
        fetchHRUsers();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create HR account.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteHR = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove HR account for ${name}?`)) {
      return;
    }
    try {
      const res = await userService.deleteHRUser(id);
      if (res.success) {
        toast.success('HR account removed.');
        fetchHRUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete HR account.');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied credentials to clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-100 text-cyan-800">
              Talent Management
            </span>
            <span className="text-xs text-slate-400">OfferFlow Workspace</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight mt-1">HR Officers & Talent Leads</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage HR officers authorized to create candidates, draft appointment letters, and submit offers for Admin review.
          </p>
        </div>

        <Button onClick={() => setModalOpen(true)} icon={Plus}>
          Add HR Officer
        </Button>
      </div>

      {/* HR Roster Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <CardSkeleton />
        </div>
      ) : hrUsers.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <EmptyState
            icon={UserCheck}
            title="No HR officers yet — Add your first HR officer"
            description="Add an HR team member to manage candidate pipelines and draft appointment letters."
            actionLabel="Add HR Officer"
            onAction={() => setModalOpen(true)}
          />
        </div>
      ) : (
        <div className="overflow-hidden bg-white rounded-xl border border-slate-200/80 shadow-card">
          <div className="overflow-x-auto">
            <table className="min-w-[650px] w-full divide-y divide-slate-200 text-xs">
              <thead>
                <tr className="bg-slate-50/70">
                  <th className="py-3 px-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    HR Officer
                  </th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Official Email
                  </th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Role Title
                  </th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Added On
                  </th>
                  <th className="py-3 px-4 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {hrUsers.map((hr) => (
                  <tr key={hr._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {hr.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{hr.name}</p>
                          <span className="text-[10px] text-slate-400">ID: {hr._id.substring(hr._id.length - 6)}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-700 font-medium">
                      {hr.email}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-600">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                        {hr.title || 'HR Talent Lead'}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-500">
                      {hr.phone || '—'}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-500">
                      {formatDate(hr.createdAt)}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right text-xs">
                      <button
                        type="button"
                        onClick={() => handleDeleteHR(hr._id, hr.name)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Remove HR account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add HR Officer Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create HR Officer Account"
      >
        <form onSubmit={handleCreateHR} className="space-y-4">
          <Input
            label="Officer Full Name"
            name="name"
            placeholder="e.g. Meera Nambiar"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <Input
            label="Official Work Email"
            name="email"
            type="email"
            placeholder="hr@yourcompany.com"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <Input
            label="Title / Track"
            name="title"
            placeholder="e.g. Talent Acquisition Lead"
            value={formData.title}
            onChange={handleChange}
          />

          <Input
            label="Phone (Optional)"
            name="phone"
            placeholder="+1 (555) 000-0000"
            value={formData.phone}
            onChange={handleChange}
          />

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Custom Password (Optional)
            </label>
            <Input
              name="password"
              type="password"
              placeholder="Leave blank to auto-generate a secure password"
              value={formData.password}
              onChange={handleChange}
            />
            <p className="text-[10px] text-slate-400 mt-1">
              If left blank, an auto-generated password will be shown upon creation.
            </p>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Create HR Officer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Created Credentials Modal */}
      {createdHRInfo && (
        <Modal
          isOpen={!!createdHRInfo}
          onClose={() => setCreatedHRInfo(null)}
          title="HR Account Created Successfully"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Account ready for sign-in</p>
                <p className="text-[11px] text-emerald-700">
                  Please securely share these credentials with {createdHRInfo.name}.
                </p>
              </div>
            </div>

            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl space-y-2 font-mono text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Email:</span>
                <span className="text-cyan-400">{createdHRInfo.email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Password:</span>
                <span className="text-emerald-400 font-bold">{createdHRInfo.temporaryPassword}</span>
              </div>
            </div>

            <Button
              className="w-full"
              icon={Copy}
              onClick={() => copyToClipboard(`GENFREX HR Portal Credentials:\nEmail: ${createdHRInfo.email}\nPassword: ${createdHRInfo.temporaryPassword}\nLogin: http://localhost:5173/login`)}
            >
              Copy Credentials
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminHRTeam;
