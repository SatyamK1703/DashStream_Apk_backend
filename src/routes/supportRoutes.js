import express from 'express';
import * as supportController from '../controllers/supportController.js';
import { protect, admin } from '../middleware/auth.js';

const router = express.Router();

router.post('/questions', protect, supportController.createQuestion);
router.get('/questions', protect, admin, supportController.getQuestions);
router.post('/questions/:id/reply', protect, admin, supportController.replyToQuestion);

export default router;
