import React from 'react';
import { Badge } from './ui/badge';
import { cn } from './ui/utils';

interface ProBadgeProps {
  className?: string;
  label?: string;
}

export function ProBadge({ className, label = 'PRO' }: ProBadgeProps) {
  return (
    <Badge
      className={cn(
        'bg-[#d20c0b] text-white border-[#d20c0b]/40 uppercase tracking-[0.08em] text-[10px] px-2 py-0.5',
        className,
      )}
    >
      {label}
    </Badge>
  );
}
