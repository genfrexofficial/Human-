const express = require('express');
const router = express.Router();
const {
  getProjectTasks,
  getMyTasks,
  getTaskById,
  createTask,
  updateTask,
  startTask,
  updateTaskProgress,
  submitTaskForReview,
  completeTask,
  blockTask,
  deleteTask
} = require('../controllers/taskController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Employee: Get my tasks
router.get('/my-tasks', authorizeRoles('Employee', 'ADMIN'), getMyTasks);

// Get tasks for a project
router.get('/project/:projectId', getProjectTasks);
router.get('/project', (req, res) => res.status(200).json({ success: true, count: 0, tasks: [] }));

// Single task details
router.get('/:id', getTaskById);

// Admin task creation
router.post('/', authorizeRoles('ADMIN'), createTask);

// Update task (Admin or Employee with transition validation)
router.put('/:id', authorizeRoles('ADMIN', 'Employee'), updateTask);

// Dedicated action endpoints
router.post('/:id/start', authorizeRoles('Employee', 'ADMIN'), startTask);
router.post('/:id/progress', authorizeRoles('Employee', 'ADMIN'), updateTaskProgress);
router.post('/:id/submit-review', authorizeRoles('Employee', 'ADMIN'), submitTaskForReview);
router.post('/:id/block', authorizeRoles('Employee', 'ADMIN'), blockTask);
router.post('/:id/complete', authorizeRoles('ADMIN'), completeTask);

// Delete task (Admin only)
router.delete('/:id', authorizeRoles('ADMIN'), deleteTask);

module.exports = router;
