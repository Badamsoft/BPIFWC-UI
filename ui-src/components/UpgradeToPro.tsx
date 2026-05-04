import { Sparkles } from 'lucide-react';
import { t } from '../utils/i18n';

export function UpgradeToPro() {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <div className="w-12 h-12 rounded-lg flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#f3f4f6' }}>
            <Sparkles className="w-5 h-5 text-gray-500" />
          </div>
          <h1 className="text-gray-900 mb-3">{t('Feature Information')}</h1>
          <p className="text-gray-600">{t('Feature availability depends on the active plugin configuration.')}</p>
        </div>
      </div>
    </div>
  );
}
