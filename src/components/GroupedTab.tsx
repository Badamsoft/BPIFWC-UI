import { AlertCircle, Check, CheckCircle2, X, PlusCircle, Package, Calculator, AlertTriangle, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface GroupedChild {
  id: string;
  index: number;
}

interface GroupedTabProps {
  groupedModel: 'classic' | 'no-parent-sku' | 'auto-create' | 'bundle';
  setGroupedModel: (model: 'classic' | 'no-parent-sku' | 'auto-create' | 'bundle') => void;
  DropZoneField: any;
  getMappedSourceField: (id: string) => any;
  getManualValue: (id: string) => string;
  handleDrop: (sourceField: any, targetField: any) => void;
  handleRemoveMapping: (targetFieldId: string) => void;
  handleManualValueChange: (targetFieldId: string, value: string) => void;
}

export function GroupedTab({
  groupedModel,
  setGroupedModel,
  DropZoneField,
  getMappedSourceField,
  getManualValue,
  handleDrop,
  handleRemoveMapping,
  handleManualValueChange
}: GroupedTabProps) {
  const [children, setChildren] = useState<GroupedChild[]>([
    { id: '1', index: 1 }
  ]);

  const addChild = () => {
    const newIndex = children.length > 0 ? Math.max(...children.map(c => c.index)) + 1 : 1;
    setChildren([...children, { id: Date.now().toString(), index: newIndex }]);
  };

  const removeChild = (id: string) => {
    if (children.length > 1) {
      setChildren(children.filter(c => c.id !== id));
    }
  };

  const renderChildFields = (child: GroupedChild, modelPrefix: string) => (
    <div key={child.id} className="bg-white border-2 border-blue-200 rounded-lg p-3 relative">
      <div className="flex items-center justify-between mb-3">
        <h6 className="text-xs text-blue-900">Child Product #{child.index}</h6>
        {children.length > 1 && (
          <button
            onClick={() => removeChild(child.id)}
            className="text-red-500 hover:text-red-700 transition-colors"
            title="Remove child product"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <DropZoneField
          field={{ 
            id: `grp_child_sku_${modelPrefix}_${child.id}`, 
            label: 'Child SKU', 
            type: 'text', 
            placeholder: 'e.g., KETTLE-01', 
            required: true, 
            section: 'grouped' 
          }}
          mappedSourceField={getMappedSourceField(`grp_child_sku_${modelPrefix}_${child.id}`)}
          manualValue={getManualValue(`grp_child_sku_${modelPrefix}_${child.id}`)}
          onDrop={handleDrop}
          onRemove={handleRemoveMapping}
          onManualChange={handleManualValueChange}
        />
        <DropZoneField
          field={{ 
            id: `grp_child_name_${modelPrefix}_${child.id}`, 
            label: 'Child Name', 
            type: 'text', 
            placeholder: 'e.g., Kettle', 
            required: true, 
            section: 'grouped' 
          }}
          mappedSourceField={getMappedSourceField(`grp_child_name_${modelPrefix}_${child.id}`)}
          manualValue={getManualValue(`grp_child_name_${modelPrefix}_${child.id}`)}
          onDrop={handleDrop}
          onRemove={handleRemoveMapping}
          onManualChange={handleManualValueChange}
        />
        <DropZoneField
          field={{ 
            id: `grp_child_price_${modelPrefix}_${child.id}`, 
            label: 'Child Price', 
            type: 'number', 
            placeholder: 'e.g., 30.00', 
            required: true, 
            section: 'grouped' 
          }}
          mappedSourceField={getMappedSourceField(`grp_child_price_${modelPrefix}_${child.id}`)}
          manualValue={getManualValue(`grp_child_price_${modelPrefix}_${child.id}`)}
          onDrop={handleDrop}
          onRemove={handleRemoveMapping}
          onManualChange={handleManualValueChange}
        />
        <DropZoneField
          field={{ 
            id: `grp_child_stock_${modelPrefix}_${child.id}`, 
            label: 'Child Stock', 
            type: 'number', 
            placeholder: 'e.g., 10', 
            required: true, 
            section: 'grouped' 
          }}
          mappedSourceField={getMappedSourceField(`grp_child_stock_${modelPrefix}_${child.id}`)}
          manualValue={getManualValue(`grp_child_stock_${modelPrefix}_${child.id}`)}
          onDrop={handleDrop}
          onRemove={handleRemoveMapping}
          onManualChange={handleManualValueChange}
        />
        <DropZoneField
          field={{ 
            id: `grp_child_image_${modelPrefix}_${child.id}`, 
            label: 'Child Image', 
            type: 'image', 
            placeholder: 'Image URL (optional)', 
            required: false, 
            section: 'grouped' 
          }}
          mappedSourceField={getMappedSourceField(`grp_child_image_${modelPrefix}_${child.id}`)}
          manualValue={getManualValue(`grp_child_image_${modelPrefix}_${child.id}`)}
          onDrop={handleDrop}
          onRemove={handleRemoveMapping}
          onManualChange={handleManualValueChange}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Model Selection */}
      <div>
        <h3 className="text-sm text-gray-900 mb-3">Select grouped product model</h3>
        <div className="grid grid-cols-2 gap-3">
          {/* Model 1: Classic Grouped */}
          <button
            onClick={() => setGroupedModel('classic')}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              groupedModel === 'classic'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300 hover:border-red-300'
            }`}
          >
            <div className="flex items-start gap-2 mb-2">
              <Check className={`w-5 h-5 mt-0.5 flex-shrink-0 ${groupedModel === 'classic' ? 'text-red-500' : 'text-gray-300'}`} />
              <div className="flex-1">
                <h4 className="text-sm text-gray-900 mb-1">1. Classic Grouped Model</h4>
                <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                  RECOMMENDED
                </span>
              </div>
            </div>
            <ul className="text-xs text-gray-600 space-y-1 ml-7">
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Parent container</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> All children have SKU</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> All children are simple</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Images optional</li>
            </ul>
          </button>

          {/* Model 2: No Parent SKU */}
          <button
            onClick={() => setGroupedModel('no-parent-sku')}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              groupedModel === 'no-parent-sku'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300 hover:border-red-300'
            }`}
          >
            <div className="flex items-start gap-2 mb-2">
              <Check className={`w-5 h-5 mt-0.5 flex-shrink-0 ${groupedModel === 'no-parent-sku' ? 'text-red-500' : 'text-gray-300'}`} />
              <div className="flex-1">
                <h4 className="text-sm text-gray-900 mb-1">2. No Parent SKU</h4>
                <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                  Identification by name
                </span>
              </div>
            </div>
            <ul className="text-xs text-gray-600 space-y-1 ml-7">
              <li className="flex items-center gap-1"><X className="w-3 h-3 text-red-500" /> Parent SKU absent</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Children have SKU</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Linked by Group Name</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Images optional</li>
            </ul>
          </button>

          {/* Model 3: Auto Create Children */}
          <button
            onClick={() => setGroupedModel('auto-create')}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              groupedModel === 'auto-create'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300 hover:border-red-300'
            }`}
          >
            <div className="flex items-start gap-2 mb-2">
              <Check className={`w-5 h-5 mt-0.5 flex-shrink-0 ${groupedModel === 'auto-create' ? 'text-red-500' : 'text-gray-300'}`} />
              <div className="flex-1">
                <h4 className="text-sm text-gray-900 mb-1">3. Auto-create Children</h4>
                <span className="inline-block px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded border border-red-200">
                  Products created automatically
                </span>
              </div>
            </div>
            <ul className="text-xs text-gray-600 space-y-1 ml-7">
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Grouped container</li>
              <li className="flex items-center gap-1"><PlusCircle className="w-3 h-3 text-purple-600" /> Auto-create by Child SKU</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Minimal manual work</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Images optional</li>
            </ul>
          </button>

          {/* Model 4: Bundle without Price */}
          <button
            onClick={() => setGroupedModel('bundle')}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              groupedModel === 'bundle'
                ? 'border-red-500 bg-red-50'
                : 'border-gray-300 hover:border-red-300'
            }`}
          >
            <div className="flex items-start gap-2 mb-2">
              <Check className={`w-5 h-5 mt-0.5 flex-shrink-0 ${groupedModel === 'bundle' ? 'text-red-500' : 'text-gray-300'}`} />
              <div className="flex-1">
                <h4 className="text-sm text-gray-900 mb-1">4. Bundle</h4>
                <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                  Price = sum of children
                </span>
              </div>
            </div>
            <ul className="text-xs text-gray-600 space-y-1 ml-7">
              <li className="flex items-center gap-1"><Package className="w-3 h-3 text-orange-600" /> Parent is showcase</li>
              <li className="flex items-center gap-1"><Calculator className="w-3 h-3 text-orange-600" /> Price calculated</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Perfect for sets</li>
              <li className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-green-600" /> Images optional</li>
            </ul>
          </button>
        </div>
      </div>

      {/* Model Mapping Fields */}
      <div className="space-y-4">
        {groupedModel === 'classic' && (
          <div className="bg-white border-2 border-gray-300 rounded-lg">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
              <h4 className="text-sm text-gray-900">Model 1: Classic Grouped (Recommended)</h4>
              <p className="text-xs text-gray-600 mt-1">
                Reference model for grouped import. Compatible with all APIs and highly stable for updates.
              </p>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Parent Level Fields */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <h5 className="text-xs text-red-900 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Parent Product (Container)
                </h5>
                <div className="grid grid-cols-3 gap-3">
                  <DropZoneField
                    field={{ id: 'grp_parent_name', label: 'Group Name', type: 'text', placeholder: 'e.g., Kitchen Set', required: true, section: 'grouped' }}
                    mappedSourceField={getMappedSourceField('grp_parent_name')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                  <DropZoneField
                    field={{ id: 'grp_parent_sku', label: 'Group SKU', type: 'text', placeholder: 'e.g., SET-01', required: false, section: 'grouped' }}
                    mappedSourceField={getMappedSourceField('grp_parent_sku')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                  <DropZoneField
                    field={{ id: 'grp_parent_image', label: 'Group Image', type: 'image', placeholder: 'Image URL (optional)', required: false, section: 'grouped' }}
                    mappedSourceField={getMappedSourceField('grp_parent_image')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mt-3 text-xs text-yellow-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Parent has no price or stock. It's only a container for child products.</span>
                </div>
              </div>

              {/* Children Level Fields */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h5 className="text-xs text-blue-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Child Products (Simple Products)
                </h5>
                
                <div className="space-y-3">
                  {children.map(child => renderChildFields(child, 'classic'))}
                </div>

                <button
                  onClick={addChild}
                  className="w-full mt-3 px-4 py-2 border-2 border-dashed border-blue-300 rounded-lg text-sm text-blue-700 hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add Child Product
                </button>
              </div>

              {/* Example Table */}
              <div className="bg-gray-50 border border-gray-300 rounded p-3">
                <h5 className="text-xs text-gray-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-gray-500" />
                  Example table import schema:
                </h5>
                <div className="overflow-x-auto text-xs">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-2 py-1 text-left">Group Name</th>
                        <th className="border border-gray-300 px-2 py-1 text-left">Group SKU</th>
                        <th className="border border-gray-300 px-2 py-1 text-left">Child SKU</th>
                        <th className="border border-gray-300 px-2 py-1 text-left">Child Name</th>
                        <th className="border border-gray-300 px-2 py-1 text-left">Price</th>
                        <th className="border border-gray-300 px-2 py-1 text-left">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      <tr>
                        <td className="border border-gray-300 px-2 py-1">Kitchen Set</td>
                        <td className="border border-gray-300 px-2 py-1">SET-01</td>
                        <td className="border border-gray-300 px-2 py-1">KETTLE-01</td>
                        <td className="border border-gray-300 px-2 py-1">Kettle</td>
                        <td className="border border-gray-300 px-2 py-1">30</td>
                        <td className="border border-gray-300 px-2 py-1">10</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-2 py-1">Kitchen Set</td>
                        <td className="border border-gray-300 px-2 py-1">SET-01</td>
                        <td className="border border-gray-300 px-2 py-1">CUP-01</td>
                        <td className="border border-gray-300 px-2 py-1">Cup</td>
                        <td className="border border-gray-300 px-2 py-1">5</td>
                        <td className="border border-gray-300 px-2 py-1">50</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-2 py-1">Kitchen Set</td>
                        <td className="border border-gray-300 px-2 py-1">SET-01</td>
                        <td className="border border-gray-300 px-2 py-1">PLATE-01</td>
                        <td className="border border-gray-300 px-2 py-1">Plate</td>
                        <td className="border border-gray-300 px-2 py-1">7</td>
                        <td className="border border-gray-300 px-2 py-1">40</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {groupedModel === 'no-parent-sku' && (
          <div className="bg-white border-2 border-gray-300 rounded-lg">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
              <h4 className="text-sm text-gray-900">Model 2: Grouped without Parent SKU</h4>
              <p className="text-xs text-gray-600 mt-1">
                Group identification by name. Common with suppliers.
              </p>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Parent Level Fields */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <h5 className="text-xs text-red-900 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Parent Product (Container)
                </h5>
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-3 text-xs text-yellow-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Parent SKU is absent. Identification only by Group Name! Strict name uniqueness required.</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <DropZoneField
                    field={{ id: 'grp_parent_name_nosku', label: 'Group Name', type: 'text', placeholder: 'e.g., Travel Kit', required: true, section: 'grouped' }}
                    mappedSourceField={getMappedSourceField('grp_parent_name_nosku')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                  <DropZoneField
                    field={{ id: 'grp_parent_image_nosku', label: 'Group Image', type: 'image', placeholder: 'Image URL (optional)', required: false, section: 'grouped' }}
                    mappedSourceField={getMappedSourceField('grp_parent_image_nosku')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                </div>
              </div>

              {/* Children Level Fields */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h5 className="text-xs text-blue-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Child Products (Simple Products)
                </h5>
                
                <div className="space-y-3">
                  {children.map(child => renderChildFields(child, 'nosku'))}
                </div>

                <button
                  onClick={addChild}
                  className="w-full mt-3 px-4 py-2 border-2 border-dashed border-blue-300 rounded-lg text-sm text-blue-700 hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add Child Product
                </button>
              </div>

              {/* Example Table */}
              <div className="bg-gray-50 border border-gray-300 rounded p-3">
                <h5 className="text-xs text-gray-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-gray-500" />
                  Example table import schema:
                </h5>
                <div className="overflow-x-auto text-xs">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-2 py-1 text-left">Group Name</th>
                        <th className="border border-gray-300 px-2 py-1 text-left">Parent SKU</th>
                        <th className="border border-gray-300 px-2 py-1 text-left">Child SKU</th>
                        <th className="border border-gray-300 px-2 py-1 text-left">Child Name</th>
                        <th className="border border-gray-300 px-2 py-1 text-left">Price</th>
                        <th className="border border-gray-300 px-2 py-1 text-left">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      <tr>
                        <td className="border border-gray-300 px-2 py-1">Travel Kit</td>
                        <td className="border border-gray-300 px-2 py-1">—</td>
                        <td className="border border-gray-300 px-2 py-1">BAG-01</td>
                        <td className="border border-gray-300 px-2 py-1">Bag</td>
                        <td className="border border-gray-300 px-2 py-1">45</td>
                        <td className="border border-gray-300 px-2 py-1">8</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-2 py-1">Travel Kit</td>
                        <td className="border border-gray-300 px-2 py-1">—</td>
                        <td className="border border-gray-300 px-2 py-1">TOWEL-01</td>
                        <td className="border border-gray-300 px-2 py-1">Towel</td>
                        <td className="border border-gray-300 px-2 py-1">12</td>
                        <td className="border border-gray-300 px-2 py-1">20</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {groupedModel === 'auto-create' && (
          <div className="bg-white border-2 border-gray-300 rounded-lg">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
              <h4 className="text-sm text-gray-900">Model 3: Auto-create Child Products</h4>
              <p className="text-xs text-gray-600 mt-1">
                Missing products are created automatically. Convenient for quick set imports.
              </p>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Info */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <h5 className="text-xs text-purple-900 mb-2 flex items-center gap-2">
                  <PlusCircle className="w-4 h-4" />
                  Auto-creation logic:
                </h5>
                <ul className="text-xs text-purple-700 space-y-1">
                  <li>• If Child SKU <strong>exists</strong> → linked to group</li>
                  <li>• If Child SKU <strong>doesn't exist</strong> → new simple product created automatically</li>
                </ul>
              </div>

              {/* Parent Level Fields */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <h5 className="text-xs text-red-900 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Parent Product (Container)
                </h5>
                <div className="grid grid-cols-3 gap-3">
                  <DropZoneField
                    field={{ id: 'grp_parent_name_auto', label: 'Group Name', type: 'text', placeholder: 'e.g., Office Set', required: true, section: 'grouped' }}
                    mappedSourceField={getMappedSourceField('grp_parent_name_auto')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                  <DropZoneField
                    field={{ id: 'grp_parent_sku_auto', label: 'Group SKU', type: 'text', placeholder: 'e.g., SET-OFF', required: true, section: 'grouped' }}
                    mappedSourceField={getMappedSourceField('grp_parent_sku_auto')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                  <DropZoneField
                    field={{ id: 'grp_parent_image_auto', label: 'Group Image', type: 'image', placeholder: 'Image URL (optional)', required: false, section: 'grouped' }}
                    mappedSourceField={getMappedSourceField('grp_parent_image_auto')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                </div>
              </div>

              {/* Children Level Fields */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h5 className="text-xs text-blue-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Child Products (created automatically if missing)
                </h5>
                <div className="bg-purple-50 border border-purple-200 rounded p-2 mb-3 text-xs text-purple-800 flex items-start gap-2">
                  <PlusCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Child products are created automatically with specified parameters</span>
                </div>
                
                <div className="space-y-3">
                  {children.map(child => renderChildFields(child, 'auto'))}
                </div>

                <button
                  onClick={addChild}
                  className="w-full mt-3 px-4 py-2 border-2 border-dashed border-blue-300 rounded-lg text-sm text-blue-700 hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add Child Product
                </button>
              </div>

              {/* Example Table */}
              <div className="bg-gray-50 border border-gray-300 rounded p-3">
                <h5 className="text-xs text-gray-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-gray-500" />
                  Example table import schema:
                </h5>
                <div className="overflow-x-auto text-xs">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-2 py-1 text-left">Group Name</th>
                        <th className="border border-gray-300 px-2 py-1 text-left">Group SKU</th>
                        <th className="border border-gray-300 px-2 py-1 text-left">Child SKU</th>
                        <th className="border border-gray-300 px-2 py-1 text-left">Child Name</th>
                        <th className="border border-gray-300 px-2 py-1 text-left">Price</th>
                        <th className="border border-gray-300 px-2 py-1 text-left">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      <tr>
                        <td className="border border-gray-300 px-2 py-1">Office Set</td>
                        <td className="border border-gray-300 px-2 py-1">SET-OFF</td>
                        <td className="border border-gray-300 px-2 py-1">NOTE-01</td>
                        <td className="border border-gray-300 px-2 py-1">Notebook</td>
                        <td className="border border-gray-300 px-2 py-1">6</td>
                        <td className="border border-gray-300 px-2 py-1">30</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-2 py-1">Office Set</td>
                        <td className="border border-gray-300 px-2 py-1">SET-OFF</td>
                        <td className="border border-gray-300 px-2 py-1">PEN-01</td>
                        <td className="border border-gray-300 px-2 py-1">Pen</td>
                        <td className="border border-gray-300 px-2 py-1">2</td>
                        <td className="border border-gray-300 px-2 py-1">150</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {groupedModel === 'bundle' && (
          <div className="bg-white border-2 border-gray-300 rounded-lg">
            <div className="bg-gray-100 px-4 py-3 border-b border-gray-300">
              <h4 className="text-sm text-gray-900">Model 4: Bundle without Total Price</h4>
              <p className="text-xs text-gray-600 mt-1">
                Parent is showcase. Price calculated automatically from child products. Perfect for sets.
              </p>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Info */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <h5 className="text-xs text-orange-900 mb-2 flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Price calculation logic:
                </h5>
                <ul className="text-xs text-orange-700 space-y-1">
                  <li>• Grouped product price <strong>not set explicitly</strong></li>
                  <li>• Total cost = <strong>sum of selected child products</strong></li>
                  <li>• User can select quantity of each product</li>
                  <li>• Buy multiple items with one button</li>
                </ul>
              </div>

              {/* Parent Level Fields */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <h5 className="text-xs text-red-900 mb-3 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Parent Product (Showcase)
                </h5>
                <div className="grid grid-cols-3 gap-3">
                  <DropZoneField
                    field={{ id: 'grp_parent_name_bundle', label: 'Group Name', type: 'text', placeholder: 'e.g., BBQ Set', required: true, section: 'grouped' }}
                    mappedSourceField={getMappedSourceField('grp_parent_name_bundle')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                  <DropZoneField
                    field={{ id: 'grp_parent_sku_bundle', label: 'Group SKU', type: 'text', placeholder: 'e.g., BBQ-01', required: true, section: 'grouped' }}
                    mappedSourceField={getMappedSourceField('grp_parent_sku_bundle')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                  <DropZoneField
                    field={{ id: 'grp_parent_image_bundle', label: 'Group Image', type: 'image', placeholder: 'Image URL (optional)', required: false, section: 'grouped' }}
                    mappedSourceField={getMappedSourceField('grp_parent_image_bundle')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded p-2 mt-3 text-xs text-orange-800 flex items-start gap-2">
                  <Calculator className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Parent price not specified. It's calculated automatically as sum of child products.</span>
                </div>
              </div>

              {/* Children Level Fields */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h5 className="text-xs text-blue-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Child Products (Simple Products)
                </h5>
                
                <div className="space-y-3">
                  {children.map(child => renderChildFields(child, 'bundle'))}
                </div>

                <button
                  onClick={addChild}
                  className="w-full mt-3 px-4 py-2 border-2 border-dashed border-blue-300 rounded-lg text-sm text-blue-700 hover:border-blue-500 hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add Child Product
                </button>
              </div>

              {/* Example Table */}
              <div className="bg-gray-50 border border-gray-300 rounded p-3">
                <h5 className="text-xs text-gray-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-gray-500" />
                  Example table import schema:
                </h5>
                <div className="overflow-x-auto text-xs">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-gray-300 px-2 py-1 text-left">Group Name</th>
                        <th className="border border-gray-300 px-2 py-1 text-left">Group SKU</th>
                        <th className="border border-gray-300 px-2 py-1 text-left">Child SKU</th>
                        <th className="border border-gray-300 px-2 py-1 text-left">Child Name</th>
                        <th className="border border-gray-300 px-2 py-1 text-left">Price</th>
                        <th className="border border-gray-300 px-2 py-1 text-left">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="text-gray-700">
                      <tr>
                        <td className="border border-gray-300 px-2 py-1">BBQ Set</td>
                        <td className="border border-gray-300 px-2 py-1">BBQ-01</td>
                        <td className="border border-gray-300 px-2 py-1">GRILL-01</td>
                        <td className="border border-gray-300 px-2 py-1">Grill</td>
                        <td className="border border-gray-300 px-2 py-1">210</td>
                        <td className="border border-gray-300 px-2 py-1">3</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-2 py-1">BBQ Set</td>
                        <td className="border border-gray-300 px-2 py-1">BBQ-01</td>
                        <td className="border border-gray-300 px-2 py-1">COAL-01</td>
                        <td className="border border-gray-300 px-2 py-1">Charcoal</td>
                        <td className="border border-gray-300 px-2 py-1">15</td>
                        <td className="border border-gray-300 px-2 py-1">25</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 px-2 py-1">BBQ Set</td>
                        <td className="border border-gray-300 px-2 py-1">BBQ-01</td>
                        <td className="border border-gray-300 px-2 py-1">TONG-01</td>
                        <td className="border border-gray-300 px-2 py-1">Tongs</td>
                        <td className="border border-gray-300 px-2 py-1">8</td>
                        <td className="border border-gray-300 px-2 py-1">40</td>
                      </tr>
                    </tbody>
                  </table>
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
          Required rules for all Grouped models
        </h4>
        <ul className="text-xs text-gray-700 space-y-1 ml-6">
          <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-600" /> At least 1 child product in group</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-600" /> Child SKU uniqueness check</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-600" /> No circular references (group within group)</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-600" /> Support for adding/removing products in group</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-600" /> Group composition rebuild on re-import</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-600" /> Independent existence of child products in catalog</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3 text-green-600" /> Individual photos for each product</li>
        </ul>
      </div>
    </div>
  );
}