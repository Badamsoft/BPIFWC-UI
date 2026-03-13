import { 
  CheckCircle, 
  X, 
  Zap, 
  Cloud, 
  Calendar, 
  Database, 
  History, 
  Settings, 
  BarChart3, 
  Shield,
  Sparkles,
  ArrowRight,
  Code
} from 'lucide-react';

export function UpgradeToPro() {
  const handleBuyNow = (plan: 'single' | 'bundle') => {
    if (plan === 'single') {
      // Product Importer PRO - Single Site License
      window.open('https://badamsoft.com/checkout/?add-to-cart=1234', '_blank');
    } else {
      // Product Importer PRO - Bundle (5 Sites)
      window.open('https://badamsoft.com/checkout/?add-to-cart=1235', '_blank');
    }
  };

  const proFeatures = [
    {
      icon: Cloud,
      title: 'Advanced Data Sources',
      description: 'Import from URL feeds, FTP/SFTP servers, and Google Sheets with automatic synchronization',
      free: false
    },
    {
      icon: Calendar,
      title: 'Scheduled Imports (CRON)',
      description: 'Automate your imports with flexible scheduling - hourly, daily, weekly, or custom intervals',
      free: false
    },
    {
      icon: Database,
      title: 'Data Source Management',
      description: 'Centralized management of all your external data sources with connection testing and monitoring',
      free: false
    },
    {
      icon: History,
      title: 'Rollback Changes',
      description: 'Safely revert any import with one click - restore products to their previous state',
      free: false
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Detailed import statistics, performance metrics, and insights about your product data',
      free: false
    },
    {
      icon: Settings,
      title: 'Performance Optimization',
      description: 'Fine-tune import speed, memory usage, and batch sizes for maximum efficiency',
      free: false
    },
    {
      icon: Shield,
      title: 'Priority Support',
      description: '24/7 priority support with direct access to our technical team via email and chat',
      free: false
    },
    {
      icon: Sparkles,
      title: 'Unlimited Import Profiles',
      description: 'Create and save unlimited import configurations for different products and scenarios',
      free: false
    },
    {
      icon: Code,
      title: 'REST API Endpoint',
      description: 'Connect to REST API for product data. Programmatically trigger imports and access product information',
      free: false
    }
  ];

  const comparisonFeatures = [
    {
      feature: 'CSV/XML Import',
      free: true,
      pro: true,
      description: 'Basic file import support'
    },
    {
      feature: 'Field Mapping',
      free: true,
      pro: true,
      description: 'Map CSV columns to product fields'
    },
    {
      feature: 'Import Profiles',
      free: '3 profiles',
      pro: 'Unlimited',
      description: 'Save import configurations'
    },
    {
      feature: 'Import History',
      free: 'Last 10',
      pro: 'Unlimited',
      description: 'Track past imports'
    },
    {
      feature: 'Manual Import',
      free: true,
      pro: true,
      description: 'One-time manual imports'
    },
    {
      feature: 'URL/FTP/SFTP Sources',
      free: false,
      pro: true,
      description: 'Import from remote locations'
    },
    {
      feature: 'Google Sheets Integration',
      free: false,
      pro: true,
      description: 'Sync with Google Sheets'
    },
    {
      feature: 'Scheduled Imports (CRON)',
      free: false,
      pro: true,
      description: 'Automated recurring imports'
    },
    {
      feature: 'Data Source Management',
      free: false,
      pro: true,
      description: 'Centralized source control'
    },
    {
      feature: 'Rollback Functionality',
      free: false,
      pro: true,
      description: 'Undo imports instantly'
    },
    {
      feature: 'Advanced Performance Settings',
      free: false,
      pro: true,
      description: 'Optimize import speed'
    },
    {
      feature: 'Detailed Analytics',
      free: false,
      pro: true,
      description: 'Deep insights and reports'
    },
    {
      feature: 'Support',
      free: 'Community',
      pro: 'Priority 24/7',
      description: 'Technical assistance'
    },
    {
      feature: 'Updates',
      free: 'Basic',
      pro: 'Priority + Beta',
      description: 'Feature updates'
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-full mb-4">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm">Product Importer Pricing</span>
        </div>
        <h1 className="text-gray-900 mb-4">Upgrade to Product Importer PRO</h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Import from anywhere with Smart Mode, drag & drop mapping, and Google Sheets integration
        </p>
        
        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto mb-12">
          {/* Free Plan */}
          <div className="bg-white rounded-lg border-2 border-gray-200 p-6 text-left">
            <div className="mb-4">
              <h3 className="text-gray-900 mb-2">Free</h3>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl text-gray-900">$0</span>
                <span className="text-gray-600">/forever</span>
              </div>
              <p className="text-sm text-gray-600">Perfect for getting started</p>
            </div>
            <ul className="space-y-2.5 mb-6 min-h-[280px]">
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">CSV/XML Import</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Field Mapping</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">3 Import Profiles</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Community Support</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Documentation access</span>
              </li>
            </ul>
            <button 
              className="w-full py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 transition-colors"
              disabled
            >
              Current Plan
            </button>
          </div>

          {/* PRO Single Site */}
          <div className="bg-white rounded-lg border-2 border-gray-300 p-6 text-left relative overflow-hidden">
            <div className="mb-4">
              <h3 className="text-gray-900 mb-2">Single Site</h3>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl text-gray-900">$39</span>
                <span className="text-gray-600">/year</span>
              </div>
              <p className="text-sm text-gray-600">Perfect for individual stores</p>
            </div>
            <ul className="space-y-2.5 mb-6 min-h-[280px]">
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Use on 1 site</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Unlimited imports</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">CSV, Excel, XML, JSON support</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Google Sheets & URL feeds</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Smart Mode auto-updates</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Drag & Drop field mapping</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Field validation</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">Reusable import profiles</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">WPML & ACF Integration</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">1 year of updates</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">1 year of support</span>
              </li>
            </ul>
            <button className="w-full py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2 font-medium" onClick={() => handleBuyNow('single')}>
              Buy Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* PRO 5 Sites - BEST VALUE */}
          <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg border-2 border-red-600 p-6 text-left relative overflow-hidden transform scale-105 shadow-lg">
            <div className="absolute top-4 right-4 bg-white text-red-600 text-xs px-3 py-1 rounded-full font-medium">
              BEST VALUE
            </div>
            <div className="mb-4">
              <h3 className="text-white mb-2">5 Sites</h3>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl text-white">$89</span>
                <span className="text-red-100">/year</span>
              </div>
              <p className="text-sm text-red-100">Best for agencies and developers</p>
            </div>
            <ul className="space-y-2.5 mb-6 min-h-[280px]">
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-white flex-shrink-0" />
                <span className="text-white">Use on 5 sites</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-white flex-shrink-0" />
                <span className="text-white">Unlimited imports</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-white flex-shrink-0" />
                <span className="text-white">CSV, Excel, XML, JSON support</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-white flex-shrink-0" />
                <span className="text-white">Google Sheets & URL feeds</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-white flex-shrink-0" />
                <span className="text-white">Smart Mode auto-updates</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-white flex-shrink-0" />
                <span className="text-white">Drag & Drop field mapping</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-white flex-shrink-0" />
                <span className="text-white">Field validation</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-white flex-shrink-0" />
                <span className="text-white">Reusable import profiles</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-white flex-shrink-0" />
                <span className="text-white">WPML & ACF Integration</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-white flex-shrink-0" />
                <span className="text-white">1 year of updates</span>
              </li>
              <li className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-white flex-shrink-0" />
                <span className="text-white">1 year of support</span>
              </li>
            </ul>
            <button 
              className="w-full py-3 bg-white text-red-600 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 font-medium shadow-md"
              onClick={() => handleBuyNow('bundle')}
            >
              Buy Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* PRO Features Grid */}
      <div className="mb-16">
        <div className="text-center mb-8">
          <h2 className="text-gray-900 mb-2">PRO Features</h2>
          <p className="text-gray-600">
            Powerful tools to automate and optimize your product import workflow
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {proFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:border-red-300 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-red-50 rounded-lg p-3">
                    <Icon className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-gray-900 mb-2 text-base">{feature.title}</h3>
                    <p className="text-sm text-gray-600">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="mb-12">
        <div className="text-center mb-8">
          <h2 className="text-gray-900 mb-2">FREE vs PRO Comparison</h2>
          <p className="text-gray-600">
            See what's included in each plan
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-4 text-left text-sm text-gray-900">Feature</th>
                <th className="px-6 py-4 text-center text-sm text-gray-900">FREE</th>
                <th className="px-6 py-4 text-center text-sm text-white bg-red-500">PRO</th>
              </tr>
            </thead>
            <tbody>
              {comparisonFeatures.map((item, index) => (
                <tr 
                  key={index}
                  className={`border-b border-gray-200 hover:bg-gray-50 transition-colors ${
                    index === comparisonFeatures.length - 1 ? 'border-b-0' : ''
                  }`}
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm text-gray-900 mb-1">{item.feature}</div>
                      <div className="text-xs text-gray-500">{item.description}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {typeof item.free === 'boolean' ? (
                      item.free ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-gray-300 mx-auto" />
                      )
                    ) : (
                      <span className="text-sm text-gray-700">{item.free}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center bg-red-50">
                    {typeof item.pro === 'boolean' ? (
                      item.pro ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-gray-300 mx-auto" />
                      )
                    ) : (
                      <span className="text-sm text-gray-900 font-medium">{item.pro}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-lg p-12 text-center text-white">
        <Zap className="w-12 h-12 mx-auto mb-4" />
        <h2 className="text-white mb-3">Ready to Supercharge Your Imports?</h2>
        <p className="text-red-100 mb-8 max-w-2xl mx-auto">
          Join thousands of WooCommerce store owners who have upgraded to PRO 
          and automated their entire product import workflow
        </p>
        <div className="flex items-center justify-center gap-4">
          <button className="px-8 py-3 bg-white text-red-600 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 font-medium" onClick={() => handleBuyNow('single')}>
            Get PRO Now
            <ArrowRight className="w-5 h-5" />
          </button>
          <button className="px-8 py-3 bg-transparent border-2 border-white text-white rounded-lg hover:bg-white hover:text-red-600 transition-colors">
            View Pricing
          </button>
        </div>
        <p className="text-red-100 text-sm mt-6">
          30-day money-back guarantee • Instant activation • Secure payment
        </p>
      </div>

      {/* FAQ or Trust Section */}
      <div className="mt-12 grid md:grid-cols-3 gap-6 text-center">
        <div className="p-6">
          <div className="text-3xl mb-2">🔒</div>
          <h3 className="text-gray-900 mb-2 text-base">Secure Payment</h3>
          <p className="text-sm text-gray-600">
            All transactions are encrypted and secure
          </p>
        </div>
        <div className="p-6">
          <div className="text-3xl mb-2">⚡</div>
          <h3 className="text-gray-900 mb-2 text-base">Instant Access</h3>
          <p className="text-sm text-gray-600">
            Activate PRO features immediately after purchase
          </p>
        </div>
        <div className="p-6">
          <div className="text-3xl mb-2">💰</div>
          <h3 className="text-gray-900 mb-2 text-base">Money-Back Guarantee</h3>
          <p className="text-sm text-gray-600">
            30-day refund policy, no questions asked
          </p>
        </div>
      </div>
    </div>
  );
}