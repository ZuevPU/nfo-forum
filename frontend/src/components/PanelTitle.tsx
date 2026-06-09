import { Footnote, Title } from '@vkontakte/vkui';

interface Props {
  title: string;
  subtitle?: string;
}

export function PanelTitle({ title, subtitle }: Props) {
  return (
    <div>
      <Title level="2">{title}</Title>
      {subtitle && <Footnote>{subtitle}</Footnote>}
    </div>
  );
}
