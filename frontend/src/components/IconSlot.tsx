import { forwardRef, type ReactNode } from 'react';

/** Обёртка для иконок внутри VKUI-компонентов, которым нужен getRootRef. */
export const IconSlot = forwardRef<HTMLSpanElement, { children: ReactNode; className?: string }>(
  function IconSlot({ children, className }, ref) {
    return (
      <span ref={ref} className={className} style={{ display: 'inline-flex', alignItems: 'center' }}>
        {children}
      </span>
    );
  },
);
