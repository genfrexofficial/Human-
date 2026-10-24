const express = require('express');
const router = express.Router();
const {
  generateMonthlyPayroll,
  getPayrolls,
  getPayrollStats,
  getPayrollById,
  updatePayrollSlip,
  submitForApproval,
  approvePayroll,
  recordPayment,
  bulkRecordPayment,
  getMyPayrolls,
  deletePayroll,
  downloadPaymentVoucher
} = require('../controllers/payrollController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Employee routes
router.get('/my-payrolls', authorizeRoles('Employee'), getMyPayrolls);

// Shared / Role-checked detail view & PDF download
router.get('/slip/:id', getPayrollById);
router.get('/slip/:id/download-pdf', downloadPaymentVoucher);

// Admin & HR management routes
router.get('/all', authorizeRoles('ADMIN', 'HR'), getPayrolls);
router.get('/stats', authorizeRoles('ADMIN', 'HR'), getPayrollStats);
router.post('/generate', authorizeRoles('ADMIN', 'HR'), generateMonthlyPayroll);
router.put('/slip/:id', authorizeRoles('ADMIN', 'HR'), updatePayrollSlip);
router.post('/submit-approval', authorizeRoles('HR', 'ADMIN'), submitForApproval);
router.post('/approve', authorizeRoles('ADMIN'), approvePayroll);
router.post('/record-payment/:id', authorizeRoles('ADMIN', 'HR'), recordPayment);
router.post('/bulk-record-payment', authorizeRoles('ADMIN', 'HR'), bulkRecordPayment);
router.delete('/slip/:id', authorizeRoles('ADMIN', 'HR'), deletePayroll);

module.exports = router;
