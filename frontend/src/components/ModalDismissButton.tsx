import { Icon24Dismiss } from '@vkontakte/icons';
import { PanelHeaderButton } from '@vkontakte/vkui';
import { IconSlot } from './IconSlot';

export function ModalDismissButton({ onClick }: { onClick: () => void }) {
  return (
    <PanelHeaderButton aria-label="Закрыть" onClick={onClick}>
      <IconSlot>
        <Icon24Dismiss />
      </IconSlot>
    </PanelHeaderButton>
  );
}
