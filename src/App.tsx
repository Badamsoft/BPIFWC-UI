import { useEffect, useState } from 'react';
import 'react-datepicker/dist/react-datepicker.css';
import { Sidebar } from './components/Sidebar';
import { ImportDashboard } from './components/ImportDashboard';
import { NewImport } from './components/NewImport';
import { ImportProfiles } from './components/ImportProfiles';
import { ImportHistory } from './components/ImportHistory';
import { Settings } from './components/Settings';
import { HelpDocs } from './components/HelpDocs';

const updateWordPressMenuLabel = () => {
  const menuLabel = 'BadamSoft Product Importer';
  const topLevelMenu = document.querySelector('#toplevel_page_badamsoft-product-importer-for-woocommerce .wp-menu-name');
  if (topLevelMenu) {
    topLevelMenu.textContent = menuLabel;
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editProfileId, setEditProfileId] = useState<number | null>(null);
  const [newImportNonce, setNewImportNonce] = useState(0);

  useEffect(() => {
    updateWordPressMenuLabel();
  }, []);

  const handleNavigate = (tab: string, profileId?: number) => {
    if (tab === 'new-import') {
      setNewImportNonce((n) => n + 1);
      if (profileId) {
        setEditProfileId(profileId);
      } else {
        setEditProfileId(null);
      }
    } else {
      setEditProfileId(null);
    }

    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <ImportDashboard onNavigate={handleNavigate} />;
      case 'new-import':
        return (
          <NewImport
            key={`${editProfileId || 'new'}-${newImportNonce}`}
            onNavigate={handleNavigate}
            editProfileId={editProfileId}
            resetNonce={newImportNonce}
          />
        );
      case 'profiles':
        return <ImportProfiles onNavigate={handleNavigate} />;
      case 'history':
        return <ImportHistory onNavigate={handleNavigate} />;
      case 'settings':
        return <Settings />;
      case 'help':
        return <HelpDocs />;
      default:
        return <ImportDashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar activeTab={activeTab} onTabChange={(tab) => handleNavigate(tab)} />
      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
}