const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const File = require('./models/File');
const User = require('./models/User');
const Project = require('./models/Project');

const BASE_URL = 'http://localhost:5000/api';

async function runStorageTests() {
  console.log('========================================================');
  console.log('☁️  GENFREX MULTI-TIER CLOUD STORAGE TESTS');
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

  // 1. Admin login
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@genfrex.com', password: 'Admin@123' })
  });
  const loginData = await loginRes.json();
  assert(loginRes.status === 200 && loginData.token, '1. Admin authenticated for storage operations');
  const adminToken = loginData.token;

  // 2. Storage diagnostics API
  const statsRes = await fetch(`${BASE_URL}/files/storage-stats`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const statsData = await statsRes.json();
  assert(
    statsRes.status === 200 && statsData.success && statsData.diagnostics?.providers?.S3,
    '2. Admin can retrieve storage diagnostics with S3 & Cloudinary status'
  );

  // 3. Unauthenticated access to storage diagnostics is rejected
  const unauthStats = await fetch(`${BASE_URL}/files/storage-stats`);
  assert(unauthStats.status === 401, '3. Unauthenticated access to storage stats is rejected (401)');

  // 4. Create dummy files on disk to test multipart uploads
  const tempTestDir = path.join(__dirname, 'temp_test_storage');
  if (!fs.existsSync(tempTestDir)) fs.mkdirSync(tempTestDir, { recursive: true });

  const safePdfPath = path.join(tempTestDir, 'test_contract.pdf');
  fs.writeFileSync(safePdfPath, '%PDF-1.4 Mock PDF content for cloud storage testing');

  const dangerousPath = path.join(tempTestDir, 'malicious_script.exe');
  fs.writeFileSync(dangerousPath, 'MZ fake executable binary');

  // 5. Security test: Disallow dangerous executable file extensions
  const maliciousFormData = new FormData();
  const exeBuffer = fs.readFileSync(dangerousPath);
  maliciousFormData.append('file', new Blob([exeBuffer]), 'malicious_script.exe');

  const exeUploadRes = await fetch(`${BASE_URL}/files/upload-confidential`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: maliciousFormData
  });
  assert(exeUploadRes.status !== 200 && exeUploadRes.status !== 201, '4. Malicious .exe file is strictly rejected by security filter');

  // 6. Upload confidential document (HR / S3 tier)
  const confidentialFormData = new FormData();
  const pdfBuffer = fs.readFileSync(safePdfPath);
  confidentialFormData.append('file', new Blob([pdfBuffer], { type: 'application/pdf' }), 'confidential_terms.pdf');
  confidentialFormData.append('category', 'HR_DOCUMENT');

  const confUploadRes = await fetch(`${BASE_URL}/files/upload-confidential`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: confidentialFormData
  });
  const confUploadData = await confUploadRes.json();
  assert(
    confUploadRes.status === 201 && confUploadData.file?.isConfidential === true,
    '5. Confidential document uploaded with strict confidentiality tier'
  );
  const confidentialFileId = confUploadData.file?._id;

  // 7. Test download endpoint with presigned / secure URL
  const downloadRes = await fetch(`${BASE_URL}/files/${confidentialFileId}/download?json=true`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const downloadData = await downloadRes.json();
  assert(downloadRes.status === 200 && downloadData.url, '6. Authenticated Admin receives valid secure download URL');

  // 8. Test Role-Based Confidentiality Barrier: Create temporary Worker & Client accounts
  const workerRes = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Storage Test Worker',
      email: 'storageworker@genfrex.com',
      role: 'WORKER',
      password: 'Worker@123Pass!'
    })
  });
  const workerData = await workerRes.json();
  const workerLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'storageworker@genfrex.com', password: 'Worker@123Pass!' })
  });
  const workerToken = (await workerLogin.json()).token;

  const clientRes = await fetch(`${BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Storage Test Client',
      email: 'storageclient@test.com',
      role: 'CLIENT',
      password: 'Client@123Pass!'
    })
  });
  const clientData = await clientRes.json();
  const clientLogin = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'storageclient@test.com', password: 'Client@123Pass!' })
  });
  const clientToken = (await clientLogin.json()).token;

  // Worker attempt to access confidential file
  const workerAttempt = await fetch(`${BASE_URL}/files/${confidentialFileId}/download`, {
    headers: { Authorization: `Bearer ${workerToken}` }
  });
  assert(workerAttempt.status === 403, '7a. Worker is FORBIDDEN from downloading confidential HR files (403)');

  // Client attempt to access confidential file
  const clientAttempt = await fetch(`${BASE_URL}/files/${confidentialFileId}/download`, {
    headers: { Authorization: `Bearer ${clientToken}` }
  });
  assert(clientAttempt.status === 403, '7b. Client is FORBIDDEN from downloading confidential HR files (403)');

  // 9. Admin delete file
  const deleteRes = await fetch(`${BASE_URL}/files/${confidentialFileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(deleteRes.status === 200, '8. Admin can delete file across storage providers');

  // 10. Clean up temporary test files & users
  if (fs.existsSync(tempTestDir)) {
    fs.rmSync(tempTestDir, { recursive: true, force: true });
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clientportal';
  await mongoose.connect(mongoUri);
  await User.deleteMany({ email: { $in: ['storageworker@genfrex.com', 'storageclient@test.com'] } });
  await File.deleteMany({ _id: confidentialFileId });

  const remainingTestUsers = await User.countDocuments({ email: { $in: ['storageworker@genfrex.com', 'storageclient@test.com'] } });
  const remainingTestFiles = await File.countDocuments({ _id: confidentialFileId });
  assert(remainingTestUsers === 0, '9. Test users cleaned up (test worker & client removed)');
  assert(remainingTestFiles === 0, '10. Test files cleaned up (confidential test file removed)');

  await mongoose.disconnect();

  console.log('========================================================');
  console.log(`STORAGE TEST SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
  console.log('========================================================');

  if (testsFailed > 0) process.exit(1);
}

runStorageTests().catch((err) => {
  console.error('Fatal storage test error:', err);
  process.exit(1);
});
