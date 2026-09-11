export default function PropertiesPanel({ typeId }: { typeId: string }) {
  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: 'var(--sp-4)',
      backgroundColor: 'var(--bg-surface)'
    }}>
      <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', marginBottom: 'var(--sp-4)' }}>
        Proprietà ({typeId})
      </h3>
      <p style={{ color: 'var(--text-secondary)' }}>
        Render delle proprietà dinamiche basato su PageType...
      </p>
    </div>
  );
}
