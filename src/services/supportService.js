import Question from '../models/questionModel.js';

export const createQuestion = async (userId, issueType, message) => {
  const question = new Question({
    user: userId,
    issueType,
    message,
  });
  await question.save();
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
  return question;
};
