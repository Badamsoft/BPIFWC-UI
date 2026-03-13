import { BookOpen, Video, FileText, Code, MessageCircle, Download, ExternalLink } from 'lucide-react';

export function HelpDocs() {
  const quickStartSteps = [
    'Create a new import through "New Import" menu',
    'Select data source (file, URL, FTP, etc.)',
    'Configure field mapping',
    'Choose product update logic',
    'Run import or save as profile',
  ];

  const videoTutorials = [
    { title: 'Quick Start - First Import', duration: '5:30' },
    { title: 'Field Mapping Configuration', duration: '8:15' },
    { title: 'Creating and Using Profiles', duration: '6:45' },
    { title: 'Scheduled Imports (CRON)', duration: '10:20' },
    { title: 'Working with FTP and SFTP', duration: '12:00' },
  ];

  const documentation = [
    { title: 'User Guide', icon: BookOpen },
    { title: 'WooCommerce Field Mapping', icon: FileText },
    { title: 'File Formats (CSV, XML, Excel, JSON)', icon: FileText },
    { title: 'API Documentation', icon: Code },
    { title: 'Import Examples', icon: FileText },
    { title: 'Troubleshooting', icon: MessageCircle },
  ];

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-gray-900 mb-2">Help / Docs</h1>
        <p className="text-gray-600">Documentation, videos and support</p>
      </div>

      {/* Quick Start */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <h2 className="text-gray-900">Quick Start</h2>
        </div>
        <p className="text-gray-600 mb-4">
          Follow these steps to create your first import
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
          <h2 className="text-gray-900">Video Tutorials</h2>
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

      {/* Documentation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-6 h-6 text-green-600" />
          <h2 className="text-gray-900">Documentation</h2>
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
          <h2 className="text-gray-900">API</h2>
        </div>
        <p className="text-gray-600 mb-4">
          Use API for programmatic management of imports
        </p>
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm overflow-x-auto mb-4">
          <div>POST /wp-json/woo-import/v1/import</div>
          <div>GET /wp-json/woo-import/v1/profiles</div>
          <div>GET /wp-json/woo-import/v1/history</div>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Open API documentation
        </button>
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
        <div className="space-y-2 text-sm mb-4">
          <div className="flex justify-between">
            <span className="text-gray-600">WordPress version:</span>
            <span className="text-gray-900">6.4.2</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">WooCommerce version:</span>
            <span className="text-gray-900">8.5.1</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">PHP version:</span>
            <span className="text-gray-900">8.2.13</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Memory available:</span>
            <span className="text-gray-900">512 MB</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Plugin version:</span>
            <span className="text-gray-900">1.0.0</span>
          </div>
        </div>
        <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Download diagnostic logs
        </button>
      </div>
    </div>
  );
}