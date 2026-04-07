import { useEffect, useState } from 'react';
import 'react-datepicker/dist/react-datepicker.css';
import { Sidebar } from './components/Sidebar';
import { ImportDashboard } from './components/ImportDashboard';
import { NewImport } from './components/NewImport';
import { ImportProfiles } from './components/ImportProfiles';
import { ImportHistory } from './components/ImportHistory';
import { ScheduledImports } from './components/ScheduledImports';
import { Sources } from './components/Sources';
import { Settings } from './components/Settings';

const updateWordPressMenuLabel = (isPro: boolean) => {
  const menuLabel = isPro
    ? 'BadamSoft Product Importer PRO'
    : 'BadamSoft Product Importer';
  const topLevelMenu = document.querySelector('#toplevel_page_badamsoft-product-importer-for-woocommerce .wp-menu-name');
  if (topLevelMenu) {
    topLevelMenu.textContent = menuLabel;
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editProfileId, setEditProfileId] = useState<number | null>(null);
  const [newImportNonce, setNewImportNonce] = useState(0);
  const [schedulePrefillProfileId, setSchedulePrefillProfileId] = useState<number | null>(null);
  const [schedulePrefillNonce, setSchedulePrefillNonce] = useState(0);
  const [proUiNonce, setProUiNonce] = useState(0);
  const isPro = !!(window as any).pifwcAdmin?.isPro;

  useEffect(() => {
    updateWordPressMenuLabel(!!(window as any).pifwcAdmin?.isPro);

    const onProActivated = () => {
      if ((window as any).pifwcAdmin) {
        (window as any).pifwcAdmin.isPro = true;
      }
      updateWordPressMenuLabel(true);
      setProUiNonce((n) => n + 1);
      setActiveTab('dashboard');
    };
    const onProDeactivated = () => {
      if ((window as any).pifwcAdmin) {
        (window as any).pifwcAdmin.isPro = false;
      }
      updateWordPressMenuLabel(false);
      setProUiNonce((n) => n + 1);
      setActiveTab('dashboard');
    };

    window.addEventListener('pifwc_pro_activated', onProActivated);
    window.addEventListener('pifwc_pro_deactivated', onProDeactivated);
    return () => {
      window.removeEventListener('pifwc_pro_activated', onProActivated);
      window.removeEventListener('pifwc_pro_deactivated', onProDeactivated);
    };
  }, []);

  const handleNavigate = (tab: string, profileId?: number) => {
    if (!isPro && (tab === 'scheduled-imports' || tab === 'sources')) {
      setActiveTab('dashboard');
      return;
    }

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

    if (tab === 'scheduled-imports') {
      setSchedulePrefillProfileId(profileId ? profileId : null);
      setSchedulePrefillNonce((n) => n + 1);
    } else {
      setSchedulePrefillProfileId(null);
    }

    setActiveTab(tab);
  };

  const renderContent = () => {
    if (!isPro && (activeTab === 'scheduled-imports' || activeTab === 'sources')) {
      return <ImportDashboard onNavigate={handleNavigate} />;
    }

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
      case 'scheduled-imports':
        return (
          <ScheduledImports
            prefillProfileId={schedulePrefillProfileId}
            prefillNonce={schedulePrefillNonce}
          />
        );
      case 'history':
        return <ImportHistory onNavigate={handleNavigate} />;
      case 'sources':
        return <Sources />;
      case 'settings':
        return <Settings />;
      default:
        return <ImportDashboard onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar key={`sidebar-${proUiNonce}`} activeTab={activeTab} onTabChange={(tab) => handleNavigate(tab)} />
      <main key={`main-${proUiNonce}`} className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
}