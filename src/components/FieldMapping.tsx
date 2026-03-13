import { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Link as LinkIcon, 
  X,
  Check,
  AlertCircle,
  GripVertical,
  Plus,
  Trash2,
  ChevronDown,
  HelpCircle
} from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { VariationsTab } from './VariationsTab';
import { GroupedTab } from './GroupedTab';
import { DatePickerWithFooter } from './DatePickerWithFooter';
import { CategoryFields } from './CategoryFields';

interface FieldMappingProps {
  onBack: () => void;
  onNext: () => void;
}

interface SourceField {
  id: string;
  name: string;
  value: string;
  columnIndex: number;
  isMapped: boolean;
}

interface TargetField {
  id: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'image' | 'select' | 'multiselect';
  placeholder?: string;
  required?: boolean;
  mappedTo?: string;
  section: string;
}

interface Mapping {
  sourceFieldId: string;
  targetFieldId: string;
}

interface ProductAttribute {
  id: string;
  name: string;
  values: string;
  inVariations: boolean;
  isVisible: boolean;
  isTaxonomy: boolean;
  autoCreateTerms: boolean;
}

interface CategoryField {
  id: string;
  name: string;
  level: number;
}

// Sample data for CSV template
const generateSampleData = (rowIndex: number): SourceField[] => {
  const rows = [
    { sku: '12345', title: 'Wireless Mouse Pro', price: '29.99', sale_price: '24.99', stock: '150', categories: 'Electronics, Accessories', description: 'High-quality wireless mouse', weight: '0.2', shipping_class: 'standard', upsells: '101, 102, 103', cross_sells: '201, 202', grouped_parent: '' },
    { sku: 'WM-002', title: 'Mechanical Keyboard RGB', price: '89.99', sale_price: '79.99', stock: '75', categories: 'Electronics, Gaming', description: 'RGB mechanical keyboard', weight: '1.2', shipping_class: 'heavy', upsells: '104, 105', cross_sells: '203, 204', grouped_parent: '' },
    { sku: 'UC-003', title: 'USB-C Cable 2m', price: '12.99', sale_price: '', stock: '300', categories: 'Electronics, Cables', description: 'Fast charging cable', weight: '0.05', shipping_class: 'light', upsells: '', cross_sells: '205, 206', grouped_parent: '' },
    { sku: 'LS-004', title: 'Laptop Stand Aluminum', price: '45.99', sale_price: '39.99', stock: '120', categories: 'Office, Accessories', description: 'Ergonomic laptop stand', weight: '0.8', shipping_class: 'standard', upsells: '106', cross_sells: '207', grouped_parent: '500' },
    { sku: 'WC-005', title: 'Webcam HD 1080p', price: '65.99', sale_price: '', stock: '90', categories: 'Electronics, Video', description: 'Full HD webcam', weight: '0.3', shipping_class: 'express', upsells: '107, 108', cross_sells: '', grouped_parent: '' },
  ];

  const row = rows[rowIndex % rows.length];
  return Object.entries(row).map(([key, value], index) => ({
    id: `${key}_${rowIndex}`,
    name: key,
    value: value as string,
    columnIndex: index + 1,
    isMapped: false
  }));
};

