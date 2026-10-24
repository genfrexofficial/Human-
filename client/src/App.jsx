import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import AppLayout from './layouts/AppLayout';

// Public Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import AdminSetup from './pages/auth/AdminSetup';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProjects from './pages/admin/AdminProjects';
import AdminProjectDetails from './pages/admin/AdminProjectDetails';
import AdminTaskRequests from './pages/admin/AdminTaskRequests';
import AdminEmployees from './pages/admin/AdminEmployees';
import AdminClients from './pages/admin/AdminClients';
import AdminHRTeam from './pages/admin/AdminHRTeam';
import AdminUsers from './pages/admin/AdminUsers';
import AdminTasks from './pages/admin/AdminTasks';
import AdminFiles from './pages/admin/AdminFiles';
import AdminReports from './pages/admin/AdminReports';
import AdminActivities from './pages/admin/AdminActivities';
import AdminNotifications from './pages/admin/AdminNotifications';
import AdminSettings from './pages/admin/AdminSettings';
import AdminStorage from './pages/admin/AdminStorage';
import AdminPendingApprovals from './pages/admin/AdminPendingApprovals';
import AdminHRReports from './pages/admin/AdminHRReports';
import AdminInvoices from './pages/admin/AdminInvoices';
import AdminPayroll from './pages/admin/AdminPayroll';

// HR Pages
import HRDashboard from './pages/hr/HRDashboard';
import Candidates from './pages/hr/Candidates';
import CreateAppointment from './pages/hr/CreateAppointment';
import AppointmentDetails from './pages/hr/AppointmentDetails';
import AppointmentsList from './pages/hr/AppointmentsList';
import HRSettings from './pages/hr/HRSettings';
import HRAttendanceLeaves from './pages/hr/HRAttendanceLeaves';

// Employee Pages
import EmployeeDashboard from './pages/worker/WorkerDashboard';
import EmployeeTasks from './pages/worker/WorkerTasks';
import EmployeeTaskDetails from './pages/worker/WorkerTaskDetails';
import EmployeeProjects from './pages/worker/WorkerProjects';
import EmployeeFiles from './pages/worker/WorkerFiles';
import EmployeeActivity from './pages/worker/WorkerActivity';
import EmployeeProfile from './pages/worker/WorkerProfile';
import EmployeeAttendance from './pages/worker/WorkerAttendance';
import EmployeePayroll from './pages/worker/WorkerPayroll';

// Client Pages
import ClientDashboard from './pages/client/ClientDashboard';
import ClientProjects from './pages/client/ClientProjects';
import ClientProjectDetails from './pages/client/ClientProjectDetails';
import ClientTaskRequests from './pages/client/ClientTaskRequests';
import ClientTasks from './pages/client/ClientTasks';
import ClientFiles from './pages/client/ClientFiles';
import ClientActivity from './pages/client/ClientActivity';
import ClientNotifications from './pages/client/ClientNotifications';
import ClientProfile from './pages/client/ClientProfile';
import ClientInvoices from './pages/client/ClientInvoices';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        {/* Toast Notifications Provider */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0f172a',
              color: '#f8fafc',
              fontSize: '12px',
              borderRadius: '10px',
              padding: '10px 14px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)'
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#ffffff'
              }
            },
            error: {
              iconTheme: {
                primary: '#f43f5e',
                secondary: '#ffffff'
              }
            }
          }}
        />

        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/setup-admin" element={<AdminSetup />} />

          {/* Admin Routes (Role: ADMIN) */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="projects" element={<AdminProjects />} />
            <Route path="projects/:id" element={<AdminProjectDetails />} />
            <Route path="task-requests" element={<AdminTaskRequests />} />
            <Route path="Employees" element={<AdminEmployees />} />
            <Route path="clients" element={<AdminClients />} />
            <Route path="hr-team" element={<AdminHRTeam />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="tasks" element={<AdminTasks />} />
            <Route path="files" element={<AdminFiles />} />
            <Route path="invoices" element={<AdminInvoices />} />
            <Route path="attendance-leaves" element={<HRAttendanceLeaves />} />
            <Route path="payroll" element={<AdminPayroll />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="activities" element={<AdminActivities />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="storage" element={<AdminStorage />} />
            <Route path="settings" element={<AdminSettings />} />

            {/* Admin HR Routes */}
            <Route path="hr" element={<Navigate to="/admin/hr/dashboard" replace />} />
            <Route path="hr/dashboard" element={<HRDashboard />} />
            <Route path="hr/candidates" element={<Candidates />} />
            <Route path="hr/appointments" element={<AppointmentsList />} />
            <Route path="hr/appointments/:id" element={<AppointmentDetails />} />
            <Route path="hr/pending-approvals" element={<AdminPendingApprovals />} />
            <Route path="hr/approved" element={<AppointmentsList defaultStatus="APPROVED" />} />
            <Route path="hr/sent" element={<AppointmentsList defaultStatus="SENT" />} />
            <Route path="hr/rejected" element={<AppointmentsList defaultStatus="REJECTED" />} />
            <Route path="hr/reports" element={<AdminHRReports />} />
          </Route>

          {/* HR Routes (Role: HR) */}
          <Route
            path="/hr"
            element={
              <ProtectedRoute allowedRoles={['HR', 'ADMIN']}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/hr/dashboard" replace />} />
            <Route path="dashboard" element={<HRDashboard />} />
            <Route path="attendance-leaves" element={<HRAttendanceLeaves />} />
            <Route path="payroll" element={<AdminPayroll />} />
            <Route path="candidates" element={<Candidates />} />
            <Route path="appointments" element={<AppointmentsList />} />
            <Route path="appointments/create" element={<CreateAppointment />} />
            <Route path="appointments/:id" element={<AppointmentDetails />} />
            <Route path="approvals-status" element={<AppointmentsList defaultStatus="PENDING_APPROVAL" />} />
            <Route path="sent-letters" element={<AppointmentsList defaultStatus="SENT" />} />
            <Route path="settings" element={<HRSettings />} />
          </Route>

          {/* Employee Routes (Role: Employee) */}
          <Route
            path="/Employee"
            element={
              <ProtectedRoute allowedRoles={['Employee']}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/Employee/dashboard" replace />} />
            <Route path="dashboard" element={<EmployeeDashboard />} />
            <Route path="attendance" element={<EmployeeAttendance />} />
            <Route path="payroll" element={<EmployeePayroll />} />
            <Route path="tasks" element={<EmployeeTasks />} />
            <Route path="tasks/:id" element={<EmployeeTaskDetails />} />
            <Route path="projects" element={<EmployeeProjects />} />
            <Route path="files" element={<EmployeeFiles />} />
            <Route path="activity" element={<EmployeeActivity />} />
            <Route path="profile" element={<EmployeeProfile />} />
          </Route>

          {/* Client Routes (Role: CLIENT) */}
          <Route
            path="/client"
            element={
              <ProtectedRoute allowedRoles={['CLIENT']}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/client/dashboard" replace />} />
            <Route path="dashboard" element={<ClientDashboard />} />
            <Route path="invoices" element={<ClientInvoices />} />
            <Route path="projects" element={<ClientProjects />} />
            <Route path="projects/:id" element={<ClientProjectDetails />} />
            <Route path="task-requests" element={<ClientTaskRequests />} />
            <Route path="tasks" element={<ClientTasks />} />
            <Route path="files" element={<ClientFiles />} />
            <Route path="activity" element={<ClientActivity />} />
            <Route path="notifications" element={<ClientNotifications />} />
            <Route path="profile" element={<ClientProfile />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
