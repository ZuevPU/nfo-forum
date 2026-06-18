import { MASCOT_IMAGES } from '../constants/mascotImages';

export const CHARACTER_IMAGE_SRC = MASCOT_IMAGES.default;

interface Props {
  size?: number;
  src?: string;
  alt?: string;
  className?: string;
}

export function CharacterIllustration({
  size = 80,
  src = MASCOT_IMAGES.default,
  alt = 'Помощник Форума НФО',
  className,
}: Props) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ width: size, height: 'auto', display: 'block', margin: '0 auto' }}
    />
  );
}