function AttributeRow({ 
  attribute, 
  index, 
  productType, 
  onMove, 
  onUpdate, 
  onRemove 
}: { 
  attribute: ProductAttribute; 
  index: number;
  productType: 'simple' | 'variable' | 'grouped';
  onMove: (dragIndex: number, hoverIndex: number) => void;
  onUpdate: (id: string, field: keyof ProductAttribute, value: any) => void;
  onRemove: (id: string) => void;
}) {
  const [{ isDragging }, drag, preview] = useDrag({
    type: 'ATTRIBUTE_ROW',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'ATTRIBUTE_ROW',
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        onMove(item.index, index);
        item.index = index;
      }
    },
  });

  const [{ isOverName }, dropName] = useDrop({
    accept: 'FIELD',
    drop: (item: { field: SourceField }) => {
      onUpdate(attribute.id, 'name', item.field.value);
    },
    collect: (monitor) => ({
      isOverName: monitor.isOver(),
    }),
  });

  const [{ isOverValues }, dropValues] = useDrop({
    accept: 'FIELD',
    drop: (item: { field: SourceField }) => {
      onUpdate(attribute.id, 'values', item.field.value);
    },
    collect: (monitor) => ({
      isOverValues: monitor.isOver(),
    }),
  });

  return (
    <div
      ref={(node) => preview(drop(node))}
      className={`bg-white border border-gray-300 rounded-lg p-3 ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <div
          ref={drag}
          className="cursor-move p-1 hover:bg-gray-100 rounded"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>

        {/* Name Field */}
        <div className="flex-1" ref={dropName}>
          <input
            type="text"
            value={attribute.name}
            onChange={(e) => onUpdate(attribute.id, 'name', e.target.value)}
            className={`w-full px-3 py-2 border rounded text-sm transition-all ${
              isOverName ? 'border-green-500 bg-green-50' : 'border-gray-300'
            }`}
            placeholder="Name"
          />
        </div>

        {/* Values Field */}
        <div className="flex-[2]" ref={dropValues}>
          <input
            type="text"
            value={attribute.values}
            onChange={(e) => onUpdate(attribute.id, 'values', e.target.value)}
            className={`w-full px-3 py-2 border rounded text-sm transition-all ${
              isOverValues ? 'border-green-500 bg-green-50' : 'border-gray-300'
            }`}
            placeholder="Values"
          />
        </div>

        {/* Checkboxes */}
        <div className="flex items-center gap-4 text-xs">
          {productType === 'variable' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={attribute.inVariations}
                onChange={(e) => onUpdate(attribute.id, 'inVariations', e.target.checked)}
                className="attribute-checkbox"
              />
              <span className="text-gray-700">In Variations</span>
            </label>
          )}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={attribute.isVisible}
              onChange={(e) => onUpdate(attribute.id, 'isVisible', e.target.checked)}
              className="attribute-checkbox"
            />
            <span className="text-gray-700">Is Visible</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={attribute.isTaxonomy}
              onChange={(e) => onUpdate(attribute.id, 'isTaxonomy', e.target.checked)}
              className="attribute-checkbox"
            />
            <span className="text-gray-700">Is Taxonomy</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={attribute.autoCreateTerms}
              onChange={(e) => onUpdate(attribute.id, 'autoCreateTerms', e.target.checked)}
              className="attribute-checkbox"
            />
            <span className="text-gray-700">Auto-Create Terms</span>
          </label>
        </div>

        {/* Remove Button */}
        <button
          onClick={() => onRemove(attribute.id)}
          className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-600"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function SourceFieldItem({ field, isMapped }: { field: SourceField; isMapped: boolean }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'FIELD',
    item: { field },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <tr
      ref={drag}
      className={`border-b border-gray-200 cursor-move transition-all ${
        isDragging ? 'opacity-50' : ''
      } ${isMapped ? 'bg-green-50' : 'hover:bg-gray-50'}`}
    >
      <td className="py-2 px-3 text-sm text-gray-900">
        <div className="flex items-center gap-2">
          {field.name || `Column ${field.columnIndex}`}
          {isMapped && (
            <span className="inline-flex items-center text-xs text-green-600">
              <Check className="w-3 h-3" />
            </span>
          )}
        </div>
      </td>
      <td className="py-2 px-3 text-sm text-gray-600">{field.value || '—'}</td>
    </tr>
  );
}

function DropZoneField({ 
  field, 
  mappedSourceField, 
  onDrop, 
  onRemove 
}: { 
  field: TargetField; 
  mappedSourceField?: SourceField;
  onDrop: (sourceField: SourceField, targetField: TargetField) => void;
  onRemove: (targetFieldId: string) => void;
}) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'FIELD',
    drop: (item: { field: SourceField }) => {
      onDrop(item.field, field);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  const getBorderColor = () => {
    if (isOver && canDrop) return 'border-green-500 bg-green-50';
    if (mappedSourceField) return 'border-blue-300 bg-blue-50';
    if (field.required) return 'border-orange-300';
    return 'border-gray-300';
  };

  return (
    <div
      ref={drop}
      className={`relative border-2 rounded-lg p-3 transition-all ${getBorderColor()}`}
    >
      <label className="block text-sm text-gray-600 mb-1">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {mappedSourceField ? (
        <div className="flex items-center justify-between bg-white border border-gray-300 rounded px-3 py-2">
          <div className="flex items-center gap-2 flex-1">
            <LinkIcon className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-gray-900">{mappedSourceField.name || `Column ${mappedSourceField.columnIndex}`}</span>
            <span className="text-xs text-gray-500">→</span>
            <span className="text-sm text-gray-600">{mappedSourceField.value}</span>
          </div>
          <button
            onClick={() => onRemove(field.id)}
            className="ml-2 p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      ) : (
        <div className={`border-2 border-dashed rounded px-3 py-2 text-sm text-gray-400 ${
          isOver && canDrop ? 'border-green-500' : 'border-gray-300'
        }`}>
          {field.placeholder || 'Drag field here'}
        </div>
      )}
    </div>
  );
}

function FieldMappingContent({ onBack, onNext }: FieldMappingProps) {
  const [currentRow, setCurrentRow] = useState(0);
  const [productType, setProductType] = useState<'simple' | 'variable' | 'grouped'>('simple');
  const [mappings, setMappings] = useState<Mapping[]>([
    { id: '1', sourceFieldId: 'title', targetFieldId: 'title' },
    { id: '2', sourceFieldId: 'price', targetFieldId: 'regular_price' },
    { id: '3', sourceFieldId: 'sku', targetFieldId: 'sku' },
  ]);
  const [sourceFields] = useState<SourceField[]>(generateSampleData(currentRow));
  const [activeTab, setActiveTab] = useState<'general' | 'inventory' | 'shipping' | 'linked' | 'attributes' | 'variations' | 'grouped'>('general');
  const [attributes, setAttributes] = useState<ProductAttribute[]>([
    { id: '1', name: 'Color', values: 'Red | Blue | Green', inVariations: true, isVisible: true, isTaxonomy: false, autoCreateTerms: true },
    { id: '2', name: 'Size', values: 'Small | Medium | Large', inVariations: true, isVisible: true, isTaxonomy: false, autoCreateTerms: true },
  ]);
  const [variationModel, setVariationModel] = useState<'classic' | 'no-parent-sku' | 'auto-sku' | 'shared-price'>('classic');
  const [groupedModel, setGroupedModel] = useState<'classic' | 'no-parent-sku' | 'auto-create' | 'bundle'>('classic');
  const [postStatus, setPostStatus] = useState<string>('published');
  const [postDates, setPostDates] = useState<string>('as-specified');
  const [asSpecifiedDate, setAsSpecifiedDate] = useState<Date | null>(new Date());
  const [randomStartDate, setRandomStartDate] = useState<Date | null>(new Date());
  const [randomEndDate, setRandomEndDate] = useState<Date | null>(new Date());
  const [categories, setCategories] = useState<CategoryField[]>([
    { id: 'cat_1', name: '', level: 0 },
    { id: 'cat_2', name: '', level: 0 },
    { id: 'cat_3', name: '', level: 0 },
    { id: 'cat_4', name: '', level: 0 },
    { id: 'cat_5', name: '', level: 0 },
  ]);

  const targetFields: TargetField[] = [
    // General Section
    { id: 'title', label: 'Product Title', type: 'text', placeholder: 'Enter product title', required: true, section: 'general' },
    { id: 'description', label: 'Description', type: 'textarea', placeholder: 'Enter description', required: false, section: 'general' },
    { id: 'short_description', label: 'Short Description', type: 'textarea', placeholder: 'Enter short description', required: false, section: 'general' },
    
    // Pricing Section
    { id: 'regular_price', label: 'Regular Price', type: 'number', placeholder: '0.00', required: true, section: 'pricing' },
    { id: 'sale_price', label: 'Sale Price', type: 'number', placeholder: '0.00', required: false, section: 'pricing' },
    
    // Inventory Section
    { id: 'sku', label: 'Артикул', type: 'text', placeholder: 'Enter SKU', required: true, section: 'inventory' },
    { id: 'gtin_upc_ean', label: 'GTIN, UPC, EAN или ISBN', type: 'text', placeholder: '', required: false, section: 'inventory' },
    { id: 'stock_quantity', label: 'Количество', type: 'number', placeholder: '1', required: false, section: 'inventory' },
    { id: 'backorder_status', label: 'Разрешить предзаказы?', type: 'select', placeholder: 'Select backorder status', required: false, section: 'inventory' },
    { id: 'low_stock_threshold', label: 'Граница малых запасов', type: 'text', placeholder: 'Порог для всего магазина (2)', required: false, section: 'inventory' },
    { id: 'sold_individually', label: 'Ограничение покупок до 1 товара в заказе', type: 'select', placeholder: '', required: false, section: 'inventory' },
    
    // Categories & Tags Section
    { id: 'categories', label: 'Categories', type: 'multiselect', placeholder: 'Select categories', required: false, section: 'taxonomy' },
    { id: 'tags', label: 'Tags', type: 'multiselect', placeholder: 'Select tags', required: false, section: 'taxonomy' },
    
    // Images Section
    { id: 'main_image', label: 'Main Image', type: 'image', placeholder: 'Image URL or path', required: false, section: 'images' },
    { id: 'gallery_images', label: 'Gallery Images', type: 'image', placeholder: 'Image URLs (comma separated)', required: false, section: 'images' },
    
    // Shipping Section
    { id: 'weight', label: 'Weight (kg)', type: 'number', placeholder: '0', required: false, section: 'shipping' },
    { id: 'length', label: 'Length (cm)', type: 'number', placeholder: '0', required: false, section: 'shipping' },
    { id: 'width', label: 'Width (cm)', type: 'number', placeholder: '0', required: false, section: 'shipping' },
    { id: 'height', label: 'Height (cm)', type: 'number', placeholder: '0', required: false, section: 'shipping' },
    { id: 'shipping_class', label: 'Shipping class', type: 'select', placeholder: 'No shipping class', required: false, section: 'shipping' },
    
    // Linked Products Section
    { id: 'upsells', label: 'Upsells', type: 'text', placeholder: 'Product IDs (comma separated)', required: false, section: 'linked' },
    { id: 'cross_sells', label: 'Cross-sells', type: 'text', placeholder: 'Product IDs (comma separated)', required: false, section: 'linked' },
    { id: 'grouped_products', label: 'Grouped Products', type: 'text', placeholder: 'Parent product ID', required: false, section: 'linked' },
  ];

  // Add variable product fields
  if (productType === 'variable') {
    targetFields.push(
      { id: 'attributes', label: 'Attributes', type: 'multiselect', placeholder: 'Select attributes', required: true, section: 'variations' },
      { id: 'variation_sku', label: 'Variation SKU', type: 'text', placeholder: 'Variation SKU pattern', required: false, section: 'variations' },
      { id: 'variation_price', label: 'Variation Price', type: 'number', placeholder: 'Variation price', required: false, section: 'variations' },
    );
  }

  const updateSourceFields = (rowIndex: number) => {
    const newFields = generateSampleData(rowIndex);
    setCurrentRow(rowIndex);
    // Preserve mapping status
    return newFields.map(field => ({
      ...field,
      isMapped: mappings.some(m => m.sourceFieldId === field.name)
    }));
  };

  const handleDrop = (sourceField: SourceField, targetField: TargetField) => {
    // Remove existing mapping for this target field
    const newMappings = mappings.filter(m => m.targetFieldId !== targetField.id);
    
    // Add new mapping
    newMappings.push({
      sourceFieldId: sourceField.name,
      targetFieldId: targetField.id
    });
    
    setMappings(newMappings);
  };

  const handleRemoveMapping = (targetFieldId: string) => {
    setMappings(mappings.filter(m => m.targetFieldId !== targetFieldId));
  };

  const moveAttribute = (dragIndex: number, hoverIndex: number) => {
    const draggedAttribute = attributes[dragIndex];
    const newAttributes = [...attributes];
    newAttributes.splice(dragIndex, 1);
    newAttributes.splice(hoverIndex, 0, draggedAttribute);
    setAttributes(newAttributes);
  };

  const updateAttribute = (id: string, field: keyof ProductAttribute, value: any) => {
    setAttributes(attributes.map(attr => 
      attr.id === id ? { ...attr, [field]: value } : attr
    ));
  };

  const removeAttribute = (id: string) => {
    setAttributes(attributes.filter(attr => attr.id !== id));
  };

  const addAttribute = () => {
    const newId = (Math.max(...attributes.map(a => parseInt(a.id)), 0) + 1).toString();
    setAttributes([
      ...attributes,
      { 
        id: newId, 
        name: '', 
        values: '', 
        inVariations: productType === 'variable', 
        isVisible: true, 
        isTaxonomy: false, 
        autoCreateTerms: true 
      }
    ]);
  };

  const getMappedSourceField = (targetFieldId: string): SourceField | undefined => {
    const mapping = mappings.find(m => m.targetFieldId === targetFieldId);
    if (!mapping) return undefined;
    
    return sourceFields.find(f => f.name === mapping.sourceFieldId);
  };

  const getFieldsBySection = (section: string) => {
    return targetFields.filter(f => f.section === section);
  };

  const requiredFieldsMapped = targetFields
    .filter(f => f.required)
    .every(f => mappings.some(m => m.targetFieldId === f.id));

  return (
    <div className="p-8 bg-gray-50 h-screen flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900 mb-2">Field Mapping</h1>
        <p className="text-gray-500">Step 3 of 5 - Drag fields from template to product card</p>
      </div>

      {/* Product Type Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <label className="block text-sm text-gray-600 mb-2">Product Type</label>
        <div className="flex gap-2">
          <button
            onClick={() => setProductType('simple')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              productType === 'simple'
                ? 'bg-red-500 text-white border-red-500'
                : 'bg-white text-gray-700 border-gray-300 hover:border-red-500'
            }`}
          >
            Simple Product
          </button>
          <button
            onClick={() => setProductType('variable')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              productType === 'variable'
                ? 'bg-red-500 text-white border-red-500'
                : 'bg-white text-gray-700 border-gray-300 hover:border-red-500'
            }`}
          >
            Variable Product
          </button>
          <button
            onClick={() => setProductType('grouped')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              productType === 'grouped'
                ? 'bg-red-500 text-white border-red-500'
                : 'bg-white text-gray-700 border-gray-300 hover:border-red-500'
            }`}
          >
            Grouped Product
          </button>
        </div>
      </div>

      {/* Validation Alert */}
      {!requiredFieldsMapped && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
          <div>
            <h3 className="text-gray-900 mb-1">Required Fields Missing</h3>
            <p className="text-sm text-gray-600">
              Please map all required fields (marked with *) to continue to the next step.
            </p>
          </div>
        </div>
      )}

      {/* Main Layout: 1/4 + 3/4 */}
      <div className="flex gap-6 flex-1 overflow-hidden">
        {/* LEFT: Source Template (1/4) */}
        <div className="w-1/4 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-gray-900 mb-3">Import Template</h2>
            
            {/* Row Navigation */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg p-2">
              <button
                onClick={() => {
                  if (currentRow > 0) {
                    updateSourceFields(currentRow - 1);
                  }
                }}
                disabled={currentRow === 0}
                className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>
              <span className="text-sm text-gray-900">
                Column {currentRow + 1}
              </span>
              <button
                onClick={() => updateSourceFields(currentRow + 1)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <ChevronRight className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>

          {/* Source Fields Table */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="border-b border-gray-200">
                  <th className="py-2 px-3 text-left text-xs text-gray-600">Field Name</th>
                  <th className="py-2 px-3 text-left text-xs text-gray-600">Value</th>
                </tr>
              </thead>
              <tbody>
                {sourceFields.map((field) => (
                  <SourceFieldItem
                    key={field.id}
                    field={field}
                    isMapped={mappings.some(m => m.sourceFieldId === field.name)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-gray-200 bg-gray-50">
            <div className="text-xs text-gray-600">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 bg-green-50 border border-green-300 rounded"></div>
                <span>Mapped field</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-white border border-gray-300 rounded"></div>
                <span>Available field</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Product Card Layout (3/4) */}
        <div className="w-3/4 bg-white rounded-lg shadow-sm border border-gray-200 overflow-y-auto">
          <div className="p-6">
            <h2 className="text-gray-900 mb-6">WooCommerce Product Card (Visual Layout)</h2>

            {/* Main Content Area */}
            <div className="flex gap-6">
              {/* Left Column - Main Fields */}
              <div className="flex-1">
                {/* Product Title */}
                <div className="mb-6">
                  <DropZoneField
                    field={targetFields.find(f => f.id === 'title')!}
                    mappedSourceField={getMappedSourceField('title')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                  />
                </div>

                {/* Description Editor */}
                <div className="mb-6">
                  <label className="block text-sm text-gray-600 mb-2">Описание товара</label>
                  <div className="border-2 border-gray-300 rounded-lg">
                    {/* Editor Toolbar Simulation */}
                    <div className="bg-gray-50 border-b border-gray-300 px-3 py-2 flex items-center gap-2">
                      <button className="text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100">
                        Добавить медиафайл
                      </button>
                      <button className="text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100">
                        Добавить форму
                      </button>
                      <div className="flex-1"></div>
                      <select className="text-xs px-2 py-1 border border-gray-300 rounded">
                        <option>Абзац</option>
                      </select>
                    </div>
                    <div className="p-3">
                      <DropZoneField
                        field={targetFields.find(f => f.id === 'description')!}
                        mappedSourceField={getMappedSourceField('description')}
                        onDrop={handleDrop}
                        onRemove={handleRemoveMapping}
                      />
                    </div>
                  </div>
                </div>

                {/* Short Description Editor */}
                <div className="mb-6">
                  <label className="block text-sm text-gray-600 mb-2">Краткое описание товара</label>
                  <div className="border-2 border-gray-300 rounded-lg">
                    <div className="bg-gray-50 border-b border-gray-300 px-3 py-2 flex items-center gap-2">
                      <button className="text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100">
                        Добавить медиафайл
                      </button>
                      <button className="text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100">
                        Добавить форму
                      </button>
                    </div>
                    <div className="p-3">
                      <DropZoneField
                        field={targetFields.find(f => f.id === 'short_description')!}
                        mappedSourceField={getMappedSourceField('short_description')}
                        onDrop={handleDrop}
                        onRemove={handleRemoveMapping}
                      />
                    </div>
                  </div>
                </div>

                {/* Product Data Tabs */}
                <div className="mb-6">
                  <div className="border-2 border-gray-300 rounded-lg">
                    <div className="bg-gray-100 px-4 py-3 border-b border-gray-300 flex items-center gap-4">
                      <label className="text-sm text-gray-700">Данные товара —</label>
                      <select 
                        value={productType}
                        onChange={(e) => setProductType(e.target.value as any)}
                        className="px-3 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="simple">Простой товар</option>
                        <option value="variable">Вариативный товар</option>
                        <option value="grouped">Grouped product</option>
                      </select>
                      <button className="text-gray-500 hover:text-gray-700">
                        <span className="text-sm">ⓘ</span>
                      </button>
                      <label className="flex items-center gap-2 text-sm text-gray-700 ml-4">
                        <input type="checkbox" className="w-4 h-4" />
                        Виртуальный
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" className="w-4 h-4" />
                        Скачиваемый
                      </label>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="bg-gray-50 border-b border-gray-300 px-2 py-0 flex gap-1 text-xs overflow-x-auto">
                      <button
                        className={`px-3 py-2 ${activeTab === 'general' ? 'bg-white border-t-2 border-red-500' : 'hover:bg-white'}`}
                        onClick={() => setActiveTab('general')}
                      >
                        Основные
                      </button>
                      <button
                        className={`px-3 py-2 ${activeTab === 'inventory' ? 'bg-white border-t-2 border-red-500' : 'hover:bg-white'}`}
                        onClick={() => setActiveTab('inventory')}
                      >
                        Запасы
                      </button>
                      <button
                        className={`px-3 py-2 ${activeTab === 'shipping' ? 'bg-white border-t-2 border-red-500' : 'hover:bg-white'}`}
                        onClick={() => setActiveTab('shipping')}
                      >
                        Доставка
                      </button>
                      <button
                        className={`px-3 py-2 ${activeTab === 'linked' ? 'bg-white border-t-2 border-red-500' : 'hover:bg-white'}`}
                        onClick={() => setActiveTab('linked')}
                      >
                        Сопутствующие
                      </button>
                      <button
                        className={`px-3 py-2 ${activeTab === 'attributes' ? 'bg-white border-t-2 border-red-500' : 'hover:bg-white'}`}
                        onClick={() => setActiveTab('attributes')}
                      >
                        Атрибуты
                      </button>
                      {productType === 'variable' && (
                        <button
                          className={`px-3 py-2 ${activeTab === 'variations' ? 'bg-white border-t-2 border-red-500' : 'hover:bg-white'}`}
                          onClick={() => setActiveTab('variations')}
                        >
                          Вариации
                        </button>
                      )}
                      {productType === 'grouped' && (
                        <button
                          className={`px-3 py-2 ${activeTab === 'grouped' ? 'bg-white border-t-2 border-red-500' : 'hover:bg-white'}`}
                          onClick={() => setActiveTab('grouped')}
                        >
                          Модели
                        </button>
                      )}
                    </div>

                    {/* Tab Content - General */}
                    <div className="p-4 space-y-4">
                      {activeTab === 'general' && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <DropZoneField
                              field={targetFields.find(f => f.id === 'regular_price')!}
                              mappedSourceField={getMappedSourceField('regular_price')}
                              onDrop={handleDrop}
                              onRemove={handleRemoveMapping}
                            />
                            <DropZoneField
                              field={targetFields.find(f => f.id === 'sale_price')!}
                              mappedSourceField={getMappedSourceField('sale_price')}
                              onDrop={handleDrop}
                              onRemove={handleRemoveMapping}
                            />
                          </div>

                          {/* Sale Dates */}
                          <div>
                            <label className="block text-sm text-gray-600 mb-2">Даты акции</label>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="border-2 border-gray-300 rounded-lg p-3">
                                <label className="block text-sm text-gray-600 mb-1">С...</label>
                                <input 
                                  type="text" 
                                  placeholder="YYYY-MM-DD" 
                                  className="w-full border border-gray-300 rounded px-3 py-1 text-sm"
                                />
                              </div>
                              <div className="border-2 border-gray-300 rounded-lg p-3">
                                <label className="block text-sm text-gray-600 mb-1">По...</label>
                                <input 
                                  type="text" 
                                  placeholder="YYYY-MM-DD" 
                                  className="w-full border border-gray-300 rounded px-3 py-1 text-sm"
                                />
                              </div>
                            </div>
                            <button className="text-xs text-blue-600 hover:underline mt-2">Отмена</button>
                          </div>
                        </>
                      )}

                      {activeTab === 'inventory' && (
                        <>
                          {/* SKU */}
                          <div>
                            <DropZoneField
                              field={targetFields.find(f => f.id === 'sku')!}
                              mappedSourceField={getMappedSourceField('sku')}
                              onDrop={handleDrop}
                              onRemove={handleRemoveMapping}
                            />
                          </div>

                          {/* GTIN, UPC, EAN */}
                          <div>
                            <DropZoneField
                              field={targetFields.find(f => f.id === 'gtin_upc_ean')!}
                              mappedSourceField={getMappedSourceField('gtin_upc_ean')}
                              onDrop={handleDrop}
                              onRemove={handleRemoveMapping}
                            />
                          </div>

                          {/* Stock Management Checkbox */}
                          <div className="flex items-center gap-2 py-2">
                            <input type="checkbox" id="track_stock" className="w-4 h-4" defaultChecked />
                            <label htmlFor="track_stock" className="text-sm text-gray-700">
                              Отслеживание количества товара на складе для данного товара
                            </label>
                            <button className="text-gray-500 hover:text-gray-700">
                              <span className="text-sm">ⓘ</span>
                            </button>
                          </div>

                          {/* Stock Quantity */}
                          <div>
                            <DropZoneField
                              field={targetFields.find(f => f.id === 'stock_quantity')!}
                              mappedSourceField={getMappedSourceField('stock_quantity')}
                              onDrop={handleDrop}
                              onRemove={handleRemoveMapping}
                            />
                          </div>

                          {/* Backorder Status */}
                          <div>
                            <label className="block text-sm text-gray-600 mb-2">
                              Разрешить предзаказы?
                              <button className="ml-2 text-gray-500 hover:text-gray-700 inline">
                                <span className="text-sm">ⓘ</span>
                              </button>
                            </label>
                            <div className="space-y-2">
                              <label className="flex items-center gap-2">
                                <input type="radio" name="backorders" value="no" defaultChecked className="w-4 h-4" />
                                <span className="text-sm text-gray-700">Не разрешать</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <input type="radio" name="backorders" value="notify" className="w-4 h-4" />
                                <span className="text-sm text-gray-700">Разрешать, но уведомить клиента</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <input type="radio" name="backorders" value="yes" className="w-4 h-4" />
                                <span className="text-sm text-gray-700">Разрешать</span>
                              </label>
                            </div>
                          </div>

                          {/* Low Stock Threshold */}
                          <div>
                            <DropZoneField
                              field={targetFields.find(f => f.id === 'low_stock_threshold')!}
                              mappedSourceField={getMappedSourceField('low_stock_threshold')}
                              onDrop={handleDrop}
                              onRemove={handleRemoveMapping}
                            />
                          </div>

                          {/* Sold Individually */}
                          <div className="flex items-center gap-2 py-2">
                            <input type="checkbox" id="sold_individually" className="w-4 h-4" />
                            <label htmlFor="sold_individually" className="text-sm text-gray-700">
                              Ограничение покупок до 1 товара в заказе
                            </label>
                            <button className="text-gray-500 hover:text-gray-700">
                              <span className="text-sm">ⓘ</span>
                            </button>
                          </div>
                        </>
                      )}

                      {activeTab === 'shipping' && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-4 gap-4">
                            <DropZoneField
                              field={targetFields.find(f => f.id === 'weight')!}
                              mappedSourceField={getMappedSourceField('weight')}
                              onDrop={handleDrop}
                              onRemove={handleRemoveMapping}
                            />
                            <DropZoneField
                              field={targetFields.find(f => f.id === 'length')!}
                              mappedSourceField={getMappedSourceField('length')}
                              onDrop={handleDrop}
                              onRemove={handleRemoveMapping}
                            />
                            <DropZoneField
                              field={targetFields.find(f => f.id === 'width')!}
                              mappedSourceField={getMappedSourceField('width')}
                              onDrop={handleDrop}
                              onRemove={handleRemoveMapping}
                            />
                            <DropZoneField
                              field={targetFields.find(f => f.id === 'height')!}
                              mappedSourceField={getMappedSourceField('height')}
                              onDrop={handleDrop}
                              onRemove={handleRemoveMapping}
                            />
                          </div>
                          <DropZoneField
                            field={targetFields.find(f => f.id === 'shipping_class')!}
                            mappedSourceField={getMappedSourceField('shipping_class')}
                            onDrop={handleDrop}
                            onRemove={handleRemoveMapping}
                          />
                        </div>
                      )}

                      {activeTab === 'linked' && (
                        <div className="space-y-4">
                          {/* Upsells Section */}
                          <div>
                            <div className="mb-2">
                              <label className="block text-sm text-gray-700 mb-1">
                                Дополнительные товары (Upsells)
                              </label>
                              <p className="text-xs text-gray-500">
                                Товары, которые будут показаны на странице товара как рекомендации
                              </p>
                            </div>
                            <DropZoneField
                              field={targetFields.find(f => f.id === 'upsells')!}
                              mappedSourceField={getMappedSourceField('upsells')}
                              onDrop={handleDrop}
                              onRemove={handleRemoveMapping}
                            />
                          </div>

                          {/* Cross-sells Section */}
                          <div>
                            <div className="mb-2">
                              <label className="block text-sm text-gray-700 mb-1">
                                Перекрестные продажи (Cross-sells)
                              </label>
                              <p className="text-xs text-gray-500">
                                Товары, которые будут показаны в корзине как дополнительные покупки
                              </p>
                            </div>
                            <DropZoneField
                              field={targetFields.find(f => f.id === 'cross_sells')!}
                              mappedSourceField={getMappedSourceField('cross_sells')}
                              onDrop={handleDrop}
                              onRemove={handleRemoveMapping}
                            />
                          </div>

                          {/* Grouped Products Section */}
                          <div>
                            <div className="mb-2">
                              <label className="block text-sm text-gray-700 mb-1">
                                Сгруппированные товары (Grouped Products)
                              </label>
                              <p className="text-xs text-gray-500">
                                ID родительского товара для группировки (только для grouped products)
                              </p>
                            </div>
                            <DropZoneField
                              field={targetFields.find(f => f.id === 'grouped_products')!}
                              mappedSourceField={getMappedSourceField('grouped_products')}
                              onDrop={handleDrop}
                              onRemove={handleRemoveMapping}
                            />
                          </div>

                          {/* Info Box */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                            <div className="flex items-start gap-2">
                              <HelpCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div className="text-sm text-gray-700">
                                <p className="mb-2"><strong>Рекомендации:</strong></p>
                                <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                                  <li><strong>Upsells</strong> — более дорогие или улучшенные версии текущего товара</li>
                                  <li><strong>Cross-sells</strong> — сопутствующие товары (например, батарейки к фонарику)</li>
                                  <li><strong>Grouped</strong> — для объединения нескольких товаров в один набор</li>
                                  <li>ID товаров должны существовать в вашем магазине (разделяйте через запятую)</li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === 'attributes' && (
                        <div className="space-y-3">
                          {/* Header Row */}
                          {attributes.length > 0 && (
                            <div className="flex items-center gap-3 px-3">
                              {/* Drag Handle Space */}
                              <div className="w-6"></div>
                              
                              {/* Name Label */}
                              <div className="flex-1">
                                <label className="text-xs text-gray-600">Name</label>
                              </div>
                              
                              {/* Values Label */}
                              <div className="flex-[2]">
                                <label className="text-xs text-gray-600">Values</label>
                              </div>
                              
                              {/* Checkboxes Space */}
                              <div className="flex items-center gap-4 text-xs">
                                {productType === 'variable' && (
                                  <div className="w-[100px]"></div>
                                )}
                                <div className="w-[80px]"></div>
                                <div className="w-[90px]"></div>
                                <div className="w-[130px]"></div>
                              </div>
                              
                              {/* Remove Button Space */}
                              <div className="w-6"></div>
                            </div>
                          )}
                          
                          {/* Attributes List */}
                          {attributes.map((attr, index) => (
                            <AttributeRow
                              key={attr.id}
                              attribute={attr}
                              index={index}
                              productType={productType}
                              onMove={moveAttribute}
                              onUpdate={updateAttribute}
                              onRemove={removeAttribute}
                            />
                          ))}

                          {/* Add Attribute Button */}
                          <button
                            onClick={addAttribute}
                            className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-red-400 hover:text-red-600 transition-colors flex items-center justify-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Add Attribute
                          </button>
                        </div>
                      )}

                      {activeTab === 'variations' && (
                        <VariationsTab
                          variationModel={variationModel}
                          setVariationModel={setVariationModel}
                          DropZoneField={DropZoneField}
                          getMappedSourceField={getMappedSourceField}
                          handleDrop={handleDrop}
                          handleRemoveMapping={handleRemoveMapping}
                        />
                      )}

                      {activeTab === 'grouped' && (
                        <GroupedTab
                          groupedModel={groupedModel}
                          setGroupedModel={setGroupedModel}
                          DropZoneField={DropZoneField}
                          getMappedSourceField={getMappedSourceField}
                          handleDrop={handleDrop}
                          handleRemoveMapping={handleRemoveMapping}
                        />
                      )}

                      {false && activeTab === 'variations' && (
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
                                  <Check className={`w-5 h-5 mt-0.5 ${variationModel === 'classic' ? 'text-red-500' : 'text-gray-300'}`} />
                                  <div className="flex-1">
                                    <h4 className="text-sm text-gray-900 mb-1">1. Классическая модель</h4>
                                    <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                      РЕКОМЕНДУЕМАЯ
                                    </span>
                                  </div>
                                </div>
                                <ul className="text-xs text-gray-600 space-y-1 ml-7">
                                  <li>✅ Родительский SKU</li>
                                  <li>✅ SKU вариаций</li>
                                  <li>✅ Атрибуты на уровне родителя</li>
                                  <li>✅ Фото вариации — опционально</li>
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
                                  <Check className={`w-5 h-5 mt-0.5 ${variationModel === 'no-parent-sku' ? 'text-red-500' : 'text-gray-300'}`} />
                                  <div className="flex-1">
                                    <h4 className="text-sm text-gray-900 mb-1">2. Без SKU родителя</h4>
                                    <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                      Идентификация по названию
                                    </span>
                                  </div>
                                </div>
                                <ul className="text-xs text-gray-600 space-y-1 ml-7">
                                  <li>❌ Родительский SKU отсутствует</li>
                                  <li>✅ SKU вариаций</li>
                                  <li>✅ Связь по названию товара</li>
                                  <li>✅ Фото вариации — опционально</li>
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
                                  <Check className={`w-5 h-5 mt-0.5 ${variationModel === 'auto-sku' ? 'text-red-500' : 'text-gray-300'}`} />
                                  <div className="flex-1">
                                    <h4 className="text-sm text-gray-900 mb-1">3. Автогенерация SKU</h4>
                                    <span className="inline-block px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded border border-red-200">
                                      SKU создаётся автоматически
                                    </span>
                                  </div>
                                </div>
                                <ul className="text-xs text-gray-600 space-y-1 ml-7">
                                  <li>✅ Родительский SKU</li>
                                  <li>🔄 SKU вариаций генерируется</li>
                                  <li>✅ Формула: PARENT-ATTR1-ATTR2</li>
                                  <li>✅ Фото вариации — опционально</li>
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
                                  <Check className={`w-5 h-5 mt-0.5 ${variationModel === 'shared-price' ? 'text-red-500' : 'text-gray-300'}`} />
                                  <div className="flex-1">
                                    <h4 className="text-sm text-gray-900 mb-1">4. Общая цена</h4>
                                    <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                                      Цена на уровне родителя
                                    </span>
                                  </div>
                                </div>
                                <ul className="text-xs text-gray-600 space-y-1 ml-7">
                                  <li>✅ Родительский SKU</li>
                                  <li>✅ SKU вариаций</li>
                                  <li>💰 Цена только у родителя</li>
                                  <li>✅ Фото вариации — опционально</li>
                                </ul>
                              </button>
                            </div>
                          </div>

                          {/* Model Details */}
                          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                            {variationModel === 'classic' && (
                              <div>
                                <h4 className="text-sm text-gray-900 mb-3">Модель 1: Классическая (Рекомендуемая)</h4>
                                <p className="text-xs text-gray-600 mb-4">
                                  Эталонная модель для импорта. Полная совместимость с ERP, складом, API. Лучшая модель для масштабных каталогов.
                                </p>
                                
                                {/* Example Table */}
                                <div className="bg-white border border-gray-300 rounded overflow-hidden">
                                  <div className="bg-gray-100 px-3 py-2 border-b border-gray-300">
                                    <h5 className="text-xs text-gray-700">Пример структуры данных:</h5>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="bg-gray-50 border-b border-gray-300">
                                          <th className="px-3 py-2 text-left text-gray-700">Parent SKU</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Parent Name</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Variation SKU</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Color</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Size</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Price</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Stock</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Image</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr className="border-b border-gray-200">
                                          <td className="px-3 py-2 text-gray-900">TSHIRT-01</td>
                                          <td className="px-3 py-2 text-gray-900">T-Shirt</td>
                                          <td className="px-3 py-2 text-gray-900">TSHIRT-01-R-M</td>
                                          <td className="px-3 py-2 text-gray-600">Red</td>
                                          <td className="px-3 py-2 text-gray-600">M</td>
                                          <td className="px-3 py-2 text-gray-600">25</td>
                                          <td className="px-3 py-2 text-gray-600">10</td>
                                          <td className="px-3 py-2 text-gray-400">optional</td>
                                        </tr>
                                        <tr className="border-b border-gray-200">
                                          <td className="px-3 py-2 text-gray-900">TSHIRT-01</td>
                                          <td className="px-3 py-2 text-gray-900">T-Shirt</td>
                                          <td className="px-3 py-2 text-gray-900">TSHIRT-01-R-L</td>
                                          <td className="px-3 py-2 text-gray-600">Red</td>
                                          <td className="px-3 py-2 text-gray-600">L</td>
                                          <td className="px-3 py-2 text-gray-600">27</td>
                                          <td className="px-3 py-2 text-gray-600">8</td>
                                          <td className="px-3 py-2 text-gray-400">optional</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            )}

                            {variationModel === 'no-parent-sku' && (
                              <div>
                                <h4 className="text-sm text-gray-900 mb-3">Модель 2: Без SKU родителя</h4>
                                <p className="text-xs text-gray-600 mb-4">
                                  Часто используется у поставщиков. Подходит для импорта без артикула родителя. Требует строгой уникальности имени товара.
                                </p>
                                
                                <div className="bg-white border border-gray-300 rounded overflow-hidden">
                                  <div className="bg-gray-100 px-3 py-2 border-b border-gray-300">
                                    <h5 className="text-xs text-gray-700">Пример структуры данных:</h5>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="bg-gray-50 border-b border-gray-300">
                                          <th className="px-3 py-2 text-left text-gray-700">Parent SKU</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Parent Name</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Variation SKU</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Color</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Size</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Price</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Stock</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Image</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr className="border-b border-gray-200">
                                          <td className="px-3 py-2 text-gray-400">—</td>
                                          <td className="px-3 py-2 text-gray-900">Sneakers Air</td>
                                          <td className="px-3 py-2 text-gray-900">AIR-R-42</td>
                                          <td className="px-3 py-2 text-gray-600">Red</td>
                                          <td className="px-3 py-2 text-gray-600">42</td>
                                          <td className="px-3 py-2 text-gray-600">99</td>
                                          <td className="px-3 py-2 text-gray-600">5</td>
                                          <td className="px-3 py-2 text-gray-400">optional</td>
                                        </tr>
                                        <tr className="border-b border-gray-200">
                                          <td className="px-3 py-2 text-gray-400">—</td>
                                          <td className="px-3 py-2 text-gray-900">Sneakers Air</td>
                                          <td className="px-3 py-2 text-gray-900">AIR-B-43</td>
                                          <td className="px-3 py-2 text-gray-600">Black</td>
                                          <td className="px-3 py-2 text-gray-600">43</td>
                                          <td className="px-3 py-2 text-gray-600">99</td>
                                          <td className="px-3 py-2 text-gray-600">7</td>
                                          <td className="px-3 py-2 text-gray-400">optional</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            )}

                            {variationModel === 'auto-sku' && (
                              <div>
                                <h4 className="text-sm text-gray-900 mb-3">Модель 3: Автогенерация SKU вариаций</h4>
                                <p className="text-xs text-gray-600 mb-4">
                                  Допустимая модель с автоматической генерацией SKU. Обязательна строгая проверка уникальности SKU. Удобна при импорте из упрощённых CSV.
                                </p>

                                {/* Formula */}
                                <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                                  <h5 className="text-xs text-blue-900 mb-2">Формула автогенерации SKU:</h5>
                                  <code className="text-xs text-blue-800">
                                    PARENT_SKU + "-" + Attribute_Abbreviations
                                  </code>
                                  <div className="mt-2 text-xs text-blue-700">
                                    Пример: <strong>TSHIRT-01-R-XL</strong> (где R = Red, XL = XL)
                                  </div>
                                </div>
                                
                                <div className="bg-white border border-gray-300 rounded overflow-hidden">
                                  <div className="bg-gray-100 px-3 py-2 border-b border-gray-300">
                                    <h5 className="text-xs text-gray-700">Пример структуры данных:</h5>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="bg-gray-50 border-b border-gray-300">
                                          <th className="px-3 py-2 text-left text-gray-700">Parent SKU</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Parent Name</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Auto SKU</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Color</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Size</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Price</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Stock</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Image</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr className="border-b border-gray-200">
                                          <td className="px-3 py-2 text-gray-900">TSHIRT-01</td>
                                          <td className="px-3 py-2 text-gray-900">T-Shirt</td>
                                          <td className="px-3 py-2 text-purple-600">TSHIRT-01-R-M</td>
                                          <td className="px-3 py-2 text-gray-600">Red</td>
                                          <td className="px-3 py-2 text-gray-600">M</td>
                                          <td className="px-3 py-2 text-gray-600">25</td>
                                          <td className="px-3 py-2 text-gray-600">10</td>
                                          <td className="px-3 py-2 text-gray-400">optional</td>
                                        </tr>
                                        <tr className="border-b border-gray-200">
                                          <td className="px-3 py-2 text-gray-900">TSHIRT-01</td>
                                          <td className="px-3 py-2 text-gray-900">T-Shirt</td>
                                          <td className="px-3 py-2 text-purple-600">TSHIRT-01-R-XL</td>
                                          <td className="px-3 py-2 text-gray-600">Red</td>
                                          <td className="px-3 py-2 text-gray-600">XL</td>
                                          <td className="px-3 py-2 text-gray-600">27</td>
                                          <td className="px-3 py-2 text-gray-600">6</td>
                                          <td className="px-3 py-2 text-gray-400">optional</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            )}

                            {variationModel === 'shared-price' && (
                              <div>
                                <h4 className="text-sm text-gray-900 mb-3">Модель 4: Общая цена на уровне родителя</h4>
                                <p className="text-xs text-gray-600 mb-4">
                                  Удобна для fashion-каталогов. Упрощает ценообразование. Требует жёсткого наследования цены от родительского товара.
                                </p>
                                
                                <div className="bg-white border border-gray-300 rounded overflow-hidden">
                                  <div className="bg-gray-100 px-3 py-2 border-b border-gray-300">
                                    <h5 className="text-xs text-gray-700">Пример структуры данных:</h5>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="bg-gray-50 border-b border-gray-300">
                                          <th className="px-3 py-2 text-left text-gray-700">Parent SKU</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Parent Name</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Variation SKU</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Color</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Size</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Parent Price</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Stock</th>
                                          <th className="px-3 py-2 text-left text-gray-700">Image</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr className="border-b border-gray-200">
                                          <td className="px-3 py-2 text-gray-900">JACKET-01</td>
                                          <td className="px-3 py-2 text-gray-900">Jacket</td>
                                          <td className="px-3 py-2 text-gray-900">JACKET-01-B-M</td>
                                          <td className="px-3 py-2 text-gray-600">Black</td>
                                          <td className="px-3 py-2 text-gray-600">M</td>
                                          <td className="px-3 py-2 text-orange-600">120</td>
                                          <td className="px-3 py-2 text-gray-600">4</td>
                                          <td className="px-3 py-2 text-gray-400">optional</td>
                                        </tr>
                                        <tr className="border-b border-gray-200">
                                          <td className="px-3 py-2 text-gray-900">JACKET-01</td>
                                          <td className="px-3 py-2 text-gray-900">Jacket</td>
                                          <td className="px-3 py-2 text-gray-900">JACKET-01-B-L</td>
                                          <td className="px-3 py-2 text-gray-600">Black</td>
                                          <td className="px-3 py-2 text-gray-600">L</td>
                                          <td className="px-3 py-2 text-orange-600">120</td>
                                          <td className="px-3 py-2 text-gray-600">6</td>
                                          <td className="px-3 py-2 text-gray-400">optional</td>
                                        </tr>
                                      </tbody>
                                    </table>
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
                              <li>✅ Проверка уникальности комбинаций атрибутов</li>
                              <li>✅ Проверка уникальности SKU (включая автогенерацию)</li>
                              <li>✅ Поддержка фото на уровне родителя и вариации</li>
                              <li>✅ Свой остаток у каждой вариации</li>
                              <li>✅ Валидация наличия обязательных атрибутов</li>
                              <li>✅ Валидация конфликтов по имени и SKU</li>
                              <li>✅ Проверка дублей вариаций</li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Sidebar - Meta Boxes */}
              <div className="w-80 space-y-4">
                {/* Publish Box */}
                <div className="border-2 border-gray-300 rounded-lg">
                  <div className="bg-gray-100 px-4 py-2 border-b border-gray-300">
                    <h3 className="text-sm text-gray-900">Опубликовать</h3>
                  </div>
                  <div className="p-4 space-y-4">
                    {/* Post Status */}
                    <div>
                      <h4 className="text-xs text-gray-600 mb-2">Post Status</h4>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="postStatus"
                            value="published"
                            checked={postStatus === 'published'}
                            onChange={(e) => setPostStatus(e.target.value)}
                            className="w-3.5 h-3.5"
                          />
                          <span className="text-xs text-gray-900">Published</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="postStatus"
                            value="draft"
                            checked={postStatus === 'draft'}
                            onChange={(e) => setPostStatus(e.target.value)}
                            className="w-3.5 h-3.5"
                          />
                          <span className="text-xs text-gray-900">Draft</span>
                        </label>
                        <label className="flex items-center gap-2 opacity-50">
                          <input
                            type="radio"
                            name="postStatus"
                            value="xpath"
                            disabled
                            className="w-3.5 h-3.5"
                          />
                          <span className="text-xs text-gray-900">Set with XPath</span>
                          <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-200">PRO</span>
                        </label>
                      </div>
                    </div>

                    {/* Post Dates */}
                    <div>
                      <h4 className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                        Post Dates
                        <button className="text-gray-400 hover:text-gray-600" title="Справка">
                          <HelpCircle className="w-3 h-3" />
                        </button>
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="flex items-center gap-2 cursor-pointer mb-2">
                            <input
                              type="radio"
                              name="postDates"
                              value="as-specified"
                              checked={postDates === 'as-specified'}
                              onChange={(e) => setPostDates(e.target.value)}
                              className="w-3.5 h-3.5"
                            />
                            <span className="text-xs text-gray-900">As specified</span>
                          </label>
                          {postDates === 'as-specified' && (
                            <div className="ml-5">
                              <DatePickerWithFooter
                                selected={asSpecifiedDate}
                                onChange={(date) => setAsSpecifiedDate(date)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                dateFormat="yyyy-MM-dd"
                              />
                            </div>
                          )}
                        </div>
                        <div>
                          <label className="flex items-center gap-2 cursor-pointer mb-2">
                            <input
                              type="radio"
                              name="postDates"
                              value="random"
                              checked={postDates === 'random'}
                              onChange={(e) => setPostDates(e.target.value)}
                              className="w-3.5 h-3.5"
                            />
                            <span className="text-xs text-gray-900">Random dates</span>
                            <button className="text-gray-400 hover:text-gray-600" title="Справка">
                              <HelpCircle className="w-3 h-3" />
                            </button>
                          </label>
                          {postDates === 'random' && (
                            <div className="ml-5 space-y-2">
                              <DatePickerWithFooter
                                selected={randomStartDate}
                                onChange={(date) => setRandomStartDate(date)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                dateFormat="yyyy-MM-dd"
                              />
                              <div className="text-[10px] text-gray-600 text-center">and</div>
                              <DatePickerWithFooter
                                selected={randomEndDate}
                                onChange={(date) => setRandomEndDate(date)}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                                dateFormat="yyyy-MM-dd"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Categories */}
                <div className="border-2 border-gray-300 rounded-lg">
                  <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex items-center justify-between">
                    <h3 className="text-sm text-gray-900">Категории товаров</h3>
                    <button className="text-xs text-gray-600 hover:text-gray-900">▼</button>
                  </div>
                  <div className="p-4">
                    <CategoryFields
                      categories={categories}
                      onChange={setCategories}
                    />
                  </div>
                </div>

                {/* Tags */}
                <div className="border-2 border-gray-300 rounded-lg">
                  <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex items-center justify-between">
                    <h3 className="text-sm text-gray-900">Метки товаров</h3>
                    <button className="text-xs text-gray-600 hover:text-gray-900">▼</button>
                  </div>
                  <div className="p-4">
                    <DropZoneField
                      field={targetFields.find(f => f.id === 'tags')!}
                      mappedSourceField={getMappedSourceField('tags')}
                      onDrop={handleDrop}
                      onRemove={handleRemoveMapping}
                    />
                  </div>
                </div>

                {/* Product Image */}
                <div className="border-2 border-gray-300 rounded-lg">
                  <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex items-center justify-between">
                    <h3 className="text-sm text-gray-900">Изображение товара</h3>
                    <button className="text-xs text-gray-600 hover:text-gray-900">▼</button>
                  </div>
                  <div className="p-4">
                    <DropZoneField
                      field={targetFields.find(f => f.id === 'main_image')!}
                      mappedSourceField={getMappedSourceField('main_image')}
                      onDrop={handleDrop}
                      onRemove={handleRemoveMapping}
                    />
                  </div>
                </div>

                {/* Gallery */}
                <div className="border-2 border-gray-300 rounded-lg">
                  <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex items-center justify-between">
                    <h3 className="text-sm text-gray-900">Галерея товара</h3>
                    <button className="text-xs text-gray-600 hover:text-gray-900">▼</button>
                  </div>
                  <div className="p-4">
                    <DropZoneField
                      field={targetFields.find(f => f.id === 'gallery_images')!}
                      mappedSourceField={getMappedSourceField('gallery_images')}
                      onDrop={handleDrop}
                      onRemove={handleRemoveMapping}
                    />
                  </div>
                </div>

                {/* Brands (Custom Meta Box) */}
                <div className="border-2 border-gray-300 rounded-lg">
                  <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex items-center justify-between">
                    <h3 className="text-sm text-gray-900">Бренды</h3>
                    <button className="text-xs text-gray-600 hover:text-gray-900">▼</button>
                  </div>
                  <div className="p-4">
                    <div className="text-xs text-gray-500 text-center py-3 border-2 border-dashed border-gray-300 rounded">
                      Custom meta box
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:border-gray-400 flex items-center gap-2"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">
            Mapped: {mappings.length} / {targetFields.length} fields
          </span>
          <button
            onClick={onNext}
            disabled={!requiredFieldsMapped}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Next
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function FieldMapping(props: FieldMappingProps) {
  return (
    <DndProvider backend={HTML5Backend}>
      <FieldMappingContent {...props} />
    </DndProvider>
  );
}