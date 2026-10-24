const express = require('express');
const router = express.Router();
const {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  updateLeaveStatus,
  cancelLeave
} = require('../controllers/leaveController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Employee / Employee routes
router.post('/apply', applyLeave);
router.get('/my-leaves', getMyLeaves);
router.delete('/:id', cancelLeave);

// HR & Admin routes
router.get('/all', authorizeRoles('HR', 'ADMIN'), getAllLeaves);
router.put('/:id/status', authorizeRoles('HR', 'ADMIN'), updateLeaveStatus);

module.exports = router;
