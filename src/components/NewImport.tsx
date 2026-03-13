import { useState } from 'react';
import { 
  Upload, 
  Link, 
  Server, 
  FileSpreadsheet, 
  Code, 
  Check, 
  ChevronRight,
  ChevronLeft,
  Play,
  Save,
  Clock,
  ArrowRight,
  Calendar,
  HelpCircle
} from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';
import { FieldMapping } from './FieldMapping';
import { DatePickerWithFooter } from './DatePickerWithFooter';

interface NewImportProps {
  onNavigate: (tab: string) => void;
}

export function NewImport({ onNavigate }: NewImportProps) {
  const [currentStep, setCurrentStep] = useState(1); // Start from step 1
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [selectedFormat, setSelectedFormat] = useState<string>('csv');
  const [updateMode, setUpdateMode] = useState<string>('both');
  const [comparisonKey, setComparisonKey] = useState<string>('sku');
  const [postStatus, setPostStatus] = useState<string>('published');
  const [postDates, setPostDates] = useState<string>('as-specified');
  const [asSpecifiedDate, setAsSpecifiedDate] = useState<Date | null>(new Date());
  const [randomStartDate, setRandomStartDate] = useState<Date | null>(new Date());
  const [randomEndDate, setRandomEndDate] = useState<Date | null>(new Date());

  // Data source form states
  const [urlSource, setUrlSource] = useState<string>('');
  const [urlAuthType, setUrlAuthType] = useState<string>('none');
  const [urlUsername, setUrlUsername] = useState<string>('');
  const [urlPassword, setUrlPassword] = useState<string>('');
  
  const [ftpHost, setFtpHost] = useState<string>('');
  const [ftpPort, setFtpPort] = useState<string>('21');
  const [ftpProtocol, setFtpProtocol] = useState<string>('ftp');
  const [ftpUsername, setFtpUsername] = useState<string>('');
  const [ftpPassword, setFtpPassword] = useState<string>('');
  const [ftpPath, setFtpPath] = useState<string>('');
  
  const [sheetsUrl, setSheetsUrl] = useState<string>('');
  const [sheetsRange, setSheetsRange] = useState<string>('A1:Z1000');
  const [sheetsFirstRowHeaders, setSheetsFirstRowHeaders] = useState<boolean>(true);
  
  const [apiUrl, setApiUrl] = useState<string>('');
  const [apiMethod, setApiMethod] = useState<string>('GET');
  const [apiHeaders, setApiHeaders] = useState<string>('');
  const [apiBody, setApiBody] = useState<string>('');
  const [apiAuthType, setApiAuthType] = useState<string>('none');
  const [apiAuthKey, setApiAuthKey] = useState<string>('');
  const [apiUsername, setApiUsername] = useState<string>('');
  const [apiPassword, setApiPassword] = useState<string>('');

  const sources = [
    { id: 'upload', name: 'Upload File', icon: Upload, free: true, description: 'Upload file from computer' },
    { id: 'url', name: 'From URL', icon: Link, free: false, description: 'Import from URL' },
    { id: 'ftp', name: 'FTP / SFTP', icon: Server, free: false, description: 'Connect to FTP server' },
    { id: 'sheets', name: 'Google Sheets', icon: FileSpreadsheet, free: false, description: 'Sync with Google Sheets' },
    { id: 'api', name: 'API Endpoint', icon: Code, free: false, description: 'REST API integration' },
  ];

  const formats = [
    { id: 'csv', name: 'CSV' },
    { id: 'xml', name: 'XML' },
    { id: 'excel', name: 'Excel' },
    { id: 'json', name: 'JSON' },
    { id: 'yml', name: 'YML' },
  ];

  const sampleData = [
    { id: 1, title: 'Wireless Mouse', price: '29.99', sku: 'WM-001', stock: '150' },
    { id: 2, title: 'Mechanical Keyboard', price: '89.99', sku: 'MK-002', stock: '75' },
    { id: 3, title: 'USB-C Cable', price: '12.99', sku: 'UC-003', stock: '300' },
    { id: 4, title: 'Laptop Stand', price: '45.99', sku: 'LS-004', stock: '120' },
    { id: 5, title: 'Webcam HD', price: '65.99', sku: 'WC-005', stock: '90' },
  ];

  const fieldMappings = [
    { source: 'title', target: 'Product Title', mapped: true },
    { source: 'price', target: 'Price', mapped: true },
    { source: 'sale_price', target: 'Sale Price', mapped: false },
    { source: 'sku', target: 'SKU', mapped: true },
    { source: 'stock', target: 'Stock', mapped: true },
    { source: 'categories', target: 'Categories', mapped: false },
    { source: 'images', target: 'Images', mapped: false },
    { source: 'description', target: 'Description', mapped: false },
  ];

  const steps = [
    { number: 1, title: 'Data Source' },
    { number: 2, title: 'Format + Preview' },
    { number: 3, title: 'Field Mapping' },
    { number: 4, title: 'Update Logic' },
    { number: 5, title: 'Launch' },
  ];

  const renderStepIndicator = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <button
                onClick={() => setCurrentStep(step.number)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors cursor-pointer hover:opacity-80 ${
                  currentStep === step.number
                    ? 'bg-red-500 text-white'
                    : currentStep > step.number
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}
              >
                {currentStep > step.number ? <Check className="w-5 h-5" /> : step.number}
              </button>
              <p className="text-xs text-gray-600 mt-2 text-center">{step.title}</p>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-1 mx-4 ${
                currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-gray-900 mb-6">Select Data Source</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sources.map((source) => {
          const Icon = source.icon;
          return (
            <button
              key={source.id}
              onClick={() => setSelectedSource(source.id)}
              className={`relative p-6 rounded-lg border-2 transition-all text-left ${
                selectedSource === source.id
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <Icon className="w-8 h-8 text-red-500" />
                {!source.free && (
                  <span className="text-xs px-2 py-1 bg-red-50 text-red-600 rounded border border-red-200">PRO</span>
                )}
              </div>
              <h3 className="text-gray-900 mb-1">{source.name}</h3>
              <p className="text-sm text-gray-600">{source.description}</p>
              {source.id === 'api' && (
                <div className="mt-2 text-xs text-gray-500 italic">Phase 2</div>
              )}
            </button>
          );
        })}
      </div>

      {selectedSource === 'upload' && (
        <div className="mt-6 p-6 border-2 border-dashed border-gray-300 rounded-lg text-center">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-900 mb-2">Drag & drop file here or click to select</p>
          <p className="text-sm text-gray-600 mb-4">Supported formats: CSV, XML, Excel, JSON, YML</p>
          <button className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
            Select File
          </button>
        </div>
      )}

      {selectedSource === 'url' && (
        <div className="mt-6 p-6 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <Link className="w-10 h-10 text-red-500" />
            <div>
              <p className="text-gray-900">Import from URL</p>
              <p className="text-sm text-gray-600">Enter URL and authentication details</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">File URL *</label>
              <input
                type="text"
                value={urlSource}
                onChange={(e) => setUrlSource(e.target.value)}
                placeholder="https://example.com/products.csv"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Authentication Type</label>
              <select
                value={urlAuthType}
                onChange={(e) => setUrlAuthType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="none">None</option>
                <option value="basic">Basic Auth</option>
                <option value="token">Token Auth</option>
              </select>
            </div>
            {urlAuthType === 'basic' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Username</label>
                  <input
                    type="text"
                    value={urlUsername}
                    onChange={(e) => setUrlUsername(e.target.value)}
                    placeholder="username"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Password</label>
                  <input
                    type="password"
                    value={urlPassword}
                    onChange={(e) => setUrlPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
            {urlAuthType === 'token' && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm text-gray-600 mb-2">Bearer Token</label>
                <input
                  type="text"
                  value={urlPassword}
                  onChange={(e) => setUrlPassword(e.target.value)}
                  placeholder="Enter your API token"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            )}
            <button className="w-full px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center justify-center gap-2">
              <Link className="w-4 h-4" />
              Test Connection
            </button>
          </div>
        </div>
      )}

      {selectedSource === 'ftp' && (
        <div className="mt-6 p-6 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <Server className="w-10 h-10 text-red-500" />
            <div>
              <p className="text-gray-900">FTP / SFTP Connection</p>
              <p className="text-sm text-gray-600">Connect to your FTP or SFTP server</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Protocol *</label>
                <select
                  value={ftpProtocol}
                  onChange={(e) => setFtpProtocol(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="ftp">FTP</option>
                  <option value="sftp">SFTP (Secure)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Port *</label>
                <input
                  type="text"
                  value={ftpPort}
                  onChange={(e) => setFtpPort(e.target.value)}
                  placeholder={ftpProtocol === 'sftp' ? '22' : '21'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Host *</label>
              <input
                type="text"
                value={ftpHost}
                onChange={(e) => setFtpHost(e.target.value)}
                placeholder="ftp.example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Username *</label>
                <input
                  type="text"
                  value={ftpUsername}
                  onChange={(e) => setFtpUsername(e.target.value)}
                  placeholder="username"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Password *</label>
                <input
                  type="password"
                  value={ftpPassword}
                  onChange={(e) => setFtpPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">File Path *</label>
              <input
                type="text"
                value={ftpPath}
                onChange={(e) => setFtpPath(e.target.value)}
                placeholder="/public_html/products.csv"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Full path to the file on the server</p>
            </div>
            <button className="w-full px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center justify-center gap-2">
              <Server className="w-4 h-4" />
              Test Connection
            </button>
          </div>
        </div>
      )}

      {selectedSource === 'sheets' && (
        <div className="mt-6 p-6 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <FileSpreadsheet className="w-10 h-10 text-red-500" />
            <div>
              <p className="text-gray-900">Google Sheets Integration</p>
              <p className="text-sm text-gray-600">Import data directly from Google Sheets</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Google Sheets URL *</label>
              <input
                type="text"
                value={sheetsUrl}
                onChange={(e) => setSheetsUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">Share your sheet with view access or make it public</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">Sheet Name</label>
                <input
                  type="text"
                  placeholder="Sheet1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">Range (Optional)</label>
                <input
                  type="text"
                  value={sheetsRange}
                  onChange={(e) => setSheetsRange(e.target.value)}
                  placeholder="A1:Z1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sheetsFirstRowHeaders}
                  onChange={(e) => setSheetsFirstRowHeaders(e.target.checked)}
                  className="w-4 h-4 text-red-500"
                />
                <div>
                  <span className="text-gray-900">First row contains column headers</span>
                  <p className="text-xs text-gray-500">Use first row as field names</p>
                </div>
              </label>
            </div>
            <button className="w-full px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center justify-center gap-2">
              <FileSpreadsheet className="w-4 h-4" />
              Connect to Google Sheets
            </button>
          </div>
        </div>
      )}

      {selectedSource === 'api' && (
        <div className="mt-6 p-6 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="flex items-center gap-3 mb-4">
            <Code className="w-10 h-10 text-red-500" />
            <div>
              <p className="text-gray-900">REST API Endpoint</p>
              <p className="text-sm text-gray-600">Connect to REST API for product data</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-1">
                <label className="block text-sm text-gray-600 mb-2">Method *</label>
                <select
                  value={apiMethod}
                  onChange={(e) => setApiMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="PATCH">PATCH</option>
                </select>
              </div>
              <div className="col-span-3">
                <label className="block text-sm text-gray-600 mb-2">API Endpoint URL *</label>
                <input
                  type="text"
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://api.example.com/products"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">Authentication Type</label>
              <select
                value={apiAuthType}
                onChange={(e) => setApiAuthType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                <option value="none">None</option>
                <option value="basic">Basic Auth</option>
                <option value="bearer">Bearer Token</option>
                <option value="apikey">API Key</option>
              </select>
            </div>
            {apiAuthType === 'basic' && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Username</label>
                  <input
                    type="text"
                    value={apiUsername}
                    onChange={(e) => setApiUsername(e.target.value)}
                    placeholder="username"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-2">Password</label>
                  <input
                    type="password"
                    value={apiPassword}
                    onChange={(e) => setApiPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
            {(apiAuthType === 'bearer' || apiAuthType === 'apikey') && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm text-gray-600 mb-2">
                  {apiAuthType === 'bearer' ? 'Bearer Token' : 'API Key'}
                </label>
                <input
                  type="text"
                  value={apiAuthKey}
                  onChange={(e) => setApiAuthKey(e.target.value)}
                  placeholder={apiAuthType === 'bearer' ? 'Enter your bearer token' : 'Enter your API key'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                />
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-600 mb-2">Request Headers (JSON format)</label>
              <textarea
                value={apiHeaders}
                onChange={(e) => setApiHeaders(e.target.value)}
                placeholder={`{\n  "Content-Type": "application/json",\n  "Accept": "application/json"\n}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm"
                rows={4}
              />
            </div>
            {apiMethod !== 'GET' && (
              <div>
                <label className="block text-sm text-gray-600 mb-2">Request Body (JSON format)</label>
                <textarea
                  value={apiBody}
                  onChange={(e) => setApiBody(e.target.value)}
                  placeholder={`{\n  "limit": 100,\n  "page": 1\n}`}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent font-mono text-sm"
                  rows={4}
                />
              </div>
            )}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Note:</strong> API response should return product data in JSON format. The response will be parsed automatically.
              </p>
            </div>
            <button className="w-full px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center justify-center gap-2">
              <Code className="w-4 h-4" />
              Test API Connection
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-gray-900 mb-6">Format and Data Preview</h2>
      
      <div className="mb-6">
        <label className="block text-sm text-gray-600 mb-2">File Format</label>
        <div className="flex gap-2">
          {formats.map((format) => (
            <button
              key={format.id}
              onClick={() => setSelectedFormat(format.id)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                selectedFormat === format.id
                  ? 'bg-red-500 text-white border-red-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-red-300'
              }`}
            >
              {format.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm text-gray-600 mb-2">Delimiter</label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
            <option>Comma (,)</option>
            <option>Semicolon (;)</option>
            <option>Tab</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Encoding</label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
            <option>UTF-8</option>
            <option>Windows-1251</option>
            <option>ISO-8859-1</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-2">Currency</label>
          <select className="w-full px-3 py-2 border border-gray-300 rounded-lg">
            <option>USD ($)</option>
            <option>EUR (€)</option>
            <option>RUB (₽)</option>
          </select>
        </div>
      </div>

      <div>
        <h3 className="text-gray-900 mb-3">Preview (first 5 rows)</h3>
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm text-gray-600">ID</th>
                <th className="px-4 py-2 text-left text-sm text-gray-600">Title</th>
                <th className="px-4 py-2 text-left text-sm text-gray-600">Price</th>
                <th className="px-4 py-2 text-left text-sm text-gray-600">SKU</th>
                <th className="px-4 py-2 text-left text-sm text-gray-600">Stock</th>
              </tr>
            </thead>
            <tbody>
              {sampleData.map((row) => (
                <tr key={row.id} className="border-t border-gray-200">
                  <td className="px-4 py-2 text-sm text-gray-600">{row.id}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{row.title}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">${row.price}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{row.sku}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{row.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-gray-900 mb-6">Update Logic</h2>

      <div className="space-y-6">
        <div>
          <label className="block text-sm text-gray-600 mb-3">Import Mode</label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="updateMode"
                value="new"
                checked={updateMode === 'new'}
                onChange={(e) => setUpdateMode(e.target.value)}
                className="w-4 h-4"
              />
              <div>
                <div className="text-gray-900">Only New Products</div>
                <div className="text-sm text-gray-600">Do not update existing products</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="updateMode"
                value="update"
                checked={updateMode === 'update'}
                onChange={(e) => setUpdateMode(e.target.value)}
                className="w-4 h-4"
              />
              <div>
                <div className="text-gray-900">Only Update</div>
                <div className="text-sm text-gray-600">Update only existing products</div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="updateMode"
                value="both"
                checked={updateMode === 'both'}
                onChange={(e) => setUpdateMode(e.target.value)}
                className="w-4 h-4"
              />
              <div>
                <div className="text-gray-900">Update + Add</div>
                <div className="text-sm text-gray-600">Update existing and add new</div>
              </div>
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-2">Comparison Key</label>
          <select
            value={comparisonKey}
            onChange={(e) => setComparisonKey(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="sku">SKU</option>
            <option value="id">ID</option>
            <option value="title">Product Title</option>
            <option value="ean">EAN</option>
            <option value="gtin">GTIN</option>
            <option value="custom">Custom Field</option>
          </select>
        </div>

        <div className="space-y-3">
          <label className="flex items-center gap-3">
            <input type="checkbox" className="w-4 h-4" />
            <span className="text-gray-900">Do not overwrite manually changed fields</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" className="w-4 h-4" />
            <span className="text-gray-900">Delete products not in file</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" defaultChecked className="w-4 h-4" />
            <span className="text-gray-900">Update images</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-gray-900 mb-6">Launch Import</h2>

      <div className="mb-6 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-gray-900 mb-3">Import Parameters</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Source:</span>
            <span className="text-gray-900">Upload File</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Format:</span>
            <span className="text-gray-900">CSV</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Mapped Fields:</span>
            <span className="text-gray-900">5 out of 8</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Mode:</span>
            <span className="text-gray-900">Update + Add</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Comparison Key:</span>
            <span className="text-gray-900">SKU</span>
          </div>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm text-gray-600 mb-2">Profile Name (optional)</label>
          <input
            type="text"
            placeholder="Example: Products from Supplier A"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2">
          <Play className="w-5 h-5" />
          Start Import
        </button>
        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
          <Save className="w-5 h-5" />
          Save Profile
        </button>
        <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Schedule
        </button>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return (
        <FieldMapping
          onBack={() => setCurrentStep(2)}
          onNext={() => setCurrentStep(4)}
        />
      );
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return null;
    }
  };

  return (
    <div className={currentStep === 3 ? '' : 'p-8 bg-gray-50'}>
      <div className={currentStep === 3 ? 'p-8 bg-gray-50' : ''}>
        <div className="mb-6">
          <h1 className="text-2xl text-gray-900 mb-2">New Import</h1>
          <p className="text-gray-500">Import creation wizard - step {currentStep} of 5</p>
        </div>

        {renderStepIndicator()}
      </div>
      
      {renderCurrentStep()}

      {currentStep !== 3 && (
        <div className="flex justify-between mt-6">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft className="w-5 h-5" />
            Back
          </button>
          <button
            onClick={() => setCurrentStep(Math.min(5, currentStep + 1))}
            disabled={currentStep === 5}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}