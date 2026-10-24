const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  createUser,
  updateUser,
  changeUserPassword,
  changeAdminPassword,
  deleteUser,
  rejectNonAdminPasswordChange,
  getClients,
  getClientById,
  createClient,
  getEmployees,
  getEmployeeById,
  createEmployee,
  getHRUsers,
  createHRUser,
  deleteHRUser
} = require('../controllers/userController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// All user routes require authentication
router.use(authenticateToken);

// Explicit rejection routes for unauthorized password changes
router.patch('/change-password', rejectNonAdminPasswordChange);
router.post('/change-password', rejectNonAdminPasswordChange);
router.patch('/profile/password', rejectNonAdminPasswordChange);

// Admin-specific password change
router.patch('/admin/password', authorizeRoles('ADMIN'), changeAdminPassword);

// User-specific password change (ADMIN ONLY)
router.patch('/:id/password', authorizeRoles('ADMIN'), changeUserPassword);

// Primary User Management endpoints (ADMIN ONLY)
router.get('/', authorizeRoles('ADMIN'), getAllUsers);
router.post('/', authorizeRoles('ADMIN'), createUser);
router.patch('/:id', authorizeRoles('ADMIN'), updateUser);
router.delete('/:id', authorizeRoles('ADMIN'), deleteUser);

// Legacy role-filtered endpoints for compatibility (ADMIN ONLY)
router.get('/clients', authorizeRoles('ADMIN'), getClients);
router.post('/clients', authorizeRoles('ADMIN'), createClient);
router.get('/clients/:id', authorizeRoles('ADMIN'), getClientById);

router.get('/Employees', authorizeRoles('ADMIN'), getEmployees);
router.post('/Employees', authorizeRoles('ADMIN'), createEmployee);
router.get('/Employees/:id', authorizeRoles('ADMIN'), getEmployeeById);

router.get('/hr', authorizeRoles('ADMIN'), getHRUsers);
router.post('/hr', authorizeRoles('ADMIN'), createHRUser);
router.delete('/hr/:id', authorizeRoles('ADMIN'), deleteHRUser);

module.exports = router;
