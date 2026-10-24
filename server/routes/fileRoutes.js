const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const {
  getProjectFiles,
  uploadProjectFile,
  uploadConfidentialHRFile,
  replaceFile,
  deleteProjectFile,
  reviewDeliverable,
  downloadFile,
  getStorageStats,
  browseFiles
} = require('../controllers/fileController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Admin Storage Diagnostics & Usage Metrics
router.get('/storage-stats', authorizeRoles('ADMIN'), getStorageStats);

// Filtered File Browser (Indexed in MongoDB)
router.get('/browse', browseFiles);

// Confidential HR document upload (Admin & HR only)
router.post('/upload-confidential', authorizeRoles('ADMIN', 'HR'), upload.single('file'), uploadConfidentialHRFile);

// Project & General File Upload
router.post('/upload', upload.single('file'), uploadProjectFile);

// File Replacement (Upload new version, remove old version safely)
router.put('/:id/replace', upload.single('file'), replaceFile);

// Project Files
router.get('/project/:projectId', getProjectFiles);
router.get('/project', (req, res) => res.status(200).json({ success: true, count: 0, files: [] }));

// Secure Download & Stream (Direct Google Drive streaming proxy)
router.get('/:id/download', downloadFile);
router.get('/:id/view', downloadFile);

// Review Deliverables
router.put('/:id/review', reviewDeliverable);

// Delete file
router.delete('/:id', deleteProjectFile);

module.exports = router;
