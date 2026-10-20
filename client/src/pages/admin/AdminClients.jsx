import React, { useState, useEffect } from 'react';
import { clientService } from '../../services/clientService';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Modal from '../../components/common/Modal';
import { CardSkeleton } from '../../components/common/Skeleton';
import EmptyState from '../../components/common/EmptyState';
import { formatDate } from '../../utils/formatters';
import {
  Users,
  Plus,
  Mail,
  Building,
  Phone,
  FolderKanban,
  CheckCircle2,
  Copy,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const AdminClients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // New Client Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    companyName: '',
    phone: '',
    password: ''
  });

  // Display newly created temporary credentials clearly
  const [createdClientInfo, setCreatedClientInfo] = useState(null);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const res = await clientService.getClients();
      if (res.success) {
        setClients(res.clients || []);
      }
    } catch (err) {
      toast.error('Failed to load clients list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await clientService.createClient(formData);
      if (res.success) {
        const clientObj = res.client || res.user || {};
        setCreatedClientInfo({
          email: clientObj.email || formData.email,
          password: res.temporaryPassword || formData.password,
          name: clientObj.name || formData.name
        });
        setModalOpen(false);
        setFormData({ name: '', email: '', companyName: '', phone: '', password: '' });
        fetchClients();
        toast.success('Client account created successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create client.');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyCredentials = () => {
    if (createdClientInfo) {
      navigator.clipboard.writeText(
        `Portal URL: ${window.location.origin}/login\nEmail: ${createdClientInfo.email}\nTemporary Password: ${createdClientInfo.password}`
      );
      toast.success('Credentials copied to clipboard!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Clients Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your client accounts, view active projects, and invite new stakeholders.
          </p>
        </div>

        <Button onClick={() => setModalOpen(true)} icon={Plus}>
          Add New Client
        </Button>
      </div>

      {/* Temporary Password Banner if newly created */}
      {createdClientInfo && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-subtle animate-in fade-in">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-emerald-950">
                Client Account Created: {createdClientInfo.name}
              </h4>
              <p className="text-xs text-emerald-800 mt-0.5">
                Email: <strong>{createdClientInfo.email}</strong> • Temporary Password: <code className="bg-white px-2 py-0.5 rounded border border-emerald-300 font-mono font-bold text-emerald-900">{createdClientInfo.password}</code>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="xs" variant="outline" onClick={handleCopyCredentials} icon={Copy}>
              Copy Login Info
            </Button>
            <Button size="xs" variant="ghost" onClick={() => setCreatedClientInfo(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Clients Table */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <CardSkeleton />
        </div>
      ) : clients.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <EmptyState
            icon={Users}
            title="No clients created yet."
            description="Add your first client to start collaborating on projects, sharing milestones, and receiving task requests."
            actionLabel="Add Client"
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
                    Client Name
                  </th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="py-3 px-4 text-center text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Projects
                  </th>
                  <th className="py-3 px-4 text-right text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Added On
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {clients.map((client) => (
                  <tr key={client._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {client.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{client.name}</p>
                          <span className="text-[10px] text-slate-400">ID: {client._id.substring(client._id.length - 6)}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-700 font-medium">
                      {client.companyName || '—'}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-600">
                      {client.email}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-500">
                      {client.phone || '—'}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {client.projectCount || 0} project{client.projectCount === 1 ? '' : 's'}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-right text-xs text-slate-500">
                      {formatDate(client.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Client Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add New Client Account"
      >
        <form onSubmit={handleCreateClient} className="space-y-4">
          <Input
            label="Client Full Name"
            name="name"
            placeholder="e.g. Sarah Jenkins"
            value={formData.name}
            onChange={handleChange}
            required
          />

          <Input
            label="Company Name"
            name="companyName"
            icon={Building}
            placeholder="e.g. Acme Global Corp"
            value={formData.companyName}
            onChange={handleChange}
          />

          <Input
            label="Client Email Address"
            name="email"
            type="email"
            icon={Mail}
            placeholder="sarah@acmeglobal.com"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <Input
            label="Phone Number (Optional)"
            name="phone"
            icon={Phone}
            placeholder="+1 (555) 000-0000"
            value={formData.phone}
            onChange={handleChange}
          />

          <Input
            label="Temporary Password (Leave blank to auto-generate)"
            name="password"
            type="password"
            placeholder="Leave blank for automatic temporary password"
            value={formData.password}
            onChange={handleChange}
            helperText="The temporary password will be shown once upon creation so you can share it with the client."
          />

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              Create Client
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminClients;
