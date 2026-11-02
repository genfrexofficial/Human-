const Notification = require('../models/Notification');

/**
 * Dispatch an in-app notification
 * @param {Object} params - Notification parameters
 * @param {string} params.userId - Recipient user ID
 * @param {string} [params.projectId] - Associated project ID
 * @param {string} [params.title] - Notification title
 * @param {string} params.message - Notification message
 * @param {string} [params.type='GENERAL'] - Notification type
 * @param {string} [params.link] - Deep link for the notification
 * @param {boolean} [params.critical=false] - If true, throw error on failure instead of swallowing
 * @returns {Promise<Object|null>} Created notification or null if failed (non-critical)
 */
const sendNotification = async ({ userId, projectId, title = '', message, type = 'GENERAL', link = '', critical = false }) => {
  try {
    if (!userId || !message) return null;
    const notification = await Notification.create({
      user: userId,
      project: projectId,
      title,
      message,
      type,
      link
    });
    return notification;
  } catch (error) {
    console.error(`[Notification Service Error] Failed to create notification for user ${userId}: ${error.message}`, {
      userId,
      projectId,
      title,
      type,
      critical
    });
    if (critical) {
      throw error;
    }
    return null;
  }
};

module.exports = {
  sendNotification
};
