import { useState, useEffect } from 'react'
import './App.css'
import Navbar from './components/Navbar'
import RefineGoal from './components/RefineGoal'
import { TelemetryPanel, type TelemetryLog } from './components/TelemetryPanel'
import { BACKEND_API_BASE_URL } from './constants'
import GoalHistory from './components/GoalHistory'
import { MiniEvalPanel } from './components/MiniEvalPanel'

type Tab = 'coach' | 'eval' | 'history';


function App() {
  const [activeTab, setActiveTab] = useState<Tab>('coach')
  const [logs, setLogs] = useState<TelemetryLog[]>([])

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab)
  }

  const refreshTelemetryLogs = async () => {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/telemetry/logs`)
      const data = await response.json()
      console.log('Fetched telemetry logs:', data)
      setLogs(data.data)
    } catch (error) {
      console.error('Error fetching telemetry logs:', error)
    }
  }

  useEffect(() => {
    // Fetch telemetry logs from the backend
    refreshTelemetryLogs()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Navbar onTabChange={handleTabChange} />
      
      <main className="max-w-7xl mx-auto px-4 py-6 sm:py-8 lg:py-12">
        <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="w-full lg:col-span-8 space-y-6 lg:space-y-8 order-2 lg:order-1">
            {activeTab === 'coach' && <RefineGoal onRefinementComplete={refreshTelemetryLogs} />}
            {activeTab === 'eval' && <MiniEvalPanel />}
            {activeTab === 'history' && <GoalHistory />}
          </div>

          {/* Sidebar */}
          <div className="w-full lg:col-span-4 order-1 lg:order-2">
            <TelemetryPanel log={logs} />
          </div>
        </div>
      </main>
    </div>
  )
}

export default App
