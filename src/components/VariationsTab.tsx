import { AlertCircle, Check, CheckCircle2, X, RefreshCw, DollarSign, AlertTriangle } from 'lucide-react';

interface VariationsTabProps {
  variationModel: 'classic' | 'no-parent-sku' | 'auto-sku' | 'shared-price';
  setVariationModel: (model: 'classic' | 'no-parent-sku' | 'auto-sku' | 'shared-price') => void;
  DropZoneField: any;
  getMappedSourceField: (id: string) => any;
  handleDrop: (sourceField: any, targetField: any) => void;
  handleRemoveMapping: (targetFieldId: string) => void;
}

export function VariationsTab({
  variationModel,
  setVariationModel,
  DropZoneField,
  getMappedSourceField,
  handleDrop,
  handleRemoveMapping
}: VariationsTabProps) {
  return (
    <div className="space-y-6">
      {/* Model Selection */}
      <div>
        <h3 className="text-sm text-gray-900 mb-3">Выберите модель вариативного товара</h3>
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
                <h4 className="text-sm text-gray-900 mb-1">1. Классическая модель</h4>
                <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                  РЕКОМЕНДУЕМАЯ
                </span>
              </div>
            </div>
            <ul className="text-xs text-gray-600 space-y-1 ml-7">
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Родительский SKU</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> SKU вариаций</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Атрибуты на уровне родителя</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Фото вариации — опционально</li>
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
                <h4 className="text-sm text-gray-900 mb-1">2. Без SKU родителя</h4>
                <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                  Идентификация по названию
                </span>
              </div>
            </div>
            <ul className="text-xs text-gray-600 space-y-1 ml-7">
              <li className="flex items-center gap-1"><X className="w-3 h-3 text-red-500" /> Родительский SKU отсутствует</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> SKU вариаций</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Связь по названию товара</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Фото вариации — опционально</li>
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
                <h4 className="text-sm text-gray-900 mb-1">3. Автогенерация SKU</h4>
                <span className="inline-block px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded border border-red-200">
                  SKU создаётся автоматически
                </span>
              </div>
            </div>
            <ul className="text-xs text-gray-600 space-y-1 ml-7">
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Родительский SKU</li>
              <li className="flex items-center gap-1"><RefreshCw className="w-3 h-3 text-purple-600" /> SKU вариаций генерируется</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Формула: PARENT-ATTR1-ATTR2</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Фото вариации — опционально</li>
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
                <h4 className="text-sm text-gray-900 mb-1">4. Общая цена</h4>
                <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                  Цена на уровне родителя
                </span>
              </div>
            </div>
            <ul className="text-xs text-gray-600 space-y-1 ml-7">
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Родительский SKU</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> SKU вариаций</li>
              <li className="flex items-center gap-1"><DollarSign className="w-3 h-3 text-orange-600" /> Цена только у родителя</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Фото вариации — опционально</li>
            </ul>
          </button>
        </div>
      </div>

      {/* Model Mapping Fields */}
      <div className="space-y-4">
        {variationModel === 'classic' && (
          <div className="bg-white border-2 border-gray-300 rounded-lg">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
              <h4 className="text-sm text-gray-900">Модель 1: Классическая (Рекомендуемая)</h4>
              <p className="text-xs text-gray-600 mt-1">
                Эталонная модель для импорта. Полная совместимость с ERP, складом, API.
              </p>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Parent Level Fields */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <h5 className="text-xs text-red-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Родительский товар
                </h5>
                <div className="grid grid-cols-2 gap-3">
                  <DropZoneField
                    field={{ id: 'var_parent_sku', label: 'Parent SKU', type: 'text', placeholder: 'e.g., TSHIRT-01', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_parent_sku')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                  <DropZoneField
                    field={{ id: 'var_parent_name', label: 'Parent Name', type: 'text', placeholder: 'e.g., T-Shirt', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_parent_name')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                </div>
              </div>

              {/* Variation Level Fields */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h5 className="text-xs text-blue-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Вариации
                </h5>
                <div className="grid grid-cols-2 gap-3">
                  <DropZoneField
                    field={{ id: 'var_variation_sku', label: 'Variation SKU', type: 'text', placeholder: 'e.g., TSHIRT-01-R-M', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_sku')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                  <DropZoneField
                    field={{ id: 'var_variation_price', label: 'Variation Price', type: 'number', placeholder: 'e.g., 25.00', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_price')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                  <DropZoneField
                    field={{ id: 'var_variation_stock', label: 'Variation Stock', type: 'number', placeholder: 'e.g., 10', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_stock')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                  <DropZoneField
                    field={{ id: 'var_variation_image', label: 'Variation Image', type: 'image', placeholder: 'Image URL (optional)', required: false, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_image')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                </div>
              </div>

              {/* Attributes Note */}
              <div className="bg-gray-50 border border-gray-300 rounded p-3 text-xs text-gray-600 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Атрибуты:</strong> используйте вкладку "Атрибуты" для настройки Color, Size и других атрибутов
                </div>
              </div>
            </div>
          </div>
        )}

        {variationModel === 'no-parent-sku' && (
          <div className="bg-white border-2 border-gray-300 rounded-lg">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
              <h4 className="text-sm text-gray-900">Модель 2: Без SKU родителя</h4>
              <p className="text-xs text-gray-600 mt-1">
                Часто используется у поставщиков. Идентификация по названию товара.
              </p>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Parent Level Fields */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <h5 className="text-xs text-red-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Родительский товар
                </h5>
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3 text-xs text-yellow-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Parent SKU отсутствует. Связь через Product Name!</span>
                </div>
                <DropZoneField
                  field={{ id: 'var_parent_name_nosku', label: 'Parent Name', type: 'text', placeholder: 'e.g., Sneakers Air', required: true, section: 'variations' }}
                  mappedSourceField={getMappedSourceField('var_parent_name_nosku')}
                  onDrop={handleDrop}
                  onRemove={handleRemoveMapping}
                />
              </div>

              {/* Variation Level Fields */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h5 className="text-xs text-blue-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Вариации
                </h5>
                <div className="grid grid-cols-2 gap-3">
                  <DropZoneField
                    field={{ id: 'var_variation_sku_noparent', label: 'Variation SKU', type: 'text', placeholder: 'e.g., AIR-R-42', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_sku_noparent')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                  <DropZoneField
                    field={{ id: 'var_variation_price_noparent', label: 'Variation Price', type: 'number', placeholder: 'e.g., 99.00', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_price_noparent')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                  <DropZoneField
                    field={{ id: 'var_variation_stock_noparent', label: 'Variation Stock', type: 'number', placeholder: 'e.g., 5', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_stock_noparent')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                  <DropZoneField
                    field={{ id: 'var_variation_image_noparent', label: 'Variation Image', type: 'image', placeholder: 'Image URL (optional)', required: false, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_image_noparent')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                </div>
              </div>

              {/* Attributes Note */}
              <div className="bg-gray-50 border border-gray-300 rounded p-3 text-xs text-gray-600 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Атрибуты:</strong> используйте вкладку "Атрибуты" для настройки Color, Size и других атрибутов
                </div>
              </div>
            </div>
          </div>
        )}

        {variationModel === 'auto-sku' && (
          <div className="bg-white border-2 border-gray-300 rounded-lg">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
              <h4 className="text-sm text-gray-900">Модель 3: Автогенерация SKU вариаций</h4>
              <p className="text-xs text-gray-600 mt-1">
                SKU вариаций генерируется автоматически на основе атрибутов.
              </p>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Formula Info */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <h5 className="text-xs text-purple-900 mb-2 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Формула автогенерации SKU:
                </h5>
                <code className="text-xs text-purple-800 bg-purple-100 px-2 py-1 rounded">
                  PARENT_SKU + "-" + Attribute_Abbreviations
                </code>
                <div className="mt-2 text-xs text-purple-700">
                  Пример: <strong>TSHIRT-01-R-XL</strong> (где R = Red, XL = XL)
                </div>
              </div>

              {/* Parent Level Fields */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <h5 className="text-xs text-red-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Родительский товар
                </h5>
                <div className="grid grid-cols-2 gap-3">
                  <DropZoneField
                    field={{ id: 'var_parent_sku_auto', label: 'Parent SKU', type: 'text', placeholder: 'e.g., TSHIRT-01', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_parent_sku_auto')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                  <DropZoneField
                    field={{ id: 'var_parent_name_auto', label: 'Parent Name', type: 'text', placeholder: 'e.g., T-Shirt', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_parent_name_auto')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                </div>
              </div>

              {/* Variation Level Fields */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h5 className="text-xs text-blue-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Вариации
                </h5>
                <div className="bg-purple-50 border border-purple-200 rounded p-2 mb-3 text-xs text-purple-800 flex items-start gap-2">
                  <RefreshCw className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>SKU вариации генерируется автоматически. Укажите только цену и остаток.</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <DropZoneField
                    field={{ id: 'var_variation_price_auto', label: 'Variation Price', type: 'number', placeholder: 'e.g., 25.00', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_price_auto')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                  <DropZoneField
                    field={{ id: 'var_variation_stock_auto', label: 'Variation Stock', type: 'number', placeholder: 'e.g., 10', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_stock_auto')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                  <DropZoneField
                    field={{ id: 'var_variation_image_auto', label: 'Variation Image', type: 'image', placeholder: 'Image URL (optional)', required: false, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_image_auto')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                </div>
              </div>

              {/* Attributes Note */}
              <div className="bg-gray-50 border border-gray-300 rounded p-3 text-xs text-gray-600 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Атрибуты:</strong> используйте вкладку "Атрибуты" для настройки атрибутов, которые будут использоваться в формуле генерации SKU
                </div>
              </div>
            </div>
          </div>
        )}

        {variationModel === 'shared-price' && (
          <div className="bg-white border-2 border-gray-300 rounded-lg">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
              <h4 className="text-sm text-gray-900">Модель 4: Общая цена на уровне родителя</h4>
              <p className="text-xs text-gray-600 mt-1">
                Удобна для fashion-каталогов. Цена наследуется от родительского товара.
              </p>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Parent Level Fields */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <h5 className="text-xs text-red-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Родительский товар
                </h5>
                <div className="grid grid-cols-3 gap-3">
                  <DropZoneField
                    field={{ id: 'var_parent_sku_shared', label: 'Parent SKU', type: 'text', placeholder: 'e.g., JACKET-01', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_parent_sku_shared')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                  <DropZoneField
                    field={{ id: 'var_parent_name_shared', label: 'Parent Name', type: 'text', placeholder: 'e.g., Jacket', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_parent_name_shared')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                  <DropZoneField
                    field={{ id: 'var_parent_price_shared', label: 'Parent Price', type: 'number', placeholder: 'e.g., 120.00', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_parent_price_shared')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded p-2 mt-3 text-xs text-orange-800 flex items-start gap-2">
                  <DollarSign className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Цена задана на уровне родителя и наследуется всеми вариациями</span>
                </div>
              </div>

              {/* Variation Level Fields */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h5 className="text-xs text-blue-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Вариации
                </h5>
                <div className="grid grid-cols-2 gap-3">
                  <DropZoneField
                    field={{ id: 'var_variation_sku_shared', label: 'Variation SKU', type: 'text', placeholder: 'e.g., JACKET-01-B-M', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_sku_shared')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                  <DropZoneField
                    field={{ id: 'var_variation_stock_shared', label: 'Variation Stock', type: 'number', placeholder: 'e.g., 4', required: true, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_stock_shared')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                  <DropZoneField
                    field={{ id: 'var_variation_image_shared', label: 'Variation Image', type: 'image', placeholder: 'Image URL (optional)', required: false, section: 'variations' }}
                    mappedSourceField={getMappedSourceField('var_variation_image_shared')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                </div>
              </div>

              {/* Attributes Note */}
              <div className="bg-gray-50 border border-gray-300 rounded p-3 text-xs text-gray-600 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Атрибуты:</strong> используйте вкладку "Атрибуты" для настройки Color, Size и других атрибутов
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
          Обязательные правила для всех моделей
        </h4>
        <ul className="text-xs text-gray-700 space-y-1 ml-6">
          <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-600" /> Проверка уникальности комбинаций атрибутов</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-600" /> Проверка уникальности SKU (включая автогенерацию)</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-600" /> Поддержка фото на уровне родителя и вариации</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-600" /> Свой остаток у каждой вариации</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-600" /> Валидация наличия обязательных атрибутов</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-600" /> Валидация конфликтов по имени и SKU</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-600" /> Проверка дублей вариаций</li>
        </ul>
      </div>
    </div>
  );
}