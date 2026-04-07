import { useDrag, useDrop } from 'react-dnd';
import { GripVertical, ChevronLeft, ChevronRight, X, Plus } from 'lucide-react';

interface CategoryField {
  id: string;
  name: string;
  level: number;
}

interface SourceField {
  id: string;
  name: string;
  value: string;
  columnIndex: number;
  isMapped: boolean;
}

interface CategoryFieldItemProps {
  category: CategoryField;
  index: number;
  isFirst: boolean;
  hasHierarchy: boolean;
  onMove: (dragIndex: number, hoverIndex: number) => void;
  onUpdate: (id: string, value: string) => void;
  onRemove: (id: string) => void;
  onLevelChange: (id: string, direction: 'left' | 'right') => void;
  onDrop: (id: string, sourceField: SourceField) => void;
}

function CategoryFieldItem({
  category,
  index,
  isFirst,
  hasHierarchy,
  onMove,
  onUpdate,
  onRemove,
  onLevelChange,
  onDrop
}: CategoryFieldItemProps) {
  const [{ isDragging }, drag, preview] = useDrag({
    type: 'CATEGORY_ROW',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'CATEGORY_ROW',
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        onMove(item.index, index);
        item.index = index;
      }
    },
  });

  const [{ isOver }, dropField] = useDrop({
    accept: 'FIELD',
    drop: (item: { field: SourceField }) => {
      onDrop(category.id, item.field);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  const maxLevel = 6;
  const indentSize = 16.67; // 1/6 = 16.67%

  return (
    <div
      ref={(node) => preview(drop(node))}
      className={`flex items-center gap-2 mb-2 ${isDragging ? 'opacity-50' : ''}`}
      style={{ marginLeft: category.level > 0 ? `${category.level * indentSize}%` : '0' }}
    >
      <div
        ref={drag}
        className="cursor-move p-1 hover:bg-gray-100 rounded flex-shrink-0"
      >
        <GripVertical className="w-3.5 h-3.5 text-gray-400" />
      </div>

      {!isFirst ? (
        <div className="flex flex-col gap-0.5 w-6 flex-shrink-0">
          <button
            onClick={() => onLevelChange(category.id, 'left')}
            disabled={category.level === 0}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Decrease hierarchy level"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button
            onClick={() => onLevelChange(category.id, 'right')}
            disabled={category.level >= maxLevel}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"
            title="Increase hierarchy level"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="w-6 flex-shrink-0" />
      )}

      <div
        ref={dropField}
        className={`flex-1 border rounded px-2 py-1.5 transition-all ${
          isOver ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-white'
        }`}
      >
        <input
          type="text"
          value={category.name}
          onChange={(e) => onUpdate(category.id, e.target.value)}
          placeholder="Drag column or type"
          className="w-full text-xs bg-transparent outline-none text-gray-900 placeholder-gray-400"
        />
      </div>

      <button
        onClick={() => onRemove(category.id)}
        className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-600 flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

interface CategoryFieldsProps {
  categories: CategoryField[];
  onChange: (categories: CategoryField[]) => void;
}

export function CategoryFields({ categories, onChange }: CategoryFieldsProps) {
  const moveCategory = (dragIndex: number, hoverIndex: number) => {
    const draggedCategory = categories[dragIndex];
    const newCategories = [...categories];
    newCategories.splice(dragIndex, 1);
    newCategories.splice(hoverIndex, 0, draggedCategory);
    onChange(newCategories);
  };

  const updateCategory = (id: string, value: string) => {
    onChange(
      categories.map((cat) => (cat.id === id ? { ...cat, name: value } : cat))
    );
  };

  const removeCategory = (id: string) => {
    const next = categories.filter((cat) => cat.id !== id);
    if (next.length === 0) {
      onChange([{ id: `cat_${Date.now()}`, name: '', level: 0 }]);
      return;
    }
    onChange(next);
  };

  const changeCategoryLevel = (id: string, direction: 'left' | 'right') => {
    onChange(
      categories.map((cat) => {
        if (cat.id === id) {
          const newLevel = direction === 'right' ? cat.level + 1 : cat.level - 1;
          return { ...cat, level: Math.max(0, Math.min(6, newLevel)) };
        }
        return cat;
      })
    );
  };

  const handleDrop = (id: string, sourceField: SourceField) => {
    updateCategory(id, `{${sourceField.name}}`);
  };

  const addCategory = () => {
    onChange([
      ...categories,
      { id: `cat_${Date.now()}`, name: '', level: 0 },
    ]);
  };

  // Check if any category has hierarchy
  const hasHierarchy = categories.some((cat) => cat.level > 0);

  return (
    <div>
      {categories.map((category, index) => (
        <CategoryFieldItem
          key={category.id}
          category={category}
          index={index}
          isFirst={index === 0}
          hasHierarchy={hasHierarchy}
          onMove={moveCategory}
          onUpdate={updateCategory}
          onRemove={removeCategory}
          onLevelChange={changeCategoryLevel}
          onDrop={handleDrop}
        />
      ))}
      <button
        onClick={addCategory}
        className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-2"
      >
        <Plus className="w-3 h-3" />
        Add Category
      </button>
    </div>
  );
}