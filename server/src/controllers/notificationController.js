import { Notification } from '../models/Notification.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';

export const getMyNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });

    return successResponse(res, 200, 'Notifications retrieved.', notifications, { unreadCount });
  } catch (error) {
    next(error);
  }
};

export const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notification) {
      return errorResponse(res, 404, 'Notification not found.');
    }

    notification.read = true;
    await notification.save();

    return successResponse(res, 200, 'Notification marked as read.', notification);
  } catch (error) {
    next(error);
  }
};

export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    return successResponse(res, 200, 'All notifications marked as read.');
  } catch (error) {
    next(error);
  }
};
