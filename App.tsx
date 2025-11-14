
import React, { useState } from 'react';
import Tabs from './components/Tabs';
import { MapsScraper } from './components/MapsScraper';
import WhatsAppChecker from './components/WhatsAppChecker';
import { RankingChecker } from './components/RankingChecker';
import { AppTab } from './types';
import { MapPinIcon } from './components/icons/MapPinIcon';
import { WhatsAppIcon } from './components/icons/WhatsAppIcon';
import { TrophyIcon } from './components/icons/TrophyIcon';
import { LinkedInIcon } from './components/icons/LinkedInIcon';
import { TwitterIcon } from './components/icons/TwitterIcon';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.MAPS_SCRAPER);

  const TABS = [
    { id: AppTab.MAPS_SCRAPER, label: 'Maps Scraper', icon: <MapPinIcon className="w-5 h-5 mr-2" /> },
    { id: AppTab.WHATSAPP_CHECKER, label: 'WA Checker', icon: <WhatsAppIcon className="w-5 h-5 mr-2" /> },
    { id: AppTab.RANK_CHECKER, label: 'Rank Checker', icon: <TrophyIcon className="w-5 h-5 mr-2" /> },
  ];

  return (
    <div className="min-h-screen text-slate-200 font-sans">
      <main className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            GeoScout & WA Checker
          </h1>
          <p className="mt-2 text-lg text-slate-400">
            Intelligent tools for business data and contact verification.
          </p>
          <div className="mt-4 flex justify-center items-center gap-4">
            <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors duration-200" aria-label="LinkedIn">
              <LinkedInIcon className="w-6 h-6" />
            </a>
            <a href="https://www.twitter.com" target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-white transition-colors duration-200" aria-label="Twitter">
              <TwitterIcon className="w-6 h-6" />
            </a>
          </div>
        </header>

        <div className="max-w-4xl mx-auto">
          <Tabs tabs={TABS} activeTab={activeTab} setActiveTab={setActiveTab} />
          
          <div className="mt-6 bg-slate-800/50 backdrop-blur-sm rounded-lg shadow-2xl p-6 md:p-8 border border-slate-700">
            {activeTab === AppTab.MAPS_SCRAPER && <MapsScraper />}
            {activeTab === AppTab.WHATSAPP_CHECKER && <WhatsAppChecker />}
            {activeTab === AppTab.RANK_CHECKER && <RankingChecker />}
          </div>
        </div>
      </main>
      <footer className="text-center p-4 text-slate-500 text-sm">
        <p>Powered by Gemini API</p>
      </footer>
    </div>
  );
};

export default App;