import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xmssmnivkkqgbijsjzku.supabase.co';
const supabaseKey = process.env.SUPABASE_API_KEY;

class TelemetryService {
  constructor() {
    this.supabase = null;
    this.tableName = 'ai_call_logs';
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
   * Log AI API call with full telemetry
   * @param {Object} telemetryData - Telemetry data object
   */
  async logAICall(telemetryData) {
    this.initialize();

    const {
      userInput,
      aiOutput,
      latencyMs,
      promptTokens,
      completionTokens,
      model,
      timestamp = new Date().toISOString(),
      success = true,
      errorMessage = null,
    } = telemetryData;

    const totalTokens = (promptTokens || 0) + (completionTokens || 0);
    
    // Estimate cost (Gemini 1.5 Flash pricing: ~$0.075/M input, ~$0.3/M output)
    const inputCost = (promptTokens || 0) / 1000000 * 0.075;
    const outputCost = (completionTokens || 0) / 1000000 * 0.3;
    const totalCost = inputCost + outputCost;

    const logEntry = {
      timestamp,
      model,
      success,
      latency_ms: latencyMs,
      prompt_tokens: promptTokens || 0,
      completion_tokens: completionTokens || 0,
      total_tokens: totalTokens,
      input_cost: inputCost,
      completion_cost: outputCost,
      total_cost: totalCost,
      input: userInput,
      output: aiOutput,
      error_message: errorMessage,
    };

    try {
      const { data, error } = await this.supabase
        .from('ai_call_logs')
        .insert([logEntry])
        .select();

      if (error) {
        console.error('Error inserting telemetry data:', error);
        throw error;
      }

      this.logToConsole(logEntry);
      return data[0];
    } catch (error) {
      console.error('Failed to log AI call to Supabase:', error);
      throw error;
    }
  }

  logToConsole(telemetryData) {
    const {
      timestamp,
      model,
      success,
      latency_ms,
      latencyMs,
      total_tokens,
      total_cost,
      error_message,
      errorMessage,
    } = telemetryData;

    const latency = latency_ms || latencyMs;
    const tokens = total_tokens || 0;
    const cost = total_cost || 0;
    const error = error_message || errorMessage;

    const status = success ? '✓' : '✗';
    const errorStr = error ? ` | Error: ${error}` : '';

    console.log(
      `[${timestamp || new Date().toISOString()}] ${status} ${model || 'unknown'} | Latency: ${latency}ms | ` +
      `Tokens: ${tokens} | ` +
      `Cost: $${typeof cost === 'number' ? cost.toFixed(6) : cost}${errorStr}`
    );
  }

  /**
   * Get all logs or logs for a specific date
   * @param {string} date - Optional date in YYYY-MM-DD format
   */
  async getLogs(date = null) {
    this.initialize();

    try {
      console.log('[DEBUG] Fetching logs from Supabase...');
      console.log('[DEBUG] Supabase client initialized:', !!this.supabase);
      
      // First test: try to get table info
      console.log('[DEBUG] Testing table access...');
      const { data: tableTest, error: tableError } = await this.supabase
        .from('ai_call_logs')
        .select('count', { count: 'exact', head: true });
      
      console.log('[DEBUG] Table test result:', { 
        count: tableTest, 
        error: tableError?.message || null 
      });

      let query = this.supabase
        .from('ai_call_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      console.log('[DEBUG] Base query built');

      if (date) {
        const startDate = `${date}T00:00:00.000Z`;
        const endDate = `${date}T23:59:59.999Z`;
        query = query.gte('timestamp', startDate).lte('timestamp', endDate);
        console.log('[DEBUG] Date filter applied:', { startDate, endDate });
      }

      console.log('[DEBUG] Executing query...');
      const { data, error } = await query;
      
      console.log('[DEBUG] Query result:', { 
        dataLength: data?.length || 0, 
        error: error?.message || null,
        errorDetails: error || null,
        data: data?.slice(0, 2) || [] // Show first 2 results
      });

      if (error) {
        console.error('Error fetching logs:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Failed to get logs from Supabase:', error);
      return [];
    }
  }

  /**
   * Get telemetry summary
   */
  async getSummary() {
    this.initialize();

    try {
      const logs = await this.getLogs();
      
      if (logs.length === 0) {
        return {
          totalCalls: 0,
          successfulCalls: 0,
          failedCalls: 0,
          averageLatencyMs: 0,
          totalTokens: 0,
          totalCost: 0,
        };
      }

      const totalTokens = logs.reduce((sum, log) => sum + log.total_tokens, 0);
      const totalCost = logs.reduce((sum, log) => sum + parseFloat(log.total_cost), 0);
      const averageLatency = logs.reduce((sum, log) => sum + log.latency_ms, 0) / logs.length;
      const successCount = logs.filter(log => log.success).length;

      return {
        totalCalls: logs.length,
        successfulCalls: successCount,
        failedCalls: logs.length - successCount,
        averageLatencyMs: Math.round(averageLatency),
        totalTokens,
        totalCost: totalCost.toFixed(6),
      };
    } catch (error) {
      console.error('Failed to get summary from Supabase:', error);
      return {
        totalCalls: 0,
        successfulCalls: 0,
        failedCalls: 0,
        averageLatencyMs: 0,
        totalTokens: 0,
        totalCost: 0,
      };
    }
  }
}

export default new TelemetryService();
