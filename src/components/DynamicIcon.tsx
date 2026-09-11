import React from 'react';
import * as Icons from 'lucide-react';

interface DynamicIconProps {
  name?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function DynamicIcon({ name, size = 16, className, style }: DynamicIconProps) {
  if (!name) return <span className={className} style={{ fontSize: size, ...style }}>📄</span>;
  
  // Check if the name corresponds to a Lucide icon
  const IconComponent = (Icons as any)[name];
  
  if (IconComponent) {
    return <IconComponent size={size} className={className} style={style} />;
  }
  
  // Fallback for emojis or other short text
  return (
    <span className={className} style={{ fontSize: size, lineHeight: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...style }}>
      {name}
    </span>
  );
}
