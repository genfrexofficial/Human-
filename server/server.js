const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorMiddleware');

// Initialize database
connectDB();

const app = express();

// Enable CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('http://localhost:')) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for hackathon demos
    },
    credentials: true
  })
);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const { authenticateToken } = require('./middleware/authMiddleware');
const File = require('./models/File');
const Task = require('./models/Task');

// Secure static file serving for uploads (enforcing Auth & RBAC)
app.use('/uploads', authenticateToken, async (req, res, next) => {
  try {
    const filename = path.basename(req.path);
    const file = await File.findOne({ fileUrl: `/uploads/${filename}` }).populate('project task');

    if (file) {
      if (req.user.role === 'CLIENT') {
        if (file.project && file.project.client.toString() !== req.user._id.toString()) {
          return res.status(403).json({ success: false, message: 'Access denied to this file.' });
        }
        if (file.task && file.task.clientVisible === false) {
          return res.status(403).json({ success: false, message: 'Access denied. Internal file.' });
        }
      } else if (req.user.role === 'WORKER') {
        const isAssigned = file.project?.assignedWorkers?.some(
          (w) => w.toString() === req.user._id.toString()
        );
        const hasTask = await Task.exists({ project: file.project?._id, assignedTo: req.user._id });
        if (!isAssigned && !hasTask) {
          return res.status(403).json({ success: false, message: 'Access denied to this file.' });
        }
      }
    } else if (req.user.role !== 'ADMIN' && req.user.role !== 'HR') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    express.static(path.join(__dirname, 'uploads'))(req, res, next);
  } catch (err) {
    next(err);
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'GENFREX Unified Platform API'
  });
});

// Mount API routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/tasks', require('./routes/taskRoutes'));
app.use('/api/task-requests', require('./routes/taskRequestRoutes'));
app.use('/api/milestones', require('./routes/milestoneRoutes'));
app.use('/api/files', require('./routes/fileRoutes'));
app.use('/api/comments', require('./routes/commentRoutes'));
app.use('/api/activities', require('./routes/activityRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));
app.use('/api/hr', require('./routes/hrRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/leaves', require('./routes/leaveRoutes'));
app.use('/api/invoices', require('./routes/invoiceRoutes'));
app.use('/api/salary-structures', require('./routes/salaryStructureRoutes'));
app.use('/api/payrolls', require('./routes/payrollRoutes'));

// 404 handler for undefined API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Endpoint ${req.originalUrl} not found on ClientFlow server.`
  });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 ClientFlow API running on port ${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📁 Local file uploads available at /uploads`);
  console.log(`✨ GENFREX OfferFlow Integration Active`);
  console.log(`=========================================`);
});

module.exports = app;
