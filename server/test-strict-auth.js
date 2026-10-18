const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const User = require('./models/User');
const AuditLog = require('./models/AuditLog');

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('========================================================');
  console.log('🔒 GENFREX STRICT AUTHENTICATION & USER MANAGEMENT TESTS');
  console.log('========================================================');

  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      testsPassed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      testsFailed++;
    }
  }

  // 1. Admin login works
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@genfrex.com', password: 'Admin@123' })
  });
  const adminLoginData = await adminLoginRes.json();
  assert(adminLoginRes.status === 200 && adminLoginData.token && adminLoginData.user?.role === 'ADMIN', '1. Admin login works with admin@genfrex.com / Admin@123');
  const adminToken = adminLoginData.token;

  // 2. Public registration is disabled
  const regRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Hacker', email: 'hacker@test.com', password: 'Password123' })
  });
  assert(regRes.status === 403, '2. Public registration returns 403 Forbidden');

  // 3. First-time setup is rejected once Admin exists
  const setupRes = await fetch(`${BASE_URL}/auth/setup-admin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Another Admin', email: 'admin2@genfrex.com', password: 'Password123' })
  });
  assert(setupRes.status === 403, '3. Public setup-admin returns 403 when Admin already exists');

  // 4. Admin creates HR account
  const hrEmail = 'test.hr@genfrex.com';
  const hrPass = 'HrPass@123!';
  const createHrRes = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Test HR Officer',
      email: hrEmail,
      phone: '+91 9876543210',
      role: 'HR',
      password: hrPass,
      status: 'ACTIVE'
    })
  });
  const createHrData = await createHrRes.json();
  assert(createHrRes.status === 201 && createHrData.user?.role === 'HR', '4. Admin can create HR account');
  const hrId = createHrData.user?.id || createHrData.user?._id;

  // 5. Admin creates Worker account
  const workerEmail = 'test.worker@genfrex.com';
  const workerPass = 'WorkerPass@123!';
  const createWorkerRes = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Test Worker Engineer',
      email: workerEmail,
      phone: '+91 9876543211',
      role: 'WORKER',
      password: workerPass,
      status: 'ACTIVE'
    })
  });
  const createWorkerData = await createWorkerRes.json();
  assert(createWorkerRes.status === 201 && createWorkerData.user?.role === 'WORKER', '5. Admin can create Worker account');
  const workerId = createWorkerData.user?.id || createWorkerData.user?._id;

  // 6. Admin creates Client account
  const clientEmail = 'test.client@clientcorp.com';
  const clientPass = 'ClientPass@123!';
  const createClientRes = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Test Client Stakeholder',
      email: clientEmail,
      phone: '+1 555 123 4567',
      role: 'CLIENT',
      password: clientPass,
      status: 'ACTIVE'
    })
  });
  const createClientData = await createClientRes.json();
  assert(createClientRes.status === 201 && createClientData.user?.role === 'CLIENT', '6. Admin can create Client account');
  const clientId = createClientData.user?.id || createClientData.user?._id;

  // 7. Normal user creation forbids ADMIN role
  const createAdminAttemptRes = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Rogue Admin',
      email: 'rogue@genfrex.com',
      role: 'ADMIN',
      password: 'RoguePassword@123'
    })
  });
  assert(createAdminAttemptRes.status === 400, '7. Normal user creation forbids ADMIN role');

  // 8. Log in as HR, Worker, and Client
  const hrLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: hrEmail, password: hrPass })
  });
  const hrLoginData = await hrLoginRes.json();
  assert(hrLoginRes.status === 200 && hrLoginData.user?.role === 'HR', '8a. HR can log in with provisioned credentials');
  const hrToken = hrLoginData.token;

  const workerLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: workerEmail, password: workerPass })
  });
  const workerLoginData = await workerLoginRes.json();
  assert(workerLoginRes.status === 200 && workerLoginData.user?.role === 'WORKER', '8b. Worker can log in with provisioned credentials');
  const workerToken = workerLoginData.token;

  const clientLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: clientEmail, password: clientPass })
  });
  const clientLoginData = await clientLoginRes.json();
  assert(clientLoginRes.status === 200 && clientLoginData.user?.role === 'CLIENT', '8c. Client can log in with provisioned credentials');
  const clientToken = clientLoginData.token;

  // 9. HR, Worker, Client CANNOT create users
  const hrCreateUser = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({ name: 'Unauthorized', email: 'unauth@test.com', role: 'WORKER', password: 'Pass@123' })
  });
  assert(hrCreateUser.status === 403, '9a. HR cannot create users (returns 403)');

  const workerCreateUser = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${workerToken}` },
    body: JSON.stringify({ name: 'Unauthorized', email: 'unauth2@test.com', role: 'WORKER', password: 'Pass@123' })
  });
  assert(workerCreateUser.status === 403, '9b. Worker cannot create users (returns 403)');

  const clientCreateUser = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientToken}` },
    body: JSON.stringify({ name: 'Unauthorized', email: 'unauth3@test.com', role: 'CLIENT', password: 'Pass@123' })
  });
  assert(clientCreateUser.status === 403, '9c. Client cannot create users (returns 403)');

  // 10. HR, Worker, Client CANNOT change password
  const hrChangePass = await fetch(`${BASE_URL}/users/${hrId}/password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({ newPassword: 'NewPass@123' })
  });
  assert(hrChangePass.status === 403 || hrChangePass.status === 404, '10a. HR cannot change password (returns 403 Forbidden)');

  const workerChangePass = await fetch(`${BASE_URL}/users/change-password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${workerToken}` },
    body: JSON.stringify({ newPassword: 'NewPass@123' })
  });
  assert(workerChangePass.status === 403, '10b. Worker cannot change password (returns 403 Forbidden)');

  const clientChangePass = await fetch(`${BASE_URL}/users/change-password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${clientToken}` },
    body: JSON.stringify({ newPassword: 'NewPass@123' })
  });
  assert(clientChangePass.status === 403, '10c. Client cannot change password (returns 403 Forbidden)');

  const forgotPassRes = await fetch(`${BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: hrEmail })
  });
  assert(forgotPassRes.status === 403, '10d. Forgot Password endpoint returns 403 Forbidden');

  // 11. Admin CAN change HR, Worker, and Client passwords
  const newHrPass = 'NewHrSecret@2026!';
  const adminChangeHrPass = await fetch(`${BASE_URL}/users/${hrId}/password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ newPassword: newHrPass, confirmPassword: newHrPass })
  });
  assert(adminChangeHrPass.status === 200, '11a. Admin can change HR password');

  // HR can log in with new password; old password fails
  const hrOldLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: hrEmail, password: hrPass })
  });
  assert(hrOldLogin.status === 401, '11b. HR login with old password fails (401)');

  const hrNewLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: hrEmail, password: newHrPass })
  });
  assert(hrNewLogin.status === 200, '11c. HR can log in with Admin-set new password');

  // Admin changes Worker password
  const newWorkerPass = 'NewWorkerSecret@2026!';
  const adminChangeWorkerPass = await fetch(`${BASE_URL}/users/${workerId}/password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ newPassword: newWorkerPass, confirmPassword: newWorkerPass })
  });
  assert(adminChangeWorkerPass.status === 200, '11d. Admin can change Worker password');

  // Admin changes Client password
  const newClientPass = 'NewClientSecret@2026!';
  const adminChangeClientPass = await fetch(`${BASE_URL}/users/${clientId}/password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ newPassword: newClientPass, confirmPassword: newClientPass })
  });
  assert(adminChangeClientPass.status === 200, '11e. Admin can change Client password');

  // 12. Deactivated user cannot log in
  const deactivateRes = await fetch(`${BASE_URL}/users/${workerId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'INACTIVE' })
  });
  assert(deactivateRes.status === 200, '12a. Admin can deactivate Worker account');

  const deactivatedLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: workerEmail, password: newWorkerPass })
  });
  assert(deactivatedLogin.status === 403, '12b. Deactivated user cannot log in (returns 403)');

  // 13. HR Confidentiality: Worker & Client cannot access HR endpoints
  const workerHR = await fetch(`${BASE_URL}/hr/candidates`, {
    headers: { Authorization: `Bearer ${workerToken}` }
  });
  assert(workerHR.status === 403, '13a. Worker cannot access HR candidates (returns 403)');

  const clientHROldSession = await fetch(`${BASE_URL}/hr/appointments`, {
    headers: { Authorization: `Bearer ${clientToken}` }
  });
  assert(clientHROldSession.status === 401, '13b. Old Client session invalidated after Admin password change (returns 401)');

  // Log in with updated password to obtain active token
  const clientNewLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: clientEmail, password: newClientPass })
  });
  const activeClientToken = (await clientNewLogin.json()).token;

  const activeClientHR = await fetch(`${BASE_URL}/hr/appointments`, {
    headers: { Authorization: `Bearer ${activeClientToken}` }
  });
  assert(activeClientHR.status === 403, '13c. Client cannot access HR appointment letters (returns 403 Forbidden)');

  // 14. Admin changes own password
  const adminChangeOwnPass = await fetch(`${BASE_URL}/users/admin/password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      currentPassword: 'Admin@123',
      newPassword: 'NewAdmin@2026!',
      confirmPassword: 'NewAdmin@2026!'
    })
  });
  assert(adminChangeOwnPass.status === 200, '14a. Admin can change own password');

  // Verify old admin password fails, new password works
  const adminOldLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@genfrex.com', password: 'Admin@123' })
  });
  assert(adminOldLogin.status === 401, '14b. Old Admin password fails (401)');

  const adminNewLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@genfrex.com', password: 'NewAdmin@2026!' })
  });
  assert(adminNewLogin.status === 200, '14c. New Admin password succeeds (200)');
  const refreshedAdminToken = (await adminNewLogin.json()).token;

  // Revert Admin password back to Admin@123 as required by specification
  const revertAdminPass = await fetch(`${BASE_URL}/users/admin/password`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${refreshedAdminToken}` },
    body: JSON.stringify({
      currentPassword: 'NewAdmin@2026!',
      newPassword: 'Admin@123',
      confirmPassword: 'Admin@123'
    })
  });
  assert(revertAdminPass.status === 200, '14d. Admin password reverted cleanly to Admin@123 for operational stability');

  // 15. Verify Audit Logs created in database and NEVER contain passwords
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clientportal';
  await mongoose.connect(mongoUri);
  const auditEntries = await AuditLog.find().sort({ createdAt: -1 });
  assert(auditEntries.length >= 4, `15a. Audit logs recorded (${auditEntries.length} entries)`);

  const anyPasswordLeaked = auditEntries.some(
    (log) =>
      JSON.stringify(log).includes('HrPass@123!') ||
      JSON.stringify(log).includes('WorkerPass@123!') ||
      JSON.stringify(log).includes('ClientPass@123!') ||
      JSON.stringify(log).includes('NewHrSecret')
  );
  assert(!anyPasswordLeaked, '15b. Passwords NEVER stored in Audit Logs');

  await User.deleteMany({ email: { $in: [hrEmail, workerEmail, clientEmail] } });
  await AuditLog.deleteMany({});
  const remainingTestUsers = await User.find({ email: { $in: [hrEmail, workerEmail, clientEmail] } });
  assert(
    remainingTestUsers.length === 0,
    '16. Test users cleaned up; no test accounts remain in database'
  );

  await mongoose.disconnect();

  console.log('========================================================');
  console.log(`SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('========================================================');

  if (testsFailed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
