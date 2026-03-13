import { useState } from 'react';
import { Calendar, Clock, Edit, Trash2, Pause, Play, Plus, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export function ScheduledImports() {
  const [activeTab, setActiveTab] = useState<'list' | 'calendar'>('list');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [scheduleName, setScheduleName] = useState('');
  const [selectedProfile, setSelectedProfile] = useState('');
  const [frequency, setFrequency] = useState('weekly');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon']);
  const [timezone, setTimezone] = useState('Europe/Istanbul');
  const [runTimes, setRunTimes] = useState(['09:00']);
  const [isActive, setIsActive] = useState(true);
  const [useDateRange, setUseDateRange] = useState(false);
  const [scheduleStartDate, setScheduleStartDate] = useState<Date | null>(null);
  const [scheduleEndDate, setScheduleEndDate] = useState<Date | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'paused'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [cronExpression, setCronExpression] = useState('0 0 * * *');
  const [notificationEmail, setNotificationEmail] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const schedules = [
    {
      id: 1,
      profile: 'Products from Supplier A',
      frequency: 'Daily',
      time: '14:30',
      status: 'active',
      lastRun: '2025-12-04 14:30',
      nextRun: '2025-12-05 14:30',
      dateRange: 'Ongoing',
    },
    {
      id: 2,
      profile: 'Google Sheets Sync',
      frequency: 'Every 6 hours',
      time: '00:00, 06:00, 12:00, 18:00',
      status: 'active',
      lastRun: '2025-12-04 12:00',
      nextRun: '2025-12-04 18:00',
      dateRange: 'Ongoing',
    },
    {
      id: 3,
      profile: 'New Products Weekly',
      frequency: 'Weekly',
      time: 'Monday 09:00',
      status: 'active',
      lastRun: '2025-11-27 09:00',
      nextRun: '2025-12-04 09:00',
      dateRange: '2025-01-01 - 2025-12-31',
    },
    {
      id: 4,
      profile: 'XML Product Feed',
      frequency: 'Daily',
      time: '00:00',
      status: 'active',
      lastRun: '2025-12-04 00:00',
      nextRun: '2025-12-05 00:00',
      dateRange: 'Ongoing',
    },
    {
      id: 5,
      profile: 'Price Update Hourly',
      frequency: 'Hourly',
      time: 'Every hour',
      status: 'paused',
      lastRun: '2025-12-03 15:00',
      nextRun: 'Paused',
      dateRange: 'Ongoing',
    },
  ];

  const importProfiles = [
    'Products from Supplier A',
    'Google Sheets Sync',
    'New Products Weekly',
    'XML Product Feed',
    'Price Update Hourly',
    'Amazon Inventory Sync',
  ];

  const getStatusBadge = (status: string) => {
    const styles = {
      active: { bg: 'bg-green-100', text: 'text-green-700', label: 'Active' },
      paused: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Paused' },
    };
    const style = styles[status as keyof typeof styles];
    return (
      <span className={`inline-block px-2 py-1 rounded text-xs ${style.bg} ${style.text}`}>
        {style.label}
      </span>
    );
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const addRunTime = () => {
    setRunTimes([...runTimes, '09:00']);
  };

  const removeRunTime = (index: number) => {
    setRunTimes(runTimes.filter((_, i) => i !== index));
  };

  const updateRunTime = (index: number, value: string) => {
    const newTimes = [...runTimes];
    newTimes[index] = value;
    setRunTimes(newTimes);
  };

  const handleCreateSchedule = () => {
    // Handle schedule creation logic here
    setShowCreateModal(false);
    // Reset form
    setScheduleName('');
    setSelectedProfile('');
    setFrequency('weekly');
    setSelectedDays(['Mon']);
    setTimezone('Europe/Istanbul');
    setRunTimes(['09:00']);
    setIsActive(true);
    setUseDateRange(false);
    setScheduleStartDate(null);
    setScheduleEndDate(null);
    setDayOfMonth('1');
    setCronExpression('0 0 * * *');
    setNotificationEmail('');
    setSelectedMonth(new Date().getMonth());
    setSelectedYear(new Date().getFullYear());
  };

  // Count schedules by status
  const allCount = schedules.length;
  const activeCount = schedules.filter(s => s.status === 'active').length;
  const pausedCount = schedules.filter(s => s.status === 'paused').length;

  // Calendar functions
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    // Returns 0 for Sunday, 1 for Monday, etc.
    const day = new Date(year, month, 1).getDay();
    // Convert to Monday-based (0 = Monday, 6 = Sunday)
    return day === 0 ? 6 : day - 1;
  };

  const isToday = (day: number, month: number, year: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const hasScheduleOnDay = (day: number) => {
    // Mock data - in real app, this would check actual schedules
    return [4, 5, 8, 11, 12, 15, 18, 19, 22, 25, 26].includes(day);
  };

  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
    const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);
    const days = [];

    // Add empty cells for days before the first day of month
    for (let i = 0; i < firstDay; i++) {
      days.push({ day: 0, isCurrentMonth: false });
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ day, isCurrentMonth: true });
    }

    return days;
  };

  const previousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const nextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-gray-900 mb-2">Scheduled Imports</h1>
        <p className="text-gray-600">Manage automatic import schedules</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-6 py-3 transition-colors ${
              activeTab === 'list'
                ? 'border-b-2 border-red-500 text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            List of Schedules
          </button>
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-6 py-3 transition-colors ${
              activeTab === 'calendar'
                ? 'border-b-2 border-red-500 text-gray-900'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Schedule Calendar
          </button>
        </div>
      </div>

      {/* Filter Bar - Only for List Tab */}
      {activeTab === 'list' && (
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                filterStatus === 'all'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All schedules ({allCount})
            </button>
            <button
              onClick={() => setFilterStatus('active')}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                filterStatus === 'active'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Active ({activeCount})
            </button>
            <button
              onClick={() => setFilterStatus('paused')}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                filterStatus === 'paused'
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Paused ({pausedCount})
            </button>
            
            {/* Search Box */}
            <div className="relative ml-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by profile name..."
                className="pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent w-64"
              />
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Schedule
          </button>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'list' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Profile</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Frequency</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Time</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Status</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Date Range</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Last Run</th>
                  <th className="text-left py-3 px-4 text-sm text-gray-600">Next Run</th>
                  <th className="text-right py-3 px-4 text-sm text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules
                  .filter(schedule => {
                    if (filterStatus === 'all') return true;
                    return schedule.status === filterStatus;
                  })
                  .filter(schedule => schedule.profile.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((schedule) => (
                    <tr key={schedule.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900">{schedule.profile}</td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-1 bg-red-50 text-red-600 rounded text-xs border border-red-200">
                          {schedule.frequency}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{schedule.time}</td>
                      <td className="py-3 px-4">{getStatusBadge(schedule.status)}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{schedule.dateRange}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{schedule.lastRun}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">{schedule.nextRun}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          {schedule.status === 'active' ? (
                            <button
                              className="p-2 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                              title="Pause"
                            >
                              <Pause className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Resume"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-gray-600" />
            <h2 className="text-gray-900">Schedule Calendar</h2>
          </div>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={previousMonth}
              className="px-3 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-gray-900">
              {monthNames[selectedMonth]} {selectedYear}
            </div>
            <button
              onClick={nextMonth}
              className="px-3 py-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div key={day} className="text-center text-sm text-gray-600 py-2">
                {day}
              </div>
            ))}
            {generateCalendarDays().map((day, index) => {
              const isTodayFlag = isToday(day.day, selectedMonth, selectedYear);
              const hasScheduleFlag = hasScheduleOnDay(day.day);
              return (
                <div
                  key={index}
                  className={`aspect-square border rounded p-2 text-center ${
                    day.day < 1 || day.day > 31
                      ? 'bg-gray-50 text-gray-400'
                      : isTodayFlag
                      ? 'bg-blue-50 border-blue-500'
                      : hasScheduleFlag
                      ? 'bg-green-50 border-green-300'
                      : 'border-gray-200'
                  }`}
                >
                  {day.day > 0 && day.day <= 31 && (
                    <>
                      <div className="text-sm">{day.day}</div>
                      {hasScheduleFlag && (
                        <div className="w-1 h-1 bg-green-600 rounded-full mx-auto mt-1"></div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Schedule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-gray-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-gray-900">Create Schedule</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Schedule Name and Import Profile */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    Schedule name
                  </label>
                  <input
                    type="text"
                    value={scheduleName}
                    onChange={(e) => setScheduleName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="Enter schedule name"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    Import Profile
                  </label>
                  <select
                    value={selectedProfile}
                    onChange={(e) => setSelectedProfile(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  >
                    <option value="">Select a profile...</option>
                    {importProfiles.map((profile) => (
                      <option key={profile} value={profile}>
                        {profile}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Frequency */}
              <div>
                <label className="block text-sm text-gray-700 mb-3">
                  Frequency
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="frequency"
                      value="weekly"
                      checked={frequency === 'weekly'}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="w-4 h-4 text-red-500 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">Weekly</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="frequency"
                      value="monthly"
                      checked={frequency === 'monthly'}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="w-4 h-4 text-red-500 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">Monthly</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="frequency"
                      value="cron"
                      checked={frequency === 'cron'}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="w-4 h-4 text-red-500 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">Manual (cron expression)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="frequency"
                      value="none"
                      checked={frequency === 'none'}
                      onChange={(e) => setFrequency(e.target.value)}
                      className="w-4 h-4 text-red-500 focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700">None (manual only)</span>
                  </label>
                </div>
              </div>

              {/* Run on days */}
              {frequency === 'weekly' && (
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    Run on days
                  </label>
                  <div className="flex gap-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                      <button
                        key={day}
                        onClick={() => toggleDay(day)}
                        className={`px-3 py-2 text-sm rounded transition-colors ${
                          selectedDays.includes(day)
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Day of Month - for Monthly */}
              {frequency === 'monthly' && (
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    Day of month
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              )}

              {/* Cron Expression - for Manual */}
              {frequency === 'cron' && (
                <div>
                  <label className="block text-sm text-gray-700 mb-2">
                    Cron expression
                  </label>
                  <input
                    type="text"
                    value={cronExpression}
                    onChange={(e) => setCronExpression(e.target.value)}
                    placeholder="0 0 * * *"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Standard cron syntax: minute hour day month weekday
                  </p>
                </div>
              )}

              {/* Timezone */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Time zone (defaults to WordPress setting)
                </label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                >
                  <option value="Europe/Istanbul">Europe/Istanbul</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="America/Los_Angeles">America/Los_Angeles</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Asia/Tokyo">Asia/Tokyo</option>
                </select>
              </div>

              {/* Run at times */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Run at times
                </label>
                <div className="flex flex-wrap gap-2 items-start">
                  {runTimes.map((time, index) => (
                    <div key={index} className="flex items-center gap-1 border border-gray-300 rounded-lg px-2 py-1">
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => updateRunTime(index, e.target.value)}
                        className="border-0 p-0 focus:ring-0 focus:outline-none w-20 text-sm"
                        style={{
                          colorScheme: 'light',
                          backgroundColor: 'white'
                        }}
                      />
                      <Clock className="w-3 h-3 text-gray-400" />
                      {index > 0 && (
                        <button
                          onClick={() => removeRunTime(index)}
                          className="ml-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addRunTime}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:text-red-700 border border-dashed border-gray-300 rounded-lg hover:border-red-300 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add time
                  </button>
                </div>
              </div>

              {/* Date Range */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input
                    type="checkbox"
                    checked={useDateRange}
                    onChange={(e) => setUseDateRange(e.target.checked)}
                    className="w-4 h-4 text-red-500 focus:ring-red-500 rounded"
                  />
                  <span className="text-sm text-gray-700">Set schedule date range</span>
                </label>
                
                {useDateRange && (
                  <div className="grid grid-cols-2 gap-4 pl-6">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        Start Date
                      </label>
                      <DatePicker
                        selected={scheduleStartDate}
                        onChange={(date) => setScheduleStartDate(date)}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Select start date"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">
                        End Date
                      </label>
                      <DatePicker
                        selected={scheduleEndDate}
                        onChange={(date) => setScheduleEndDate(date)}
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Select end date"
                        minDate={scheduleStartDate}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                )}
                
                {!useDateRange && (
                  <p className="text-xs text-gray-500 pl-6">
                    Schedule will run from today with no end date
                  </p>
                )}
              </div>

              {/* Notification Email */}
              <div>
                <label className="block text-sm text-gray-700 mb-2">
                  Notification Email
                </label>
                <input
                  type="email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  placeholder="Enter email address"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 text-red-500 focus:ring-red-500 rounded"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSchedule}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Create Schedule
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}