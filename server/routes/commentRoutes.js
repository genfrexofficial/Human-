const express = require('express');
const router = express.Router();
const {
  getProjectComments,
  createComment,
  deleteComment
} = require('../controllers/commentController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

router.get('/project/:projectId', getProjectComments);
router.get('/project', (req, res) => res.status(200).json({ success: true, count: 0, comments: [] }));
router.post('/', createComment);
router.delete('/:id', deleteComment);

module.exports = router;
