const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'clientflow_jwt_secret_super_secure_key_2026_hackathon';
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      email: user.email,
      tokenVersion: user.tokenVersion || 0
    },
    secret,
    { expiresIn: '7d' }
  );
};

// @desc    Check whether the platform requires initial Administrator setup
// @route   GET /api/auth/setup-status
// @access  Public
const getSetupStatus = async (req, res, next) => {
  try {
    const adminCount = await User.countDocuments({ role: 'ADMIN' });
    res.status(200).json({
      success: true,
      needsSetup: adminCount === 0,
      adminCount
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Perform First-Time Secure Administrator Setup
// @route   POST /api/auth/setup-admin
// @access  Public (Only when adminCount === 0)
const setupFirstAdmin = async (req, res, next) => {
  try {
    const adminCount = await User.countDocuments({ role: 'ADMIN' });
    if (adminCount > 0) {
      return res.status(403).json({
        success: false,
        message: 'Administrator setup has already been completed. Public Admin registration is disabled.'
      });
    }

    const { name, email, password, companyName, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide administrator name, official email, and password.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists.'
      });
    }

    // Create the primary system Administrator (password hashed via User model pre-save hook)
    const adminUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      companyName: companyName ? companyName.trim() : 'GENFREX',
      phone: phone ? phone.trim() : '',
      role: 'ADMIN',
      title: 'Platform Administrator'
    });

    const token = generateToken(adminUser);

    res.status(201).json({
      success: true,
      message: 'Primary Administrator account created successfully.',
      token,
      user: {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        companyName: adminUser.companyName,
        avatar: adminUser.avatar
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Register a new user (Strictly Disabled: Only ADMIN can create users)
// @route   POST /api/auth/register
// @access  Public (Disabled)
const register = async (req, res, next) => {
  return res.status(403).json({
    success: false,
    message: 'Public registration is disabled. All team and client accounts must be created by the Administrator.'
  });
};

// @desc    Login user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    // Check account status
    if (user.status === 'INACTIVE' || user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact the Administrator.'
      });
    }

    // Automated Attendance Tracking on Login (For Employees/Employees/HR/Admin)
    if (['Employee', 'HR', 'ADMIN'].includes(user.role)) {
      try {
        const Attendance = require('../models/Attendance');
        const todayStr = new Date().toISOString().split('T')[0];
        const now = new Date();
        let att = await Attendance.findOne({ user: user._id, date: todayStr });
        if (!att) {
          att = new Attendance({
            user: user._id,
            date: todayStr,
            firstLogin: now,
            lastLogin: now,
            sessions: [{ loginAt: now }],
            status: 'PRESENT',
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers['user-agent']
          });
          await att.save();
        } else {
          att.lastLogin = now;
          att.sessions.push({ loginAt: now });
          if (att.status === 'ABSENT') att.status = 'PRESENT';
          await att.save();
        }
      } catch (attErr) {
        console.error('[Attendance Auto-Login Log Error]:', attErr.message);
      }
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyName: user.companyName,
        phone: user.phone,
        avatar: user.avatar
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Logout user & record attendance session end
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  try {
    if (req.user && req.user._id) {
      try {
        const Attendance = require('../models/Attendance');
        const todayStr = new Date().toISOString().split('T')[0];
        const now = new Date();
        const att = await Attendance.findOne({ user: req.user._id, date: todayStr });
        if (att) {
          att.lastLogout = now;
          if (att.sessions && att.sessions.length > 0) {
            const lastSession = att.sessions[att.sessions.length - 1];
            if (!lastSession.logoutAt) {
              lastSession.logoutAt = now;
              const durationMins = Math.max(1, Math.round((now - new Date(lastSession.loginAt)) / 60000));
              lastSession.durationMinutes = durationMins;
            }
          }
          let totalMins = 0;
          for (const s of att.sessions) {
            totalMins += (s.durationMinutes || 0);
          }
          att.totalMinutes = totalMins;
          att.totalHours = parseFloat((totalMins / 60).toFixed(2));
          await att.save();
        }
      } catch (attErr) {
        console.error('[Attendance Logout Tracking Error]:', attErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Disallowed Forgot Password (Only Admin can manage passwords)
// @route   POST /api/auth/forgot-password, POST /api/auth/reset-password
// @access  Public (Forbidden)
const forgotPassword = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Self-serve password reset is disabled. Please contact the Platform Administrator to reset your password.'
  });
};

module.exports = {
  getSetupStatus,
  setupFirstAdmin,
  register,
  login,
  logout,
  getMe,
  forgotPassword
};
