import { AlertCircle, Check, CheckCircle2, X, RefreshCw, DollarSign, AlertTriangle } from 'lucide-react';

interface VariationsTabProps {
  variationModel: 'classic' | 'no-parent-sku' | 'auto-sku' | 'shared-price';
  setVariationModel: (model: 'classic' | 'no-parent-sku' | 'auto-sku' | 'shared-price') => void;
  DropZoneField: any;
  getMappedSourceField: (id: string) => any;
  getManualValue: (id: string) => string;
  handleDrop: (sourceField: any, targetField: any) => void;
  handleRemoveMapping: (targetFieldId: string) => void;
  handleManualValueChange: (targetFieldId: string, value: string) => void;
}

export function VariationsTab({
  variationModel,
  setVariationModel,
  DropZoneField,
  getMappedSourceField,
  getManualValue,
  handleDrop,
  handleRemoveMapping,
  handleManualValueChange
}: VariationsTabProps) {
  return (
    <div className="space-y-6">
      {/* Model Selection */}
      <div>
        <h3 className="text-sm text-gray-900 mb-3">Select variable product model</h3>
        <div className="grid grid-cols-2 gap-3">
          {/* Model 1: Classic */}
          <button
            onClick={() => setVariationModel('classic')}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              variationModel === 'classic'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300 hover:border-red-300'
            }`}
          >
            <div className="flex items-start gap-2 mb-2">
              <Check className={`w-5 h-5 mt-0.5 flex-shrink-0 ${variationModel === 'classic' ? 'text-red-500' : 'text-gray-300'}`} />
              <div className="flex-1">
                <h4 className="text-sm text-gray-900 mb-1">1. Classic Model</h4>
                <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                  RECOMMENDED
                </span>
              </div>
            </div>
            <ul className="text-xs text-gray-600 space-y-1 ml-7">
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Parent SKU</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Variation SKUs</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Attributes at parent level</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Variation images optional</li>
            </ul>
          </button>

          {/* Model 2: No Parent SKU */}
          <button
            onClick={() => setVariationModel('no-parent-sku')}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              variationModel === 'no-parent-sku'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300 hover:border-red-300'
            }`}
          >
            <div className="flex items-start gap-2 mb-2">
              <Check className={`w-5 h-5 mt-0.5 flex-shrink-0 ${variationModel === 'no-parent-sku' ? 'text-red-500' : 'text-gray-300'}`} />
              <div className="flex-1">
                <h4 className="text-sm text-gray-900 mb-1">2. No Parent SKU</h4>
                <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                  Identification by name
                </span>
              </div>
            </div>
            <ul className="text-xs text-gray-600 space-y-1 ml-7">
              <li className="flex items-center gap-1"><X className="w-3 h-3 text-red-500" /> Parent SKU absent</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Variation SKUs</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Linked by product name</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Variation images optional</li>
            </ul>
          </button>

          {/* Model 3: Auto SKU */}
          <button
            onClick={() => setVariationModel('auto-sku')}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              variationModel === 'auto-sku'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300 hover:border-red-300'
            }`}
          >
            <div className="flex items-start gap-2 mb-2">
              <Check className={`w-5 h-5 mt-0.5 flex-shrink-0 ${variationModel === 'auto-sku' ? 'text-red-500' : 'text-gray-300'}`} />
              <div className="flex-1">
                <h4 className="text-sm text-gray-900 mb-1">3. Auto-generate SKU</h4>
                <span className="inline-block px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded border border-red-200">
                  SKU created automatically
                </span>
              </div>
            </div>
            <ul className="text-xs text-gray-600 space-y-1 ml-7">
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Parent SKU</li>
              <li className="flex items-center gap-1"><RefreshCw className="w-3 h-3 text-purple-600" /> Variation SKU generated</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Formula: PARENT-ATTR1-ATTR2</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Variation images optional</li>
            </ul>
          </button>

          {/* Model 4: Shared Price */}
          <button
            onClick={() => setVariationModel('shared-price')}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              variationModel === 'shared-price'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300 hover:border-red-300'
            }`}
          >
            <div className="flex items-start gap-2 mb-2">
              <Check className={`w-5 h-5 mt-0.5 flex-shrink-0 ${variationModel === 'shared-price' ? 'text-red-500' : 'text-gray-300'}`} />
              <div className="flex-1">
                <h4 className="text-sm text-gray-900 mb-1">4. Shared Price</h4>
                <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                  Price at parent level
                </span>
              </div>
            </div>
            <ul className="text-xs text-gray-600 space-y-1 ml-7">
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Parent SKU</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Variation SKUs</li>
              <li className="flex items-center gap-1"><DollarSign className="w-3 h-3 text-orange-600" /> Price only at parent</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Variation images optional</li>
            </ul>
          </button>
        </div>
      </div>

      {/* Model Mapping Fields */}
      <div className="space-y-4">
        {variationModel === 'classic' && (
          <div className="bg-white border-2 border-gray-300 rounded-lg">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
              <h4 className="text-sm text-gray-900">Model 1: Classic (Recommended)</h4>
              <p className="text-xs text-gray-600 mt-1">
                Reference model for import. Full compatibility with ERP, warehouse, API.
              </p>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Parent Level Fields */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <h5 className="text-xs text-red-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Parent Product
                </h5>
                <div className="grid grid-cols-2 gap-3">
                  <DropZoneField
                    field={{ id: 'var_parent_sku', label: 'Parent SKU', type: 'text', placeholder: 'e.g., TSHIRT-01', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_parent_sku')}
                    manualValue={getManualValue('var_parent_sku')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                    onManualChange={handleManualValueChange}
                  />
                  <DropZoneField
                    field={{ id: 'var_parent_name', label: 'Parent Name', type: 'text', placeholder: 'e.g., T-Shirt', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_parent_name')}
                    manualValue={getManualValue('var_parent_name')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                    onManualChange={handleManualValueChange}
                  />
                </div>
              </div>

              {/* Variation Level Fields */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h5 className="text-xs text-blue-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Variations
                </h5>
                <div className="grid grid-cols-2 gap-3">
                  <DropZoneField
                    field={{ id: 'var_variation_sku', label: 'Variation SKU', type: 'text', placeholder: 'e.g., TSHIRT-01-R-M', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_sku')}
                    manualValue={getManualValue('var_variation_sku')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                    onManualChange={handleManualValueChange}
                  />
                  <DropZoneField
                    field={{ id: 'var_variation_price', label: 'Variation Price', type: 'number', placeholder: 'e.g., 25.00', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_price')}
                    manualValue={getManualValue('var_variation_price')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                    onManualChange={handleManualValueChange}
                  />
                  <DropZoneField
                    field={{ id: 'var_variation_stock', label: 'Variation Stock', type: 'number', placeholder: 'e.g., 10', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_stock')}
                    manualValue={getManualValue('var_variation_stock')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                    onManualChange={handleManualValueChange}
                  />
                  <DropZoneField
                    field={{ id: 'var_variation_image', label: 'Variation Image', type: 'image', placeholder: 'Image URL (optional)', required: false, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_image')}
                    manualValue={getManualValue('var_variation_image')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                    onManualChange={handleManualValueChange}
                  />
                </div>
              </div>

              {/* Attributes Note */}
              <div className="bg-gray-50 border border-gray-300 rounded p-3 text-xs text-gray-600 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Attributes:</strong> use "Attributes" tab to configure Color, Size and other attributes
                </div>
              </div>
            </div>
          </div>
        )}

        {variationModel === 'no-parent-sku' && (
          <div className="bg-white border-2 border-gray-300 rounded-lg">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
              <h4 className="text-sm text-gray-900">Model 2: No Parent SKU</h4>
              <p className="text-xs text-gray-600 mt-1">
                Often used by suppliers. Identification by product name.
              </p>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Parent Level Fields */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <h5 className="text-xs text-red-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Parent Product
                </h5>
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3 text-xs text-yellow-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Parent SKU is absent. Linked via Product Name!</span>
                </div>
                <DropZoneField
                  field={{ id: 'var_parent_name_nosku', label: 'Parent Name', type: 'text', placeholder: 'e.g., Sneakers Air', required: true, section: 'variations' }}
                  mappedSourceField={getMappedSourceField('var_parent_name_nosku')}
                  manualValue={getManualValue('var_parent_name_nosku')}
                  onDrop={handleDrop}
                  onRemove={handleRemoveMapping}
                  onManualChange={handleManualValueChange}
                />
              </div>

              {/* Variation Level Fields */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h5 className="text-xs text-blue-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Variations
                </h5>
                <div className="grid grid-cols-2 gap-3">
                  <DropZoneField
                    field={{ id: 'var_variation_sku_noparent', label: 'Variation SKU', type: 'text', placeholder: 'e.g., AIR-R-42', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_sku_noparent')}
                    manualValue={getManualValue('var_variation_sku_noparent')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                    onManualChange={handleManualValueChange}
                  />
                  <DropZoneField
                    field={{ id: 'var_variation_price_noparent', label: 'Variation Price', type: 'number', placeholder: 'e.g., 99.00', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_price_noparent')}
                    manualValue={getManualValue('var_variation_price_noparent')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                    onManualChange={handleManualValueChange}
                  />
                  <DropZoneField
                    field={{ id: 'var_variation_stock_noparent', label: 'Variation Stock', type: 'number', placeholder: 'e.g., 5', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_stock_noparent')}
                    manualValue={getManualValue('var_variation_stock_noparent')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                    onManualChange={handleManualValueChange}
                  />
                  <DropZoneField
                    field={{ id: 'var_variation_image_noparent', label: 'Variation Image', type: 'image', placeholder: 'Image URL (optional)', required: false, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_image_noparent')}
                    manualValue={getManualValue('var_variation_image_noparent')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                    onManualChange={handleManualValueChange}
                  />
                </div>
              </div>

              {/* Attributes Note */}
              <div className="bg-gray-50 border border-gray-300 rounded p-3 text-xs text-gray-600 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Attributes:</strong> use "Attributes" tab to configure Color, Size and other attributes
                </div>
              </div>
            </div>
          </div>
        )}

        {variationModel === 'auto-sku' && (
          <div className="bg-white border-2 border-gray-300 rounded-lg">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
              <h4 className="text-sm text-gray-900">Model 3: Auto-generate Variation SKU</h4>
              <p className="text-xs text-gray-600 mt-1">
                Variation SKU generated automatically based on attributes.
              </p>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Formula Info */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <h5 className="text-xs text-purple-900 mb-2 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  SKU auto-generation formula:
                </h5>
                <code className="text-xs text-purple-800 bg-purple-100 px-2 py-1 rounded">
                  PARENT_SKU + "-" + Attribute_Abbreviations
                </code>
                <div className="mt-2 text-xs text-purple-700">
                  Example: <strong>TSHIRT-01-R-XL</strong> (where R = Red, XL = XL)
                </div>
              </div>

              {/* Parent Level Fields */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <h5 className="text-xs text-red-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Parent Product
                </h5>
                <div className="grid grid-cols-2 gap-3">
                  <DropZoneField
                    field={{ id: 'var_parent_sku_auto', label: 'Parent SKU', type: 'text', placeholder: 'e.g., TSHIRT-01', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_parent_sku_auto')}
                    manualValue={getManualValue('var_parent_sku_auto')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                    onManualChange={handleManualValueChange}
                  />
                  <DropZoneField
                    field={{ id: 'var_parent_name_auto', label: 'Parent Name', type: 'text', placeholder: 'e.g., T-Shirt', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_parent_name_auto')}
                    manualValue={getManualValue('var_parent_name_auto')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                    onManualChange={handleManualValueChange}
                  />
                </div>
              </div>

              {/* Variation Level Fields */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h5 className="text-xs text-blue-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Variations
                </h5>
                <div className="bg-purple-50 border border-purple-200 rounded p-2 mb-3 text-xs text-purple-800 flex items-start gap-2">
                  <RefreshCw className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Variation SKU generated automatically. Specify only price and stock.</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <DropZoneField
                    field={{ id: 'var_variation_price_auto', label: 'Variation Price', type: 'number', placeholder: 'e.g., 25.00', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_price_auto')}
                    manualValue={getManualValue('var_variation_price_auto')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                    onManualChange={handleManualValueChange}
                  />
                  <DropZoneField
                    field={{ id: 'var_variation_stock_auto', label: 'Variation Stock', type: 'number', placeholder: 'e.g., 10', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_stock_auto')}
                    manualValue={getManualValue('var_variation_stock_auto')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                    onManualChange={handleManualValueChange}
                  />
                  <DropZoneField
                    field={{ id: 'var_variation_image_auto', label: 'Variation Image', type: 'image', placeholder: 'Image URL (optional)', required: false, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_image_auto')}
                    manualValue={getManualValue('var_variation_image_auto')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                    onManualChange={handleManualValueChange}
                  />
                </div>
              </div>

              {/* Attributes Note */}
              <div className="bg-gray-50 border border-gray-300 rounded p-3 text-xs text-gray-600 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Attributes:</strong> use "Attributes" tab to configure attributes that will be used in SKU generation formula
                </div>
              </div>
            </div>
          </div>
        )}

        {variationModel === 'shared-price' && (
          <div className="bg-white border-2 border-gray-300 rounded-lg">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
              <h4 className="text-sm text-gray-900">Model 4: Shared Price at Parent Level</h4>
              <p className="text-xs text-gray-600 mt-1">
                Convenient for fashion catalogs. Price inherited from parent product.
              </p>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Parent Level Fields */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <h5 className="text-xs text-red-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Parent Product
                </h5>
                <div className="grid grid-cols-3 gap-3">
                  <DropZoneField
                    field={{ id: 'var_parent_sku_shared', label: 'Parent SKU', type: 'text', placeholder: 'e.g., JACKET-01', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_parent_sku_shared')}
                    manualValue={getManualValue('var_parent_sku_shared')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                    onManualChange={handleManualValueChange}
                  />
                  <DropZoneField
                    field={{ id: 'var_parent_name_shared', label: 'Parent Name', type: 'text', placeholder: 'e.g., Jacket', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_parent_name_shared')}
                    manualValue={getManualValue('var_parent_name_shared')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                    onManualChange={handleManualValueChange}
                  />
                  <DropZoneField
                    field={{ id: 'var_parent_price_shared', label: 'Parent Price', type: 'number', placeholder: 'e.g., 120.00', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_parent_price_shared')}
                    manualValue={getManualValue('var_parent_price_shared')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                    onManualChange={handleManualValueChange}
                  />
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded p-2 mt-3 text-xs text-orange-800 flex items-start gap-2">
                  <DollarSign className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Price set at parent level and inherited by all variations</span>
                </div>
              </div>

              {/* Variation Level Fields */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h5 className="text-xs text-blue-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Variations
                </h5>
                <div className="grid grid-cols-2 gap-3">
                  <DropZoneField
                    field={{ id: 'var_variation_sku_shared', label: 'Variation SKU', type: 'text', placeholder: 'e.g., JACKET-01-B-M', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_sku_shared')}
                    manualValue={getManualValue('var_variation_sku_shared')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                    onManualChange={handleManualValueChange}
                  />
                  <DropZoneField
                    field={{ id: 'var_variation_stock_shared', label: 'Variation Stock', type: 'number', placeholder: 'e.g., 4', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_stock_shared')}
                    manualValue={getManualValue('var_variation_stock_shared')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                    onManualChange={handleManualValueChange}
                  />
                  <DropZoneField
                    field={{ id: 'var_variation_image_shared', label: 'Variation Image', type: 'image', placeholder: 'Image URL (optional)', required: false, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_image_shared')}
                    manualValue={getManualValue('var_variation_image_shared')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                    onManualChange={handleManualValueChange}
                  />
                </div>
              </div>

              {/* Attributes Note */}
              <div className="bg-gray-50 border border-gray-300 rounded p-3 text-xs text-gray-600 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Attributes:</strong> use "Attributes" tab to configure Color, Size and other attributes
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Validation Rules */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="text-sm text-gray-900 mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-yellow-600" />
          Required rules for all models
        </h4>
        <ul className="text-xs text-gray-700 space-y-1 ml-6">
          <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-600" /> Attribute combination uniqueness check</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-600" /> SKU uniqueness check (including auto-generation)</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-600" /> Support for images at parent and variation level</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-600" /> Individual stock for each variation</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-600" /> Validation of required attributes</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-600" /> Validation of name and SKU conflicts</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-600" /> Duplicate variation check</li>
        </ul>
      </div>
    </div>
  );
}