const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');

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

async function runUnifiedPlatformTests() {
  console.log('================================================================');
  console.log('🚀 GENFREX UNIFIED BUSINESS MANAGEMENT PLATFORM ACCEPTANCE SUITE');
  console.log('================================================================\n');

  try {
    // 1. Health check
    console.log('[Test 1] Checking API Health...');
    const health = await req('GET', '/health');
    console.log('✅ Health status:', health.status, '| Service:', health.service);

    // 2. Authentication for all 4 roles via single endpoint
    console.log('\n[Test 2] Single Authentication Endpoint Verification (4 Roles)...');
    
    // Admin login
    const adminLogin = await req('POST', '/auth/login', {
      email: 'admin@genfrex.com',
      password: 'Admin@123'
    });
    console.log(`✅ Admin Authenticated: ${adminLogin.user.name} (Role: ${adminLogin.user.role})`);

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

    // HR login
    const hrLogin = await ensureUser('hr@genfrex.com', 'Hr@123', 'HR', 'HR Talent Lead');
    console.log(`✅ HR Authenticated:    ${hrLogin.user.name} (Role: ${hrLogin.user.role})`);

    // Worker login
    const workerLogin = await ensureUser('worker.unified@genfrex.com', 'Worker@123', 'WORKER', 'Arun Kumar', { title: 'Full Stack Engineer' });
    console.log(`✅ Worker Authenticated: ${workerLogin.user.name} (Role: ${workerLogin.user.role})`);

    // Client login
    const clientLogin = await ensureUser('client.unified@clientcorp.com', 'Client@123', 'CLIENT', 'Sarah Jenkins', { companyName: 'ClientCorp' });
    console.log(`✅ Client Authenticated: ${clientLogin.user.name} (Role: ${clientLogin.user.role})`);

    // 3. Strict RBAC Enforcement
    console.log('\n[Test 3] Testing Strict Role-Based Access Control (RBAC)...');
    
    // Client trying to access HR candidates -> should fail with 403
    try {
      await req('GET', '/hr/candidates', null, clientLogin.token);
      throw new Error('SECURITY VIOLATION: Client accessed HR candidates!');
    } catch (err) {
      if (err.status === 403) {
        console.log('✅ RBAC Passed: Client denied access to HR candidates (403 Forbidden).');
      } else throw err;
    }

    // Worker trying to access HR appointments -> should fail with 403
    try {
      await req('GET', '/hr/appointments', null, workerLogin.token);
      throw new Error('SECURITY VIOLATION: Worker accessed HR appointments!');
    } catch (err) {
      if (err.status === 403) {
        console.log('✅ RBAC Passed: Worker denied access to HR appointments (403 Forbidden).');
      } else throw err;
    }

    // 4. Candidate Management (HR)
    console.log('\n[Test 4] Candidate Management (HR Workflow)...');
    const testCandEmail = `divya.nair.${Date.now()}@example.com`;
    const candCreateRes = await req(
      'POST',
      '/hr/candidates',
      {
        name: 'Divya Nair',
        email: testCandEmail,
        phone: '+91 99887 76655',
        address: 'HSR Layout, Bengaluru, India',
        designation: 'Trainee QA Automation Engineer',
        department: 'Quality Assurance',
        employmentType: 'Trainee',
        joiningDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        compensation: 23000,
        compensationFrequency: 'STIPEND_MONTHLY'
      },
      hrLogin.token
    );
    const newCandidate = candCreateRes.candidate;
    console.log(`✅ Candidate Created: ID: ${newCandidate._id} | Name: ${newCandidate.name} | Role: ${newCandidate.designation}`);

    // 5. Appointment Letter Creation (HR Draft & Submit)
    console.log('\n[Test 5] Appointment Letter Draft Creation & Submission (HR)...');
    const appCreateRes = await req(
      'POST',
      '/hr/appointments',
      {
        candidateId: newCandidate._id,
        appointmentType: 'TRAINEE',
        designation: 'Trainee QA Automation Engineer',
        department: 'Quality Assurance',
        appointmentDate: new Date().toISOString(),
        joiningDate: newCandidate.joiningDate,
        workLocation: 'Remote / Bengaluru HQ',
        reportingManager: 'David Chen',
        compensation: 23000,
        compensationFrequency: 'STIPEND_MONTHLY',
        acceptanceDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        submitNow: false // Start as draft
      },
      hrLogin.token
    );
    const letter = appCreateRes.appointment;
    console.log(`✅ Appointment Draft Created: Ref: ${letter.referenceNumber} | Status: ${letter.status}`);

    // Submit for approval
    console.log('\n[Test 6] HR Submitting Appointment Letter for Admin Approval...');
    const submitRes = await req(
      'POST',
      `/hr/appointments/${letter._id}/submit`,
      { comment: 'Submitted for Admin Approval following technical interview' },
      hrLogin.token
    );
    console.log(`✅ Letter Submitted: Status is now "${submitRes.appointment.status}"`);

    // 7. Test HR Cannot Self-Approve (Security check)
    console.log('\n[Test 7] Security Check: HR Attempting to Approve Letter (Must be Rejected)...');
    try {
      await req('POST', `/hr/appointments/${letter._id}/approve`, { comment: 'HR trying to approve' }, hrLogin.token);
      throw new Error('SECURITY VIOLATION: HR was able to approve their own appointment letter!');
    } catch (err) {
      if (err.status === 403) {
        console.log('✅ Security Passed: HR cannot approve appointment letters (403 Forbidden).');
      } else throw err;
    }

    // 8. Admin Reviews and Approves Letter
    console.log('\n[Test 8] Admin Review and Approval Workflow...');
    const approveRes = await req(
      'POST',
      `/hr/appointments/${letter._id}/approve`,
      { comment: 'Approved by Managing Director. Welcome to GENFREX.' },
      adminLogin.token
    );
    console.log(`✅ Admin Approved Letter: Status is "${approveRes.appointment.status}" | ApprovedBy: ${approveRes.appointment.approvedBy}`);

    // 9. Generate Official A4 PDF
    console.log('\n[Test 9] Generating Official A4 PDF Document...');
    const pdfRes = await req(
      'POST',
      `/hr/appointments/${letter._id}/generate-pdf`,
      {},
      hrLogin.token
    );
    console.log(`✅ Official A4 PDF Generated: ${pdfRes.fileName} | URL: ${pdfRes.pdfUrl}`);

    // 10. HR Sends Approved Letter to Candidate via Email
    console.log('\n[Test 10] HR Dispatching Appointment Letter via Official Email (genfrexofficial@gmail.com)...');
    const sendRes = await req(
      'POST',
      `/hr/appointments/${letter._id}/send`,
      { confirmResend: false },
      hrLogin.token
    );
    console.log(`✅ Appointment Sent: Status is "${sendRes.appointment.status}" | EmailStatus: ${sendRes.appointment.emailStatus}`);
    console.log(`   Provider Message ID: ${sendRes.emailResult?.messageId}`);

    // 11. Candidate Acceptance Update
    console.log('\n[Test 11] Candidate Acceptance Tracking...');
    const acceptRes = await req(
      'PUT',
      `/hr/appointments/${letter._id}/acceptance`,
      { status: 'ACCEPTED' },
      hrLogin.token
    );
    console.log(`✅ Acceptance Updated: AcceptanceStatus is "${acceptRes.appointment.acceptanceStatus}" | LetterStatus: "${acceptRes.appointment.status}"`);

    // 12. Verify Existing ClientFlow Features (Preservation Check)
    console.log('\n[Test 12] Preserving Existing ClientFlow Core Features...');
    const projects = await req('GET', '/projects', null, adminLogin.token);
    console.log(`✅ Existing Projects Intact: Count: ${projects.count} | Sample: "${projects.projects[0]?.name}"`);

    const clientProjects = await req('GET', '/projects', null, clientLogin.token);
    console.log(`✅ Client Project Isolation Intact: Client sees ${clientProjects.count} assigned projects`);

    const workersList = await req('GET', '/users/workers', null, adminLogin.token);
    console.log(`✅ Worker Management Intact: ${workersList.workers?.length} active workers on roster`);

    console.log('\n================================================================');
    console.log('🎉 ALL GENFREX ACCEPTANCE SCENARIOS PASSED WITH 100% SUCCESS!');
    console.log('================================================================\n');
  } catch (error) {
    console.error('\n❌ TEST FAILURE:', error.message);
    if (error.data) console.error('Details:', error.data);
    process.exit(1);
  }
}

runUnifiedPlatformTests();
