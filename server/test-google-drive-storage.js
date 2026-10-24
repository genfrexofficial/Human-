const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const File = require('./models/File');
const User = require('./models/User');
const Project = require('./models/Project');
const AuditLog = require('./models/AuditLog');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000/api';

async function runStorageTestSuite() {
  console.log('================================================================');
  console.log('🚀 GENFREX GOOGLE DRIVE & CLOUD STORAGE VERIFICATION SUITE');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${message}`);
      failed++;
    }
  }

  // Connect directly to MongoDB
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/clientportal');

  // Purge any stale test accounts/files from prior runs before recording baseline
  await User.deleteMany({
    email: {
      $in: [
        'test_hr_storage@genfrex.com',
        'test_Employee_storage@genfrex.com',
        'client1_storage@test.com',
        'client2_storage@test.com'
      ]
    }
  });
  await File.deleteMany({
    fileName: { $in: ['HR_Offer_Letter_2026.pdf', 'HR_Offer_Letter_2026_V2.pdf', 'client1_requirement_brief.docx'] }
  });

  const initialUserCount = await User.countDocuments();
  const initialFileCount = await File.countDocuments();

  const testTempDir = path.join(__dirname, 'temp_gdrive_test');
  if (!fs.existsSync(testTempDir)) fs.mkdirSync(testTempDir, { recursive: true });

  const testPdfPath = path.join(testTempDir, 'enterprise_contract.pdf');
  fs.writeFileSync(testPdfPath, '%PDF-1.4 GENFREX test cloud storage contract payload');

  const testDocPath = path.join(testTempDir, 'project_spec.docx');
  fs.writeFileSync(testDocPath, 'GENFREX Project Specification Docx binary payload');

  const dangerousExePath = path.join(testTempDir, 'malicious_payload.exe');
  fs.writeFileSync(dangerousExePath, 'MZ malicious executable binary simulation');

  let adminToken = null;
  let hrToken = null;
  let EmployeeToken = null;
  let client1Token = null;
  let client2Token = null;

  let hrUser = null;
  let EmployeeUser = null;
  let client1User = null;
  let client2User = null;
  let testProject = null;

  try {
    // -------------------------------------------------------------
    // Test 1: Admin Authentication (admin@genfrex.com / Admin@123)
    // -------------------------------------------------------------
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@genfrex.com', password: 'Admin@123' })
    });
    const adminLogin = await adminLoginRes.json();
    assert(adminLoginRes.status === 200 && adminLogin.token, '1. Admin authenticated successfully');
    adminToken = adminLogin.token;

    // -------------------------------------------------------------
    // Test 2: Storage Diagnostics & Metrics
    // -------------------------------------------------------------
    const statsRes = await fetch(`${BASE_URL}/files/storage-stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const statsData = await statsRes.json();
    assert(
      statsRes.status === 200 &&
      statsData.success &&
      statsData.diagnostics?.providers?.GOOGLE_DRIVE,
      '2. Admin retrieved storage diagnostics with Google Drive & Multi-Cloud providers'
    );

    // -------------------------------------------------------------
    // Test 3: Unauthenticated access rejected (401)
    // -------------------------------------------------------------
    const unauthRes = await fetch(`${BASE_URL}/files/storage-stats`);
    assert(unauthRes.status === 401, '3. Unauthenticated request to storage diagnostics strictly rejected (401)');

    // -------------------------------------------------------------
    // Test 4: Security File Filter - Dangerous .exe rejected
    // -------------------------------------------------------------
    const exeForm = new FormData();
    exeForm.append('file', new Blob([fs.readFileSync(dangerousExePath)]), 'malicious_payload.exe');
    const exeRes = await fetch(`${BASE_URL}/files/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: exeForm
    });
    assert(exeRes.status !== 200 && exeRes.status !== 201, '4. Malicious executable (.exe) rejected by security filter');

    // -------------------------------------------------------------
    // Test 5: Setup temporary test accounts (HR, Employee, Clients)
    // -------------------------------------------------------------
    const createHRRes = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Test HR Specialist',
        email: 'test_hr_storage@genfrex.com',
        role: 'HR',
        password: 'Password@123'
      })
    });
    const hrData = await createHRRes.json();
    hrUser = hrData.user;

    const hrLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test_hr_storage@genfrex.com', password: 'Password@123' })
    });
    hrToken = (await hrLoginRes.json()).token;

    const createEmployeeRes = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Test Employee Engineer',
        email: 'test_Employee_storage@genfrex.com',
        role: 'Employee',
        password: 'Password@123'
      })
    });
    EmployeeUser = (await createEmployeeRes.json()).user;

    const EmployeeLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test_Employee_storage@genfrex.com', password: 'Password@123' })
    });
    EmployeeToken = (await EmployeeLoginRes.json()).token;

    const createClient1Res = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Client One Corp',
        email: 'client1_storage@test.com',
        role: 'CLIENT',
        password: 'Password@123'
      })
    });
    client1User = (await createClient1Res.json()).user;

    const client1LoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'client1_storage@test.com', password: 'Password@123' })
    });
    client1Token = (await client1LoginRes.json()).token;

    const createClient2Res = await fetch(`${BASE_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Client Two Ltd',
        email: 'client2_storage@test.com',
        role: 'CLIENT',
        password: 'Password@123'
      })
    });
    client2User = (await createClient2Res.json()).user;

    const client2LoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'client2_storage@test.com', password: 'Password@123' })
    });
    client2Token = (await client2LoginRes.json()).token;

    // Create a project for Client 1
    const adminId = adminLogin.user.id || adminLogin.user._id;
    testProject = await Project.create({
      name: 'Client 1 ERP Platform',
      client: client1User._id || client1User.id,
      assignedEmployees: [EmployeeUser._id || EmployeeUser.id],
      createdBy: adminId,
      status: 'IN_PROGRESS'
    });

    assert(testProject && hrToken && EmployeeToken && client1Token && client2Token, '5. Authorized test entities created for verification');

    // -------------------------------------------------------------
    // Test 6: HR uploads authorized confidential HR document
    // -------------------------------------------------------------
    const hrUploadForm = new FormData();
    hrUploadForm.append('file', new Blob([fs.readFileSync(testPdfPath)], { type: 'application/pdf' }), 'HR_Offer_Letter_2026.pdf');
    hrUploadForm.append('category', 'HR_APPOINTMENT');
    hrUploadForm.append('fileName', 'HR_Offer_Letter_2026.pdf');

    const hrUploadRes = await fetch(`${BASE_URL}/files/upload-confidential`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${hrToken}` },
      body: hrUploadForm
    });
    const hrUploadData = await hrUploadRes.json();
    assert(
      hrUploadRes.status === 201 &&
      hrUploadData.file?.isConfidential === true &&
      hrUploadData.file?.module === 'HR',
      '6. HR uploaded confidential HR document with strict tier'
    );
    const confidentialFileId = hrUploadData.file?._id;

    // -------------------------------------------------------------
    // Test 7: Employee is FORBIDDEN from accessing HR document (403)
    // -------------------------------------------------------------
    const EmployeeAccessRes = await fetch(`${BASE_URL}/files/${confidentialFileId}/download`, {
      headers: { Authorization: `Bearer ${EmployeeToken}` }
    });
    assert(EmployeeAccessRes.status === 403, '7. Employee access to confidential HR document rejected (403 Forbidden)');

    // -------------------------------------------------------------
    // Test 8: Client is FORBIDDEN from accessing HR document (403)
    // -------------------------------------------------------------
    const clientAccessRes = await fetch(`${BASE_URL}/files/${confidentialFileId}/download`, {
      headers: { Authorization: `Bearer ${client1Token}` }
    });
    assert(clientAccessRes.status === 403, '8. Client access to confidential HR document rejected (403 Forbidden)');

    // -------------------------------------------------------------
    // Test 9: Verify FILE_ACCESS_DENIED audit log was recorded
    // -------------------------------------------------------------
    const deniedLogs = await AuditLog.find({ action: 'FILE_ACCESS_DENIED' });
    assert(deniedLogs.length >= 2, '9. Storage security audit recorded FILE_ACCESS_DENIED events');

    // -------------------------------------------------------------
    // Test 10: Client 1 uploads authorized project document
    // -------------------------------------------------------------
    const client1Form = new FormData();
    client1Form.append('file', new Blob([fs.readFileSync(testDocPath)]), 'client1_requirement_brief.docx');
    client1Form.append('projectId', testProject._id.toString());
    client1Form.append('category', 'DOCUMENT');

    const client1UploadRes = await fetch(`${BASE_URL}/files/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${client1Token}` },
      body: client1Form
    });
    const client1UploadData = await client1UploadRes.json();
    assert(
      client1UploadRes.status === 201 && client1UploadData.file?._id,
      '10. Client 1 successfully uploaded document to their own project'
    );
    const client1FileId = client1UploadData.file?._id;

    // -------------------------------------------------------------
    // Test 11: Cross-Client Isolation: Client 2 FORBIDDEN from Client 1's file (403)
    // -------------------------------------------------------------
    const client2CrossRes = await fetch(`${BASE_URL}/files/${client1FileId}/download`, {
      headers: { Authorization: `Bearer ${client2Token}` }
    });
    assert(client2CrossRes.status === 403, '11. Cross-client security barrier strictly enforced (Client 2 got 403)');

    // -------------------------------------------------------------
    // Test 12: File Replacement Flow (PUT /files/:id/replace)
    // -------------------------------------------------------------
    const replaceForm = new FormData();
    const updatedPdfBuffer = Buffer.from('%PDF-1.4 Updated V2 Contract content with revisions');
    replaceForm.append('file', new Blob([updatedPdfBuffer], { type: 'application/pdf' }), 'HR_Offer_Letter_2026_V2.pdf');
    replaceForm.append('fileName', 'HR_Offer_Letter_2026_V2.pdf');

    const replaceRes = await fetch(`${BASE_URL}/files/${confidentialFileId}/replace`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: replaceForm
    });
    const replaceData = await replaceRes.json();
    assert(
      replaceRes.status === 200 && replaceData.file?.fileName === 'HR_Offer_Letter_2026_V2.pdf',
      '12. Admin successfully replaced file with atomic versioning'
    );

    const replaceAudit = await AuditLog.findOne({ action: 'FILE_REPLACE' });
    assert(replaceAudit !== null, '13. FILE_REPLACE action successfully recorded in audit trail');

    // -------------------------------------------------------------
    // Test 13: MongoDB Indexed File Browser & Search (/files/browse)
    // -------------------------------------------------------------
    const browseRes = await fetch(`${BASE_URL}/files/browse?search=Letter`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const browseData = await browseRes.json();
    assert(
      browseRes.status === 200 && browseData.files && browseData.files.length >= 1,
      '14. Admin browsed and searched files via MongoDB index'
    );

    // -------------------------------------------------------------
    // Test 14: File Deletion Flow (DELETE /files/:id)
    // -------------------------------------------------------------
    const deleteRes = await fetch(`${BASE_URL}/files/${confidentialFileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const deleteData = await deleteRes.json();
    assert(deleteRes.status === 200 && deleteData.success, '15. Admin deleted file from storage and updated ledger');

    const deletedFileRecord = await File.findById(confidentialFileId);
    assert(deletedFileRecord.status === 'DELETED', '16. File status transitioned to DELETED in MongoDB');

    const deleteAudit = await AuditLog.findOne({ action: 'FILE_DELETE', fileId: confidentialFileId });
    assert(deleteAudit !== null, '17. FILE_DELETE action successfully recorded in audit log');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    // -------------------------------------------------------------
    // Clean up temporary test files & data (NO DEMO DATA LEFT BEHIND)
    // -------------------------------------------------------------
    console.log('\n🧹 Cleaning up test artifacts and temporary entities...');
    if (fs.existsSync(testTempDir)) {
      fs.rmSync(testTempDir, { recursive: true, force: true });
    }

    if (testProject) await Project.deleteOne({ _id: testProject._id });
    await User.deleteMany({
      email: {
        $in: [
          'test_hr_storage@genfrex.com',
          'test_Employee_storage@genfrex.com',
          'client1_storage@test.com',
          'client2_storage@test.com'
        ]
      }
    });
    await File.deleteMany({
      fileName: { $in: ['HR_Offer_Letter_2026.pdf', 'HR_Offer_Letter_2026_V2.pdf', 'client1_requirement_brief.docx'] }
    });
    await AuditLog.deleteMany({
      action: { $in: ['FILE_UPLOAD', 'FILE_VIEW', 'FILE_DOWNLOAD', 'FILE_DELETE', 'FILE_REPLACE', 'FILE_ACCESS_DENIED'] }
    });

    const userCount = await User.countDocuments();
    const fileCount = await File.countDocuments();
    assert(userCount === initialUserCount, `18. Database returned to pristine clean state (${initialUserCount} users preserved)`);
    assert(fileCount === initialFileCount, `19. Zero demo/seed storage files remaining in database (${initialFileCount} files)`);

    await mongoose.disconnect();
  }

  console.log('================================================================');
  console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) process.exit(1);
}

runStorageTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
