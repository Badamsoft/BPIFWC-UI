import { AlertCircle, Key } from 'lucide-react';
import { t } from '../utils/i18n';

export function License() {
  const isProAddon = !!(window as any).pifwcAdmin?.isProAddonInstalled;
  const proLicenseUrl = (window as any).pifwcAdmin?.proLicenseUrl || '';

  if (!isProAddon) {
    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <Key className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-gray-900 mb-4">{t('License Management')}</h1>
            <p className="text-gray-600 mb-6">
              {t('License management is handled separately from the free importer interface.')}
            </p>
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h3 className="text-lg font-semibold mb-3">{t('What the commercial add-on provides')}</h3>
              <ul className="text-left max-w-md mx-auto space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✓</span>
                  <span>{t('Import from URL, FTP, SFTP')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✓</span>
                  <span>{t('Google Sheets synchronization')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✓</span>
                  <span>{t('Scheduled imports (CRON)')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✓</span>
                  <span>{t('XML, JSON, XLSX file formats')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✓</span>
                  <span>{t('Unlimited profiles')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✓</span>
                  <span>{t('Data source management')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">✓</span>
                  <span>{t('Priority support')}</span>
                </li>
              </ul>
            </div>
            <p className="text-sm text-gray-500">
              {t('Use the separate commercial add-on interface if you need license-related actions.')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-6">
          <div className="flex items-start gap-4">
            <Key className="w-10 h-10 text-red-500 flex-shrink-0" />
            <div>
              <h1 className="text-gray-900 mb-2">{t('Commercial Add-on Detected')}</h1>
              <p className="text-gray-600 mb-4">
                {t('License management is handled by the installed commercial add-on and is not managed inside the main importer interface.')}
              </p>
              {proLicenseUrl ? (
                <a
                  href={proLicenseUrl}
                  className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  {t('Open License Page')}
                </a>
              ) : (
                <p className="text-sm text-gray-500">{t('Open the add-on license page from the WordPress admin menu to manage your license.')}</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('Need Help?')}</h3>
            <p className="text-gray-600 mb-4">
              {t('For billing, license activation, renewals, and domain management, use the add-on page or your BadamSoft account.')}
            </p>
            <a
              href="https://badamsoft.com/support/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {t('Contact Support')} →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}