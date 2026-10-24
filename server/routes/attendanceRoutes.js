const express = require('express');
const router = express.Router();
const {
  getMyAttendance,
  getAllAttendance,
  getTodaySummary
} = require('../controllers/attendanceController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Employee / Employee route
router.get('/my-attendance', getMyAttendance);

// HR & Admin routes
router.get('/all', authorizeRoles('HR', 'ADMIN'), getAllAttendance);
router.get('/today-summary', authorizeRoles('HR', 'ADMIN'), getTodaySummary);

module.exports = router;
