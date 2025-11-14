
import React from 'react';
import { AppTab } from '../types';

interface Tab {
  id: AppTab;
  label: string;
  icon?: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, setActiveTab }) => {
  return (
    <div className="flex justify-center border-b border-slate-700 mb-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center justify-center px-4 py-3 font-semibold text-sm md:text-base transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
            ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-500 text-white'
                : 'text-slate-400 hover:text-white border-b-2 border-transparent'
            }
          `}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default Tabs;
