import * as supportService from '../services/supportService.js';

export const createQuestion = async (req, res) => {
  const { issueType, message } = req.body;
  const userId = req.user.id;

  try {
    const question = await supportService.createQuestion(userId, issueType, message);
    res.status(201).json({ success: true, data: question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getQuestions = async (req, res) => {
  try {
    const questions = await supportService.getQuestions();
    res.status(200).json({ success: true, data: questions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const replyToQuestion = async (req, res) => {
  const { message } = req.body;
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const question = await supportService.replyToQuestion(id, userId, message);
    res.status(200).json({ success: true, data: question });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
