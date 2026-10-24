const LeaveRequest = require('../models/LeaveRequest');
const Attendance = require('../models/Attendance');

// @desc    Apply for a leave
// @route   POST /api/leaves/apply
// @access  Private (Employee, HR, ADMIN)
const applyLeave = async (req, res, next) => {
  try {
    const { leaveType, startDate, endDate, totalDays, reason } = req.body;

    if (!startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide start date, end date, and reason for leave.'
      });
    }

    const calculatedDays = totalDays || Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1);

    const leave = new LeaveRequest({
      user: req.user._id,
      leaveType: leaveType || 'CASUAL',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      totalDays: calculatedDays,
      reason,
      status: 'PENDING'
    });

    await leave.save();

    res.status(201).json({
      success: true,
      message: 'Leave application submitted successfully.',
      leave
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get my leave requests & balance summary
// @route   GET /api/leaves/my-leaves
// @access  Private (Employee, HR, ADMIN)
const getMyLeaves = async (req, res, next) => {
  try {
    const leaves = await LeaveRequest.find({ user: req.user._id }).sort({ createdAt: -1 });

    // Calculate taken vs remaining (Default annual quota: Casual 12, Sick 8, Paid 10)
    let usedCasual = 0, usedSick = 0, usedPaid = 0;
    leaves.forEach(l => {
      if (l.status === 'APPROVED') {
        if (l.leaveType === 'CASUAL') usedCasual += l.totalDays;
        if (l.leaveType === 'SICK') usedSick += l.totalDays;
        if (l.leaveType === 'PAID') usedPaid += l.totalDays;
      }
    });

    const balance = {
      casual: Math.max(0, 12 - usedCasual),
      sick: Math.max(0, 8 - usedSick),
      paid: Math.max(0, 10 - usedPaid)
    };

    res.status(200).json({
      success: true,
      count: leaves.length,
      leaves,
      balance
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all leave requests (HR / Admin)
// @route   GET /api/leaves/all
// @access  Private (HR, ADMIN)
const getAllLeaves = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = {};
    if (status) query.status = status;

    const leaves = await LeaveRequest.find(query)
      .populate('user', 'name email role title avatar')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: leaves.length,
      leaves
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve or Reject leave request
// @route   PUT /api/leaves/:id/status
// @access  Private (HR, ADMIN)
const updateLeaveStatus = async (req, res, next) => {
  try {
    const { status, reviewNote } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status must be APPROVED or REJECTED.'
      });
    }

    const leave = await LeaveRequest.findById(req.id || req.params.id);
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found.'
      });
    }

    leave.status = status;
    leave.reviewedBy = req.user._id;
    leave.reviewNote = reviewNote || '';
    leave.reviewedAt = new Date();
    await leave.save();

    // If APPROVED, mark attendance records for those dates as ON_LEAVE
    if (status === 'APPROVED') {
      try {
        let curr = new Date(leave.startDate);
        const end = new Date(leave.endDate);
        while (curr <= end) {
          const dateStr = curr.toISOString().split('T')[0];
          await Attendance.findOneAndUpdate(
            { user: leave.user, date: dateStr },
            {
              $set: {
                status: 'ON_LEAVE',
                firstLogin: curr,
                lastLogin: curr,
                totalHours: 0
              }
            },
            { upsert: true }
          );
          curr.setDate(curr.getDate() + 1);
        }
      } catch (attErr) {
        console.error('[Leave Approval Attendance Sync Error]:', attErr.message);
      }
    }

    res.status(200).json({
      success: true,
      message: `Leave request ${status.toLowerCase()} successfully.`,
      leave
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel pending leave request
// @route   DELETE /api/leaves/:id
// @access  Private
const cancelLeave = async (req, res, next) => {
  try {
    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    if (leave.user.toString() !== req.user._id.toString() && req.user.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this request.' });
    }

    if (leave.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Can only cancel pending leave requests.' });
    }

    await LeaveRequest.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Leave request cancelled successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyLeave,
  getMyLeaves,
  getAllLeaves,
  updateLeaveStatus,
  cancelLeave
};
