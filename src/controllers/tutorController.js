import User from '../models/User.js';
import { buildTutorReply } from '../services/tutorService.js';

const MAX_MESSAGE_LENGTH = 1000;
const MAX_LABEL_LENGTH = 100;

// POST /api/tutor/chat
// Protected endpoint. Replies with study-coach tips matched to the learner's saved
// quiz preference. The reply is rule-based (no AI service, no cost). See
// src/services/tutorService.js.
export const chat = async (req, res) => {
  try {
    const { message, subject, topic } = req.body || {};

    if (typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'A non-empty message is required',
        code: 'INVALID_MESSAGE'
      });
    }

    if (message.trim().length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({
        success: false,
        message: `Message must be ${MAX_MESSAGE_LENGTH} characters or fewer`,
        code: 'MESSAGE_TOO_LONG'
      });
    }

    for (const [name, value] of [['subject', subject], ['topic', topic]]) {
      if (value === undefined || value === null) continue;
      if (typeof value !== 'string' || value.trim().length > MAX_LABEL_LENGTH) {
        return res.status(400).json({
          success: false,
          message: `${name} must be text of ${MAX_LABEL_LENGTH} characters or fewer`,
          code: 'INVALID_FIELD'
        });
      }
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    const reply = buildTutorReply({
      message,
      subject,
      topic,
      ideotype: user.ideotype
    });

    return res.status(200).json({
      success: true,
      response: {
        ...reply,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Tutor chat error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate a tutor reply',
      code: 'TUTOR_CHAT_ERROR'
    });
  }
};
