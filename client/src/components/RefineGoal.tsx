import { useState } from 'react';
import { BACKEND_API_BASE_URL } from '../constants';

interface RefinementResult {
  userInput: string;
  refined_goal: string;
  key_results: string[];
  confidence_score: number;
}

interface RefineGoalProps {
  onRefinementComplete?: () => void;
}

export default function RefineGoal({ onRefinementComplete }: RefineGoalProps) {
  const [userInput, setUserInput] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [currentRefinement, setCurrentRefinement] = useState<RefinementResult | null>(null);

  const handleRefine = async () => {
    if (!userInput.trim()) return;

    setIsRefining(true);
    try {
      // Call your backend API to refine the goal
      const response = await fetch(`${BACKEND_API_BASE_URL}/goals/refine`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goal: userInput,
        }),
      });

      const data = await response.json();
      console.log('Refinement data:', data);
      setCurrentRefinement(data.data);
      
      // Refresh telemetry logs after successful refinement
      if (onRefinementComplete) {
        onRefinementComplete();
      }
    } catch (error) {
      console.error('Error refining goal:', error);
    } finally {
      setIsRefining(false);
    }
  };

  const handleSave = async () => {
    if (!currentRefinement) return;

    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userInput,
          refined_goal: currentRefinement.refined_goal,
          key_results: currentRefinement.key_results,
          confidence_score: currentRefinement.confidence_score,
        }),
      });

      if (response.ok) {
        setUserInput('');
        setCurrentRefinement(null);
        // You can add a success notification here
      }
    } catch (error) {
      console.error('Error saving goal:', error);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="space-y-4 sm:space-y-6">
        <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-2">Refine Your Vision</h2>
          <p className="text-slate-500 mb-4 sm:mb-6 text-sm">
            Input a vague goal and let the AI partner help you structure it for success.
          </p>

          <div className="space-y-3 sm:space-y-4">
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="e.g., I want to get better at sales"
              className="w-full h-28 sm:h-32 p-3 sm:p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none resize-none font-medium text-slate-700 text-sm sm:text-base"
            />
            <div className="flex justify-end">
              <button
                onClick={handleRefine}
                disabled={isRefining || !userInput.trim()}
                className={`px-6 sm:px-8 py-2.5 sm:py-3 rounded-xl font-bold text-white transition-all shadow-lg text-sm sm:text-base ${
                  isRefining || !userInput.trim()
                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                    : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200 transform hover:-translate-y-0.5'
                }`}
              >
                {isRefining ? 'Thinking...' : 'Refine Goal'}
              </button>
            </div>
          </div>
        </div>

        {/* Refinement Result Card */}
        {currentRefinement && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {currentRefinement.confidence_score < 4 ? (
              <div className="bg-rose-50 border border-rose-200 p-4 sm:p-6 rounded-2xl">
                <div className="flex items-center gap-3 text-rose-600 mb-2 font-bold">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    stroke="currentColor"
                    className="w-5 h-5 sm:w-6 sm:h-6"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                    />
                  </svg>
                  <span className="text-sm sm:text-base">Low Confidence Input</span>
                </div>
                <p className="text-rose-700 text-sm">
                  The AI isn't sure this is a goal. Please try describing an objective or an aspiration you'd like to achieve.
                </p>
              </div>
            ) : (
              <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border-l-4 border-l-indigo-500 border border-slate-200 space-y-4 sm:space-y-6">
                <div className="flex items-center justify-between">
                  <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">
                    AI Refinement Complete
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-400">COACH CONFIDENCE:</span>
                    <div className="flex gap-0.5">
                      {[...Array(10)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-4 rounded-sm ${
                            i < currentRefinement.confidence_score ? 'bg-indigo-500' : 'bg-slate-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-slate-400 font-bold text-xs uppercase tracking-tighter mb-2">
                    Refined SMART Goal
                  </h3>
                  <p className="text-2xl font-bold text-slate-800 leading-tight">
                    {currentRefinement.refined_goal}
                  </p>
                </div>

                <div>
                  <h3 className="text-slate-400 font-bold text-xs uppercase tracking-tighter mb-4">
                    Key Results (3-5 Steps)
                  </h3>
                  <div className="space-y-3">
                    {currentRefinement.key_results && Array.isArray(currentRefinement.key_results) ? (
                      currentRefinement.key_results.map((kr, idx) => (
                        <div
                          key={idx}
                          className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-all group"
                        >
                          <span className="flex-shrink-0 w-8 h-8 rounded-full bg-white flex items-center justify-center font-black text-indigo-600 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                            {idx + 1}
                          </span>
                          <p className="text-slate-700 font-medium pt-1">{kr}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 text-sm">No key results available</p>
                    )}
                  </div>
                </div>

                <div className="pt-4 sm:pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                  <button
                    onClick={() => setCurrentRefinement(null)}
                    className="px-4 sm:px-6 py-2 rounded-lg font-bold text-slate-500 hover:bg-slate-100 transition-colors text-sm sm:text-base order-2 sm:order-1"
                  >
                    Discard
                  </button>
                  <button
                    onClick={handleSave}
                    className="px-4 sm:px-8 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-md hover:shadow-lg transform transition-all active:scale-95 text-sm sm:text-base order-1 sm:order-2"
                  >
                    Save Goal
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
