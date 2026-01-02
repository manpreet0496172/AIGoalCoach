import { useEffect, useState } from 'react';
import { BACKEND_API_BASE_URL } from '../constants';

interface Goal {
  id: string;
  original_input: string;
  refined_goal: string;
  key_results: string[];
  confidence_score: number;
  created_at: string;
}

interface GoalHistoryProps {
  goals?: Goal[];
  isLoading?: boolean;
  onDelete?: (id: string) => void;
}

export default function GoalHistory({ goals = [], isLoading = false, onDelete }: GoalHistoryProps) {
  const [goalsList, setGoalsList] = useState<Goal[]>(goals);
  const [loading, setLoading] = useState(isLoading);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If goals are provided as props, use them
    if (goals.length > 0) {
      setGoalsList(goals);
      return;
    }

    // Otherwise, fetch from API (only on mount)
    const fetchGoals = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${BACKEND_API_BASE_URL}/goals`);
        const data = await response.json();

        if (data.success) {
          setGoalsList(data.data);
          setError(null);
        } else {
          setError(data.error || 'Failed to fetch goals');
        }
      } catch (err) {
        setError('Error fetching goals');
        console.error('Error fetching goals:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, []); // Empty dependency array - run only once on mount

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/goals/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setGoalsList(goalsList.filter((goal) => goal.id !== id));
        onDelete?.(id);
      }
    } catch (err) {
      console.error('Error deleting goal:', err);
      setError('Failed to delete goal');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Goal History</h2>
          <p className="text-slate-500 text-sm mb-6">Loading your goals...</p>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-gradient-to-r from-slate-100 to-slate-50 rounded-xl animate-pulse"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold text-slate-800 mb-2">Goal History</h2>
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl">
            <p className="text-rose-600 text-sm font-medium">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:col-span-4 space-y-4">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 sticky top-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Goal History</h2>
            <p className="text-slate-500 text-sm">Your saved goals</p>
          </div>
          <span className="bg-indigo-50 text-indigo-700 text-sm font-bold px-3 py-1 rounded-full">
            {goalsList.length}
          </span>
        </div>

        {goalsList.length === 0 ? (
          <div className="text-center py-12">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-12 h-12 text-slate-300 mx-auto mb-3"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="text-slate-500 font-medium text-sm">No goals yet</p>
            <p className="text-slate-400 text-xs mt-1">Refine and save your first goal to get started</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
            {goalsList.map((goal) => (
              <div
                key={goal.id}
                className="group p-4 bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all duration-300 cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">
                      Goal
                    </p>
                    <p className="text-slate-800 font-bold text-sm leading-snug line-clamp-2">
                      {goal.refined_goal}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(goal.id)}
                    className="flex-shrink-0 p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                    title="Delete goal"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <div className="flex gap-0.5">
                    {[...Array(10)].map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-2.5 rounded-sm ${
                          i < goal.confidence_score ? 'bg-indigo-500' : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-slate-500 ml-auto">
                    {goal.confidence_score}/10
                  </span>
                </div>

                <div className="mb-3 pb-3 border-t border-slate-100 pt-3">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter mb-2">
                    Key Results
                  </p>
                  <div className="space-y-1.5">
                    {goal.key_results && Array.isArray(goal.key_results) ? (
                      goal.key_results.map((kr, idx) => (
                        <div key={idx} className="flex gap-2 items-start">
                          <span className="flex-shrink-0 w-4 h-4 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-[10px] mt-0.5">
                            {idx + 1}
                          </span>
                          <p className="text-slate-600 text-xs">{kr}</p>
                        </div>
                      ))
                    ) : null}
                  </div>
                </div>

                <p className="text-xs text-slate-400">
                  {formatDate(goal.created_at)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
