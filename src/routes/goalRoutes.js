import express from 'express';
import GoalController from '../controllers/GoalController.js';

const router = express.Router();

/**
 * POST /api/goals/refine
 * Refine a vague goal into structured SMART goal
 */
router.post('/refine', (req, res) => GoalController.refineGoal(req, res));

/**
 * POST /api/goals
 * Save a refined goal
 */
router.post('/', (req, res) => GoalController.saveGoal(req, res));

/**
 * GET /api/goals
 * Get all goals
 */
router.get('/', (req, res) => GoalController.getAllGoals(req, res));

/**
 * GET /api/goals/:id
 * Get specific goal
 */
router.get('/:id', (req, res) => GoalController.getGoalById(req, res));

/**
 * DELETE /api/goals/:id
 * Delete goal
 */
router.delete('/:id', (req, res) => GoalController.deleteGoal(req, res));

export default router;
