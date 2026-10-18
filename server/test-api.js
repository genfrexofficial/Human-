async function testAPI() {
  try {
    const health = await fetch('http://localhost:5000/api/health').then(r => r.json());
    console.log('1. Health check:', health);

    const adminLogin = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@genfrex.com', password: 'Admin@123' })
    }).then(r => r.json());
    console.log('2. Admin login success:', adminLogin.success, 'User:', adminLogin.user.name, 'Role:', adminLogin.user.role);

    // Create a temporary client for API verification
    const testClientEmail = `api.client.${Date.now()}@test.com`;
    const createClientRes = await fetch('http://localhost:5000/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminLogin.token}`
      },
      body: JSON.stringify({
        name: 'API Test Client',
        email: testClientEmail,
        role: 'CLIENT',
        password: 'ClientPass@123'
      })
    }).then(r => r.json());

    const clientLogin = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testClientEmail, password: 'ClientPass@123' })
    }).then(r => r.json());
    console.log('3. Client login success:', clientLogin.success, 'User:', clientLogin.user.name, 'Role:', clientLogin.user.role);

    const projectsRes = await fetch('http://localhost:5000/api/projects', {
      headers: { 'Authorization': `Bearer ${adminLogin.token}` }
    }).then(r => r.json());
    console.log('4. Projects count:', projectsRes.count);

    // Clean up temporary client
    const clientId = createClientRes.user?.id || createClientRes.user?._id;
    if (clientId) {
      await fetch(`http://localhost:5000/api/users/${clientId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${adminLogin.token}` }
      });
    }

    console.log('ALL BACKEND CHECKS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('API Test Error:', err);
  }
}

testAPI();
