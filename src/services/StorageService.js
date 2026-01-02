import { createClient } from '@supabase/supabase-js';

/**
 * Supabase-based storage for goals
 * Stores and retrieves goals from Supabase database
 */
class StorageService {
  constructor() {
    this.supabase = null;
    this.tableName = 'goals';
    this.initialized = false;
  }

  initialize() {
    if (this.initialized) return;

    const supabaseUrl = 'https://xmssmnivkkqgbijsjzku.supabase.co';
    const supabaseKey = process.env.SUPABASE_API_KEY;

    if (!supabaseKey) {
      throw new Error(
        'SUPABASE_API_KEY environment variable is not set. Please add it to your .env file.'
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.initialized = true;
  }

  /**
   * Save a refined goal
   * @param {string} originalInput - The original user input
   * @param {object} refinedGoalData - Object containing: refined_goal, key_results, confidence_score
   */
  async saveGoal(originalInput, refinedGoalData) {
    this.initialize();

    const goal = {
      original_input: originalInput,
      refined_goal: refinedGoalData.refined_goal,
      key_results: refinedGoalData.key_results, // Expected to be array of 3-5 items
      confidence_score: refinedGoalData.confidence_score, // Expected to be 1-10
    };

    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert([goal])
      .select();

    if (error) {
      console.error('Error saving goal:', error);
      throw new Error(`Failed to save goal: ${error.message}`);
    }

    return data ? data[0] : goal;
  }

  /**
   * Get all goals
   */
  async getAllGoals() {
    this.initialize();

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching goals:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to fetch goals: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get goal by ID
   */
  async getGoalById(id) {
    this.initialize();

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Goal not found
        return null;
      }
      console.error('Error fetching goal:', error);
      throw new Error(`Failed to fetch goal: ${error.message}`);
    }

    return data;
  }

  /**
   * Update goal
   */
  async updateGoal(id, updates) {
    const updateData = {};

    // Only include fields that exist in the schema
    if (updates.refined_goal !== undefined) {
      updateData.refined_goal = updates.refined_goal;
    }
    if (updates.key_results !== undefined) {
      updateData.key_results = updates.key_results;
    }
    if (updates.confidence_score !== undefined) {
      updateData.confidence_score = updates.confidence_score;
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating goal:', error);
      throw new Error(`Failed to update goal: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error(`Goal with ID ${id} not found`);
    }

    return data[0];
  }

  /**
   * Delete goal
   */
  async deleteGoal(id) {
    this.initialize();

    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting goal:', error);
      throw new Error(`Failed to delete goal: ${error.message}`);
    }
  }
}

export default new StorageService();
