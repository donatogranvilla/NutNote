import React from 'react';
import type { Page, PropertyDefinition } from '../../lib/types';
import { FileUploader, FilePreview } from './FileUploader';

interface PropertiesPanelProps {
  page: Page;
  schema: PropertyDefinition[];
  onPropertyChange: (key: string, value: unknown) => void;
  isEditing?: boolean;
}

export function PropertiesPanel({ page, schema, onPropertyChange, isEditing = true }: PropertiesPanelProps) {
  if (!schema || schema.length === 0) return null;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--sp-3)',
      padding: 'var(--sp-4) 0',
      borderBottom: '1px solid var(--border)',
      marginBottom: 'var(--sp-6)'
    }}>
      {schema.map(prop => {
        const rawOptions = Array.isArray(prop.options)
          ? prop.options
          : (typeof prop.options === 'string'
              ? (() => { try { return JSON.parse(prop.options); } catch { return []; } })()
              : []);
        // Normalize options whether they are strings or { value, label }
        const normalizedOptions = rawOptions.map((opt: any) => {
          if (typeof opt === 'string') return { value: opt, label: opt };
          return { value: opt?.value || opt?.label || '', label: opt?.label || opt?.value || '' };
        });

        const currentValue = page?.properties?.[prop.key];

        return (
          <div key={prop.key} style={{ display: 'flex', alignItems: 'center', minHeight: '36px' }}>
            <div style={{
              width: '160px',
              color: 'var(--text-secondary)',
              fontSize: 'var(--text-sm)',
              fontWeight: 'var(--weight-medium)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>{prop.label}</span>
              {prop.required && <span style={{ color: 'var(--danger)', fontSize: '12px' }}>*</span>}
            </div>

            <div style={{ flex: 1, maxWidth: '500px' }}>
              {prop.type === 'text' || prop.type === 'email' || prop.type === 'url' || prop.type === 'phone' ? (
                <input 
                  type={prop.type === 'email' ? 'email' : prop.type === 'url' ? 'url' : prop.type === 'phone' ? 'tel' : 'text'}
                  value={(currentValue as string) || ''}
                  placeholder={`Inserisci ${prop.label.toLowerCase()}...`}
                  onChange={e => onPropertyChange(prop.key, e.target.value)}
                  disabled={!isEditing}
                  style={inputStyle}
                />
              ) : prop.type === 'number' ? (
                <input 
                  type="number"
                  value={currentValue !== undefined && currentValue !== null ? Number(currentValue) : ''}
                  placeholder="0"
                  onChange={e => onPropertyChange(prop.key, e.target.value === '' ? null : Number(e.target.value))}
                  disabled={!isEditing}
                  style={inputStyle}
                />
              ) : prop.type === 'date' || prop.type === 'datetime' ? (
                <input 
                  type={prop.type === 'datetime' ? 'datetime-local' : 'date'}
                  value={(currentValue as string) || ''}
                  onChange={e => onPropertyChange(prop.key, e.target.value)}
                  disabled={!isEditing}
                  style={{ ...inputStyle, width: 'auto' }}
                />
              ) : prop.type === 'select' ? (
                <select
                  value={(currentValue as string) || ''}
                  onChange={e => onPropertyChange(prop.key, e.target.value)}
                  disabled={!isEditing}
                  style={selectStyle}
                >
                  <option value="">-- Seleziona {prop.label} --</option>
                  {normalizedOptions.map((opt: { value: string; label: string }) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : prop.type === 'checkbox' ? (
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input 
                    type="checkbox"
                    checked={!!currentValue}
                    onChange={e => onPropertyChange(prop.key, e.target.checked)}
                    disabled={!isEditing}
                    style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    {currentValue ? 'Sì / Attivo' : 'No / Inattivo'}
                  </span>
                </label>
              ) : prop.type === 'file' ? (
                <div>
                  {currentValue ? (
                    <FilePreview 
                      url={(currentValue as any)?.url || (typeof currentValue === 'string' ? currentValue : '')} 
                      filename={(currentValue as any)?.filename || 'Allegato'} 
                      onRemove={() => onPropertyChange(prop.key, null)}
                    />
                  ) : (
                    <FileUploader 
                      onUploadComplete={(fileData) => onPropertyChange(prop.key, fileData)}
                    />
                  )}
                </div>
              ) : (
                <input
                  type="text"
                  value={String(currentValue || '')}
                  onChange={e => onPropertyChange(prop.key, e.target.value)}
                  disabled={!isEditing}
                  style={inputStyle}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--bg-input)',
  color: 'var(--text-primary)',
  fontSize: 'var(--text-sm)',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-md)',
  backgroundColor: 'var(--bg-input)',
  color: 'var(--text-primary)',
  fontSize: 'var(--text-sm)',
  outline: 'none',
  cursor: 'pointer',
};
