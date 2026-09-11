import React, { useState } from 'react';
import { Upload, File as FileIcon, X } from 'lucide-react';
import { uploadFile } from '../../lib/files';
import { open } from '@tauri-apps/plugin-dialog';

interface FileUploaderProps {
  onUploadComplete: (fileData: { path: string, url: string, filename: string }) => void;
}

export function FileUploader({ onUploadComplete }: FileUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectFile = async () => {
    try {
      setIsUploading(true);
      setError(null);
      
      const selected = await open({
        multiple: false,
        title: 'Seleziona un file da caricare',
      });
      
      if (selected && typeof selected === 'string') {
        const result = await uploadFile(selected);
        onUploadComplete(result);
      }
    } catch (err) {
      console.error('Upload failed:', err);
      setError('Errore durante il caricamento del file');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ padding: 'var(--sp-2)', border: '1px dashed var(--border)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
      <button 
        onClick={handleSelectFile}
        disabled={isUploading}
        style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: 'var(--sp-2)', 
          padding: 'var(--sp-2) var(--sp-4)', 
          backgroundColor: 'var(--bg-surface-active)', 
          borderRadius: 'var(--radius-md)',
          color: 'var(--text-primary)',
          cursor: isUploading ? 'not-allowed' : 'pointer',
          opacity: isUploading ? 0.7 : 1
        }}
      >
        <Upload size={16} />
        {isUploading ? 'Caricamento in corso...' : 'Carica File'}
      </button>
      {error && <div style={{ color: 'var(--danger)', fontSize: 'var(--text-xs)', marginTop: 'var(--sp-2)' }}>{error}</div>}
    </div>
  );
}

interface FilePreviewProps {
  url: string;
  filename: string;
  onRemove?: () => void;
}

export function FilePreview({ url, filename, onRemove }: FilePreviewProps) {
  const isImage = filename.match(/\.(jpeg|jpg|gif|png|webp)$/i);
  
  return (
    <div style={{ position: 'relative', display: 'inline-block', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
      {isImage ? (
        <img src={url} alt={filename} style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'contain', display: 'block' }} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', padding: 'var(--sp-3)', backgroundColor: 'var(--bg-surface)' }}>
          <FileIcon size={24} color="var(--text-secondary)" />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{filename}</span>
        </div>
      )}
      
      {onRemove && (
        <button 
          onClick={onRemove}
          style={{ position: 'absolute', top: 'var(--sp-1)', right: 'var(--sp-1)', backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', borderRadius: '50%', padding: '4px' }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
