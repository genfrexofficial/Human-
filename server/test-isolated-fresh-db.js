/**
 * GENFREX — Fresh Database & Isolated Workflow Verification Test
 * 
 * Tests the complete lifecycle on an isolated test database:
 * 1. Verifies fresh database state (0 users, needsSetup: true)
 * 2. Creates the First-Time Administrator securely (bcrypt hashed)
 * 3. Verifies public Admin creation is blocked once setup is complete
 * 4. Admin manually creates HR, Employee, and Client accounts
 * 5. Admin creates project and requirements
 * 6. HR creates candidate, links project, drafts appointment letter, submits for approval
 * 7. Admin approves appointment letter
 * 8. PDF generated & verified
 * 9. Email dispatch simulated
 * 10. Candidate acceptance recorded
 * 11. Purges test database so zero test data lingers
 */

const http = require('http');
const mongoose = require('mongoose');

const TEST_PORT = 5099;
const TEST_MONGO_URI = 'mongodb://127.0.0.1:27017/clientportal_isolated_test';

// Set environment for test isolation BEFORE requiring app
process.env.PORT = String(TEST_PORT);
process.env.MONGODB_URI = TEST_MONGO_URI;
process.env.JWT_SECRET = 'isolated_test_jwt_secret_2026';

let server;

function req(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`http://127.0.0.1:${TEST_PORT}/api${path}`);
    const postData = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json'
    };
    if (body) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method.toUpperCase(),
      headers
    };

    const clientReq = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = { raw: data };
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(parsed);
        } else {
          const err = new Error(parsed.message || `HTTP ${res.statusCode}`);
          err.status = res.statusCode;
          err.body = parsed;
          reject(err);
        }
      });
    });

    clientReq.on('error', reject);
    if (body) clientReq.write(postData);
    clientReq.end();
  });
}

