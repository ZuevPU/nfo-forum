import { Button, Div, Headline, List, Panel, PanelHeader, Placeholder, Spacing, Text } from '@vkontakte/vkui';
import { useNavigate } from 'react-router-dom';
import { CharacterIllustration } from '../components/CharacterIllustration';

export function WelcomePanel() {
  const navigate = useNavigate();

  return (
    <Panel id="welcome">
      <PanelHeader>Форум НФО</PanelHeader>
      <Div
        style={{
          minHeight: '70vh',
          background: 'linear-gradient(160deg, #3b4ec0 0%, #4f5ed4 50%, #6b5ecf 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '32px 20px',
          color: '#fff',
        }}
      >
        <CharacterIllustration size={120} />
        <Spacing size={10} />
        <Headline level="1" weight="1" style={{ color: '#fff', textAlign: 'center' }}>
          Привет!
        </Headline>
        <Spacing size={12} />
        <Text style={{ color: 'rgba(255,255,255,0.9)', textAlign: 'center', lineHeight: 1.6 }}>
          Я — твой помощник на Форуме неформального образования. Буду рядом всю программу.
        </Text>
        <Spacing size={16} />
        <List style={{ width: '100%', color: 'rgba(255,255,255,0.9)' }}>
          <li>ориентирую в расписании своего трека</li>
          <li>помогаю фиксировать мысли и рефлексию</li>
          <li>соединяю участников через «Обмен опытом»</li>
        </List>
        <div style={{ marginTop: 'auto', width: '100%' }}>
          <Button
            size="l"
            stretched
            mode="outline"
            style={{ borderColor: 'rgba(255,255,255,0.7)', color: '#fff' }}
            onClick={() => navigate('/register')}
          >
            Начать регистрацию
          </Button>
        </div>
      </Div>
      <Placeholder>мини-приложение · Форум НФО · 16+</Placeholder>
    </Panel>
  );
}
