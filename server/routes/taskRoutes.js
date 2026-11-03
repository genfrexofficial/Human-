const express = require('express');
const router = express.Router();
const {
  getProjectTasks,
  getMyTasks,
  getPersonalTasks,
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

// Personal company tasks (Admin, HR, Employee)
router.get('/personal', authorizeRoles('ADMIN', 'HR', 'Employee'), getPersonalTasks);

// Employee: Get my tasks
router.get('/my-tasks', authorizeRoles('Employee', 'ADMIN', 'HR'), getMyTasks);

// Get tasks for a project
router.get('/project/:projectId', getProjectTasks);
router.get('/project', (req, res) => res.status(200).json({ success: true, count: 0, tasks: [] }));

// Single task details
router.get('/:id', getTaskById);

// Admin task creation (Only Admin can create & assign tasks)
router.post('/', authorizeRoles('ADMIN'), createTask);

// Update task (Admin or assigned Employee/HR with transition validation)
router.put('/:id', authorizeRoles('ADMIN', 'HR', 'Employee'), updateTask);

// Dedicated action endpoints
router.post('/:id/start', authorizeRoles('Employee', 'ADMIN', 'HR'), startTask);
router.post('/:id/progress', authorizeRoles('Employee', 'ADMIN', 'HR'), updateTaskProgress);
router.post('/:id/submit-review', authorizeRoles('Employee', 'ADMIN', 'HR'), submitTaskForReview);
router.post('/:id/block', authorizeRoles('Employee', 'ADMIN', 'HR'), blockTask);
router.post('/:id/complete', authorizeRoles('ADMIN', 'HR', 'Employee'), completeTask);

// Delete task (Only Admin)
router.delete('/:id', authorizeRoles('ADMIN'), deleteTask);

module.exports = router;