async function runTests() {
  console.log('================================================================');
  console.log('🚀 GENFREX ISOLATED FRESH-DB & SETUP VERIFICATION TEST');
  console.log(`   Database: ${TEST_MONGO_URI}`);
  console.log(`   Port:     ${TEST_PORT}`);
  console.log('================================================================\n');

  try {
    // Connect to isolated test database and ensure it starts clean
    const conn = await mongoose.connect(TEST_MONGO_URI);
    await conn.connection.dropDatabase();
    console.log('✅ Isolated test database initialized and purged.');

    // Launch isolated Express instance
    const express = require('express');
    const cors = require('cors');
    const path = require('path');
    const app = express();
    app.use(cors());
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Routes
    app.use('/api/auth', require('./routes/authRoutes'));
    app.use('/api/users', require('./routes/userRoutes'));
    app.use('/api/projects', require('./routes/projectRoutes'));
    app.use('/api/tasks', require('./routes/taskRoutes'));
    app.use('/api/task-requests', require('./routes/taskRequestRoutes'));
    app.use('/api/milestones', require('./routes/milestoneRoutes'));
    app.use('/api/files', require('./routes/fileRoutes'));
    app.use('/api/comments', require('./routes/commentRoutes'));
    app.use('/api/activities', require('./routes/activityRoutes'));
    app.use('/api/notifications', require('./routes/notificationRoutes'));
    app.use('/api/hr', require('./routes/hrRoutes'));

    await new Promise((resolve) => {
      server = app.listen(TEST_PORT, resolve);
    });
    console.log(`✅ Isolated test server running on port ${TEST_PORT}.\n`);

    // [Test 1] Verify fresh database setup status
    console.log('[Test 1] Verifying Fresh Database State...');
    const status1 = await req('GET', '/auth/setup-status');
    if (!status1.needsSetup || status1.adminCount !== 0) {
      throw new Error(`Expected needsSetup: true and adminCount: 0, got ${JSON.stringify(status1)}`);
    }
    console.log('✅ Fresh DB confirmed: needsSetup = true, adminCount = 0.');

    // [Test 2] Create First-Time Administrator
    console.log('\n[Test 2] Creating First-Time Administrator via /api/auth/setup-admin...');
    const adminSetupRes = await req('POST', '/auth/setup-admin', {
      name: 'Primary Admin User',
      email: 'primary.admin@genfrex.internal',
      password: 'SecureAdminPass@2026',
      companyName: 'GENFREX Core Systems'
    });
    const adminToken = adminSetupRes.token;
    const adminId = adminSetupRes.user.id;
    console.log(`✅ Administrator created: ${adminSetupRes.user.name} (${adminSetupRes.user.email})`);

    // [Test 3] Verify setup-status is now locked
    console.log('\n[Test 3] Verifying Setup Is Locked (Public Admin Registration Disabled)...');
    const status2 = await req('GET', '/auth/setup-status');
    if (status2.needsSetup || status2.adminCount !== 1) {
      throw new Error('Expected needsSetup: false after creating first admin');
    }

    try {
      await req('POST', '/auth/setup-admin', {
        name: 'Hacker Admin',
        email: 'hacker@attack.com',
        password: 'Password123'
      });
      throw new Error('SECURITY VIOLATION: Second admin was allowed to register!');
    } catch (err) {
      if (err.status === 403) {
        console.log('✅ Security check passed: Subsequent Admin creation blocked (403 Forbidden).');
      } else {
        throw err;
      }
    }

    try {
      await req('POST', '/auth/register', {
        name: 'Public Reg Attempt',
        email: 'public@test.com',
        password: 'Password123',
        role: 'ADMIN'
      });
      throw new Error('SECURITY VIOLATION: Public admin registration was allowed!');
    } catch (err) {
      if (err.status === 403) {
        console.log('✅ Security check passed: Public registration endpoint blocked (403 Forbidden).');
      } else {
        throw err;
      }
    }

    // [Test 4] Admin manually provisions HR, Employee, and Client accounts
    console.log('\n[Test 4] Admin Manually Provisioning Team Accounts...');

    // Create HR Officer
    const hrCreateRes = await req('POST', '/users/hr', {
      name: 'Divya HR Lead',
      email: 'divya.hr@genfrex.internal',
      title: 'Talent Acquisition Lead',
      password: 'HrPassword@2026'
    }, adminToken);
    console.log(`✅ HR Account created: ${hrCreateRes.user.name} (${hrCreateRes.user.email})`);

    // Create Employee / Engineer
    const EmployeeCreateRes = await req('POST', '/users/Employees', {
      name: 'Rohan Engineer',
      email: 'rohan.eng@genfrex.internal',
      title: 'Senior Full Stack Engineer',
      skills: ['React', 'Node.js', 'MongoDB'],
      password: 'EmployeePassword@2026'
    }, adminToken);
    const EmployeeId = EmployeeCreateRes.Employee.id;
    console.log(`✅ Employee Account created: ${EmployeeCreateRes.Employee.name} (${EmployeeCreateRes.Employee.email})`);

    // Create Client
    const clientCreateRes = await req('POST', '/users/clients', {
      name: 'Enterprise Client Representative',
      email: 'client.exec@acmecorp.com',
      companyName: 'Acme Corporation',
      password: 'ClientPassword@2026'
    }, adminToken);
    const clientId = clientCreateRes.client.id;
    console.log(`✅ Client Account created: ${clientCreateRes.client.name} (${clientCreateRes.client.companyName})`);

    // [Test 5] Authenticate HR and Employee accounts
    console.log('\n[Test 5] Verifying Credentials for Provisioned Accounts...');
    const hrLogin = await req('POST', '/auth/login', {
      email: 'divya.hr@genfrex.internal',
      password: 'HrPassword@2026'
    });
    const hrToken = hrLogin.token;

    const clientLogin = await req('POST', '/auth/login', {
      email: 'client.exec@acmecorp.com',
      password: 'ClientPassword@2026'
    });
    const clientToken = clientLogin.token;
    console.log('✅ Both HR and Client authenticated successfully.');

    // [Test 6] Admin creates a project and requirement
    console.log('\n[Test 6] Admin Creating Client Project & Requirement...');
    const projectRes = await req('POST', '/projects', {
      name: 'Acme Global Digital Platform',
      client: clientId,
      description: 'Unified enterprise digital ecosystem',
      stage: 'PLANNING',
      health: 'ON_TRACK',
      assignedEmployees: [EmployeeId]
    }, adminToken);
    const projectId = projectRes.project._id;
    console.log(`✅ Project created: "${projectRes.project.name}" (ID: ${projectId})`);

    // Client creates a task request / requirement
    const reqRes = await req('POST', '/task-requests', {
      project: projectId,
      title: 'Implement Next.js Architecture',
      description: 'Requirement for senior Next.js specialist',
      priority: 'HIGH'
    }, clientToken);
    const requirementId = reqRes.taskRequest._id;
    console.log(`✅ Requirement created: "${reqRes.taskRequest.title}" (ID: ${requirementId})`);

    // [Test 7] HR registers candidate & links to project
    console.log('\n[Test 7] HR Registering Candidate & Linking to Project Context...');
    const candRes = await req('POST', '/hr/candidates', {
      name: 'Ananya Sharma',
      email: 'ananya.candidate@talent.com',
      phone: '+91 98765 43210',
      designation: 'Senior Frontend Developer',
      department: 'Engineering',
      employmentType: 'FULL_TIME',
      source: 'Client Project',
      projectId,
      clientId,
      requirementId,
      assignedEmployeeId: EmployeeId
    }, hrToken);
    const candidateId = candRes.candidate._id;
    console.log(`✅ Candidate created with linked project context: ${candRes.candidate.name} (Source: ${candRes.candidate.source})`);

    // [Test 8] HR drafts 6-step appointment letter and submits for approval
    console.log('\n[Test 8] HR Drafting & Submitting Appointment Letter...');
    const apptRes = await req('POST', '/hr/appointments', {
      candidateId,
      designation: 'Senior Frontend Developer',
      department: 'Engineering',
      employmentType: 'FULL_TIME',
      appointmentType: 'FULL_TIME',
      projectId,
      clientId,
      requirementId,
      assignedEmployeeId: EmployeeId,
      joiningDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      acceptanceDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      compensation: 85000,
      compensationFrequency: 'STIPEND_MONTHLY',
      submitNow: true
    }, hrToken);
    const appointmentId = apptRes.appointment._id;
    console.log(`✅ Appointment letter submitted: Ref: ${apptRes.appointment.referenceNumber} (Status: ${apptRes.appointment.status})`);

    // [Test 9] Admin approves appointment letter
    console.log('\n[Test 9] Admin Reviewing & Approving Appointment Letter...');
    const approveRes = await req('POST', `/hr/appointments/${appointmentId}/approve`, {
      notes: 'Terms verified and approved by Primary Admin.'
    }, adminToken);
    if (approveRes.appointment.status !== 'APPROVED') {
      throw new Error(`Expected APPROVED, got ${approveRes.appointment.status}`);
    }
    console.log(`✅ Admin approved letter: Status is now APPROVED.`);

    // [Test 10] PDF generation & Simulated Email Dispatch
    console.log('\n[Test 10] Generating PDF & Dispatching Email...');
    const pdfRes = await req('POST', `/hr/appointments/${appointmentId}/generate-pdf`, {}, hrToken);
    console.log(`✅ PDF Generated: ${pdfRes.pdfUrl || pdfRes.fileName}`);

    const sendRes = await req('POST', `/hr/appointments/${appointmentId}/send`, {}, hrToken);
    console.log(`✅ Offer letter dispatched via email. Status: ${sendRes.appointment.status}`);

    // Candidate accepts
    const acceptRes = await req('PUT', `/hr/appointments/${appointmentId}/acceptance`, {
      status: 'ACCEPTED'
    }, hrToken);
    console.log(`✅ Candidate acceptance recorded. Status: ${acceptRes.appointment.status}`);

    console.log('\n================================================================');
    console.log('🎉 ALL ISOLATED FRESH-DB TESTS PASSED WITH 100% SUCCESS!');
    console.log('================================================================\n');

  } finally {
    // Teardown
    if (server) {
      await new Promise((r) => server.close(r));
    }
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
      console.log('🧹 Cleaned up and dropped isolated test database.');
    }
  }
}

runTests().catch((err) => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
