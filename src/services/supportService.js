import Question from '../models/questionModel.js';
import User from '../models/userModel.js';
import { sendBulkNotifications, sendPushNotification } from './notificationService.js';

export const createQuestion = async (userId, issueType, message) => {
  const question = new Question({
    user: userId,
    issueType,
    message,
  });
  await question.save();

  // Notify admins
  const admins = await User.find({ role: 'admin' });
  const adminIds = admins.map(admin => admin._id);

  if (adminIds.length > 0) {
    const notificationData = {
      title: 'New Support Ticket',
      message: `A new support ticket has been submitted regarding "${issueType}".`,
      type: 'system',
      actionType: 'open_support_ticket',
      actionParams: { questionId: question._id.toString() },
    };
    await sendBulkNotifications(notificationData, adminIds);
  }

  return question;
};

export const getQuestions = async () => {
  return await Question.find().populate('user', 'name email').sort({ createdAt: -1 });
};

export const replyToQuestion = async (questionId, userId, message) => {
  const question = await Question.findById(questionId);
  if (!question) {
    throw new Error('Question not found');
  }

  question.replies.push({ user: userId, message });
  question.isRead = true;
  await question.save();

  // Notify customer
  const customerId = question.user;
  const notificationData = {
    title: 'Reply to your support ticket',
    message: 'An admin has replied to your support ticket.',
    type: 'system',
    actionType: 'open_support_ticket',
    actionParams: { questionId: question._id.toString() },
  };
  await sendPushNotification(notificationData, customerId);

  return question;
};
