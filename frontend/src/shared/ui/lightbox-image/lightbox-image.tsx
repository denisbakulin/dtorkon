import { Box } from '@mui/material';
import type { SxProps, Theme } from '@mui/material/styles';
import { PhotoView } from 'react-photo-view';

type LightboxImageProps = {
  alt?: string | null;
  onOpen?: (() => void) | null;
  src: string;
  sx?: SxProps<Theme>;
};

export function LightboxImage({ alt, onOpen, src, sx }: LightboxImageProps) {
  const image = (
    <Box
      alt={alt ?? ''}
      component="img"
      loading="lazy"
      src={src}
      sx={{
        borderRadius: 1,
        cursor: 'zoom-in',
        display: 'block',
        maxWidth: '100%',
        ...sx,
      }}
    />
  );

  if (onOpen) {
    return (
      <Box
        aria-label={alt ?? 'Open image'}
        component="button"
        onClick={onOpen}
        sx={{
          background: 'transparent',
          border: 0,
          cursor: 'pointer',
          display: 'block',
          p: 0,
          width: '100%',
        }}
        type="button"
      >
        {image}
      </Box>
    );
  }

  return (
    <PhotoView src={src}>
      {image}
    </PhotoView>
  );
}
