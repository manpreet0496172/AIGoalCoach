import { useState, useEffect } from 'react';

type Tab = 'coach' | 'eval' | 'history';

interface NavbarProps {
  onTabChange?: (tab: Tab) => void;
}

export default function Navbar({ onTabChange }: NavbarProps) {
  const [activeTab, setActiveTab] = useState<Tab>('coach');
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  return (
    <header className={`sticky top-0 z-50 transition-all duration-200 px-6 py-4 ${
      isScrolled 
        ? 'bg-white border-b border-slate-200 shadow-sm' 
        : 'glass-effect border-b border-slate-200'
    }`}>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="white" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">AI Goal Coach</h1>
        </div>

        <nav className="flex bg-slate-100 p-1 rounded-lg">
          {(['coach', 'eval', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                activeTab === tab 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
