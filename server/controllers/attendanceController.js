const Attendance = require('../models/Attendance');
const User = require('../models/User');

/**
 * Helper to compute precise active working minutes & formatted Hour : minutes
 */
const calculateRecordMetrics = (record, now = new Date()) => {
  const isPlain = record.toObject ? record.toObject() : { ...record };
  const todayStr = now.toISOString().split('T')[0];
  const isToday = isPlain.date === todayStr;

  let totalMinutes = 0;
  let hasActiveSession = false;

  // 1. Calculate duration from all sessions with session bridging for unclosed sessions
  if (Array.isArray(isPlain.sessions) && isPlain.sessions.length > 0) {
    for (let i = 0; i < isPlain.sessions.length; i++) {
      const s = isPlain.sessions[i];
      if (s.durationMinutes && s.durationMinutes > 0) {
        totalMinutes += s.durationMinutes;
      } else if (s.loginAt) {
        const start = new Date(s.loginAt).getTime();
        if (s.logoutAt) {
          const end = new Date(s.logoutAt).getTime();
          const diff = Math.max(0, Math.round((end - start) / 60000));
          totalMinutes += diff;
        } else {
          // If session has no logoutAt, check if followed by another login session
          const nextSession = isPlain.sessions[i + 1];
          if (nextSession && nextSession.loginAt) {
            const nextStart = new Date(nextSession.loginAt).getTime();
            const diff = Math.max(0, Math.round((nextStart - start) / 60000));
            totalMinutes += diff;
          } else {
            // Last session and currently open
            if (isToday) {
              hasActiveSession = true;
              const diff = Math.max(0, Math.round((now.getTime() - start) / 60000));
              totalMinutes += Math.min(diff, 16 * 60);
            } else if (isPlain.lastLogout) {
              const end = new Date(isPlain.lastLogout).getTime();
              const diff = Math.max(0, Math.round((end - start) / 60000));
              totalMinutes += Math.min(diff, 16 * 60);
            }
          }
        }
      }
    }
  }

  // 2. Validate against full time span from firstLogin to lastLogout
  // If user logged in at firstLogin and logged out at lastLogout, the actual span cannot be smaller
  if (isPlain.firstLogin) {
    const firstLoginTime = new Date(isPlain.firstLogin).getTime();
    let effectiveEndTime = null;

    if (isPlain.lastLogout) {
      effectiveEndTime = new Date(isPlain.lastLogout).getTime();
    } else if (isToday) {
      effectiveEndTime = now.getTime();
      hasActiveSession = true;
    }

    if (effectiveEndTime && effectiveEndTime > firstLoginTime) {
      const spanMinutes = Math.max(0, Math.round((effectiveEndTime - firstLoginTime) / 60000));
      // Cap at 16 hrs max
      if (spanMinutes > totalMinutes && spanMinutes <= 16 * 60) {
        totalMinutes = spanMinutes;
      }
    }
  }

  // 3. Fallback to stored totalMinutes or totalHours if available
  if (totalMinutes === 0 && isPlain.totalMinutes && isPlain.totalMinutes > 0) {
    totalMinutes = isPlain.totalMinutes;
  }
  if (totalMinutes === 0 && isPlain.totalHours && isPlain.totalHours > 0) {
    totalMinutes = Math.round(isPlain.totalHours * 60);
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const paddedHours = hours.toString().padStart(2, '0');
  const paddedMinutes = minutes.toString().padStart(2, '0');

  return {
    ...isPlain,
    totalMinutes,
    totalHours: parseFloat((totalMinutes / 60).toFixed(2)),
    hours,
    minutes,
    hasActiveSession,
    // "08:30" format (Hour : minutes)
    timeFormat: `${paddedHours}:${paddedMinutes}`,
    // "8h 30m" format
    shortFormat: `${hours}h ${minutes}m`,
    // "8 hrs 30 mins" format
    displayHours: `${hours} hrs ${paddedMinutes} mins`,
    // "08:30 hrs" format
    clockHours: `${paddedHours}:${paddedMinutes} hrs`
  };
};

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
    const now = new Date();

    let sumMinutes = 0;
    let presentDays = 0;

    const enrichedRecords = records.map((r) => {
      const enriched = calculateRecordMetrics(r, now);
      sumMinutes += enriched.totalMinutes;
      if (['PRESENT', 'HALF_DAY'].includes(enriched.status)) presentDays++;
      return enriched;
    });

    const sumHours = Math.floor(sumMinutes / 60);
    const sumMins = sumMinutes % 60;
    const sumPaddedHours = sumHours.toString().padStart(2, '0');
    const sumPaddedMinutes = sumMins.toString().padStart(2, '0');

    res.status(200).json({
      success: true,
      count: enrichedRecords.length,
      records: enrichedRecords,
      summary: {
        presentDays,
        totalMinutes: sumMinutes,
        totalHours: parseFloat((sumMinutes / 60).toFixed(2)),
        hours: sumHours,
        minutes: sumMins,
        timeFormat: `${sumPaddedHours}:${sumPaddedMinutes}`,
        shortFormat: `${sumHours}h ${sumMins}m`,
        displayHours: `${sumHours} hrs ${sumPaddedMinutes} mins`,
        clockHours: `${sumPaddedHours}:${sumPaddedMinutes} hrs`
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
      records = records.filter((r) => r.user && r.user.role === role);
    }

    const now = new Date();
    const enrichedRecords = records.map((r) => calculateRecordMetrics(r, now));

    res.status(200).json({
      success: true,
      count: enrichedRecords.length,
      records: enrichedRecords
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
    const presentCount = todayRecords.filter((r) => ['PRESENT', 'HALF_DAY'].includes(r.status)).length;
    const currentlyActive = todayRecords.filter((r) => {
      const lastSession = r.sessions && r.sessions[r.sessions.length - 1];
      return lastSession && !lastSession.logoutAt;
    }).length;

    const now = new Date();
    const enrichedRecords = todayRecords.map((r) => calculateRecordMetrics(r, now));

    res.status(200).json({
      success: true,
      date: todayStr,
      totalEmployees,
      presentCount,
      currentlyActive,
      records: enrichedRecords
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
