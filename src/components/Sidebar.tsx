import { 
  LayoutDashboard, 
  Upload, 
  FolderOpen, 
  Clock, 
  History, 
  Database, 
  Settings, 
  Key, 
  HelpCircle,
  Zap
} from 'lucide-react';
import logo from 'figma:asset/07dd119241dbd828559662231aae4dbfd713db1a.png';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  free: boolean;
  highlight?: boolean;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Import Dashboard', icon: LayoutDashboard, free: true },
    { id: 'new-import', label: 'New Import', icon: Upload, free: true },
    { id: 'profiles', label: 'Import Profiles', icon: FolderOpen, free: true },
    { id: 'scheduled', label: 'Scheduled Imports', icon: Clock, free: false },
    { id: 'history', label: 'Import History & Logs', icon: History, free: true },
    { id: 'sources', label: 'Sources', icon: Database, free: false },
    { id: 'settings', label: 'Settings', icon: Settings, free: true },
    { id: 'license', label: 'License', icon: Key, free: false },
    { id: 'help', label: 'Help / Docs', icon: HelpCircle, free: true },
    { id: 'upgrade', label: 'Upgrade to PRO', icon: Zap, free: true, highlight: true },
  ];

  return (
    <div className="w-64 bg-white h-screen flex flex-col border-r border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="mb-3">
          <img src={logo} alt="Badamsoft Logo" className="w-full h-auto" />
        </div>
        <h1 className="text-gray-900 text-sm">Product Importer for WooCommerce PRO 2.0.0</h1>
        <p className="text-xs text-gray-500">Import your products with advanced filters and automation</p>
      </div>
      
      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-6 py-3 text-left transition-colors ${
                activeTab === item.id
                  ? 'bg-red-500 text-white'
                  : item.highlight
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="flex-1 text-sm">{item.label}</span>
              {!item.free && (
                <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">PRO</span>
              )}
            </button>
          );
        })}
      </nav>
      
      <div className="p-4 bg-red-500 text-white m-4 rounded-lg">
        <h3 className="text-sm mb-2">Unlock Full Power</h3>
        <p className="text-xs mb-3 opacity-90">
          Upgrade to PRO to unlock advanced features and automations
        </p>
        <button 
          onClick={() => onTabChange('upgrade')}
          className="w-full py-2 bg-white text-red-500 rounded text-sm hover:bg-gray-100"
        >
          Upgrade to PRO
        </button>
      </div>
    </div>
  );
}