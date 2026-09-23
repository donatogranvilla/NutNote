import React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PageWithDetails, PropertyDefinition } from '../../lib/types';
import { GripVertical } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TableViewProps {
  items: PageWithDetails[];
  schema: PropertyDefinition[];
  onReorder: (activeId: string, overId: string) => void;
  onPropertyChange: (pageId: string, propertyKey: string, value: unknown) => void;
}

export function TableView({ items, schema, onReorder, onPropertyChange }: TableViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      onReorder(active.id as string, over.id as string);
    }
  };

  // Le colonne dipendono solo dallo schema del tipo, che cambia di rado: senza
  // memoria verrebbero ricalcolate anche a ogni passo di un trascinamento.
  const columns = React.useMemo(() => schema.filter(p => p.showInTable), [schema]);

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflowX: 'auto', backgroundColor: 'var(--bg-surface)' }}>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-app)' }}>
              <th style={{ padding: 'var(--sp-2) var(--sp-3)', width: '40px' }}></th>
              <th style={{ padding: 'var(--sp-2) var(--sp-3)', fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Titolo</th>
              {columns.map(col => (
                <th key={col.key} style={{ padding: 'var(--sp-2) var(--sp-3)', fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            <tbody>
              {items.map(item => (
                <SortableTableRow 
                  key={item.id} 
                  item={item} 
                  columns={columns} 
                  onPropertyChange={(key, val) => onPropertyChange(item.id, key, val)} 
                />
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 2} style={{ padding: 'var(--sp-4)', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Nessun elemento.
                  </td>
                </tr>
              )}
            </tbody>
          </SortableContext>
        </table>
      </DndContext>
    </div>
  );
}

interface SortableTableRowProps {
  item: PageWithDetails;
  columns: PropertyDefinition[];
  onPropertyChange: (key: string, value: unknown) => void;
}

function SortableTableRow({ item, columns, onPropertyChange }: SortableTableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    backgroundColor: isDragging ? 'var(--bg-surface-active)' : 'var(--bg-surface)',
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="table-row-hover">
      <td style={{ padding: 'var(--sp-2) var(--sp-3)', borderBottom: '1px solid var(--border)', width: '40px' }}>
        <button {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--text-muted)' }}>
          <GripVertical size={16} />
        </button>
      </td>
      <td style={{ padding: 'var(--sp-2) var(--sp-3)', borderBottom: '1px solid var(--border)' }}>
        <Link to={`/page/${item.id}`} style={{ textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 'var(--weight-medium)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <span style={{ color: item.typeColor || 'var(--text-secondary)' }}>{item.icon || '📄'}</span>
          {item.title}
        </Link>
      </td>
      {columns.map(col => (
        <td key={col.key} style={{ padding: 'var(--sp-2) var(--sp-3)', borderBottom: '1px solid var(--border)' }}>
          {col.type === 'text' || col.type === 'email' || col.type === 'url' ? (
            <input 
              type={col.type} 
              value={(item.properties[col.key] as string) || ''}
              onChange={e => onPropertyChange(col.key, e.target.value)}
              style={{ width: '100%', padding: '4px', border: '1px solid transparent', borderRadius: '4px', backgroundColor: 'transparent' }}
              onFocus={e => e.currentTarget.style.border = '1px solid var(--border)'}
              onBlur={e => e.currentTarget.style.border = '1px solid transparent'}
            />
          ) : col.type === 'number' ? (
            <input 
              type="number" 
              value={(item.properties[col.key] as number) || ''}
              onChange={e => onPropertyChange(col.key, Number(e.target.value))}
              style={{ width: '100%', padding: '4px', border: '1px solid transparent', borderRadius: '4px', backgroundColor: 'transparent' }}
              onFocus={e => e.currentTarget.style.border = '1px solid var(--border)'}
              onBlur={e => e.currentTarget.style.border = '1px solid transparent'}
            />
          ) : col.type === 'select' && col.options ? (
            <select
              value={(item.properties[col.key] as string) || ''}
              onChange={e => onPropertyChange(col.key, e.target.value)}
              style={{ width: '100%', padding: '4px', border: '1px solid transparent', borderRadius: '4px', backgroundColor: 'transparent' }}
            >
              <option value="">-</option>
              {col.options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          ) : (
            <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{String(item.properties[col.key] || '')}</div>
          )}
        </td>
      ))}
    </tr>
  );
}
