require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const User = require('./models/User');
const Project = require('./models/Project');
const Task = require('./models/Task');
const TaskRequest = require('./models/TaskRequest');
const Milestone = require('./models/Milestone');
const File = require('./models/File');
const Comment = require('./models/Comment');
const Activity = require('./models/Activity');
const Notification = require('./models/Notification');
const Candidate = require('./models/Candidate');
const AppointmentLetter = require('./models/AppointmentLetter');
const HRApproval = require('./models/HRApproval');
const HRAuditLog = require('./models/HRAuditLog');
const HRSettings = require('./models/HRSettings');
const AuditLog = require('./models/AuditLog');
const Invoice = require('./models/Invoice');
const Attendance = require('./models/Attendance');
const LeaveRequest = require('./models/LeaveRequest');

async function purgeData() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clientportal';
  console.log(`[Purge] Connecting to MongoDB: ${mongoUri}`);
  await mongoose.connect(mongoUri);

  console.log('[Purge] Starting database cleanup (preserving ADMIN accounts)...');

  // 1. Delete all non-admin users
  const deletedUsers = await User.deleteMany({ role: { $ne: 'ADMIN' } });
  console.log(`[Purge] Deleted non-admin users: ${deletedUsers.deletedCount}`);

  // 2. Delete all business and transactional records
  const [
    delProjects,
    delTasks,
    delRequests,
    delMilestones,
    delFiles,
    delComments,
    delActivities,
    delNotifications,
    delCandidates,
    delLetters,
    delApprovals,
    delHRAuditLogs,
    delAuditLogs,
    delInvoices,
    delAttendances,
    delLeaveRequests
  ] = await Promise.all([
    Project.deleteMany({}),
    Task.deleteMany({}),
    TaskRequest.deleteMany({}),
    Milestone.deleteMany({}),
    File.deleteMany({}),
    Comment.deleteMany({}),
    Activity.deleteMany({}),
    Notification.deleteMany({}),
    Candidate.deleteMany({}),
    AppointmentLetter.deleteMany({}),
    HRApproval.deleteMany({}),
    HRAuditLog.deleteMany({}),
    AuditLog.deleteMany({}),
    Invoice.deleteMany({}),
    Attendance.deleteMany({}),
    LeaveRequest.deleteMany({})
  ]);

  console.log('[Purge] Records purged:');
  console.log(`  - Projects: ${delProjects.deletedCount}`);
  console.log(`  - Tasks: ${delTasks.deletedCount}`);
  console.log(`  - Task Requests: ${delRequests.deletedCount}`);
  console.log(`  - Milestones: ${delMilestones.deletedCount}`);
  console.log(`  - Files: ${delFiles.deletedCount}`);
  console.log(`  - Comments: ${delComments.deletedCount}`);
  console.log(`  - Activities: ${delActivities.deletedCount}`);
  console.log(`  - Notifications: ${delNotifications.deletedCount}`);
  console.log(`  - Candidates: ${delCandidates.deletedCount}`);
  console.log(`  - Appointment Letters: ${delLetters.deletedCount}`);
  console.log(`  - HR Approvals: ${delApprovals.deletedCount}`);
  console.log(`  - HR Audit Logs: ${delHRAuditLogs.deletedCount}`);
  console.log(`  - Audit Logs: ${delAuditLogs.deletedCount}`);
  console.log(`  - Invoices: ${delInvoices.deletedCount}`);
  console.log(`  - Attendances: ${delAttendances.deletedCount}`);
  console.log(`  - Leave Requests: ${delLeaveRequests.deletedCount}`);

  // 3. Reset HR reference sequence to 1
  await HRSettings.updateMany({}, { $set: { currentSequence: 1 } });
  console.log('[Purge] Reset HR reference sequence back to 1.');

  // 4. Clean server/uploads folder of generated PDFs and test docs (keep .gitkeep)
  const uploadsDir = path.join(__dirname, 'uploads');
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir);
    let removedFiles = 0;
    for (const file of files) {
      if (file !== '.gitkeep') {
        try {
          fs.unlinkSync(path.join(uploadsDir, file));
          removedFiles++;
        } catch (e) {
          console.warn(`[Purge] Could not delete ${file}: ${e.message}`);
        }
      }
    }
    console.log(`[Purge] Cleaned uploads directory: removed ${removedFiles} files.`);
  }

  // 5. Verification: Check remaining Admin users
  const remainingAdmins = await User.find({ role: 'ADMIN' }, { email: 1, name: 1, role: 1 });
  console.log('\n[Purge] Remaining Active Administrators in DB:');
  remainingAdmins.forEach((admin) => {
    console.log(`  - Name: ${admin.name} | Email: ${admin.email} | Role: ${admin.role}`);
  });

  await mongoose.disconnect();
  console.log('\n✅ [Purge] Complete! All non-admin data deleted successfully.');
}

purgeData().catch((err) => {
  console.error('[Purge Error]', err);
  process.exit(1);
});
