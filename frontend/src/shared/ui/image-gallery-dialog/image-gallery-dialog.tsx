import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import NavigateBeforeRoundedIcon from '@mui/icons-material/NavigateBeforeRounded';
import NavigateNextRoundedIcon from '@mui/icons-material/NavigateNextRounded';
import { Box, Dialog, IconButton, Stack, Typography } from '@mui/material';
import { useEffect, useMemo, useRef, type TouchEvent } from 'react';

export type GalleryImage = {
  alt?: string | null;
  caption?: string | null;
  src: string;
};

type ImageGalleryDialogProps = {
  images: GalleryImage[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  open: boolean;
};

const SWIPE_THRESHOLD = 56;

export function ImageGalleryDialog({
  images,
  index,
  onClose,
  onIndexChange,
  open,
}: ImageGalleryDialogProps) {
  const touchStartXRef = useRef<number | null>(null);

  const activeImage = images[index] ?? null;
  const hasMultipleImages = images.length > 1;

  const counterLabel = useMemo(() => {
    if (!images.length) {
      return null;
    }

    return `${index + 1} / ${images.length}`;
  }, [images.length, index]);

  useEffect(() => {
    if (!open || !hasMultipleImages) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        onIndexChange(index === 0 ? images.length - 1 : index - 1);
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        onIndexChange(index === images.length - 1 ? 0 : index + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasMultipleImages, images.length, index, onIndexChange, open]);

  if (!activeImage) {
    return null;
  }

  const showPreviousImage = () => {
    onIndexChange(index === 0 ? images.length - 1 : index - 1);
  };

  const showNextImage = () => {
    onIndexChange(index === images.length - 1 ? 0 : index + 1);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const touchStartX = touchStartXRef.current;
    const touchEndX = event.changedTouches[0]?.clientX ?? null;

    touchStartXRef.current = null;

    if (touchStartX === null || touchEndX === null) {
      return;
    }

    const deltaX = touchEndX - touchStartX;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD) {
      return;
    }

    if (deltaX > 0) {
      showPreviousImage();
      return;
    }

    showNextImage();
  };

  return (
    <Dialog
      fullScreen
      onClose={onClose}
      open={open}
      slotProps={{
        paper: {
          sx: {
            backgroundColor: '#05070b',
            backgroundImage:
              'radial-gradient(circle at top, rgba(123, 163, 255, 0.16), transparent 32%), linear-gradient(180deg, #09101b 0%, #02050a 100%)',
          },
        },
      }}
    >
      <Stack sx={{ height: '100%' }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            px: { xs: 1.5, md: 3 },
            py: { xs: 1.25, md: 2 },
          }}
        >
          <Stack spacing={0.25} sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                color: 'common.white',
                fontSize: { xs: '0.95rem', md: '1rem' },
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {activeImage.alt || 'Photo'}
            </Typography>
            {counterLabel ? (
              <Typography color="rgba(255,255,255,0.72)" variant="body2">
                {counterLabel}
              </Typography>
            ) : null}
          </Stack>

          <IconButton aria-label="Close gallery" onClick={onClose} sx={{ color: 'common.white' }}>
            <CloseRoundedIcon />
          </IconButton>
        </Stack>

        <Box
          onTouchEnd={hasMultipleImages ? handleTouchEnd : undefined}
          onTouchStart={hasMultipleImages ? handleTouchStart : undefined}
          sx={{
            alignItems: 'center',
            display: 'grid',
            flex: 1,
            gap: { xs: 1, md: 2 },
            gridTemplateColumns: { xs: '1fr', md: hasMultipleImages ? '80px minmax(0, 1fr) 80px' : '1fr' },
            px: { xs: 1, md: 2 },
            pb: { xs: 2, md: 3 },
          }}
        >
          {hasMultipleImages ? (
            <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center' }}>
              <IconButton
                aria-label="Previous photo"
                onClick={showPreviousImage}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.08)',
                  color: 'common.white',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' },
                }}
              >
                <NavigateBeforeRoundedIcon fontSize="large" />
              </IconButton>
            </Box>
          ) : null}

          <Stack spacing={1.5} sx={{ minHeight: 0 }}>
            <Box
              sx={{
                alignItems: 'center',
                display: 'flex',
                flex: 1,
                justifyContent: 'center',
                minHeight: 0,
              }}
            >
              <Box
                alt={activeImage.alt ?? ''}
                component="img"
                src={activeImage.src}
                sx={{
                  display: 'block',
                  height: 'auto',
                  maxHeight: 'calc(100vh - 150px)',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  width: 'auto',
                }}
              />
            </Box>

            {activeImage.caption ? (
              <Typography
                color="rgba(255,255,255,0.8)"
                sx={{
                  mx: 'auto',
                  maxWidth: 760,
                  px: 1,
                  textAlign: 'center',
                }}
                variant="body2"
              >
                {activeImage.caption}
              </Typography>
            ) : null}

            {hasMultipleImages ? (
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: 'center',
                  display: { xs: 'flex', md: 'none' },
                  justifyContent: 'center',
                }}
              >
                <IconButton
                  aria-label="Previous photo"
                  onClick={showPreviousImage}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.08)',
                    color: 'common.white',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' },
                  }}
                >
                  <NavigateBeforeRoundedIcon />
                </IconButton>
                <IconButton
                  aria-label="Next photo"
                  onClick={showNextImage}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.08)',
                    color: 'common.white',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' },
                  }}
                >
                  <NavigateNextRoundedIcon />
                </IconButton>
              </Stack>
            ) : null}
          </Stack>

          {hasMultipleImages ? (
            <Box sx={{ display: { xs: 'none', md: 'flex' }, justifyContent: 'center' }}>
              <IconButton
                aria-label="Next photo"
                onClick={showNextImage}
                sx={{
                  bgcolor: 'rgba(255,255,255,0.08)',
                  color: 'common.white',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.16)' },
                }}
              >
                <NavigateNextRoundedIcon fontSize="large" />
              </IconButton>
            </Box>
          ) : null}
        </Box>
      </Stack>
    </Dialog>
  );
}
