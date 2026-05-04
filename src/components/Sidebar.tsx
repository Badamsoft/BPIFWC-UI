import { 
  LayoutDashboard, 
  Upload, 
  FolderOpen, 
  Clock,
  History, 
  Database,
  Settings, 
  Key,
  HelpCircle 
} from 'lucide-react';
import { t } from '../utils/i18n';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  // Use dynamic logo path from WordPress plugin URL to avoid hardcoded domain
  const logoUrl = (window as any).pifwcAdmin?.pluginUrl 
    ? `${(window as any).pifwcAdmin.pluginUrl}assets/images/badamsoft_logo.png`
    : '';
  const helpDocsUrl = 'https://badamsoft.com/documentation/?doc_product=importer&cat=importer-guide';

  // Get dynamic plugin name and version
  const basePluginName = (window as any).pifwcAdmin?.pluginName || 'Product Importer for WooCommerce';
  const pluginName = basePluginName;
  const version = (window as any).pifwcAdmin?.version || '2.0.0';

  const handleMenuClick = (item: any) => {
    if (item.id === 'help') {
      window.open(helpDocsUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    onTabChange(item.id);
  };

  const menuItems = [
    { id: 'dashboard', label: t('Import Dashboard'), icon: LayoutDashboard, free: true },
    { id: 'new-import', label: t('New Import'), icon: Upload, free: true },
    { id: 'profiles', label: t('Import Profiles'), icon: FolderOpen, free: true },
    { id: 'history', label: t('Import History & Logs'), icon: History, free: true },
    { id: 'settings', label: t('Settings'), icon: Settings, free: true },
    { id: 'help', label: t('Help / Docs'), icon: HelpCircle, free: true },
  ];

  return (
    <div className="w-64 bg-white h-screen flex flex-col border-r border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="mb-3">
          {logoUrl && <img src={logoUrl} alt="Badamsoft Logo" className="w-full h-auto" />}
        </div>
        <h2 className="text-gray-900">{pluginName} {version}</h2>
        <p className="text-xs text-gray-500">{t('Import your products from CSV files')}</p>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => handleMenuClick(item)}
              className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${
                activeTab === item.id
                  ? 'bg-red-500 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="flex-1 text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

    </div>
  );
}