import { z } from 'zod';
import TelemetryService from './TelemetryService.js';

/**
 * Zod schema for refined goal structure
 */
const goalSchema = z.object({
  refined_goal: z.string().min(1, 'refined_goal must be a non-empty string').describe('SMART version of the goal (Specific, Measurable, Achievable, Relevant, Time-bound)'),
  key_results: z.array(z.string().min(1, 'Each key result must be a non-empty string')).min(3, 'key_results must have at least 3 items').max(5, 'key_results must have at most 5 items').describe('Array of 3-5 measurable key results/milestones'),
  confidence_score: z.number().int().min(1, 'confidence_score must be at least 1').max(10, 'confidence_score must be at most 10').describe('Confidence score 1-10 that the input was a valid goal'),
});

class GeminiService {
  constructor() {
    this._apiKey = null;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
    this.model = 'gemini-2.5-flash';
  }

  get apiKey() {
    if (!this._apiKey) {
      this._apiKey = process.env.GOOGLE_API_KEY;
    }
    return this._apiKey;
  }

  /**
   * Refine a vague goal into a structured SMART goal
   * @param {string} userInput - The vague goal input
   * @returns {Promise<Object>} Structured goal object
   */
  async refineGoal(userInput) {
    const startTime = Date.now();

    // Validate input
    if (!userInput || typeof userInput !== 'string' || userInput.trim().length === 0) {
      return await this.handleEmptyInput(startTime);
    }

    try {
      const prompt = this.buildPrompt(userInput);
      const requestBody = this.buildRequestBody(prompt);

      // Simulate API call with structured response
      const response = await this.callGeminiAPIWithRetry(requestBody);
      const latencyMs = Date.now() - startTime;

      // Parse and validate response
      const parsedResponse = this.parseResponse(response);
      const validatedResponse = goalSchema.parse(parsedResponse);

      // Check confidence score guardrail
      if (validatedResponse.confidence_score < 4) {
        return {
          error: "Input does not appear to be a valid goal."
        };
      }

      // Log telemetry
      await TelemetryService.logAICall({
        userInput,
        aiOutput: validatedResponse,
        latencyMs,
        promptTokens: this.estimateTokens(prompt),
        completionTokens: this.estimateTokens(JSON.stringify(validatedResponse)),
        model: this.model,
        success: true,
      });

      return validatedResponse;
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      await TelemetryService.logAICall({
        userInput,
        aiOutput: null,
        latencyMs,
        promptTokens: 0,
        completionTokens: 0,
        model: this.model,
        success: false,
        errorMessage: error.message,
      });

      throw error;
    }
  }

  async handleEmptyInput(startTime) {
    const latencyMs = Date.now() - startTime;
    const response = {
      refined_goal: 'No goal provided',
      key_results: [],
      confidence_score: 0,
    };

    await TelemetryService.logAICall({
      userInput: 'EMPTY_INPUT',
      aiOutput: response,
      latencyMs,
      promptTokens: 0,
      completionTokens: 0,
      model: this.model,
      success: true,
    });

    return response;
  }

  buildPrompt(userInput) {
    return `You are an expert goal-setting coach. Analyze the following vague goal and convert it into a SMART goal (Specific, Measurable, Achievable, Relevant, Time-bound).

User Input: "${userInput}"

Respond with a JSON object containing:
1. refined_goal: A clear, SMART version of the goal
2. key_results: An array of 3-5 measurable milestones/key results
3. confidence_score: A number 1-10 indicating your confidence that the input was actually a goal (0 = definitely not a goal, 10 = definitely a valid goal)

If the input is nonsensical or obviously not a goal, set confidence_score to a low number and provide the best interpretation you can.

Return ONLY valid JSON, no markdown formatting.`;
  }

  buildRequestBody(prompt) {
    return {
      contents: [
        {
          parts: [
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'object',
          properties: {
            refined_goal: {
              type: 'string',
              description: 'SMART version of the goal (Specific, Measurable, Achievable, Relevant, Time-bound)',
            },
            key_results: {
              type: 'array',
              items: {
                type: 'string',
              },
              minItems: 3,
              maxItems: 5,
              description: 'Array of 3-5 measurable key results/milestones',
            },
            confidence_score: {
              type: 'integer',
              minimum: 1,
              maximum: 10,
              description: 'Confidence score 1-10 that the input was a valid goal',
            },
          },
          required: ['refined_goal', 'key_results', 'confidence_score'],
        },
      },
    };
  }

  /**
   * Call real Google Gemini API with retry logic
   */
  async callGeminiAPIWithRetry(requestBody, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.callGeminiAPI(requestBody);
      } catch (error) {
        console.log(`Gemini API attempt ${attempt} failed: ${error.message}`);
        
        if (attempt === maxRetries) {
          console.log('All retry attempts exhausted, throwing final error');
          throw error;
        }
        
        // 4 second delay between retries
        await this.delay(4000);
      }
    }
  }

  /**
   * Call real Google Gemini API
   */
  async callGeminiAPI(requestBody) {
    try {
      if (!this.apiKey) {
        throw new Error('GOOGLE_API_KEY environment variable is not set');
      }

      const url = `${this.baseUrl}/${this.model}:generateContent?key=${this.apiKey}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Gemini API error (${response.status}): ${
            errorData.error?.message || response.statusText
          }`
        );
      }

      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error(`Failed to call Gemini API: ${error.message}`);
    }
  }

  parseResponse(apiResponse) {
    try {
      const textContent = apiResponse.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!textContent) {
        console.error('[DEBUG] Full API response:', JSON.stringify(apiResponse, null, 2));
        throw new Error('Invalid API response structure');
      }

      console.log('[DEBUG] Raw text content:', textContent);

      // Extract JSON from response (handles markdown code blocks if present)
      let jsonStr = textContent;
      const jsonMatch = textContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
        console.log('[DEBUG] Extracted from code block:', jsonStr);
      }

      const trimmed = jsonStr.trim();
      console.log('[DEBUG] Trimmed JSON string:', trimmed);
      
      const parsed = JSON.parse(trimmed);
      return parsed;
    } catch (error) {
      console.error('[DEBUG] Parse error:', error.message);
      throw new Error(`Failed to parse API response: ${error.message}`);
    }
  }

  /**
   * Rough token estimation (1 token ≈ 4 characters)
   */
  estimateTokens(text) {
    return Math.ceil((text || '').length / 4);
  }

  /**
   * Delay utility for retry logic
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new GeminiService();
