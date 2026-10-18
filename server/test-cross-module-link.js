const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const fs = require('fs');

const BASE_URL = 'http://localhost:5000/api';

async function req(method, endpoint, body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(data.message || `HTTP error ${res.status}`);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

async function runCrossModuleIntegrationTests() {
  console.log('================================================================');
  console.log('🚀 GENFREX CROSS-MODULE INTEGRATION TEST SUITE (11 SCENARIOS)');
  console.log('   ClientFlow Project Management ⟷ HR OfferFlow Linkage');
  console.log('================================================================\n');

  try {
    // Authenticate all 4 actors
    console.log('[Setup] Authenticating test actors (Admin, HR, Worker, Client)...');
    const adminLogin = await req('POST', '/auth/login', {
      email: 'admin@genfrex.com',
      password: 'Admin@123'
    });

    async function ensureUser(email, password, role, name, extra = {}) {
      try {
        return await req('POST', '/auth/login', { email, password });
      } catch {
        await req('POST', '/users', {
          name,
          email,
          role,
          password,
          ...extra
        }, adminLogin.token);
        return await req('POST', '/auth/login', { email, password });
      }
    }

    const hrLogin = await ensureUser('hr@genfrex.com', 'Hr@123', 'HR', 'HR Talent Lead');
    const workerLogin = await ensureUser('worker.cross@genfrex.com', 'Worker@123', 'WORKER', 'Arun Kumar', { title: 'Full Stack Engineer' });
    const clientLogin = await ensureUser('client.cross@clientcorp.com', 'Client@123', 'CLIENT', 'Sarah Jenkins', { companyName: 'ClientCorp' });
    console.log('✅ All 4 actors authenticated successfully.');

    // Retrieve or create an active project belonging to clientLogin
    const clientUserId = (clientLogin.user.id || clientLogin.user._id).toString();
    const workerUserId = (workerLogin.user.id || workerLogin.user._id).toString();
    const projectsRes = await req('GET', '/projects', null, adminLogin.token);
    let targetProject = (projectsRes.projects || []).find(p => (p.client?._id || p.client)?.toString() === clientUserId);
    if (!targetProject) {
      const newProj = await req('POST', '/projects', {
        name: 'E-Commerce Website Revamp',
        description: 'Client engagement for full-stack ecommerce marketplace',
        client: clientUserId,
        assignedWorkers: [workerUserId],
        budget: 150000
      }, adminLogin.token);
      targetProject = newProj.project;
    }
    console.log(`📌 Using project: "${targetProject.name}" (ID: ${targetProject._id})`);

    // Retrieve or create a client requirement / task request
    let targetRequirementId = null;
    try {
      const reqsRes = await req('GET', `/task-requests?project=${targetProject._id}`, null, adminLogin.token);
      const reqs = reqsRes.taskRequests || reqsRes.requests || [];
      if (reqs.length > 0) {
        targetRequirementId = reqs[0]._id;
      } else {
        const createdReq = await req('POST', '/task-requests', {
          title: 'React Developer for Checkout Flow',
          description: 'Need a specialized React developer to build high-performance checkout components',
          project: targetProject._id,
          priority: 'HIGH'
        }, clientLogin.token);
        targetRequirementId = createdReq.taskRequest?._id;
      }
    } catch (e) {
      console.log('ℹ️ Task request notice:', e.message);
    }
    console.log(`📌 Using requirement ID: ${targetRequirementId || 'None'}`);

    // Create a fresh candidate for the test
    const timestamp = Date.now();
    const candidateEmail = `talent.test.${timestamp}@genfrex.com`;
    const candCreateRes = await req('POST', '/hr/candidates', {
      name: `John Doe ${timestamp.toString().slice(-4)}`,
      email: candidateEmail,
      phone: '+91 9876543210',
      designation: 'React Developer',
      department: 'Engineering',
      employmentType: 'Trainee',
      compensation: 35000,
      compensationFrequency: 'STIPEND_MONTHLY'
    }, hrLogin.token);
    const candidateId = candCreateRes.candidate._id;
    console.log(`📌 Created candidate: ${candCreateRes.candidate.name} (ID: ${candidateId})`);

    // -------------------------------------------------------------
    // Scenario 1: Admin links candidate to project
    // -------------------------------------------------------------
    console.log('\n------------------------------------------------------------');
    console.log('[Scenario 1] Admin links candidate to project...');
    const linkRes = await req('POST', `/hr/candidates/${candidateId}/link-project`, {
      projectId: targetProject._id,
      clientId: targetProject.client?._id || targetProject.client,
      requirementId: targetRequirementId,
      assignedWorkerId: workerLogin.user.id || workerLogin.user._id,
      role: 'React Developer'
    }, adminLogin.token);

    if (!linkRes.success || !linkRes.candidate.project) {
      throw new Error('Failed to link candidate to project');
    }
    console.log(`✅ Scenario 1 Passed: Candidate successfully linked to project "${targetProject.name}".`);
    console.log(`   Source: ${linkRes.candidate.source} | Role: ${linkRes.candidate.designation}`);

    // -------------------------------------------------------------
    // Scenario 2: HR sees linked project context
    // -------------------------------------------------------------
    console.log('\n------------------------------------------------------------');
    console.log('[Scenario 2] HR sees linked project context...');
    const hrCandidateView = await req('GET', `/hr/candidates/${candidateId}`, null, hrLogin.token);
    const candDoc = hrCandidateView.candidate;

    if (!candDoc.project || !candDoc.project.name) {
      throw new Error('HR cannot see populated project context on candidate');
    }
    console.log(`✅ Scenario 2 Passed: HR verified project context:`);
    console.log(`   Project Name: "${candDoc.project.name}"`);
    console.log(`   Client: ${candDoc.client?.name || candDoc.client?.companyName || 'Linked'}`);
    console.log(`   Source: ${candDoc.source}`);

    // -------------------------------------------------------------
    // Scenario 3: Client cannot access HR appointment
    // -------------------------------------------------------------
    console.log('\n------------------------------------------------------------');
    console.log('[Scenario 3] Client cannot access HR appointment endpoints...');
    try {
      await req('GET', '/hr/appointments', null, clientLogin.token);
      throw new Error('SECURITY BREACH: Client was able to access /api/hr/appointments!');
    } catch (err) {
      if (err.status === 403) {
        console.log('✅ Scenario 3.1 Passed: Client strictly forbidden from /api/hr/appointments (403 Forbidden).');
      } else {
        throw err;
      }
    }

    try {
      await req('GET', `/hr/candidates/${candidateId}`, null, clientLogin.token);
      throw new Error('SECURITY BREACH: Client was able to access /api/hr/candidates/:id!');
    } catch (err) {
      if (err.status === 403) {
        console.log('✅ Scenario 3.2 Passed: Client strictly forbidden from /api/hr/candidates (403 Forbidden).');
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // Scenario 4: Client cannot access compensation
    // -------------------------------------------------------------
    console.log('\n------------------------------------------------------------');
    console.log('[Scenario 4] Client cannot access compensation...');
    const clientProjectView = await req('GET', `/projects/${targetProject._id}`, null, clientLogin.token);
    const projData = clientProjectView.project;

    // Verify no HR compensation fields exist in project payload
    if (projData.compensation !== undefined || projData.stipend !== undefined || projData.appointmentLetter !== undefined) {
      throw new Error('LEAK: Client project payload contains confidential HR compensation fields!');
    }
    console.log('✅ Scenario 4 Passed: Client project payload verified clean with 0 confidential HR/compensation leaks.');

    // -------------------------------------------------------------
    // Scenario 5: Worker cannot access HR appointment
    // -------------------------------------------------------------
    console.log('\n------------------------------------------------------------');
    console.log('[Scenario 5] Worker cannot access HR appointment...');
    try {
      await req('GET', '/hr/appointments', null, workerLogin.token);
      throw new Error('SECURITY BREACH: Worker was able to access /api/hr/appointments!');
    } catch (err) {
      if (err.status === 403) {
        console.log('✅ Scenario 5 Passed: Worker denied access to HR appointments (403 Forbidden).');
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // Scenario 6: HR submits appointment
    // -------------------------------------------------------------
    console.log('\n------------------------------------------------------------');
    console.log('[Scenario 6] HR creates and submits appointment letter...');
    const apptCreateRes = await req('POST', '/hr/appointments', {
      candidateId,
      projectId: targetProject._id,
      clientId: targetProject.client?._id || targetProject.client,
      requirementId: targetRequirementId,
      assignedWorker: workerLogin.user.id || workerLogin.user._id,
      appointmentType: 'TRAINEE',
      designation: 'React Developer',
      department: 'Engineering',
      joiningDate: '2026-10-15',
      acceptanceDeadline: '2026-10-08',
      compensation: 35000,
      compensationFrequency: 'STIPEND_MONTHLY',
      submitNow: true
    }, hrLogin.token);

    const appointmentId = apptCreateRes.appointment._id;
    const refNumber = apptCreateRes.appointment.referenceNumber;
    console.log(`✅ Scenario 6.1 Passed: Appointment ${refNumber} created with initial status ${apptCreateRes.appointment.status}.`);

    // Verify HR cannot self-approve
    try {
      await req('POST', `/hr/appointments/${appointmentId}/approve`, { comment: 'Self approval attempt' }, hrLogin.token);
      throw new Error('POLICY VIOLATION: HR was able to approve own appointment letter!');
    } catch (err) {
      if (err.status === 403) {
        console.log('✅ Scenario 6.2 Passed: HR cannot approve own appointment letter (403 Forbidden).');
      } else {
        throw err;
      }
    }

    // -------------------------------------------------------------
    // Scenario 7: Admin approves appointment
    // -------------------------------------------------------------
    console.log('\n------------------------------------------------------------');
    console.log('[Scenario 7] Admin approves appointment...');
    const approveRes = await req('POST', `/hr/appointments/${appointmentId}/approve`, {
      comment: 'Approved by Principal Admin. Verified for client engagement allocation.'
    }, adminLogin.token);

    if (approveRes.appointment.status !== 'APPROVED') {
      throw new Error(`Expected APPROVED status, got ${approveRes.appointment.status}`);
    }
    console.log(`✅ Scenario 7 Passed: Admin approved appointment. Status: ${approveRes.appointment.status}.`);

    // -------------------------------------------------------------
    // Scenario 8: PDF generated
    // -------------------------------------------------------------
    console.log('\n------------------------------------------------------------');
    console.log('[Scenario 8] Official A4 PDF generation...');
    const pdfRes = await req('POST', `/hr/appointments/${appointmentId}/generate-pdf`, null, hrLogin.token);

    if (!pdfRes.pdfUrl || !pdfRes.fileId) {
      throw new Error('PDF generation failed to return pdfUrl or fileId');
    }
    console.log(`✅ Scenario 8 Passed: Official A4 PDF generated: ${pdfRes.fileName} (URL: ${pdfRes.pdfUrl}).`);

    // -------------------------------------------------------------
    // Scenario 9: Email sent
    // -------------------------------------------------------------
    console.log('\n------------------------------------------------------------');
    console.log('[Scenario 9] HR dispatches verified offer letter via email...');
    const sendRes = await req('POST', `/hr/appointments/${appointmentId}/send`, { confirmResend: false }, hrLogin.token);

    if (sendRes.appointment.status !== 'SENT' || sendRes.appointment.emailStatus !== 'SENT') {
      throw new Error('Email dispatch did not update appointment status to SENT');
    }
    console.log(`✅ Scenario 9 Passed: Letter dispatched to candidate ${candidateEmail}. Status: SENT.`);

    // -------------------------------------------------------------
    // Scenario 10: Candidate acceptance recorded
    // -------------------------------------------------------------
    console.log('\n------------------------------------------------------------');
    console.log('[Scenario 10] Candidate acceptance recorded...');
    const acceptRes = await req('PUT', `/hr/appointments/${appointmentId}/acceptance`, {
      status: 'ACCEPTED'
    }, hrLogin.token);

    if (acceptRes.appointment.status !== 'ACCEPTED' || acceptRes.appointment.acceptanceStatus !== 'ACCEPTED') {
      throw new Error('Candidate acceptance status was not updated properly');
    }

    // Verify candidate status updated to ONBOARDED
    const updatedCand = await req('GET', `/hr/candidates/${candidateId}`, null, hrLogin.token);
    if (updatedCand.candidate.candidateStatus !== 'ONBOARDED') {
      throw new Error(`Expected candidate ONBOARDED, got ${updatedCand.candidate.candidateStatus}`);
    }
    console.log(`✅ Scenario 10 Passed: Candidate acceptance recorded. Status: ACCEPTED. Candidate status: ONBOARDED.`);

    // Verify cross-module audit logs
    const auditRes = await req('GET', `/hr/audit-logs?appointmentLetterId=${appointmentId}`, null, adminLogin.token);
    const actions = (auditRes.logs || []).map((l) => l.action);
    console.log(`   Logged cross-module audit events: ${actions.join(' ➔ ')}`);

    // -------------------------------------------------------------
    // Scenario 11: Existing ClientFlow workflow remains functional
    // -------------------------------------------------------------
    console.log('\n------------------------------------------------------------');
    console.log('[Scenario 11] Validating existing ClientFlow workflow...');
    
    // Client checks projects
    const clientProjects = await req('GET', '/projects', null, clientLogin.token);
    if (!clientProjects.success) throw new Error('Client cannot fetch projects');
    console.log(`✅ 11.1 Client projects functional (${clientProjects.count} accessible)`);

    // Worker checks tasks
    const workerTasks = await req('GET', '/tasks/my-tasks', null, workerLogin.token);
    if (!workerTasks.success) throw new Error('Worker cannot fetch tasks');
    console.log(`✅ 11.2 Worker tasks functional (${workerTasks.count} assigned tasks)`);

    // Client checks task requests
    const clientRequests = await req('GET', '/task-requests', null, clientLogin.token);
    if (!clientRequests.success) throw new Error('Client cannot fetch task requests');
    console.log(`✅ 11.3 Client task requests functional (${clientRequests.count} requests)`);

    // Admin checks activities and stats
    const adminActivities = await req('GET', '/activities/recent', null, adminLogin.token);
    if (!adminActivities.success) throw new Error('Admin cannot fetch activities');
    console.log(`✅ 11.4 Admin activities and audit trails functional`);

    // HR checks templates & settings
    const hrSettings = await req('GET', '/hr/settings', null, hrLogin.token);
    if (!hrSettings.success) throw new Error('HR settings cannot be loaded');
    console.log(`✅ 11.5 HR OfferFlow settings and templates functional`);

    console.log('\n================================================================');
    console.log('🎉 ALL 11 INTEGRATION TESTS PASSED WITH 100% SUCCESS!');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ INTEGRATION TEST FAILED:', err.message);
    if (err.data) console.error('Details:', err.data);
    process.exit(1);
  }
}

runCrossModuleIntegrationTests();
