import { useState } from 'react';
import 'react-datepicker/dist/react-datepicker.css';
import { Sidebar } from './components/Sidebar';
import { ImportDashboard } from './components/ImportDashboard';
import { NewImport } from './components/NewImport';
import { ImportProfiles } from './components/ImportProfiles';
import { ScheduledImports } from './components/ScheduledImports';
import { ImportHistory } from './components/ImportHistory';
import { Sources } from './components/Sources';
import { Settings } from './components/Settings';
import { License } from './components/License';
import { HelpDocs } from './components/HelpDocs';
import { UpgradeToPro } from './components/UpgradeToPro';

export default function App() {
  const [activeTab, setActiveTab] = useState('new-import');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <ImportDashboard onNavigate={setActiveTab} />;
      case 'new-import':
        return <NewImport onNavigate={setActiveTab} />;
      case 'profiles':
        return <ImportProfiles onNavigate={setActiveTab} />;
      case 'scheduled':
        return <ScheduledImports />;
      case 'history':
        return <ImportHistory />;
      case 'sources':
        return <Sources />;
      case 'settings':
        return <Settings />;
      case 'license':
        return <License />;
      case 'help':
        return <HelpDocs />;
      case 'upgrade':
        return <UpgradeToPro />;
      default:
        return <ImportDashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
}