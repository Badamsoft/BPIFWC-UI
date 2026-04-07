import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Video, FileText, Code, MessageCircle, Download, ExternalLink } from 'lucide-react';
import { addCacheBuster, getWpNonce } from '../utils/api';

export function HelpDocs() {
  const quickStartSteps = [
    t('Create a new import through "New Import" menu'),
    t('Select data source (file, URL, FTP, etc.)'),
    t('Configure field mapping'),
    t('Choose product update logic'),
    t('Run import or save as profile'),
  ];

  const whatsNew = [
    t('New features and improvements will be listed here.'),
    t('Changelog page will be linked after docs are published.'),
  ];

  const knownIssues = [
    t('Known issues list will be published in the documentation.'),
  ];

  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [healthData, setHealthData] = useState<any | null>(null);

  const healthEndpointCandidates = useMemo(() => {
    const restBase = (window as any).pifwcAdmin?.restUrl;
    const candidates: string[] = [];
    if (typeof restBase === 'string' && restBase.trim() !== '') {
      const normalized = restBase.endsWith('/') ? restBase : `${restBase}/`;
      candidates.push(`${normalized}health`);
    }
    candidates.push('/wp-json/pifwc/v1/health');
    return candidates;
  }, []);

  useEffect(() => {
    const fetchHealth = async () => {
      setHealthLoading(true);
      setHealthError(null);
      try {
        const nonce = getWpNonce();
        if (!nonce) {
          setHealthError(t('Missing REST nonce. Please reload the page.'));
          return;
        }

        let lastError: string | null = null;

        for (const candidate of healthEndpointCandidates) {
          const url = addCacheBuster(candidate);
          try {
            const response = await fetch(url, {
              headers: {
                'X-WP-Nonce': nonce,
              },
              credentials: 'same-origin',
            });

            if (!response.ok) {
              const body = await response.text();
              lastError = t('HTTP {status}: {body}', { status: response.status, body });
              continue;
            }

            const data = await response.json();
            if (data?.status === 'success' && data?.data) {
              setHealthData(data.data);
              lastError = null;
              break;
            }

            lastError = t('Unexpected API response format.');
          } catch (innerErr) {
            lastError = innerErr instanceof Error ? innerErr.message : String(innerErr);
          }
        }

        if (lastError) {
          setHealthError(lastError);
        }
      } finally {
        setHealthLoading(false);
      }
    };

    fetchHealth();
  }, [healthEndpointCandidates]);

  const videoTutorials = [
    { title: t('Quick Start - First Import'), duration: '5:30' },
    { title: t('Field Mapping Configuration'), duration: '8:15' },
    { title: t('Creating and Using Profiles'), duration: '6:45' },
    { title: t('Scheduled Imports (CRON)'), duration: '10:20' },
    { title: t('Working with FTP and SFTP'), duration: '12:00' },
  ];

  const documentation = [
    { title: t('User Guide'), icon: BookOpen },
    { title: t('WooCommerce Field Mapping'), icon: FileText },
    { title: t('CSV Import Guide'), icon: FileText },
    { title: t('API Documentation'), icon: Code },
    { title: t('Import Examples'), icon: FileText },
    { title: t('Troubleshooting'), icon: MessageCircle },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-gray-900 mb-2">{t('Help / Docs')}</h1>
        <p className="text-gray-600">{t('Documentation, videos and support')}</p>
      </div>

      {/* Quick Start */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <h2 className="text-gray-900">{t('Quick Start')}</h2>
        </div>
        <p className="text-gray-600 mb-4">
          {t('Follow these steps to create your first import')}
        </p>
        <ol className="space-y-2">
          {quickStartSteps.map((step, index) => (
            <li key={index} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm">
                {index + 1}
              </span>
              <span className="text-gray-700 pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Video Tutorials */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Video className="w-6 h-6 text-red-600" />
          <h2 className="text-gray-900">{t('Video Tutorials')}</h2>
        </div>
        <div className="space-y-3">
          {videoTutorials.map((video, index) => (
            <button
              key={index}
              className="w-full flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
                  <Video className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-gray-900">{video.title}</h3>
                  <p className="text-sm text-gray-600">{video.duration}</p>
                </div>
              </div>
              <ExternalLink className="w-5 h-5 text-gray-400" />
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-6 h-6 text-blue-600" />
          <h2 className="text-gray-900">{t('Current Status')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-gray-900 mb-3">{t("What's New")}</h3>
            <ul className="space-y-2">
              {whatsNew.map((item, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm">
                    ✓
                  </span>
                  <span className="text-gray-700 pt-0.5">{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-gray-900 mb-3">{t('Known Issues')}</h3>
            <ul className="space-y-2">
              {knownIssues.map((item, index) => (
                <li key={index} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-yellow-100 text-yellow-700 rounded-full flex items-center justify-center text-sm">
                    !
                  </span>
                  <span className="text-gray-700 pt-0.5">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Documentation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-6 h-6 text-green-600" />
          <h2 className="text-gray-900">{t('Documentation')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {documentation.map((doc, index) => {
            const Icon = doc.icon;
            return (
              <button
                key={index}
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
              >
                <Icon className="w-5 h-5 text-blue-600" />
                <span className="text-gray-900">{doc.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* API Access */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Code className="w-6 h-6 text-orange-600" />
          <h2 className="text-gray-900">{t('API')}</h2>
        </div>
        <p className="text-gray-600 mb-4">
          {t('Use API for programmatic management of imports')}
        </p>
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto mb-4">
          <div>POST /wp-json/pifwc/v1/import/chunk/start</div>
          <div>POST /wp-json/pifwc/v1/import/abort/&lt;job_id&gt;</div>
          <div>GET /wp-json/pifwc/v1/import/jobs</div>
          <div>GET /wp-json/pifwc/v1/profiles</div>
        </div>
        <a
          href="https://badamsoft.com/documentation/?doc_product=importer&cat=api-sources"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <FileText className="w-4 h-4" />
          {t('Open API documentation')}
        </a>
      </div>

      {/* Support */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="w-6 h-6 text-blue-600" />
          <h2 className="text-gray-900">Support</h2>
        </div>
        <p className="text-gray-600 mb-4">
          Need help? We are ready to assist you
        </p>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Contact Support
          </button>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:border-gray-400">
            Knowledge Base
          </button>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:border-gray-400">
            Report an Issue
          </button>
        </div>
      </div>

      {/* Diagnostic Logs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-gray-900 mb-4">Diagnostics</h2>
        <p className="text-gray-600 mb-4">
          Download system information for support
        </p>
        {healthError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
            {healthError}
          </div>
        )}
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-gray-600">WordPress version:</span>
            <span className="text-gray-900">{healthData?.wp || (healthLoading ? 'Loading...' : '—')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">WooCommerce version:</span>
            <span className="text-gray-900">{healthData?.wc || (healthLoading ? 'Loading...' : '—')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">PHP version:</span>
            <span className="text-gray-900">{healthData?.php || (healthLoading ? 'Loading...' : '—')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Memory available:</span>
            <span className="text-gray-900">{healthData?.memory_limit || (healthLoading ? 'Loading...' : '—')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Plugin version:</span>
            <span className="text-gray-900">{healthData?.version || (healthLoading ? 'Loading...' : '—')}</span>
          </div>
        </div>
        <button
          onClick={() => {
            if (!healthData) {
              alert('Diagnostics data is not loaded yet. Please try again in a moment.');
              return;
            }
            const payload = {
              generated_at: new Date().toISOString(),
              health: healthData,
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'pifwc-diagnostics.json';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          }}
          disabled={healthLoading}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          Download diagnostics report
        </button>
      </div>
    </div>
  );
}