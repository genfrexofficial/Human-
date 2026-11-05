const express = require('express');
const router = express.Router();
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

const {
  getCandidates,
  getCandidateById,
  createCandidate,
  updateCandidate,
  linkCandidateToProject,
  deleteCandidate
} = require('../controllers/candidateController');

const {
  getAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  submitForApproval,
  approveAppointment,
  rejectAppointment,
  generatePDF,
  sendAppointment,
  updateAcceptanceStatus,
  deleteAppointment
} = require('../controllers/appointmentController');

const {
  getHRStats,
  getHRReports,
  getHRAuditLogs,
  getHRSettings,
  updateHRSettings,
  getLetterTemplates,
  createLetterTemplate,
  updateLetterTemplate,
  deleteLetterTemplate
} = require('../controllers/hrReportsController');

// All HR routes require authentication and strictly allow ADMIN or HR roles only
router.use(authenticateToken);
router.use(authorizeRoles('ADMIN', 'HR'));

// --- CANDIDATE ROUTES ---
router.route('/candidates')
  .get(getCandidates)
  .post(createCandidate);

router.route('/candidates/:id')
  .get(getCandidateById)
  .put(updateCandidate)
  .delete(deleteCandidate);

router.post('/candidates/:id/link-project', linkCandidateToProject);

// --- APPOINTMENT LETTER ROUTES ---
router.route('/appointments')
  .get(getAppointments)
  .post(createAppointment);

router.route('/appointments/:id')
  .get(getAppointmentById)
  .put(updateAppointment)
  .delete(deleteAppointment);

// Workflow transitions
router.post('/appointments/:id/submit', submitForApproval);
router.post('/appointments/:id/approve', authorizeRoles('ADMIN'), approveAppointment);
router.post('/appointments/:id/reject', authorizeRoles('ADMIN'), rejectAppointment);
router.post('/appointments/:id/generate-pdf', generatePDF);
router.post('/appointments/:id/send', sendAppointment);
router.put('/appointments/:id/acceptance', updateAcceptanceStatus);

// --- STATS, REPORTS & AUDIT ---
router.get('/stats', getHRStats);
router.get('/reports', getHRReports);
router.get('/audit-logs', getHRAuditLogs);

// --- SETTINGS & TEMPLATES ---
router.get('/settings', getHRSettings);
router.put('/settings', authorizeRoles('ADMIN'), updateHRSettings);

// Master Role Templates
router.get('/templates', getLetterTemplates);
router.post('/templates', authorizeRoles('ADMIN', 'HR'), createLetterTemplate);
router.put('/templates/:id', authorizeRoles('ADMIN', 'HR'), updateLetterTemplate);
router.delete('/templates/:id', authorizeRoles('ADMIN'), deleteLetterTemplate);
router.put('/template', authorizeRoles('ADMIN', 'HR'), updateLetterTemplate);

module.exports = router;
