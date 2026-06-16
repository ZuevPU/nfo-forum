import { Footnote, Title } from '@vkontakte/vkui';
import { forwardRef } from 'react';

interface Props {
  title: string;
  subtitle?: string;
}

export const PanelTitle = forwardRef<HTMLDivElement, Props>(function PanelTitle(
  { title, subtitle },
  ref,
) {
  return (
    <div ref={ref}>
      <Title level="2">{title}</Title>
      {subtitle ? <Footnote>{subtitle}</Footnote> : null}
    </div>
  );
});
