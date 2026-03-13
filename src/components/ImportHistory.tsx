import { Download, RotateCcw, FileText, AlertCircle, X, Calendar } from 'lucide-react';
import { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export function ImportHistory() {
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [startDate, endDate] = dateRange;
  
  const history = [
    {
      id: 1,
      date: '2025-12-04 14:30:45',
      profile: 'Products from Supplier A',
      type: 'Manual',
      added: 45,
      updated: 120,
      skipped: 5,
      errors: 0,
      status: 'success',
      duration: '2m 15s',
    },
    {
      id: 2,
      date: '2025-12-04 10:15:22',
      profile: 'Google Sheets Sync',
      type: 'Scheduled',
      added: 12,
      updated: 88,
      skipped: 3,
      errors: 2,
      status: 'success',
      duration: '1m 45s',
    },
    {
      id: 3,
      date: '2025-12-03 22:00:10',
      profile: 'FTP Auto Import',
      type: 'Scheduled',
      added: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      status: 'running',
      duration: '-',
    },
    {
      id: 4,
      date: '2025-12-03 18:45:33',
      profile: 'Price Update Feed',
      type: 'Scheduled',
      added: 0,
      updated: 450,
      skipped: 12,
      errors: 5,
      status: 'success',
      duration: '4m 30s',
    },
    {
      id: 5,
      date: '2025-12-03 12:00:00',
      profile: 'New Products Weekly',
      type: 'Manual',
      added: 0,
      updated: 0,
      skipped: 0,
      errors: 15,
      status: 'error',
      duration: '0m 45s',
    },
    {
      id: 6,
      date: '2025-12-03 00:00:15',
      profile: 'XML Product Feed',
      type: 'Scheduled',
      added: 78,
      updated: 234,
      skipped: 8,
      errors: 1,
      status: 'success',
      duration: '5m 20s',
    },
    {
      id: 7,
      date: '2025-12-02 14:30:00',
      profile: 'Products from Supplier A',
      type: 'Manual',
      added: 38,
      updated: 125,
      skipped: 4,
      errors: 0,
      status: 'success',
      duration: '2m 10s',
    },
  ];

  const getStatusBadge = (status: string) => {
    const styles = {
      success: { bg: 'bg-green-100', text: 'text-green-700', label: 'Success' },
      error: { bg: 'bg-red-100', text: 'text-red-700', label: 'Error' },
      running: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Running' },
    };
    const style = styles[status as keyof typeof styles];
    return (
      <span className={`inline-block px-2 py-1 rounded text-xs ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-gray-900 mb-2">Import History & Logs</h1>
        <p className="text-gray-600">Import history and detailed operation logs</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Profile</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option>All Profiles</option>
              <option>Products from Supplier A</option>
              <option>Google Sheets Sync</option>
              <option>Price Update Feed</option>
              <option>New Products Weekly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Status</label>
            <select className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option>All Statuses</option>
              <option>Success</option>
              <option>With Errors</option>
              <option>Running</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Date Range</label>
            <DatePicker
              selectsRange={true}
              startDate={startDate}
              endDate={endDate}
              onChange={(update) => {
                setDateRange(update as [Date | null, Date | null]);
              }}
              monthsShown={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent cursor-pointer"
              placeholderText="Select date range"
              dateFormat="yyyy-MM-dd"
              isClearable={true}
              customInput={
                <button
                  type="button"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white text-left flex items-center justify-between hover:border-gray-400"
                >
                  <span className={startDate || endDate ? "text-gray-900" : "text-gray-400"}>
                    {startDate && endDate
                      ? `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`
                      : startDate
                      ? `${startDate.toLocaleDateString()} - ...`
                      : "Select date range"}
                  </span>
                  <Calendar className="w-4 h-4 text-gray-400" />
                </button>
              }
            />
          </div>
          <div className="flex items-end">
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              Apply Filters
            </button>
          </div>
          <div className="flex items-end">
            <button 
              onClick={() => setDateRange([null, null])}
              className="w-full px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-3 px-4 text-sm text-gray-600">Date & Time</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">Profile</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">Type</th>
                <th className="text-right py-3 px-4 text-sm text-gray-600">Added</th>
                <th className="text-right py-3 px-4 text-sm text-gray-600">Updated</th>
                <th className="text-right py-3 px-4 text-sm text-gray-600">Skipped</th>
                <th className="text-right py-3 px-4 text-sm text-gray-600">Errors</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">Status</th>
                <th className="text-left py-3 px-4 text-sm text-gray-600">Duration</th>
                <th className="text-right py-3 px-4 text-sm text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-sm text-gray-600">{item.date}</td>
                  <td className="py-3 px-4 text-sm text-gray-900">{item.profile}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{item.type}</td>
                  <td className="py-3 px-4 text-sm text-gray-900 text-right">
                    {item.added > 0 ? (
                      <span className="text-green-600">+{item.added}</span>
                    ) : (
                      item.added
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-900 text-right">
                    {item.updated > 0 ? (
                      <span className="text-blue-600">{item.updated}</span>
                    ) : (
                      item.updated
                    )}
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600 text-right">{item.skipped}</td>
                  <td className="py-3 px-4 text-sm text-right">
                    {item.errors > 0 ? (
                      <span className="text-red-600">{item.errors}</span>
                    ) : (
                      <span className="text-gray-600">{item.errors}</span>
                    )}
                  </td>
                  <td className="py-3 px-4">{getStatusBadge(item.status)}</td>
                  <td className="py-3 px-4 text-sm text-gray-600">{item.duration}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Download log"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="View log"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      {item.status === 'success' && (
                        <button
                          className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                          title="Repeat import"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Total Imports</div>
          <div className="text-gray-900">147</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Successful</div>
          <div className="text-green-600">142</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">With Errors</div>
          <div className="text-red-600">5</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-sm text-gray-600 mb-1">Products Processed</div>
          <div className="text-gray-900">12,485</div>
        </div>
      </div>

      {/* Pro Feature Notice */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
        <div>
          <h3 className="text-gray-900 mb-1">Rollback Feature - PRO</h3>
          <p className="text-sm text-gray-600">
            Rollback changes and revert products to their previous state with a single click. 
            Available only in Pro version.
          </p>
        </div>
      </div>
    </div>
  );
}