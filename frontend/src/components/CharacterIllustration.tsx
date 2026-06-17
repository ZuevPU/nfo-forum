export const CHARACTER_IMAGE_SRC = '/assets/character.png';

type CharacterSize = 80 | 90 | 120;

interface Props {
  size?: CharacterSize;
  alt?: string;
  className?: string;
}

export function CharacterIllustration({ size = 80, alt = 'Помощник Форума НФО', className }: Props) {
  return (
    <img
      src={CHARACTER_IMAGE_SRC}
      alt={alt}
      className={className}
      style={{ width: size, height: 'auto', display: 'block', margin: '0 auto' }}
    />
  );
}
