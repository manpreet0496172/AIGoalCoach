
import React, { useState } from 'react';
import { BACKEND_API_BASE_URL } from '../constants';

export interface TestResult {
  name: string;
  passed: boolean;
  confidence?: number;
  errors?: string[];
  error?: string;
}

export interface TestSuiteResults {
  total: number;
  passed: number;
  failed: number;
  successRate: number;
  tests: TestResult[];
}

export const MiniEvalPanel: React.FC = () => {
  const [results, setResults] = useState<TestSuiteResults | null>(null);
  const [output, setOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string>('');

  const handleRunEval = async () => {
    setIsRunning(true);
    setResults(null);
    setOutput('');
    setError('');

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/eval/run-tests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setResults(data.data.results);
        setOutput(data.data.output);
      } else {
        setError(data.error || 'Failed to run tests');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Mini-Evaluation Suite</h2>
          <p className="text-slate-500 text-sm">Validate model consistency and safety guardrails.</p>
        </div>
        <button
          onClick={handleRunEval}
          disabled={isRunning}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
            isRunning 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg'
          }`}
        >
          {isRunning ? 'Evaluating...' : 'Run Test Suite'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {!results && !isRunning && !error && (
          <div className="py-12 border-2 border-dashed border-slate-100 rounded-xl text-center">
            <p className="text-slate-400 text-sm italic">Run evaluation to see how the coach handles various inputs.</p>
          </div>
        )}

        {results && (
          <>
            {/* Summary */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-slate-800 mb-3">Test Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-700">{results.total}</div>
                  <div className="text-sm text-slate-500">Total Tests</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{results.passed}</div>
                  <div className="text-sm text-slate-500">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{results.failed}</div>
                  <div className="text-sm text-slate-500">Failed</div>
                </div>
                <div className="text-center">
                  <div className={`text-2xl font-bold ${results.successRate >= 80 ? 'text-green-600' : 'text-red-600'}`}>
                    {results.successRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-slate-500">Success Rate</div>
                </div>
              </div>
            </div>

            {/* Individual Test Results */}
            <div className="bg-slate-50 rounded-lg p-4">
              <h3 className="text-lg font-medium text-slate-800 mb-3">Individual Test Results</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {results.tests.map((test, index) => (
                  <div
                    key={index}
                    className={`flex items-center justify-between p-2 rounded ${
                      test.passed ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className={test.passed ? 'text-green-600' : 'text-red-600'}>
                        {test.passed ? '✓' : '✗'}
                      </span>
                      <span className="text-sm font-medium text-slate-700">{test.name}</span>
                    </div>
                    <div className="text-right">
                      {test.passed && test.confidence && (
                        <span className="text-xs text-slate-500">
                          Confidence: {test.confidence}/10
                        </span>
                      )}
                      {!test.passed && test.errors && (
                        <div className="text-xs text-red-600">
                          {test.errors.join(', ')}
                        </div>
                      )}
                      {!test.passed && test.error && (
                        <div className="text-xs text-red-600">
                          {test.error}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Console Output */}
            {output && (
              <div className="bg-slate-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-slate-800 mb-3">Console Output</h3>
                <pre className="text-xs text-slate-600 bg-slate-900 text-green-400 p-3 rounded overflow-x-auto max-h-64">
                  {output}
                </pre>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
