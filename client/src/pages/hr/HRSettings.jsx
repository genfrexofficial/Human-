import React, { useState, useEffect } from 'react';
import { hrService } from '../../services/hrService';
import { useAuth } from '../../context/AuthContext';
import {
  Settings,
  Building,
  Mail,
  ShieldCheck,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Layers,
  Sparkles,
  Edit3,
  X
} from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

const HRSettings = () => {
  const { isAdmin } = useAuth();
  const [settings, setSettings] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [activeTemplateIndex, setActiveTemplateIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  // New Template Modal
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [newTemplateData, setNewTemplateData] = useState({
    name: '',
    roleCategory: 'WEB_DEV',
    targetRole: '',
    department: 'Engineering',
    appointmentType: 'TRAINEE',
    title: '',
    aboutGenfrex: 'GENFREX is a next-generation digital services and talent ecosystem committed to empowering enterprises and innovators with cutting-edge engineering, scalable digital products, and high-impact talent solutions.',
    roleAndResponsibilities: ['Execute assigned engineering tasks in alignment with GENFREX quality standards.'],
    termsAndConditions: ['Appointment Status: This appointment is for training and professional development within the GENFREX ecosystem.'],
    confidentialityClause: 'The Trainee agrees to hold all client and company information in strict confidence.',
    professionalConductClause: 'The Trainee agrees to maintain the highest standards of professional integrity and diligent conduct.'
  });

  useEffect(() => {
    fetchSettingsAndTemplates();
  }, []);

  const fetchSettingsAndTemplates = async () => {
    try {
      setLoading(true);
      const [settingsRes, templatesRes] = await Promise.all([
        hrService.getHRSettings().catch(() => ({ success: false })),
        hrService.getLetterTemplates().catch(() => ({ success: false }))
      ]);

      if (settingsRes.success) {
        setSettings(settingsRes.settings);
      }

      let tmpls = [];
      if (templatesRes.success && templatesRes.templates?.length > 0) {
        tmpls = templatesRes.templates;
      } else if (settingsRes.success && settingsRes.templates?.length > 0) {
        tmpls = settingsRes.templates;
      } else if (settingsRes.success && settingsRes.template) {
        tmpls = [settingsRes.template];
      }
      setTemplates(tmpls);
    } catch (err) {
      toast.error('Failed to load HR settings and role templates.');
    } finally {
      setLoading(false);
    }
  };

  const currentTemplate = templates[activeTemplateIndex] || templates[0] || null;

  const handleSettingsChange = (e) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!isAdmin) {
      toast.error('Only Admins are authorized to update company settings.');
      return;
    }
    try {
      setSavingSettings(true);
      await hrService.updateHRSettings(settings);
      toast.success('Company settings updated successfully.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  // Template modifications
  const handleCurrentTemplateChange = (field, value) => {
    if (!currentTemplate) return;
    const updated = { ...currentTemplate, [field]: value };
    const newTemplates = [...templates];
    newTemplates[activeTemplateIndex] = updated;
    setTemplates(newTemplates);
  };

  const handleAddResponsibility = () => {
    if (!currentTemplate) return;
    const updatedResp = [...(currentTemplate.roleAndResponsibilities || []), ''];
    handleCurrentTemplateChange('roleAndResponsibilities', updatedResp);
  };

  const handleUpdateResponsibility = (index, value) => {
    if (!currentTemplate) return;
    const updatedResp = [...(currentTemplate.roleAndResponsibilities || [])];
    updatedResp[index] = value;
    handleCurrentTemplateChange('roleAndResponsibilities', updatedResp);
  };

  const handleRemoveResponsibility = (index) => {
    if (!currentTemplate) return;
    const updatedResp = (currentTemplate.roleAndResponsibilities || []).filter((_, i) => i !== index);
    handleCurrentTemplateChange('roleAndResponsibilities', updatedResp);
  };

  const handleAddTerm = () => {
    if (!currentTemplate) return;
    const updatedTerms = [...(currentTemplate.termsAndConditions || []), ''];
    handleCurrentTemplateChange('termsAndConditions', updatedTerms);
  };

  const handleUpdateTerm = (index, value) => {
    if (!currentTemplate) return;
    const updatedTerms = [...(currentTemplate.termsAndConditions || [])];
    updatedTerms[index] = value;
    handleCurrentTemplateChange('termsAndConditions', updatedTerms);
  };

  const handleRemoveTerm = (index) => {
    if (!currentTemplate) return;
    const updatedTerms = (currentTemplate.termsAndConditions || []).filter((_, i) => i !== index);
    handleCurrentTemplateChange('termsAndConditions', updatedTerms);
  };

  const handleSaveActiveTemplate = async () => {
    if (!isAdmin) {
      toast.error('Only Admins can modify Master Letter Templates.');
      return;
    }
    if (!currentTemplate) return;

    try {
      setSavingTemplate(true);
      const res = await hrService.updateLetterTemplate(currentTemplate._id, currentTemplate);
      if (res.success) {
        toast.success(`Saved template for ${currentTemplate.targetRole || currentTemplate.name}!`);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update letter template.');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleCreateNewTemplate = async (e) => {
    e.preventDefault();
    if (!newTemplateData.name || !newTemplateData.targetRole) {
      toast.error('Template name and target role are required.');
      return;
    }

    try {
      const res = await hrService.createLetterTemplate({
        ...newTemplateData,
        title: newTemplateData.title || `${newTemplateData.targetRole.toUpperCase()} APPOINTMENT LETTER`
      });

      if (res.success) {
        toast.success(`Created master template for ${newTemplateData.targetRole}!`);
        setIsNewTemplateModalOpen(false);
        fetchSettingsAndTemplates();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create role template.');
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          HR & Master Template Configuration
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage company branding, authorized signatories, and role-specific Master Letter Templates
        </p>
      </div>

      {!isAdmin && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            You are viewing settings in read-only mode. Organizational and master template adjustments require Administrator clearance.
          </span>
        </div>
      )}

      {/* SECTION 1: ROLE-BASED MASTER TEMPLATES */}
      <Card className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Master Letter Templates by Company Role
              </h2>
              <p className="text-xs text-slate-500">
                Each company role has custom responsibilities, terms, and clauses. Select a role to inspect or customize.
              </p>
            </div>
          </div>

          {isAdmin && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsNewTemplateModalOpen(true)}
              className="shrink-0"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              <span>Add Role Template</span>
            </Button>
          )}
        </div>

        {/* Role Template Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-50 border border-slate-200/80 rounded-2xl">
          {templates.map((tmpl, idx) => {
            const isActive = idx === activeTemplateIndex;
            return (
              <button
                key={tmpl._id || idx}
                onClick={() => setActiveTemplateIndex(idx)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                <span>{tmpl.targetRole || tmpl.name}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {tmpl.appointmentType}
                </span>
              </button>
            );
          })}
        </div>

        {/* Selected Role Template Editor */}
        {currentTemplate && (
          <div className="space-y-5 p-5 rounded-2xl border border-slate-200 bg-slate-50/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Editing: {currentTemplate.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Target Role: <strong className="text-blue-700">{currentTemplate.targetRole}</strong> • Department: {currentTemplate.department}
                </p>
              </div>

              {isAdmin && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveActiveTemplate}
                  loading={savingTemplate}
                >
                  <Save className="w-3.5 h-3.5 mr-1" />
                  <span>Save Role Template</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Template Name</label>
                <input
                  type="text"
                  value={currentTemplate.name || ''}
                  disabled={!isAdmin}
                  onChange={(e) => handleCurrentTemplateChange('name', e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Role / Designation</label>
                <input
                  type="text"
                  value={currentTemplate.targetRole || ''}
                  disabled={!isAdmin}
                  onChange={(e) => handleCurrentTemplateChange('targetRole', e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Department</label>
                <input
                  type="text"
                  value={currentTemplate.department || ''}
                  disabled={!isAdmin}
                  onChange={(e) => handleCurrentTemplateChange('department', e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Appointment Track</label>
                <select
                  value={currentTemplate.appointmentType || 'TRAINEE'}
                  disabled={!isAdmin}
                  onChange={(e) => handleCurrentTemplateChange('appointmentType', e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 bg-white"
                >
                  <option value="TRAINEE">TRAINEE</option>
                  <option value="INTERNSHIP">INTERNSHIP</option>
                  <option value="FULL_TIME">FULL TIME</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Official Document Title</label>
                <input
                  type="text"
                  value={currentTemplate.title || ''}
                  disabled={!isAdmin}
                  onChange={(e) => handleCurrentTemplateChange('title', e.target.value)}
                  className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 bg-white"
                />
              </div>
            </div>

            {/* Role & Responsibilities */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                  Role-Specific Responsibilities ({currentTemplate.roleAndResponsibilities?.length || 0})
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleAddResponsibility}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Responsibility</span>
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {(currentTemplate.roleAndResponsibilities || []).map((resp, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-xs font-bold text-blue-600 mt-2 shrink-0">•</span>
                    <input
                      type="text"
                      value={resp}
                      disabled={!isAdmin}
                      onChange={(e) => handleUpdateResponsibility(idx, e.target.value)}
                      className="flex-1 p-2 rounded-lg border border-slate-300 text-slate-900 bg-white text-xs"
                    />
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleRemoveResponsibility(idx)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                  Role-Specific Terms & Conditions ({currentTemplate.termsAndConditions?.length || 0})
                </span>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleAddTerm}
                    className="text-xs text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Term</span>
                  </button>
                )}
              </div>

              <div className="space-y-2">
                {(currentTemplate.termsAndConditions || []).map((term, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-xs font-bold text-slate-400 mt-2 shrink-0">4.{idx + 1}</span>
                    <textarea
                      rows={2}
                      value={term}
                      disabled={!isAdmin}
                      onChange={(e) => handleUpdateTerm(idx, e.target.value)}
                      className="flex-1 p-2 rounded-lg border border-slate-300 text-slate-900 bg-white text-xs"
                    />
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTerm(idx)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors mt-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Confidentiality & Conduct Clauses */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Confidentiality & IP Clause</label>
                <textarea
                  rows={4}
                  value={currentTemplate.confidentialityClause || ''}
                  disabled={!isAdmin}
                  onChange={(e) => handleCurrentTemplateChange('confidentialityClause', e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 bg-white text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Professional Conduct & Integrity Clause</label>
                <textarea
                  rows={4}
                  value={currentTemplate.professionalConductClause || ''}
                  disabled={!isAdmin}
                  onChange={(e) => handleCurrentTemplateChange('professionalConductClause', e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300 text-slate-900 bg-white text-xs"
                />
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* SECTION 2: COMPANY BRANDING & EMAIL DISPATCHER */}
      {settings && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <Card className="space-y-4 text-xs">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-1.5">
              <Building className="w-4 h-4 text-blue-600" />
              <span>Company Branding & Numbering System</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Name</label>
                <input
                  type="text"
                  name="companyName"
                  value={settings.companyName || ''}
                  disabled={!isAdmin}
                  onChange={handleSettingsChange}
                  className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Company Tagline</label>
                <input
                  type="text"
                  name="tagline"
                  value={settings.tagline || ''}
                  disabled={!isAdmin}
                  onChange={handleSettingsChange}
                  className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
                <input
                  type="email"
                  name="officialEmail"
                  value={settings.officialEmail || ''}
                  disabled={!isAdmin}
                  onChange={handleSettingsChange}
                  className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reference Prefix</label>
                <input
                  type="text"
                  name="referencePrefix"
                  value={settings.referencePrefix || 'GFX/HR'}
                  disabled={!isAdmin}
                  onChange={handleSettingsChange}
                  className="w-full p-2 rounded-lg border border-slate-300 text-slate-900 bg-white"
                />
              </div>
            </div>

            {isAdmin && (
              <div className="flex justify-end pt-3 border-t border-slate-100">
                <Button variant="primary" size="sm" type="submit" loading={savingSettings}>
                  <Save className="w-3.5 h-3.5 mr-1" />
                  <span>Save Branding & Company Settings</span>
                </Button>
              </div>
            )}
          </Card>
        </form>
      )}

      {/* CREATE NEW TEMPLATE MODAL */}
      {isNewTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto sm:my-8 max-h-[90vh] flex flex-col">
            <div className="p-4 flex shrink-0 items-center justify-between border-b bg-blue-50/60 border-blue-100">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Add New Master Role Template</h3>
              </div>
              <button
                onClick={() => setIsNewTemplateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewTemplate} className="p-4 sm:p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Template Name *</label>
                  <input
                    type="text"
                    required
                    value={newTemplateData.name}
                    onChange={(e) => setNewTemplateData({ ...newTemplateData, name: e.target.value })}
                    placeholder="e.g. GENFREX Cloud Security Specialist Template"
                    className="w-full p-2 rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Role / Designation *</label>
                  <input
                    type="text"
                    required
                    value={newTemplateData.targetRole}
                    onChange={(e) => setNewTemplateData({ ...newTemplateData, targetRole: e.target.value })}
                    placeholder="e.g. Cloud Security Specialist"
                    className="w-full p-2 rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    value={newTemplateData.department}
                    onChange={(e) => setNewTemplateData({ ...newTemplateData, department: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Employment Track</label>
                  <select
                    value={newTemplateData.appointmentType}
                    onChange={(e) => setNewTemplateData({ ...newTemplateData, appointmentType: e.target.value })}
                    className="w-full p-2 rounded-lg border border-slate-300 text-slate-900"
                  >
                    <option value="TRAINEE">TRAINEE</option>
                    <option value="INTERNSHIP">INTERNSHIP</option>
                    <option value="FULL_TIME">FULL TIME</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Document Title</label>
                <input
                  type="text"
                  value={newTemplateData.title}
                  onChange={(e) => setNewTemplateData({ ...newTemplateData, title: e.target.value })}
                  placeholder="e.g. CLOUD SECURITY SPECIALIST APPOINTMENT LETTER"
                  className="w-full p-2 rounded-lg border border-slate-300 text-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <Button variant="secondary" size="sm" type="button" onClick={() => setIsNewTemplateModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Create Master Template
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default HRSettings;
