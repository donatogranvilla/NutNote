import React from 'react';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { PageWithDetails, StatusDefinition } from '../../lib/types';
import { Link } from 'react-router-dom';

interface KanbanViewProps {
  items: PageWithDetails[];
  statusFlow: StatusDefinition[];
  onStatusChange: (pageId: string, newStatus: string) => void;
  onReorder: (activeId: string, overId: string) => void;
}

export function KanbanView({ items, statusFlow, onStatusChange, onReorder }: KanbanViewProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const columns = statusFlow.map(status => ({
    ...status,
    items: items.filter(i => i.status === status.value)
  }));

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeItem = items.find(i => i.id === activeId);
    if (!activeItem) return;

    // Check if dragging over a column directly (empty column) or over an item
    const isOverAColumn = statusFlow.some(s => s.value === overId);
    
    if (isOverAColumn) {
      if (activeItem.status !== overId) {
        onStatusChange(activeId, overId);
      }
    } else {
      const overItem = items.find(i => i.id === overId);
      if (overItem && overItem.status !== activeItem.status) {
        onStatusChange(activeId, overItem.status);
      }
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    const isOverAColumn = statusFlow.some(s => s.value === overId);
    if (!isOverAColumn && activeId !== overId) {
      onReorder(activeId, overId);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
      <div style={{ display: 'flex', gap: 'var(--sp-4)', overflowX: 'auto', paddingBottom: 'var(--sp-4)', minHeight: '400px' }}>
        {columns.map(col => (
          <KanbanColumn key={col.value} status={col} />
        ))}
      </div>
    </DndContext>
  );
}

interface KanbanColumnProps {
  status: StatusDefinition & { items: PageWithDetails[] };
}

function KanbanColumn({ status }: KanbanColumnProps) {
  // We use useSortable for the column itself to act as a droppable container
  // even when empty (by using the column value as ID)
  const { setNodeRef } = useSortable({
    id: status.value,
    data: { type: 'Column', status: status.value }
  });

  return (
    <div style={{ 
      flex: '0 0 300px', 
      backgroundColor: 'var(--bg-surface)', 
      borderRadius: 'var(--radius-md)', 
      border: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ padding: 'var(--sp-3)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: status.color }} />
          <span style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{status.label}</span>
        </div>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', backgroundColor: 'var(--bg-app)', padding: '2px 6px', borderRadius: '12px' }}>
          {status.items.length}
        </span>
      </div>
      
      <div ref={setNodeRef} style={{ padding: 'var(--sp-2)', flex: 1, minHeight: '100px', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        <SortableContext items={status.items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {status.items.map(item => (
            <KanbanCard key={item.id} item={item} />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}

interface KanbanCardProps {
  item: PageWithDetails;
}

function KanbanCard({ item }: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: item.id,
    data: { type: 'Card', item }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 2 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className="kanban-card"
    >
      <Link to={`/page/${item.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
          <span style={{ color: item.typeColor || 'var(--text-secondary)' }}>{item.icon || '📄'}</span>
          <span style={{ fontWeight: 'var(--weight-medium)', fontSize: 'var(--text-sm)' }}>{item.title}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--sp-3)' }}>
          {item.priority !== 'none' && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              P: {item.priority}
            </span>
          )}
          {Boolean(item.relationsCount && item.relationsCount > 0) && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              🔗 {item.relationsCount}
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}
