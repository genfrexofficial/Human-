const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');

// Import all models
const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const TaskRequest = require('../models/TaskRequest');
const Milestone = require('../models/Milestone');
const File = require('../models/File');
const Comment = require('../models/Comment');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const Invoice = require('../models/Invoice');
const Candidate = require('../models/Candidate');
const AppointmentLetter = require('../models/AppointmentLetter');
const HRApproval = require('../models/HRApproval');
const HRAuditLog = require('../models/HRAuditLog');
const Attendance = require('../models/Attendance');
const LeaveRequest = require('../models/LeaveRequest');
const Payroll = require('../models/Payroll');
const SalaryStructure = require('../models/SalaryStructure');
const AuditLog = require('../models/AuditLog');

const cleanDatabaseExceptAdmin = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clientportal';

  console.log('[CleanDB] Connecting to MongoDB...');
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 8000 });
  console.log('[CleanDB] Connected successfully to database:', mongoose.connection.name);

  // 1. Verify Admin account existence
  const adminUsers = await User.find({ role: 'ADMIN' });
  if (!adminUsers || adminUsers.length === 0) {
    console.error('[CleanDB Error] No Admin user found in the database. Aborting to protect system access.');
    process.exit(1);
  }

  console.log(`[CleanDB] Found ${adminUsers.length} Admin account(s) that will be preserved:`);
  adminUsers.forEach((admin) => {
    console.log(` - ID: ${admin._id} | Name: ${admin.name} | Email: ${admin.email}`);
  });

  // 2. Perform deletions across all collections
  console.log('\n[CleanDB] Starting deletion of all non-admin data...');

  const results = {};

  results.nonAdminUsers = await User.deleteMany({ role: { $ne: 'ADMIN' } });
  results.projects = await Project.deleteMany({});
  results.tasks = await Task.deleteMany({});
  results.taskRequests = await TaskRequest.deleteMany({});
  results.milestones = await Milestone.deleteMany({});
  results.files = await File.deleteMany({});
  results.comments = await Comment.deleteMany({});
  results.activities = await Activity.deleteMany({});
  results.notifications = await Notification.deleteMany({});
  results.invoices = await Invoice.deleteMany({});
  results.candidates = await Candidate.deleteMany({});
  results.appointmentLetters = await AppointmentLetter.deleteMany({});
  results.hrApprovals = await HRApproval.deleteMany({});
  results.hrAuditLogs = await HRAuditLog.deleteMany({});
  results.attendance = await Attendance.deleteMany({});
  results.leaveRequests = await LeaveRequest.deleteMany({});
  results.payroll = await Payroll.deleteMany({});
  results.salaryStructures = await SalaryStructure.deleteMany({});
  results.auditLogs = await AuditLog.deleteMany({});

  console.log('\n==============================================');
  console.log('       DATABASE CLEANUP SUMMARY');
  console.log('==============================================');
  console.log(`- Non-Admin Users Deleted:    ${results.nonAdminUsers.deletedCount}`);
  console.log(`- Projects Deleted:           ${results.projects.deletedCount}`);
  console.log(`- Tasks Deleted:              ${results.tasks.deletedCount}`);
  console.log(`- Task Requests Deleted:      ${results.taskRequests.deletedCount}`);
  console.log(`- Milestones Deleted:         ${results.milestones.deletedCount}`);
  console.log(`- Files / Deliverables:       ${results.files.deletedCount}`);
  console.log(`- Comments Deleted:           ${results.comments.deletedCount}`);
  console.log(`- Activities Deleted:         ${results.activities.deletedCount}`);
  console.log(`- Notifications Deleted:      ${results.notifications.deletedCount}`);
  console.log(`- Invoices Deleted:           ${results.invoices.deletedCount}`);
  console.log(`- Candidates Deleted:         ${results.candidates.deletedCount}`);
  console.log(`- Appointment Letters:        ${results.appointmentLetters.deletedCount}`);
  console.log(`- HR Approvals & Logs:        ${results.hrApprovals.deletedCount + results.hrAuditLogs.deletedCount}`);
  console.log(`- Attendance Records:         ${results.attendance.deletedCount}`);
  console.log(`- Leave Requests:             ${results.leaveRequests.deletedCount}`);
  console.log(`- Payroll Records:            ${results.payroll.deletedCount}`);
  console.log(`- Salary Structures:          ${results.salaryStructures.deletedCount}`);
  console.log(`- Audit Logs Deleted:         ${results.auditLogs.deletedCount}`);
  console.log('==============================================');

  // Verify Admin accounts remain intact
  const remainingAdmins = await User.find({});
  console.log(`\n[CleanDB] Verification: ${remainingAdmins.length} user(s) remain in User collection:`);
  remainingAdmins.forEach((u) => {
    console.log(` ✔ ID: ${u._id} | Email: ${u.email} | Role: ${u.role} (Password preserved)`);
  });

  console.log('\n[CleanDB] Database cleanup completed successfully!');
  await mongoose.disconnect();
  process.exit(0);
};

cleanDatabaseExceptAdmin().catch(async (err) => {
  console.error('[CleanDB Error]', err);
  try {
    await mongoose.disconnect();
  } catch (_) {}
  process.exit(1);
});

