const express = require('express');
const router = express.Router();
const {
  getAllSalaryStructures,
  getSalaryStructureByUser,
  upsertSalaryStructure,
  getMySalaryStructure
} = require('../controllers/salaryStructureController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Employee views their own salary structure & bank details
router.get('/my-structure', getMySalaryStructure);

// Admin & HR management
router.get('/all', authorizeRoles('ADMIN', 'HR'), getAllSalaryStructures);
router.get('/user/:userId', authorizeRoles('ADMIN', 'HR'), getSalaryStructureByUser);
router.put('/user/:userId', authorizeRoles('ADMIN', 'HR'), upsertSalaryStructure);

module.exports = router;
