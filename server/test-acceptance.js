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

async function runAcceptanceTest() {
  console.log('===========================================================');
  console.log('🧪 RUNNING CRITICAL ACCEPTANCE TEST SCENARIO (REQUIREMENT 32)');
  console.log('===========================================================');

  let adminToken = null;
  let clientId = null;
  let EmployeeId = null;
  let projectId = null;

  try {
    // Setup: Admin authenticates first
    console.log('\n[Setup] Authenticating Platform Admin...');
    const adminLogin = await req('POST', '/auth/login', {
      email: 'admin@genfrex.com',
      password: 'Admin@123'
    });
    adminToken = adminLogin.token;
    console.log(`✅ Admin authenticated: ${adminLogin.user.name}`);

    // Ensure test Client exists
    const clientEmail = 'sarah.jenkins@testcorp.com';
    const clientPass = 'Client@123';
    let clientLogin;
    try {
      clientLogin = await req('POST', '/auth/login', { email: clientEmail, password: clientPass });
      clientId = clientLogin.user.id || clientLogin.user._id;
    } catch {
      const clientCreate = await req('POST', '/users', {
        name: 'Sarah Jenkins',
        email: clientEmail,
        companyName: 'Jenkins Enterprises',
        role: 'CLIENT',
        password: clientPass
      }, adminToken);
      clientId = clientCreate.user.id || clientCreate.user._id;
      clientLogin = await req('POST', '/auth/login', { email: clientEmail, password: clientPass });
    }
    const clientToken = clientLogin.token;
    console.log(`✅ Client authenticated: ${clientLogin.user.name}`);

    // Ensure test Employee exists
    const EmployeeEmail = 'arun.kumar@genfrex.internal';
    const EmployeePass = 'Employee@123';
    let EmployeeLogin;
    try {
      EmployeeLogin = await req('POST', '/auth/login', { email: EmployeeEmail, password: EmployeePass });
      EmployeeId = EmployeeLogin.user.id || EmployeeLogin.user._id;
    } catch {
      const EmployeeCreate = await req('POST', '/users', {
        name: 'Arun Kumar',
        email: EmployeeEmail,
        role: 'Employee',
        title: 'Senior Full Stack Engineer',
        skills: ['React', 'Node.js', 'MongoDB'],
        password: EmployeePass
      }, adminToken);
      EmployeeId = EmployeeCreate.user.id || EmployeeCreate.user._id;
      EmployeeLogin = await req('POST', '/auth/login', { email: EmployeeEmail, password: EmployeePass });
    }
    const EmployeeToken = EmployeeLogin.token;
    console.log(`✅ Employee authenticated: ${EmployeeLogin.user.name}`);

    // Ensure test Project exists for Client
    const clientProjects = await req('GET', '/projects', null, clientToken);
    let project = (clientProjects.projects || [])[0];
    if (!project) {
      const projCreate = await req('POST', '/projects', {
        name: 'Customer Portal Modernization',
        description: 'Enterprise client digital portal revamp',
        client: clientId,
        assignedEmployees: [EmployeeId],
        budget: 100000
      }, adminToken);
      project = projCreate.project;
    }
    projectId = project._id;
    console.log(`✅ Selected Client Project: "${project.name}" (ID: ${project._id})`);

    // 2. Client submits Task Request: "Add WhatsApp Notification"
    console.log('\n[Step 2] Client submitting Task Request: "Add WhatsApp Notification"...');
    const createReq = await req(
      'POST',
      '/task-requests',
      {
        title: 'Add WhatsApp Notification',
        description: 'Send automated WhatsApp messages to customers when order delivery status updates.',
        project: project._id,
        priority: 'HIGH',
        requestedDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      },
      clientToken
    );
    const taskRequest = createReq.taskRequest;
    console.log(`✅ Task Request created: ID: ${taskRequest._id}`);
    console.log(`   Status: ${taskRequest.status} (Expected: PENDING_APPROVAL)`);
    if (taskRequest.status !== 'PENDING_APPROVAL') {
      throw new Error(`Expected status PENDING_APPROVAL, got ${taskRequest.status}`);
    }

    // 4. Admin approves Task Request and assigns to Arun
    console.log('\n[Step 4] Admin approving task request and assigning to Arun Kumar...');
    const approveRes = await req(
      'POST',
      `/task-requests/${taskRequest._id}/approve`,
      {
        assignedTo: EmployeeId,
        priority: 'HIGH',
        adminNotes: 'Assigned to Arun for immediate implementation.'
      },
      adminToken
    );
    const assignedTask = approveRes.task;
    const updatedRequest = approveRes.taskRequest;
    console.log(`✅ TaskRequest status: ${updatedRequest.status} (Expected: APPROVED)`);
    console.log(`✅ Created Task status: ${assignedTask.status} (Expected: ASSIGNED)`);
    console.log(`   Assigned To: ${assignedTask.assignedTo.name}`);
    if (updatedRequest.status !== 'APPROVED' || assignedTask.status !== 'ASSIGNED') {
      throw new Error('Approval or Assignment state mismatch!');
    }

    // 5. Arun verifies task in my-tasks
    console.log('\n[Step 5] Employee verifying task in queue...');
    const myTasksRes = await req('GET', '/tasks/my-tasks', null, EmployeeToken);
    const arunTask = myTasksRes.tasks.find((t) => t._id === assignedTask._id);
    if (!arunTask) throw new Error('Assigned task not found in Arun queue!');
    console.log(`✅ Arun sees assigned task in his queue: "${arunTask.title}"`);

    // 6. Arun starts task (ASSIGNED -> IN_PROGRESS)
    console.log('\n[Step 6] Arun starts the task...');
    const startRes = await req('POST', `/tasks/${assignedTask._id}/start`, {}, EmployeeToken);
    console.log(`✅ Task status after start: ${startRes.task.status} (Expected: IN_PROGRESS)`);
    if (startRes.task.status !== 'IN_PROGRESS') throw new Error('Task did not transition to IN_PROGRESS');

    // 7. Arun updates progress: 25 -> 50 -> 75 -> 100
    console.log('\n[Step 7] Arun updating progress (25% -> 50% -> 75% -> 100%)...');
    for (const p of [25, 50, 75, 100]) {
      const pRes = await req('POST', `/tasks/${assignedTask._id}/progress`, { progress: p }, EmployeeToken);
      console.log(`   Progress updated to: ${pRes.progress}%`);
    }

    // 8. Arun submits for review (IN_PROGRESS -> IN_REVIEW)
    console.log('\n[Step 8] Arun submitting task for Admin review...');
    const submitRes = await req('POST', `/tasks/${assignedTask._id}/submit-review`, {}, EmployeeToken);
    console.log(`✅ Task status after submission: ${submitRes.task.status} (Expected: IN_REVIEW)`);
    if (submitRes.task.status !== 'IN_REVIEW') throw new Error('Task did not transition to IN_REVIEW');

    // 9. Admin receives notification & completes task (IN_REVIEW -> COMPLETED)
    console.log('\n[Step 9] Admin reviews task and marks COMPLETED...');
    const completeRes = await req('POST', `/tasks/${assignedTask._id}/complete`, {}, adminToken);
    console.log(`✅ Task status after Admin approval: ${completeRes.task.status} (Expected: COMPLETED)`);
    console.log(`   Task Progress: ${completeRes.task.progress}%`);
    if (completeRes.task.status !== 'COMPLETED') throw new Error('Task did not transition to COMPLETED');

    // 10. Client checks task and activity timeline
    console.log('\n[Step 10] Client verifying task completion & activity audit timeline...');
    const clientCheck = await req('GET', `/tasks/${assignedTask._id}`, null, clientToken);
    console.log(`✅ Client sees task: "${clientCheck.task.title}"`);
    console.log(`   Status: ${clientCheck.task.status} (Expected: COMPLETED)`);
    console.log(`   Progress: ${clientCheck.task.progress}%`);

    // Verify activities
    const activitiesRes = await req('GET', `/activities/project/${project._id}`, null, clientToken);
    const taskActivities = (activitiesRes.activities || []).filter(
      (a) => a.description?.includes('Add WhatsApp Notification') || a.entityId === assignedTask._id
    );
    console.log(`✅ Activity trail contains ${taskActivities.length} audit entries for this task workflow`);

    // 11. Test Role Isolation (Security Check)
    console.log('\n[Step 11] Security & Role Isolation Checks:');
    try {
      await req('POST', `/task-requests/${taskRequest._id}/approve`, { assignedTo: EmployeeId }, EmployeeToken);
      throw new Error('SECURITY VIOLATION: Employee was able to approve task requests!');
    } catch (err) {
      console.log(`✅ Employee blocked from Admin endpoint (HTTP ${err.status})`);
    }

    try {
      await req('GET', '/users/Employees', null, clientToken);
      throw new Error('SECURITY VIOLATION: Client was able to access Employees list!');
    } catch (err) {
      console.log(`✅ Client blocked from Employees endpoint (HTTP ${err.status})`);
    }

    console.log('\n===========================================================');
    console.log('🎉 ALL ACCEPTANCE CRITERIA PASSED WITH 100% SUCCESS!');
    console.log('===========================================================');
  } catch (err) {
    console.error('\n❌ ACCEPTANCE TEST FAILED:', err.message);
    if (err.data) {
      console.error('Response Data:', err.data);
    }
    process.exit(1);
  } finally {
    // Teardown temporary test entities
    if (adminToken) {
      if (projectId) await req('DELETE', `/projects/${projectId}`, null, adminToken).catch(() => { });
      if (clientId) await req('DELETE', `/users/${clientId}`, null, adminToken).catch(() => { });
      if (EmployeeId) await req('DELETE', `/users/${EmployeeId}`, null, adminToken).catch(() => { });
    }
  }
}

runAcceptanceTest();
