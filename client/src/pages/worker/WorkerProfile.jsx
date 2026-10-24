import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Mail, Phone, Briefcase, Award, Shield } from 'lucide-react';
import Badge from '../../components/common/Badge';

const EmployeeProfile = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Engineer Profile</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Your team credentials, skills, and account role information
        </p>
      </div>

      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4 pb-6 border-b border-slate-100">
          <div className="h-16 w-16 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xl flex items-center justify-center shrink-0 border border-indigo-200">
            {user?.name?.charAt(0) || 'W'}
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{user?.name}</h2>
            <p className="text-xs text-slate-500">{user?.title || 'Engineer'}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <Badge variant="warning">{user?.role}</Badge>
              <span className="text-[11px] text-slate-400">Apex Digital Systems Ltd</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 text-xs">
          <div className="space-y-1">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <Mail className="h-3.5 w-3.5" /> Email Address
            </span>
            <p className="font-semibold text-slate-800">{user?.email}</p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <Phone className="h-3.5 w-3.5" /> Phone Number
            </span>
            <p className="font-semibold text-slate-800">{user?.phone || 'Not provided'}</p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <Briefcase className="h-3.5 w-3.5" /> Designation
            </span>
            <p className="font-semibold text-slate-800">{user?.title || 'Full-Stack Engineer'}</p>
          </div>

          <div className="space-y-1">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <Shield className="h-3.5 w-3.5" /> Permissions Scope
            </span>
            <p className="font-semibold text-slate-800">Assigned Tasks & Projects</p>
          </div>
        </div>

        {/* Skills */}
        {user?.skills && user.skills.length > 0 && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <span className="text-xs font-semibold text-slate-800 flex items-center gap-1.5 mb-2">
              <Award className="h-4 w-4 text-indigo-600" /> Technical Skills & Specializations
            </span>
            <div className="flex flex-wrap gap-1.5">
              {user.skills.map((skill, i) => (
                <span
                  key={i}
                  className="px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-[11px] font-semibold border border-indigo-100"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeProfile;
