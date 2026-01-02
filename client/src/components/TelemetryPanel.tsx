
import React, { useState } from 'react';

export interface TelemetryLog {
    timestamp: string;
    model: string;
    success: boolean;
    latencyMs: number;
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;

        input_cost: string;
        completion_cost: string;
        total_cost: string;
    input: string;
    output: {
        refined_goal: string;
        key_results: string[];
        confidence_score: number;
    };
    errorMessage: string | null;
}

interface TelemetryPanelProps {
  log: TelemetryLog[];
}

const TruncatedText: React.FC<{ 
  text: string; 
  maxLength?: number; 
  className?: string;
}> = ({ text, maxLength = 100, className = "" }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (text.length <= maxLength) {
    return <div className={className}>{text}</div>;
  }

  return (
    <div className={className}>
      {isExpanded ? text : `${text.substring(0, maxLength)}...`}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="ml-2 text-xs text-blue-400 hover:text-blue-300 underline cursor-pointer"
      >
        {isExpanded ? 'Show less' : 'Show more'}
      </button>
    </div>
  );
};

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({ log }) => {
  console.log('Rendering TelemetryPanel with logs:', log);
  return (
    <div className="bg-slate-900 text-slate-300 p-3 sm:p-4 rounded-xl shadow-2xl overflow-hidden flex flex-col h-[400px] sm:h-[450px] lg:h-[500px]">
      <div className="flex items-center justify-between mb-4 border-b border-slate-700 pb-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">Observability Layer</h3>
        <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/30">
          Live Telemetry
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-2 sm:space-y-3 font-mono text-[9px] sm:text-[10px] md:text-xs scrollbar-hide">
        {!log || log.length === 0 ? (
          <div className="text-slate-500 italic py-10 text-center">No telemetry data recorded yet.</div>
        ) : (
          log.map((logEntry, index) => (
            <div key={index} className="bg-slate-800/50 p-3 rounded border border-slate-700">
              <div className="flex justify-between items-center mb-1 text-slate-500">
                <span>{new Date(logEntry.timestamp).toLocaleString()}</span>
                <span className={`px-2 py-0.5 rounded text-xs ${logEntry.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {logEntry.success ? 'Success' : 'Failed'}
                </span>
              </div>
              <div className="text-indigo-400 truncate mb-1 italic">Model: {logEntry.model}</div>
              <div className="text-yellow-400 truncate mb-1 italic">Latency: {logEntry.latencyMs}ms</div>
              <div className="grid grid-cols-3 gap-2 py-1 border-y border-slate-700/50 my-1 text-slate-400">
                <div>Prompt: {logEntry.prompt_tokens}</div>
                <div>Completion: {logEntry.completion_tokens}</div>
                <div>Total: {logEntry.total_tokens}</div>
              </div>
              <div className="text-emerald-400 whitespace-pre-wrap break-all mt-1">
                Cost: ${logEntry.total_cost}
              </div>
              {logEntry.input && (
                <div className="text-slate-300 mt-2 p-2 bg-slate-900/50 rounded">
                  <div className="text-xs text-slate-500 mb-1">Input:</div>
                  <TruncatedText 
                    text={logEntry.input} 
                    maxLength={80}
                    className="text-slate-300"
                  />
                </div>
              )}
              {logEntry.errorMessage && (
                <div className="text-red-400 mt-2 p-2 bg-red-900/20 rounded">
                  <div className="text-xs text-red-500 mb-1">Error:</div>
                  <TruncatedText 
                    text={logEntry.errorMessage} 
                    maxLength={120}
                    className="text-red-400"
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
