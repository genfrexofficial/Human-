const Attendance = require('../models/Attendance');
const User = require('../models/User');

// @desc    Get current logged-in user's attendance records
// @route   GET /api/attendance/my-attendance
// @access  Private (Employee, HR, ADMIN)
const getMyAttendance = async (req, res, next) => {
  try {
    const { month, year } = req.query;
    let query = { user: req.user._id };

    if (month && year) {
      const monthPadded = month.toString().padStart(2, '0');
      query.date = { $regex: `^${year}-${monthPadded}` };
    }

    const records = await Attendance.find(query).sort({ date: -1 }).limit(31);

    // Calculate monthly summary
    let totalHours = 0;
    let presentDays = 0;
    records.forEach(r => {
      totalHours += (r.totalHours || 0);
      if (['PRESENT', 'HALF_DAY'].includes(r.status)) presentDays++;
    });

    res.status(200).json({
      success: true,
      count: records.length,
      records,
      summary: {
        presentDays,
        totalHours: parseFloat(totalHours.toFixed(2))
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all attendance records (HR / Admin)
// @route   GET /api/attendance/all
// @access  Private (HR, ADMIN)
const getAllAttendance = async (req, res, next) => {
  try {
    const { date, user, role, startDate, endDate } = req.query;
    let query = {};

    if (date) {
      query.date = date;
    } else if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    }

    if (user) {
      query.user = user;
    }

    let records = await Attendance.find(query)
      .populate('user', 'name email role title avatar')
      .sort({ date: -1, firstLogin: -1 });

    if (role) {
      records = records.filter(r => r.user && r.user.role === role);
    }

    res.status(200).json({
      success: true,
      count: records.length,
      records
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get today's real-time attendance stats
// @route   GET /api/attendance/today-summary
// @access  Private (HR, ADMIN)
const getTodaySummary = async (req, res, next) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayRecords = await Attendance.find({ date: todayStr }).populate('user', 'name email role avatar');

    const totalEmployees = await User.countDocuments({ role: { $in: ['Employee', 'HR'] }, isActive: true });
    const presentCount = todayRecords.filter(r => ['PRESENT', 'HALF_DAY'].includes(r.status)).length;
    const currentlyActive = todayRecords.filter(r => {
      const lastSession = r.sessions && r.sessions[r.sessions.length - 1];
      return lastSession && !lastSession.logoutAt;
    }).length;

    res.status(200).json({
      success: true,
      date: todayStr,
      totalEmployees,
      presentCount,
      currentlyActive,
      records: todayRecords
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyAttendance,
  getAllAttendance,
  getTodaySummary
};
