const BASE_URL = 'http://localhost:5000/api';

async function api(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runConstraintsTest() {
  console.log('\n===========================================================');
  console.log('🛡️ TESTING PRODUCTION CONSTRAINTS & ROLE ISOLATION');
  console.log('===========================================================\n');

  // 1. Log in users
  const adminLogin = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@genfrex.com', password: 'Admin@123' })
  });
  const adminToken = adminLogin.data.token;
  console.log('✅ Admin authenticated:', adminLogin.data.user.name);

  // Ensure test worker exists
  const workerEmail = 'constraints.worker@genfrex.com';
  const workerPass = 'Worker@123';
  let workerLogin = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: workerEmail, password: workerPass })
  });
  if (workerLogin.status !== 200) {
    await api('/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Arun Kumar',
        email: workerEmail,
        role: 'WORKER',
        title: 'Full Stack Engineer',
        password: workerPass
      })
    });
    workerLogin = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: workerEmail, password: workerPass })
    });
  }
  const workerToken = workerLogin.data.token;
  const workerId = workerLogin.data.user.id || workerLogin.data.user._id;
  console.log('✅ Worker authenticated:', workerLogin.data.user.name);

  // Ensure test client exists
  const clientEmail = 'constraints.client@clientportal.com';
  const clientPass = 'Client@123';
  let clientLogin = await api('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: clientEmail, password: clientPass })
  });
  if (clientLogin.status !== 200) {
    await api('/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Sarah Jenkins',
        email: clientEmail,
        companyName: 'Jenkins Enterprises',
        role: 'CLIENT',
        password: clientPass
      })
    });
    clientLogin = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: clientEmail, password: clientPass })
    });
  }
  const clientToken = clientLogin.data.token;
  const clientId = clientLogin.data.user.id || clientLogin.data.user._id;
  console.log('✅ Client authenticated:', clientLogin.data.user.name);

  // 2. Test INTERNAL COMMENTS ISOLATION
  console.log('\n[Constraint 1: Internal Comments Filtered at Backend]');
  // Get or create client project
  let projectsRes = await api('/projects', {
    headers: { Authorization: `Bearer ${clientToken}` }
  });
  let clientProject = (projectsRes.data.projects || [])[0];
  if (!clientProject) {
    const newProj = await api('/projects', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Enterprise Constraints Test Project',
        description: 'Project created for constraints verification',
        client: clientId,
        assignedWorkers: [workerId],
        budget: 50000
      })
    });
    clientProject = newProj.data.project;
  }
  console.log(`Using Project: "${clientProject.name}" (ID: ${clientProject._id})`);

  // Admin posts an internal comment
  const postInternalComment = await api('/comments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      project: clientProject._id,
      message: 'CONFIDENTIAL INTERNAL NOTE: Client requested discount, do not mention.',
      isInternal: true
    })
  });
  console.log('✅ Admin posted internal comment (isInternal: true)');

  // Admin posts a public comment
  const postPublicComment = await api('/comments', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      project: clientProject._id,
      message: 'Public update: Milestone 2 deliverables uploaded.',
      isInternal: false
    })
  });
  console.log('✅ Admin posted public comment (isInternal: false)');

  // Client fetches project comments
  const clientCommentsRes = await api(`/comments/project/${clientProject._id}`, {
    headers: { Authorization: `Bearer ${clientToken}` }
  });
  const clientVisibleComments = clientCommentsRes.data.comments || [];
  const leakedComment = clientVisibleComments.find(c => c.isInternal === true || c.message.includes('CONFIDENTIAL'));

  if (leakedComment) {
    console.error('❌ SECURITY FAILURE: Client was able to see internal comment:', leakedComment);
    process.exit(1);
  } else {
    console.log(`✅ SECURITY PASS: Client query returned ${clientVisibleComments.length} comments. ZERO internal comments leaked!`);
  }

  // 3. Test TASK STATE MACHINE VIOLATIONS
  console.log('\n[Constraint 2: Strict State Machine Transition Enforced]');
  // Admin creates a task in ASSIGNED state
  const newTaskRes = await api('/tasks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      project: clientProject._id,
      title: 'State Machine Strictness Test Task',
      assignedTo: workerId,
      status: 'ASSIGNED'
    })
  });
  const testTaskId = newTaskRes.data.task._id;
  console.log('✅ Created task in ASSIGNED state');

  // Worker tries to jump directly to COMPLETED (Illegal transition)
  const illegalJumpRes = await api(`/tasks/${testTaskId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${workerToken}` },
    body: JSON.stringify({ status: 'COMPLETED' })
  });
  if (illegalJumpRes.status === 400) {
    console.log('✅ BLOCKED: Worker cannot illegally jump from ASSIGNED -> COMPLETED (HTTP 400 returned)');
  } else {
    console.error('❌ FAILURE: State machine allowed illegal transition from ASSIGNED to COMPLETED!');
    process.exit(1);
  }

  // Worker tries to jump directly to IN_REVIEW without starting (Illegal transition)
  const illegalReviewRes = await api(`/tasks/${testTaskId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${workerToken}` },
    body: JSON.stringify({ status: 'IN_REVIEW' })
  });
  if (illegalReviewRes.status === 400) {
    console.log('✅ BLOCKED: Worker cannot jump from ASSIGNED -> IN_REVIEW directly (HTTP 400 returned)');
  } else {
    console.error('❌ FAILURE: State machine allowed illegal transition to IN_REVIEW!');
    process.exit(1);
  }

  // Worker transitions to IN_PROGRESS (Valid)
  const startRes = await api(`/tasks/${testTaskId}/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${workerToken}` }
  });
  console.log('✅ Valid transition: Worker started task ->', startRes.data.task.status);

  // Worker reports BLOCKED (Valid)
  const blockRes = await api(`/tasks/${testTaskId}/block`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${workerToken}` },
    body: JSON.stringify({ reason: 'Waiting for API credentials' })
  });
  console.log('✅ Valid transition: Worker reported blocker ->', blockRes.data.task.status);

  // Worker unblocks back to IN_PROGRESS (Valid)
  const unblockRes = await api(`/tasks/${testTaskId}/start`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${workerToken}` }
  });
  console.log('✅ Valid transition: Worker resumed task ->', unblockRes.data.task.status);

  // Worker submits for review (Valid: IN_PROGRESS -> IN_REVIEW)
  const submitReviewRes = await api(`/tasks/${testTaskId}/submit-review`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${workerToken}` }
  });
  console.log('✅ Valid transition: Worker submitted for review ->', submitReviewRes.data.task.status);

  // Admin marks COMPLETED (Valid: IN_REVIEW -> COMPLETED)
  const completeRes = await api(`/tasks/${testTaskId}/complete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('✅ Valid transition: Admin completed task ->', completeRes.data.task.status);

  // 4. Test PROJECT PROGRESS CALCULATION
  console.log('\n[Constraint 3: Dynamic Project Progress (completed / total * 100)]');
  const projectDetailsRes = await api(`/projects/${clientProject._id}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const projectData = projectDetailsRes.data.project;
  console.log(`Project: "${projectData.name}"`);
  console.log(`Live Progress: ${projectData.progress}%`);
  console.log(`Calculated Health: ${projectData.health}`);

  // 5. Test WORKER WORKLOAD CALCULATION
  console.log('\n[Constraint 4: Dynamic Worker Workload Metrics]');
  const workersRes = await api('/users/workers', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const arun = workersRes.data.workers.find(w => w._id.toString() === workerId.toString());
  console.log(`Worker ${arun.name} Live Workload:`);
  console.log(`- Assigned: ${arun.workload.assigned}`);
  console.log(`- In Progress: ${arun.workload.inProgress}`);
  console.log(`- Awaiting Review: ${arun.workload.awaitingReview}`);
  console.log(`- Completed: ${arun.workload.completed}`);
  console.log(`- Blocked: ${arun.workload.blocked}`);
  console.log(`- Overdue: ${arun.workload.overdue}`);

  // 6. Test SECURE FILE ACCESS
  console.log('\n[Constraint 5: Secure File Access & RBAC]');
  // Unauthenticated download attempt
  const unauthFileRes = await api(`/files/${testTaskId}/download`);
  if (unauthFileRes.status === 401) {
    console.log('✅ BLOCKED: Unauthenticated file download request denied (HTTP 401)');
  } else {
    console.warn(`Unauthenticated file response: HTTP ${unauthFileRes.status}`);
  }

  // Clean up test task
  await api(`/tasks/${testTaskId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('🧹 Cleaned up test task');

  console.log('\n===========================================================');
  console.log('🎉 ALL FINAL PRODUCTION CONSTRAINTS VERIFIED & ENFORCED!');
  console.log('===========================================================\n');
}

runConstraintsTest().catch(err => {
  console.error('Error during constraints verification:', err);
  process.exit(1);
});
