import GeminiService from '../services/GeminiService.js';
import StorageService from '../services/StorageService.js';
import TelemetryService from '../services/TelemetryService.js';

class GoalController {
  /**
   * POST /api/goals/refine
   * Refine a vague goal into a structured SMART goal
   */
  async refineGoal(req, res) {
    try {
      const { goal } = req.body;

      // Validate input
      if (!goal || typeof goal !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Goal input is required and must be a string',
        });
      }

      // Call Gemini service
      const refinedGoal = await GeminiService.refineGoal(goal);

      // Check confidence score for guardrails
      if (refinedGoal.confidence_score < 3) {
        return res.status(400).json({
          success: false,
          error: 'Input does not appear to be a valid goal. Please provide a clear goal statement.',
          data: refinedGoal,
        });
      }

      return res.status(200).json({
        success: true,
        data: refinedGoal,
      });
    } catch (error) {
      console.error('Error refining goal:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to refine goal',
      });
    }
  }

  /**
   * POST /api/goals
   * Save a refined goal
   */
  async saveGoal(req, res) {
    try {
      const { userInput, refined_goal, key_results, confidence_score } = req.body;

      // Validate input
      if (!userInput || !refined_goal || !key_results || !confidence_score) {
        return res.status(400).json({
          success: false,
          error: 'All fields are required: userInput, refined_goal, key_results, confidence_score',
        });
      }

      const savedGoal = await StorageService.saveGoal(userInput, {
        refined_goal,
        key_results,
        confidence_score,
      });

      return res.status(201).json({
        success: true,
        data: savedGoal,
      });
    } catch (error) {
      console.error('Error saving goal:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to save goal',
      });
    }
  }

  /**
   * GET /api/goals
   * Get all saved goals
   */
  async getAllGoals(req, res) {
    try {
      const goals = await StorageService.getAllGoals();
      return res.status(200).json({
        success: true,
        data: goals,
        count: goals.length,
      });
    } catch (error) {
      console.error('Error fetching goals:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch goals',
      });
    }
  }

  /**
   * GET /api/goals/:id
   * Get a specific goal
   */
  async getGoalById(req, res) {
    try {
      const { id } = req.params;
      const goal = await StorageService.getGoalById(id);

      if (!goal) {
        return res.status(404).json({
          success: false,
          error: `Goal with ID ${id} not found`,
        });
      }

      return res.status(200).json({
        success: true,
        data: goal,
      });
    } catch (error) {
      console.error('Error fetching goal:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch goal',
      });
    }
  }

  /**
   * DELETE /api/goals/:id
   * Delete a goal
   */
  async deleteGoal(req, res) {
    try {
      const { id } = req.params;
      await StorageService.deleteGoal(id);

      return res.status(200).json({
        success: true,
        message: `Goal ${id} deleted successfully`,
      });
    } catch (error) {
      console.error('Error deleting goal:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to delete goal',
      });
    }
  }

  /**
   * GET /api/telemetry
   * Get telemetry summary
   */
  async getTelemetrySummary(req, res) {
    try {
      const summary = await TelemetryService.getSummary();
      return res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error('Error fetching telemetry:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch telemetry',
      });
    }
  }

  /**
   * GET /api/telemetry/logs
   * Get all telemetry logs
   */
  async getAllTelemetryLogs(req, res) {
    try {
      const { date } = req.query; // Optional date filter in YYYY-MM-DD format
      const logs = await TelemetryService.getLogs(date);
      return res.status(200).json({
        success: true,
        data: logs,
        count: logs.length,
        dateFilter: date || 'all',
      });
    } catch (error) {
      console.error('Error fetching telemetry logs:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch telemetry logs',
      });
    }
  }
}

export default new GoalController();