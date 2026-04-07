import { useState, useEffect, ChangeEvent, Dispatch, SetStateAction } from 'react';
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
import { addCacheBuster, getWpNonce } from '../utils/api';

interface FieldMappingProps {
  onBack: () => void;
  onNext: () => void;
  previewData?: {
    headers: string[];
    rows: any[][];
    file_id: string;
    original_name: string;
  };
  mappings?: Mapping[];
  setMappings?: Dispatch<SetStateAction<Mapping[]>>;
  attributes?: ProductAttribute[];
  setAttributes?: Dispatch<SetStateAction<ProductAttribute[]>>;
  categories?: CategoryField[];
  setCategories?: Dispatch<SetStateAction<CategoryField[]>>;
  productType?: 'simple' | 'variable' | 'grouped';
  setProductType?: Dispatch<SetStateAction<'simple' | 'variable' | 'grouped'>>;
  onApplyTemplateProfile?: (profileId: number) => Promise<void> | void;
  onUndoTemplateApply?: () => void;
  canUndoTemplateApply?: boolean;
  isApplyingTemplate?: boolean;
  templateAppliedProfileName?: string | null;
}

interface TemplateProfileOption {
  id: number;
  name: string;
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
  id?: string;
  sourceFieldId?: string | null;
  targetFieldId: string;
  manualValue?: string;
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
      // Map column name as the attribute name
      onUpdate(attribute.id, 'name', item.field.name);
    },
    collect: (monitor) => ({
      isOverName: monitor.isOver(),
    }),
  });

  const [{ isOverValues }, dropValues] = useDrop({
    accept: 'FIELD',
    drop: (item: { field: SourceField }) => {
      // Map column value with placeholder for dynamic retrieval
      onUpdate(attribute.id, 'values', `{${item.field.name}}`);
    },
    collect: (monitor) => ({
      isOverValues: monitor.isOver(),
    }),
  });

  return (
    <div
      ref={(node) => {
        preview(drop(node));
      }}
      className={`bg-white border border-gray-300 rounded-lg p-3 ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-3">
        {/* Drag Handle */}
        <div
          ref={(node) => {
            drag(node);
          }}
          className="cursor-move p-1 hover:bg-gray-100 rounded"
        >
          <GripVertical className="w-4 h-4 text-gray-400" />
        </div>

        {/* Name Field */}
        <div
          className="flex-1"
          ref={(node) => {
            dropName(node);
          }}
        >
          <input
            type="text"
            value={attribute.name}
            onChange={(e) => onUpdate(attribute.id, 'name', e.target.value)}
            className={`w-full px-3 py-2 border rounded text-sm transition-all ${
              isOverName ? 'border-green-500 bg-green-50' : 'border-gray-300'
            }`}
            placeholder="Name (e.g. Color)"
          />
        </div>

        {/* Values Field */}
        <div
          className="flex-[2]"
          ref={(node) => {
            dropValues(node);
          }}
        >
          <input
            type="text"
            value={attribute.values}
            onChange={(e) => onUpdate(attribute.id, 'values', e.target.value)}
            className={`w-full px-3 py-2 border rounded text-sm transition-all ${
              isOverValues ? 'border-green-500 bg-green-50' : 'border-gray-300'
            }`}
            placeholder="Values (e.g. Red | Blue or {Column})"
          />
        </div>

        {/* Checkboxes */}
        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={attribute.inVariations}
              onChange={(e) => onUpdate(attribute.id, 'inVariations', e.target.checked)}
              className="attribute-checkbox"
            />
            <span className="text-gray-700">Variations</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={attribute.isVisible}
              onChange={(e) => onUpdate(attribute.id, 'isVisible', e.target.checked)}
              className="attribute-checkbox"
            />
            <span className="text-gray-700">Visible</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={attribute.isTaxonomy}
              onChange={(e) => onUpdate(attribute.id, 'isTaxonomy', e.target.checked)}
              className="attribute-checkbox"
            />
            <span className="text-gray-700">Taxonomy</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={attribute.autoCreateTerms}
              onChange={(e) => onUpdate(attribute.id, 'autoCreateTerms', e.target.checked)}
              className="attribute-checkbox"
            />
            <span className="text-gray-700">Create Terms</span>
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
      ref={(node) => {
        drag(node as any);
      }}
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
  manualValue = '',
  onDrop, 
  onRemove,
  onManualChange
}: { 
  field: TargetField; 
  mappedSourceField?: SourceField;
  manualValue?: string;
  onDrop: (sourceField: SourceField, targetField: TargetField) => void;
  onRemove: (targetFieldId: string) => void;
  onManualChange?: (targetFieldId: string, value: string) => void;
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

  const handleManualInputChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onManualChange?.(field.id, event.target.value);
  };

  const hasManualValue = manualValue?.trim().length > 0;
  
  // Build preview: replace {value} with mapped value
  const buildPreview = () => {
    if (!hasManualValue && !mappedSourceField) return '';
    if (!hasManualValue) return mappedSourceField?.value || '';
    if (!mappedSourceField) return manualValue;
    // Replace {value} placeholder with actual mapped value
    return manualValue.replace(/{value}/g, mappedSourceField.value);
  };
  
  const previewValue = buildPreview();
  const displayValue = hasManualValue ? manualValue : (mappedSourceField ? mappedSourceField.value : manualValue);
  
  // Generate field-specific placeholder
  const getPlaceholder = (): string => {
    const fieldId = field.id.toLowerCase();
    
    // Field-specific examples
    if (fieldId.includes('title') || fieldId.includes('name')) {
      return 'Drag column or type: {value} - New Edition';
    }
    if (fieldId.includes('sku')) {
      return 'Drag column or type: PREFIX-{value}';
    }
    if (fieldId.includes('price') || fieldId.includes('cost')) {
      return 'Drag column or type static value';
    }
    if (fieldId.includes('description')) {
      return 'Drag column or type: {value}\n\nAdditional info here';
    }
    if (fieldId.includes('brand')) {
      return 'Drag column or type brand name';
    }
    if (fieldId.includes('tag') || fieldId.includes('category')) {
      return 'Drag column or type: {value}, Extra Tag';
    }
    if (fieldId.includes('image') || fieldId.includes('gallery')) {
      return 'Drag column with image URLs';
    }
    if (fieldId.includes('weight') || fieldId.includes('length') || fieldId.includes('width') || fieldId.includes('height')) {
      return 'Drag column or type value';
    }
    
    // Default placeholder
    return field.placeholder || 'Drag column or type value (use {value} for mapped data)';
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-1">
        <label className="block text-sm text-gray-600">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {(mappedSourceField || hasManualValue) && (
          <button
            onClick={() => onRemove(field.id)}
            className="ml-auto p-1 hover:bg-gray-100 rounded"
            title="Clear mapping"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>
      
      <div
        ref={(node) => {
          drop(node);
        }}
      >
        {['textarea', 'image', 'multiselect'].includes(field.type) ? (
          <textarea
            rows={field.type === 'textarea' ? 4 : 3}
            value={displayValue || ''}
            onChange={handleManualInputChange}
            placeholder={getPlaceholder()}
            className={`w-full px-3 py-2 border-2 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 transition-all resize-none ${
              isOver && canDrop 
                ? 'border-green-500 bg-green-50' 
                : hasManualValue 
                ? 'border-green-300 bg-green-50' 
                : mappedSourceField
                ? 'border-blue-300 bg-blue-50'
                : field.required
                ? 'border-orange-300'
                : 'border-gray-300'
            }`}
          />
        ) : (
          <input
            type="text"
            value={displayValue || ''}
            onChange={handleManualInputChange}
            placeholder={getPlaceholder()}
            className={`w-full px-3 py-2 border-2 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400 transition-all ${
              isOver && canDrop 
                ? 'border-green-500 bg-green-50' 
                : hasManualValue 
                ? 'border-green-300 bg-green-50' 
                : mappedSourceField
                ? 'border-blue-300 bg-blue-50'
                : field.required
                ? 'border-orange-300'
                : 'border-gray-300'
            }`}
          />
        )}
      </div>
      
      {previewValue && previewValue !== displayValue && (
        <p className="text-[11px] text-blue-600 mt-1">
          Preview: <span className="font-medium">{previewValue}</span>
        </p>
      )}
      
      {hasManualValue && !mappedSourceField && (
        <p className="text-[11px] text-green-600 mt-1">✔ Manual value will be used</p>
      )}
    </div>
  );
}

function FieldMappingContent({
  onBack,
  onNext,
  previewData,
  mappings: propMappings,
  setMappings: propSetMappings,
  attributes: propAttributes,
  setAttributes: propSetAttributes,
  categories: propCategories,
  setCategories: propSetCategories,
  productType: propProductType,
  setProductType: propSetProductType,
  onApplyTemplateProfile,
  onUndoTemplateApply,
  canUndoTemplateApply,
  isApplyingTemplate,
  templateAppliedProfileName,
}: FieldMappingProps) {
  
  const [currentRow, setCurrentRow] = useState(0);
  const [localProductType, setLocalProductType] = useState<'simple' | 'variable' | 'grouped'>('simple');
  const productType = propProductType ?? localProductType;
  const setProductType = propSetProductType ?? setLocalProductType;
  const isPro = Boolean((window as any).pifwcAdmin?.isPro);
  
  // Use mappings from props if available, otherwise use local state
  const mappings = propMappings || [];
  const setMappings = propSetMappings || (() => {});
  
  // Use attributes from props if available, otherwise use empty array
  const attributes = propAttributes || [];
  const setAttributes = propSetAttributes || (() => {});
  
  const [sourceFields, setSourceFields] = useState<SourceField[]>([]);
  const [activeTab, setActiveTab] = useState<'general' | 'inventory' | 'shipping' | 'linked' | 'attributes' | 'variations' | 'grouped'>('general');

  useEffect(() => {
    if (!isPro && (productType === 'variable' || productType === 'grouped')) {
      setProductType('simple');
    }
  }, [isPro, productType, setProductType]);

  useEffect(() => {
    if (productType === 'variable') {
      setActiveTab('variations');
      return;
    }
    if (productType === 'grouped') {
      setActiveTab('grouped');
      return;
    }
    setActiveTab('general');
  }, [productType]);
  
  // Use real data from uploaded file if available, otherwise use mock data
  const generateSourceFields = (): SourceField[] => {
    if (previewData && previewData.headers && previewData.rows && previewData.rows.length > 0) {
      // Check if currentRow is within bounds
      if (currentRow >= previewData.rows.length) {
        return [];
      }
      
      const rowData = previewData.rows[currentRow];
      
      // Create unique fields based on header + columnIndex to avoid duplicates
      const fields = previewData.headers.map((header, index) => ({
        id: `field_${index}_${currentRow}`, // Use index instead of header to ensure uniqueness
        name: header,
        value: rowData[index] || '',
        columnIndex: index + 1,
        isMapped: false
      }));
      
      return fields;
    }
    return generateSampleData(currentRow);
  };

  // Initialize and update source fields when previewData or currentRow changes
  useEffect(() => {
    const fields = generateSourceFields();
    setSourceFields(fields);
  }, [currentRow, previewData]);
  const [variationModel, setVariationModel] = useState<'classic' | 'no-parent-sku' | 'auto-sku' | 'shared-price'>('classic');
  const [groupedModel, setGroupedModel] = useState<'classic' | 'no-parent-sku' | 'auto-create' | 'bundle'>('classic');
  const [postStatus, setPostStatus] = useState<string>('published');
  const [postDates, setPostDates] = useState<string>('as-specified');
  const [asSpecifiedDate, setAsSpecifiedDate] = useState<Date | null>(new Date());
  const [randomStartDate, setRandomStartDate] = useState<Date | null>(new Date());
  const [randomEndDate, setRandomEndDate] = useState<Date | null>(new Date());
  const [localCategories, setLocalCategories] = useState<CategoryField[]>([
    { id: 'cat_1', name: '', level: 0 },
    { id: 'cat_2', name: '', level: 0 },
    { id: 'cat_3', name: '', level: 0 },
    { id: 'cat_4', name: '', level: 0 },
    { id: 'cat_5', name: '', level: 0 },
  ]);

  const categories = propCategories || localCategories;
  const setCategories = propSetCategories || setLocalCategories;

  const [templateProfiles, setTemplateProfiles] = useState<TemplateProfileOption[]>([]);
  const [isLoadingTemplateProfiles, setIsLoadingTemplateProfiles] = useState(false);
  const [selectedTemplateProfileId, setSelectedTemplateProfileId] = useState<number | ''>('');
  const [templateProfilesError, setTemplateProfilesError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        setIsLoadingTemplateProfiles(true);
        setTemplateProfilesError(null);

        const nonce = getWpNonce();
        if (!nonce) {
          setTemplateProfilesError('Missing REST nonce. Please reload the page.');
          return;
        }

        const restBase = (window as any).pifwcAdmin?.restUrl;
        const candidates: string[] = [];

        if (typeof restBase === 'string' && restBase.trim() !== '') {
          const normalizedBase = restBase.endsWith('/') ? restBase : `${restBase}/`;
          candidates.push(`${normalizedBase}profiles?limit=100`);
        }

        candidates.push('/wp-json/pifwc/v1/profiles?limit=100');

        let lastError: string | null = null;

        for (const candidate of candidates) {
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
              lastError = `HTTP ${response.status}: ${body}`;
              continue;
            }

            const data = await response.json();
            if (data.status === 'success' && Array.isArray(data.data?.profiles)) {
              const normalized = (data.data.profiles as any[])
                .map((p) => {
                  const rawId = p?.id;
                  const idNum = typeof rawId === 'number'
                    ? rawId
                    : (typeof rawId === 'string' ? parseInt(rawId, 10) : NaN);
                  if (!Number.isFinite(idNum) || idNum <= 0) {
                    return null;
                  }
                  const name = typeof p?.name === 'string' && p.name.trim() !== ''
                    ? p.name
                    : `Profile #${idNum}`;
                  return { id: idNum, name };
                })
                .filter((p): p is TemplateProfileOption => !!p);
              setTemplateProfiles(normalized);
              lastError = null;
              break;
            }

            lastError = 'Unexpected API response format.';
          } catch (innerErr) {
            lastError = innerErr instanceof Error ? innerErr.message : String(innerErr);
          }
        }

        if (lastError) {
          setTemplateProfilesError(lastError);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setTemplateProfilesError(msg);
      } finally {
        setIsLoadingTemplateProfiles(false);
      }
    };

    fetchProfiles();
  }, []);

  const targetFields: TargetField[] = [
    // General Section
    { id: 'title', label: 'Product Title', type: 'text', placeholder: 'Enter product title', required: true, section: 'general' },
    { id: 'description', label: 'Description', type: 'textarea', placeholder: 'Enter description', required: false, section: 'general' },
    { id: 'short_description', label: 'Short Description', type: 'textarea', placeholder: 'Enter short description', required: false, section: 'general' },
    
    // Pricing Section
    { id: 'regular_price', label: 'Regular Price', type: 'number', placeholder: '0.00', required: true, section: 'pricing' },
    { id: 'sale_price', label: 'Sale Price', type: 'number', placeholder: '0.00', required: false, section: 'pricing' },
    
    // Inventory Section
    { id: 'sku', label: 'SKU', type: 'text', placeholder: 'Enter SKU', required: true, section: 'inventory' },
    { id: 'gtin_upc_ean', label: 'GTIN, UPC, EAN or ISBN', type: 'text', placeholder: '', required: false, section: 'inventory' },
    { id: 'stock_quantity', label: 'Stock Quantity', type: 'number', placeholder: '1', required: false, section: 'inventory' },
    { id: 'backorder_status', label: 'Allow backorders?', type: 'select', placeholder: 'Select backorder status', required: false, section: 'inventory' },
    { id: 'low_stock_threshold', label: 'Low stock threshold', type: 'text', placeholder: 'Store-wide threshold (2)', required: false, section: 'inventory' },
    { id: 'sold_individually', label: 'Limit purchases to 1 item per order', type: 'select', placeholder: '', required: false, section: 'inventory' },
    
    // Categories & Tags Section
    { id: 'categories', label: 'Categories', type: 'multiselect', placeholder: 'Select categories', required: false, section: 'taxonomy' },
    { id: 'tags', label: 'Tags', type: 'multiselect', placeholder: 'Select tags', required: false, section: 'taxonomy' },
    { id: 'brands', label: 'Brands', type: 'multiselect', placeholder: 'Select brands', required: false, section: 'taxonomy' },
    
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
      { id: 'variation_sku', label: 'Variation SKU', type: 'text', placeholder: 'Variation SKU pattern', required: false, section: 'variations' },
      { id: 'variation_price', label: 'Variation Price', type: 'number', placeholder: 'Variation price', required: false, section: 'variations' },
    );
  }


  const handleDrop = (sourceField: SourceField, targetField: TargetField) => {
    // Use functional setState to ensure we always work with the latest state
    setMappings((prevMappings) => {
      const currentMappings = prevMappings || [];
      
      const existingMapping = currentMappings.find(m => m.targetFieldId === targetField.id);
      
      // Remove existing mapping for this target field
      const newMappings = currentMappings.filter(m => m.targetFieldId !== targetField.id);
      
      // Add new mapping with unique ID while keeping manual value if user entered one
      const token = `{${sourceField.name}}`;
      const prevManual = (existingMapping?.manualValue || '').trim();
      const nextManual = prevManual
        ? `${prevManual}${prevManual.endsWith(' ') ? '' : ' '}${token}`
        : token;
      const newMapping: Mapping = {
        id: existingMapping?.id || `mapping_${Date.now()}_${Math.random()}`,
        sourceFieldId: token,
        targetFieldId: targetField.id,
        manualValue: nextManual
      };
      
      newMappings.push(newMapping);
      
      return newMappings;
    });
    
  };

  const handleRemoveMapping = (targetFieldId: string) => {
    setMappings((prevMappings) => (prevMappings || []).filter(m => m.targetFieldId !== targetFieldId));
  };

  const handleManualValueChange = (targetFieldId: string, value: string) => {
    setMappings((prevMappings) => {
      const currentMappings = prevMappings || [];
      const existingIndex = currentMappings.findIndex((m) => m.targetFieldId === targetFieldId);

      // If field already has mapping entry
      if (existingIndex !== -1) {
        const existingMapping = currentMappings[existingIndex];
        const updatedMapping = { ...existingMapping, manualValue: value };

        // If manual value cleared and there is no source field mapped, remove entry
        if (!value && !updatedMapping.sourceFieldId) {
          const result = currentMappings.filter((_, idx) => idx !== existingIndex);
          return result;
        }

        const updatedMappings = [...currentMappings];
        updatedMappings[existingIndex] = updatedMapping;
        return updatedMappings;
      }

      // No mapping entry yet – create one only if user entered value
      if (!value) {
        return currentMappings;
      }

      const result = [
        ...currentMappings,
        {
          id: `manual_${targetFieldId}_${Date.now()}`,
          targetFieldId,
          manualValue: value,
          sourceFieldId: null,
        },
      ];
      return result;
    });
  };

  const handleNext = () => {
    if (!requiredFieldsMapped) {
    }
    onNext();
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

  const normalizeFieldName = (value?: string | null) => (value || '').trim().toLowerCase();

  const getMappingForTargetField = (targetFieldId: string): Mapping | undefined => {
    return (propMappings || []).find(m => m.targetFieldId === targetFieldId);
  };

  const getMappedSourceField = (targetFieldId: string): SourceField | undefined => {
    const mapping = getMappingForTargetField(targetFieldId);
    if (!mapping || !mapping.sourceFieldId) return undefined;
    
    return sourceFields.find(f => normalizeFieldName(f.name) === normalizeFieldName(mapping.sourceFieldId));
  };

  const getManualValue = (targetFieldId: string) => {
    return getMappingForTargetField(targetFieldId)?.manualValue || '';
  };

  const getFieldsBySection = (section: string) => {
    return targetFields.filter(f => f.section === section);
  };

  const currentMappings = propMappings || [];
  const hasAnyMappings = currentMappings.length > 0;
  
  // Extract field names from tokens like {FieldName} and normalize them
  const normalizedMappedSourceNames = new Set(
    currentMappings
      .map(m => {
        const sourceId = m.sourceFieldId || '';
        // Remove curly braces if present: {FieldName} -> FieldName
        const cleanName = sourceId.replace(/^\{|\}$/g, '');
        return normalizeFieldName(cleanName);
      })
      .filter(name => name !== '')
  );
  
  // Check if a source field is mapped in regular mappings or attributes
  const isSourceFieldMapped = (fieldName: string) => {
    const normalizedName = normalizeFieldName(fieldName);
    
    // Check regular mappings
    if (normalizedMappedSourceNames.has(normalizedName)) {
      return true;
    }
    
    // Check if used in attributes (name or values)
    return attributes.some((attr: ProductAttribute) => {
      // Check if attribute name matches the field name
      if (normalizeFieldName(attr.name) === normalizedName) {
        return true;
      }
      
      // Check if attribute values contain {fieldName}
      if (attr.values && attr.values.includes(`{${fieldName}}`)) {
        return true;
      }
      
      return false;
    }) || categories.some((cat: any) => {
      const name = typeof cat?.name === 'string' ? cat.name : '';
      return name.includes(`{${fieldName}}`);
    });
  };

  const requiredTargetFields = targetFields.filter((field) => field.required);
  const missingRequiredTargetFields = requiredTargetFields.filter(
    (field) => !currentMappings.some((m) => m.targetFieldId === field.id)
  );
  const requiredFieldsMapped = missingRequiredTargetFields.length === 0;

  return (
    <div className="p-8 bg-gray-50 h-screen flex flex-col">
      <div className="mb-6">
        <h1 className="text-2xl text-gray-900 mb-2">Field Mapping</h1>
        <p className="text-gray-500">Step 3 of 5 - Drag fields from template to product card</p>
      </div>

      {/* Product Type Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div>
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
          {isPro && (
            <>
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
            </>
          )}
            </div>
          </div>

          <div className="ml-auto flex items-end gap-2">
            <div>
              <label className="block text-sm text-gray-600 mb-2">Use profile as template</label>
              <select
                value={selectedTemplateProfileId}
                onChange={(e) => {
                  const v = e.target.value;
                  setSelectedTemplateProfileId(v === '' ? '' : parseInt(v, 10));
                }}
                disabled={isLoadingTemplateProfiles || !!isApplyingTemplate}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white min-w-[260px]"
              >
                <option value="">Select profile...</option>
                {templateProfiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {templateProfilesError && (
                <div className="mt-1 text-[11px] text-red-600 max-w-[320px] break-words">
                  {templateProfilesError}
                </div>
              )}
            </div>

            <button
              onClick={async () => {
                if (!onApplyTemplateProfile) return;
                if (selectedTemplateProfileId === '' || !Number.isFinite(selectedTemplateProfileId)) {
                  alert('Please select a profile');
                  return;
                }
                const ok = confirm('Apply selected profile as template? This will overwrite current field mapping settings.');
                if (!ok) return;
                await onApplyTemplateProfile(Number(selectedTemplateProfileId));
              }}
              disabled={!onApplyTemplateProfile || selectedTemplateProfileId === '' || !!isApplyingTemplate}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isApplyingTemplate ? 'Applying…' : 'Apply'}
            </button>

            <button
              onClick={() => {
                if (!onUndoTemplateApply) return;
                onUndoTemplateApply();
              }}
              disabled={!onUndoTemplateApply || !canUndoTemplateApply || !!isApplyingTemplate}
              className="px-4 py-2 border border-red-500 text-red-600 bg-white rounded-lg hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              Undo
            </button>
          </div>
        </div>

        {templateAppliedProfileName && (
          <div className="mt-3 text-xs text-gray-600">
            Template applied: {templateAppliedProfileName}
          </div>
        )}
      </div>


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
                    setCurrentRow(currentRow - 1);
                  }
                }}
                disabled={currentRow === 0}
                className="p-1 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5 text-gray-700" />
              </button>
              <span className="text-sm text-gray-900">
                Row {currentRow + 1}
              </span>
              <button
                onClick={() => {
                  const maxRow = previewData?.rows?.length || 5;
                  if (currentRow < maxRow - 1) {
                    setCurrentRow(currentRow + 1);
                  }
                }}
                disabled={currentRow >= ((previewData?.rows?.length || 5) - 1)}
                className="p-1 hover:bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed"
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
                    isMapped={isSourceFieldMapped(field.name)}
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
                    manualValue={getManualValue('title')}
                    onDrop={handleDrop}
                    onRemove={handleRemoveMapping}
                    onManualChange={handleManualValueChange}
                  />
                </div>

                {/* Description Editor */}
                <div className="mb-6">
                  <label className="block text-sm text-gray-600 mb-2">Product Description</label>
                  <div className="border-2 border-gray-300 rounded-lg">
                    {/* Editor Toolbar Simulation */}
                    <div className="bg-gray-50 border-b border-gray-300 px-3 py-2 flex items-center gap-2">
                      <button className="text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100">
                        Add Media
                      </button>
                      <button className="text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100">
                        Add Form
                      </button>
                      <div className="flex-1"></div>
                      <select className="text-xs px-2 py-1 border border-gray-300 rounded">
                        <option>Paragraph</option>
                      </select>
                    </div>
                    <div className="p-3">
                      <DropZoneField
                        field={targetFields.find(f => f.id === 'description')!}
                        mappedSourceField={getMappedSourceField('description')}
                        manualValue={getManualValue('description')}
                        onDrop={handleDrop}
                        onRemove={handleRemoveMapping}
                        onManualChange={handleManualValueChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Short Description Editor */}
                <div className="mb-6">
                  <label className="block text-sm text-gray-600 mb-2">Short Product Description</label>
                  <div className="border-2 border-gray-300 rounded-lg">
                    <div className="bg-gray-50 border-b border-gray-300 px-3 py-2 flex items-center gap-2">
                      <button className="text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100">
                        Add Media
                      </button>
                      <button className="text-xs px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100">
                        Add Form
                      </button>
                    </div>
                    <div className="p-3">
                      <DropZoneField
                        field={targetFields.find(f => f.id === 'short_description')!}
                        mappedSourceField={getMappedSourceField('short_description')}
                        manualValue={getManualValue('short_description')}
                        onDrop={handleDrop}
                        onRemove={handleRemoveMapping}
                        onManualChange={handleManualValueChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Product Data Tabs */}
                <div className="mb-6">
                  <div className="border-2 border-gray-300 rounded-lg">
                    <div className="bg-gray-100 px-4 py-3 border-b border-gray-300 flex items-center gap-4">
                      <label className="text-sm text-gray-700">Product Data —</label>
                      <select 
                        value={productType}
                        onChange={(e) => setProductType(e.target.value as any)}
                        className="px-3 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="simple">Simple Product</option>
                        <option value="variable">Variable Product</option>
                        <option value="grouped">Grouped product</option>
                      </select>
                      <button className="text-gray-500 hover:text-gray-700">
                        <span className="text-sm">ⓘ</span>
                      </button>
                      <label className="flex items-center gap-2 text-sm text-gray-700 ml-4">
                        <input type="checkbox" className="w-4 h-4" />
                        Virtual
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input type="checkbox" className="w-4 h-4" />
                        Downloadable
                      </label>
                    </div>

                    {/* Tabs Navigation */}
                    <div className="bg-gray-50 border-b border-gray-300 px-2 py-0 flex gap-1 text-xs overflow-x-auto">
                      <button
                        className={`px-3 py-2 ${activeTab === 'general' ? 'bg-white border-t-2 border-red-500' : 'hover:bg-white'}`}
                        onClick={() => setActiveTab('general')}
                      >
                        General
                      </button>
                      <button
                        className={`px-3 py-2 ${activeTab === 'inventory' ? 'bg-white border-t-2 border-red-500' : 'hover:bg-white'}`}
                        onClick={() => setActiveTab('inventory')}
                      >
                        Inventory
                      </button>
                      <button
                        className={`px-3 py-2 ${activeTab === 'shipping' ? 'bg-white border-t-2 border-red-500' : 'hover:bg-white'}`}
                        onClick={() => setActiveTab('shipping')}
                      >
                        Shipping
                      </button>
                      <button
                        className={`px-3 py-2 ${activeTab === 'linked' ? 'bg-white border-t-2 border-red-500' : 'hover:bg-white'}`}
                        onClick={() => setActiveTab('linked')}
                      >
                        Linked Products
                      </button>
                      <button
                        className={`px-3 py-2 ${activeTab === 'attributes' ? 'bg-white border-t-2 border-red-500' : 'hover:bg-white'}`}
                        onClick={() => setActiveTab('attributes')}
                      >
                        Attributes
                      </button>
                      {productType === 'variable' && (
                        <button
                          className={`px-3 py-2 ${activeTab === 'variations' ? 'bg-white border-t-2 border-red-500' : 'hover:bg-white'}`}
                          onClick={() => setActiveTab('variations')}
                        >
                          Variations
                        </button>
                      )}
                      {productType === 'grouped' && (
                        <button
                          className={`px-3 py-2 ${activeTab === 'grouped' ? 'bg-white border-t-2 border-red-500' : 'hover:bg-white'}`}
                          onClick={() => setActiveTab('grouped')}
                        >
                          Models
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
                              manualValue={getManualValue('regular_price')}
                              onDrop={handleDrop}
                              onRemove={handleRemoveMapping}
                              onManualChange={handleManualValueChange}
                            />
                            <DropZoneField
                              field={targetFields.find(f => f.id === 'sale_price')!}
                              mappedSourceField={getMappedSourceField('sale_price')}
                              manualValue={getManualValue('sale_price')}
                              onDrop={handleDrop}
                              onRemove={handleRemoveMapping}
                              onManualChange={handleManualValueChange}
                            />
                          </div>

                          {/* Sale Dates */}
                          <div>
                            <label className="block text-sm text-gray-600 mb-2">Sale Dates</label>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="border-2 border-gray-300 rounded-lg p-3">
                                <label className="block text-sm text-gray-600 mb-1">From...</label>
                                <input 
                                  type="text" 
                                  placeholder="YYYY-MM-DD" 
                                  className="w-full border border-gray-300 rounded px-3 py-1 text-sm"
                                />
                              </div>
                              <div className="border-2 border-gray-300 rounded-lg p-3">
                                <label className="block text-sm text-gray-600 mb-1">To...</label>
                                <input 
                                  type="text" 
                                  placeholder="YYYY-MM-DD" 
                                  className="w-full border border-gray-300 rounded px-3 py-1 text-sm"
                                />
                              </div>
                            </div>
                            <button className="text-xs text-blue-600 hover:underline mt-2">Cancel</button>
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
                              manualValue={getManualValue('sku')}
                              onDrop={handleDrop}
                              onRemove={handleRemoveMapping}
                              onManualChange={handleManualValueChange}
                            />
                          </div>

                          {/* GTIN, UPC, EAN */}
                          <div>
                            <DropZoneField
                              field={targetFields.find(f => f.id === 'gtin_upc_ean')!}
                              mappedSourceField={getMappedSourceField('gtin_upc_ean')}
                              manualValue={getManualValue('gtin_upc_ean')}
                              onDrop={handleDrop}
                              onRemove={handleRemoveMapping}
                              onManualChange={handleManualValueChange}
                            />
                          </div>

                          {/* Stock Management Checkbox */}
                          <div className="flex items-center gap-2 py-2">
                            <input type="checkbox" id="track_stock" className="w-4 h-4" defaultChecked />
                            <label htmlFor="track_stock" className="text-sm text-gray-700">
                              Track stock quantity for this product
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
                              manualValue={getManualValue('stock_quantity')}
                              onDrop={handleDrop}
                              onRemove={handleRemoveMapping}
                              onManualChange={handleManualValueChange}
                            />
                          </div>

                          {/* Backorder Status */}
                          <div>
                            <label className="block text-sm text-gray-600 mb-2">
                              Allow backorders?
                              <button className="ml-2 text-gray-500 hover:text-gray-700 inline">
                                <span className="text-sm">ⓘ</span>
                              </button>
                            </label>
                            <div className="space-y-2">
                              <label className="flex items-center gap-2">
                                <input type="radio" name="backorders" value="no" defaultChecked className="w-4 h-4" />
                                <span className="text-sm text-gray-700">Do not allow</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <input type="radio" name="backorders" value="notify" className="w-4 h-4" />
                                <span className="text-sm text-gray-700">Allow, but notify customer</span>
                              </label>
                              <label className="flex items-center gap-2">
                                <input type="radio" name="backorders" value="yes" className="w-4 h-4" />
                                <span className="text-sm text-gray-700">Allow</span>
                              </label>
                            </div>
                          </div>

                          {/* Low Stock Threshold */}
                          <div>
                            <DropZoneField
                              field={targetFields.find(f => f.id === 'low_stock_threshold')!}
                              mappedSourceField={getMappedSourceField('low_stock_threshold')}
                              manualValue={getManualValue('low_stock_threshold')}
                              onDrop={handleDrop}
                              onRemove={handleRemoveMapping}
                              onManualChange={handleManualValueChange}
                            />
                          </div>

                          {/* Sold Individually */}
                          <div className="flex items-center gap-2 py-2">
                            <input type="checkbox" id="sold_individually" className="w-4 h-4" />
                            <label htmlFor="sold_individually" className="text-sm text-gray-700">
                              Limit purchases to 1 item per order
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
                              manualValue={getManualValue('weight')}
                              onDrop={handleDrop}
                              onRemove={handleRemoveMapping}
                              onManualChange={handleManualValueChange}
                            />
                            <DropZoneField
                              field={targetFields.find(f => f.id === 'length')!}
                              mappedSourceField={getMappedSourceField('length')}
                              manualValue={getManualValue('length')}
                              onDrop={handleDrop}
                              onRemove={handleRemoveMapping}
                              onManualChange={handleManualValueChange}
                            />
                            <DropZoneField
                              field={targetFields.find(f => f.id === 'width')!}
                              mappedSourceField={getMappedSourceField('width')}
                              manualValue={getManualValue('width')}
                              onDrop={handleDrop}
                              onRemove={handleRemoveMapping}
                              onManualChange={handleManualValueChange}
                            />
                            <DropZoneField
                              field={targetFields.find(f => f.id === 'height')!}
                              mappedSourceField={getMappedSourceField('height')}
                              manualValue={getManualValue('height')}
                              onDrop={handleDrop}
                              onRemove={handleRemoveMapping}
                              onManualChange={handleManualValueChange}
                            />
                          </div>
                          <DropZoneField
                            field={targetFields.find(f => f.id === 'shipping_class')!}
                            mappedSourceField={getMappedSourceField('shipping_class')}
                            manualValue={getManualValue('shipping_class')}
                            onDrop={handleDrop}
                            onRemove={handleRemoveMapping}
                            onManualChange={handleManualValueChange}
                          />
                        </div>
                      )}

                      {activeTab === 'linked' && (
                        <div className="space-y-4">
                          {/* Upsells Section */}
                          <div>
                            <div className="mb-2">
                              <label className="block text-sm text-gray-700 mb-1">
                                Upsell Products
                              </label>
                              <p className="text-xs text-gray-500">
                                Products shown on product page as recommendations
                              </p>
                            </div>
                            <DropZoneField
                              field={targetFields.find(f => f.id === 'upsells')!}
                              mappedSourceField={getMappedSourceField('upsells')}
                              manualValue={getManualValue('upsells')}
                              onDrop={handleDrop}
                              onRemove={handleRemoveMapping}
                              onManualChange={handleManualValueChange}
                            />
                          </div>

                          {/* Cross-sells Section */}
                          <div>
                            <div className="mb-2">
                              <label className="block text-sm text-gray-700 mb-1">
                                Cross-sell Products
                              </label>
                              <p className="text-xs text-gray-500">
                                Products shown in cart as additional purchases
                              </p>
                            </div>
                            <DropZoneField
                              field={targetFields.find(f => f.id === 'cross_sells')!}
                              mappedSourceField={getMappedSourceField('cross_sells')}
                              manualValue={getManualValue('cross_sells')}
                              onDrop={handleDrop}
                              onRemove={handleRemoveMapping}
                              onManualChange={handleManualValueChange}
                            />
                          </div>

                          {/* Grouped Products Section */}
                          <div>
                            <div className="mb-2">
                              <label className="block text-sm text-gray-700 mb-1">
                                Grouped Products
                              </label>
                              <p className="text-xs text-gray-500">
                                Parent product ID for grouping (only for grouped products)
                              </p>
                            </div>
                            <DropZoneField
                              field={targetFields.find(f => f.id === 'grouped_products')!}
                              mappedSourceField={getMappedSourceField('grouped_products')}
                              manualValue={getManualValue('grouped_products')}
                              onDrop={handleDrop}
                              onRemove={handleRemoveMapping}
                              onManualChange={handleManualValueChange}
                            />
                          </div>

                          {/* Info Box */}
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                            <div className="flex items-start gap-2">
                              <HelpCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <div className="text-sm text-gray-700">
                                <p className="mb-2"><strong>Recommendations:</strong></p>
                                <ul className="text-xs text-gray-600 space-y-1 ml-4 list-disc">
                                  <li><strong>Upsells</strong> — more expensive or improved versions of current product</li>
                                  <li><strong>Cross-sells</strong> — related products (e.g., batteries for flashlight)</li>
                                  <li><strong>Grouped</strong> — to combine multiple products into one set</li>
                                  <li>Product IDs must exist in your store (separate with commas)</li>
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
                                <div className="w-[80px]"></div>
                                <div className="w-[65px]"></div>
                                <div className="w-[80px]"></div>
                                <div className="w-[100px]"></div>
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
                          getManualValue={getManualValue}
                          handleDrop={handleDrop}
                          handleRemoveMapping={handleRemoveMapping}
                          handleManualValueChange={handleManualValueChange}
                        />
                      )}

                      {activeTab === 'grouped' && (
                        <GroupedTab
                          groupedModel={groupedModel}
                          setGroupedModel={setGroupedModel}
                          DropZoneField={DropZoneField}
                          getMappedSourceField={getMappedSourceField}
                          getManualValue={getManualValue}
                          handleDrop={handleDrop}
                          handleRemoveMapping={handleRemoveMapping}
                          handleManualValueChange={handleManualValueChange}
                        />
                      )}

                      {false && activeTab === 'variations' && (
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
                                  <Check className={`w-5 h-5 mt-0.5 ${variationModel === 'classic' ? 'text-red-500' : 'text-gray-300'}`} />
                                  <div className="flex-1">
                                    <h4 className="text-sm text-gray-900 mb-1">1. Classic Model</h4>
                                    <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                      RECOMMENDED
                                    </span>
                                  </div>
                                </div>
                                <ul className="text-xs text-gray-600 space-y-1 ml-7">
                                  <li>✅ Parent SKU</li>
                                  <li>✅ Variation SKUs</li>
                                  <li>✅ Attributes at parent level</li>
                                  <li>✅ Variation images optional</li>
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
                                    <h4 className="text-sm text-gray-900 mb-1">2. No Parent SKU</h4>
                                    <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                      Identification by name
                                    </span>
                                  </div>
                                </div>
                                <ul className="text-xs text-gray-600 space-y-1 ml-7">
                                  <li>❌ Parent SKU absent</li>
                                  <li>✅ Variation SKUs</li>
                                  <li>✅ Linked by product name</li>
                                  <li>✅ Variation images optional</li>
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
                                    <h4 className="text-sm text-gray-900 mb-1">3. Auto-generate SKU</h4>
                                    <span className="inline-block px-2 py-0.5 bg-red-50 text-red-600 text-xs rounded border border-red-200">
                                      SKU created automatically
                                    </span>
                                  </div>
                                </div>
                                <ul className="text-xs text-gray-600 space-y-1 ml-7">
                                  <li>✅ Parent SKU</li>
                                  <li>🔄 Variation SKU generated</li>
                                  <li>✅ Formula: PARENT-ATTR1-ATTR2</li>
                                  <li>✅ Variation images optional</li>
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
                                    <h4 className="text-sm text-gray-900 mb-1">4. Shared Price</h4>
                                    <span className="inline-block px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                                      Price at parent level
                                    </span>
                                  </div>
                                </div>
                                <ul className="text-xs text-gray-600 space-y-1 ml-7">
                                  <li>✅ Parent SKU</li>
                                  <li>✅ Variation SKUs</li>
                                  <li>💰 Price only at parent</li>
                                  <li>✅ Variation images optional</li>
                                </ul>
                              </button>
                            </div>
                          </div>

                          {/* Model Details */}
                          <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                            {variationModel === 'classic' && (
                              <div>
                                <h4 className="text-sm text-gray-900 mb-3">Model 1: Classic (Recommended)</h4>
                                <p className="text-xs text-gray-600 mb-4">
                                  Reference model for import. Full compatibility with ERP, warehouse, API. Best model for large catalogs.
                                </p>
                                
                                {/* Example Table */}
                                <div className="bg-white border border-gray-300 rounded overflow-hidden">
                                  <div className="bg-gray-100 px-3 py-2 border-b border-gray-300">
                                    <h5 className="text-xs text-gray-700">Example data structure:</h5>
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
                                <h4 className="text-sm text-gray-900 mb-3">Model 2: No Parent SKU</h4>
                                <p className="text-xs text-gray-600 mb-4">
                                  Often used by suppliers. Suitable for import without parent SKU. Requires strict product name uniqueness.
                                </p>
                                
                                <div className="bg-white border border-gray-300 rounded overflow-hidden">
                                  <div className="bg-gray-100 px-3 py-2 border-b border-gray-300">
                                    <h5 className="text-xs text-gray-700">Example data structure:</h5>
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
                                <h4 className="text-sm text-gray-900 mb-3">Model 3: Auto-generate Variation SKU</h4>
                                <p className="text-xs text-gray-600 mb-4">
                                  Variation SKU generated automatically based on attributes. Convenient for quick import.
                                </p>
                                
                                {/* Formula */}
                                <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4">
                                  <h5 className="text-xs text-blue-900 mb-2">Formula for auto-generating SKU:</h5>
                                  <code className="text-xs text-blue-800">
                                    PARENT_SKU + "-" + Attribute_Abbreviations
                                  </code>
                                  <div className="mt-2 text-xs text-blue-700">
                                    Example: <strong>TSHIRT-01-R-XL</strong> (where R = Red, XL = XL)
                                  </div>
                                </div>
                                
                                <div className="bg-white border border-gray-300 rounded overflow-hidden">
                                  <div className="bg-gray-100 px-3 py-2 border-b border-gray-300">
                                    <h5 className="text-xs text-gray-700">Example data structure:</h5>
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
                                <h4 className="text-sm text-gray-900 mb-3">Model 4: Shared Price at Parent Level</h4>
                                <p className="text-xs text-gray-600 mb-4">
                                  Convenient for fashion catalogs. Price inherited from parent product.
                                </p>
                                
                                <div className="bg-white border border-gray-300 rounded overflow-hidden">
                                  <div className="bg-gray-100 px-3 py-2 border-b border-gray-300">
                                    <h5 className="text-xs text-gray-700">Example data structure:</h5>
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
                              Required rules for all models
                            </h4>
                            <ul className="text-xs text-gray-700 space-y-1 ml-6">
                              <li>✅ Attribute combination uniqueness check</li>
                              <li>✅ SKU uniqueness check (including auto-generation)</li>
                              <li>✅ Support for images at parent and variation level</li>
                              <li>✅ Individual stock for each variation</li>
                              <li>✅ Validation of required attributes</li>
                              <li>✅ Validation of name and SKU conflicts</li>
                              <li>✅ Duplicate variation check</li>
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
                    <h3 className="text-sm text-gray-900">Publish</h3>
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
                      </div>
                    </div>

                    {/* Post Dates */}
                    <div>
                      <h4 className="text-xs text-gray-600 mb-2 flex items-center gap-1">
                        Post Dates
                        <button className="text-gray-400 hover:text-gray-600" title="Help">
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
                            <button className="text-gray-400 hover:text-gray-600" title="Help">
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
                    <h3 className="text-sm text-gray-900">Product Categories</h3>
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
                    <h3 className="text-sm text-gray-900">Product Tags</h3>
                    <button className="text-xs text-gray-600 hover:text-gray-900">▼</button>
                  </div>
                  <div className="p-4">
                    <DropZoneField
                      field={targetFields.find(f => f.id === 'tags')!}
                      mappedSourceField={getMappedSourceField('tags')}
                      manualValue={getManualValue('tags')}
                      onDrop={handleDrop}
                      onRemove={handleRemoveMapping}
                      onManualChange={handleManualValueChange}
                    />
                  </div>
                </div>

                {/* Product Image */}
                <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex items-center justify-between">
                    <h3 className="text-sm text-gray-900">Product Image</h3>
                    <button className="text-xs text-gray-600 hover:text-gray-900">▼</button>
                  </div>
                  <div className="p-4">
                    <DropZoneField
                      field={targetFields.find(f => f.id === 'main_image')!}
                      mappedSourceField={getMappedSourceField('main_image')}
                      manualValue={getManualValue('main_image')}
                      onDrop={handleDrop}
                      onRemove={handleRemoveMapping}
                      onManualChange={handleManualValueChange}
                    />
                  </div>
                </div>

                {/* Gallery */}
                <div className="border-2 border-gray-300 rounded-lg overflow-hidden">
                  <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex items-center justify-between">
                    <h3 className="text-sm text-gray-900">Product Gallery</h3>
                    <button className="text-xs text-gray-600 hover:text-gray-900">▼</button>
                  </div>
                  <div className="p-4">
                    <DropZoneField
                      field={targetFields.find(f => f.id === 'gallery_images')!}
                      mappedSourceField={getMappedSourceField('gallery_images')}
                      manualValue={getManualValue('gallery_images')}
                      onDrop={handleDrop}
                      onRemove={handleRemoveMapping}
                      onManualChange={handleManualValueChange}
                    />
                  </div>
                </div>

                {/* Brands */}
                <div className="border-2 border-gray-300 rounded-lg">
                  <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex items-center justify-between">
                    <h3 className="text-sm text-gray-900">Brands</h3>
                    <button className="text-xs text-gray-600 hover:text-gray-900">▼</button>
                  </div>
                  <div className="p-4">
                    <DropZoneField
                      field={targetFields.find(f => f.id === 'brands')!}
                      mappedSourceField={getMappedSourceField('brands')}
                      manualValue={getManualValue('brands')}
                      onDrop={handleDrop}
                      onRemove={handleRemoveMapping}
                      onManualChange={handleManualValueChange}
                    />
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
            Mapped: {(propMappings || []).length} / {targetFields.length} fields
          </span>
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
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