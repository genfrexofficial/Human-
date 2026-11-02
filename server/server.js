const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorMiddleware');

// Initialize database
connectDB();

const app = express();

// Trust proxy for correct IP detection behind reverse proxies (nginx, Vercel, Render, etc.)
app.set('trust proxy', true);

// Enable CORS
const configuredClientUrls = (process.env.CLIENT_URL || '')
  .split(',')
  .map((url) => url.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5000',
  'https://hrms.genfrex.com',
  'http://hrms.genfrex.com',
  'https://genfrex.com',
  'https://www.genfrex.com'
];

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...configuredClientUrls])];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman, server-to-server)
    if (!origin) return callback(null, true);

    const cleanOrigin = origin.replace(/\/+$/, '');

    // 1. Check exact allowed list
    if (allowedOrigins.includes(cleanOrigin)) {
      return callback(null, true);
    }

    // 2. Allow any subdomain of genfrex.com
    try {
      const parsed = new URL(cleanOrigin);
      if (parsed.hostname === 'genfrex.com' || parsed.hostname.endsWith('.genfrex.com')) {
        return callback(null, true);
      }
    } catch (e) {
      // Ignore URL parse error
    }

    // 3. Development: allow localhost on known ports
    if (process.env.NODE_ENV !== 'production' && /^https?:\/\/localhost(:\d+)?$/.test(cleanOrigin)) {
      return callback(null, true);
    }

    // Reject unknown origins cleanly without throwing 500 error
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const { authenticateToken } = require('./middleware/authMiddleware');

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ClientFlow / GENFREX Backend API is running successfully!',
    healthCheck: '/api/health'
  });
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
