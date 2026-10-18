import User from '../models/User.js';
import { quizQuestions } from '../data/quizQuestions.js';

// GET /api/quiz/questions
// Public endpoint. Returns question text and option ids/texts without revealing preference mappings.
export const getQuestions = (req, res) => {
  try {
    const questions = quizQuestions.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options.map(opt => ({
        id: opt.id,
        text: opt.text
      }))
    }));

    return res.status(200).json({
      success: true,
      totalQuestions: questions.length,
      questions
    });
  } catch (error) {
    console.error('Get quiz questions error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve quiz questions',
      code: 'QUIZ_QUESTIONS_ERROR'
    });
  }
};

// POST /api/quiz/submit
// Protected endpoint. Validates 10 answers, calculates scores, determines primary preference,
// breaks ties deterministically, and saves result on user profile.
export const submitQuiz = async (req, res) => {
  try {
    const { answers } = req.body;

    // Validate answers array structure
    if (!answers || !Array.isArray(answers) || answers.length !== 10) {
      return res.status(400).json({
        success: false,
        message: 'Exactly 10 answers are required',
        code: 'INVALID_ANSWERS_COUNT'
      });
    }

    const questionMap = new Map(quizQuestions.map(q => [q.id, q]));
    const seenQuestionIds = new Set();
    const scores = {
      visual: 0,
      auditory: 0,
      readingWriting: 0,
      handsOn: 0
    };

    for (const item of answers) {
      if (!item || typeof item !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Each answer must be a valid object with questionId and optionId',
          code: 'INVALID_ANSWER_FORMAT'
        });
      }

      const { questionId, optionId } = item;

      if (questionId === undefined || optionId === undefined) {
        return res.status(400).json({
          success: false,
          message: 'Each answer must contain questionId and optionId',
          code: 'MISSING_ANSWER_FIELDS'
        });
      }

      if (seenQuestionIds.has(questionId)) {
        return res.status(400).json({
          success: false,
          message: `Duplicate answer for question ${questionId}`,
          code: 'DUPLICATE_QUESTION_ANSWER'
        });
      }
      seenQuestionIds.add(questionId);

      const question = questionMap.get(questionId);
      if (!question) {
        return res.status(400).json({
          success: false,
          message: `Unknown questionId: ${questionId}`,
          code: 'UNKNOWN_QUESTION_ID'
        });
      }

      const selectedOption = question.options.find(opt => opt.id === optionId);
      if (!selectedOption) {
        return res.status(400).json({
          success: false,
          message: `Unknown optionId '${optionId}' for question ${questionId}`,
          code: 'UNKNOWN_OPTION_ID'
        });
      }

      scores[selectedOption.preference]++;
    }

    // Determine ranking and tie-break deterministically (higher score first, then alphabetical)
    const sorted = Object.keys(scores).sort((a, b) => {
      if (scores[b] !== scores[a]) {
        return scores[b] - scores[a];
      }
      return a.localeCompare(b);
    });

    const isTied = scores[sorted[0]] === scores[sorted[1]];
    const result = {
      primary: sorted[0],
      secondary: isTied ? sorted[1] : (scores[sorted[1]] > 0 ? sorted[1] : null),
      isTied,
      scores,
      takenAt: new Date()
    };

    // Save to user profile
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    user.ideotype = result;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Quiz submitted successfully',
      result,
      ideotype: result
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit quiz',
      code: 'QUIZ_SUBMIT_ERROR'
    });
  }
};

// GET /api/quiz/result
// Protected endpoint. Returns user's saved quiz result, or 404 if not yet taken.
export const getQuizResult = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    if (!user.ideotype || !user.ideotype.primary) {
      return res.status(404).json({
        success: false,
        message: 'No quiz result found. Please complete the quiz first.',
        code: 'QUIZ_NOT_TAKEN'
      });
    }

    return res.status(200).json({
      success: true,
      result: user.ideotype,
      ideotype: user.ideotype
    });
  } catch (error) {
    console.error('Get quiz result error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch quiz result',
      code: 'QUIZ_RESULT_ERROR'
    });
  }
};
