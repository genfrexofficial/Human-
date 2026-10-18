const express = require('express');
const router = express.Router();
const {
  getInvoices,
  getInvoiceById,
  createInvoice,
  recordPayment,
  deleteInvoice,
  generateInvoicePDF,
  getFinanceStats
} = require('../controllers/invoiceController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Stats overview (Admin)
router.get('/stats/overview', authorizeRoles('ADMIN'), getFinanceStats);

// Invoices CRUD & Access (Strictly ADMIN and CLIENT only)
router.route('/')
  .get(authorizeRoles('ADMIN', 'CLIENT'), getInvoices)
  .post(authorizeRoles('ADMIN'), createInvoice);

router.route('/:id')
  .get(authorizeRoles('ADMIN', 'CLIENT'), getInvoiceById)
  .delete(authorizeRoles('ADMIN'), deleteInvoice);

// Download PDF (ADMIN and CLIENT only)
router.get('/:id/pdf', authorizeRoles('ADMIN', 'CLIENT'), generateInvoicePDF);

// Record payment (Offline bank transfer / UPI - ADMIN and CLIENT only)
router.post('/:id/record-payment', authorizeRoles('ADMIN', 'CLIENT'), recordPayment);

module.exports = router;
