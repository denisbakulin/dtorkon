import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { Alert, Box, Button, Dialog, DialogContent, Stack, TextField, Typography } from '@mui/material';
import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from 'react';

type ImageEditorDialogProps = {
  file: File | null;
  onClose: () => void;
  onSave: (imageFile: File) => Promise<void> | void;
  open: boolean;
};

const DEFAULT_BRUSH_SIZE = 8;
const DEFAULT_BRUSH_COLOR = '#111827';
const IMAGE_QUALITY = 0.92;

function clampInt(value: string, fallback: number) {
  const next = Number.parseInt(value, 10);
  return Number.isFinite(next) && next > 0 ? next : fallback;
}

async function canvasToFile(canvas: HTMLCanvasElement, fileName: string, preferredType?: string) {
  const mimeType = preferredType && preferredType.startsWith('image/') ? preferredType : 'image/png';
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, IMAGE_QUALITY));
  if (!blob) {
    throw new Error('Unable to export edited image.');
  }

  return new File([blob], fileName, {
    lastModified: Date.now(),
    type: blob.type || mimeType,
  });
}

export function ImageEditorDialog({ file, onClose, onSave, open }: ImageEditorDialogProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [exportWidth, setExportWidth] = useState<string>('');
  const [exportHeight, setExportHeight] = useState<string>('');
  const [keepAspect, setKeepAspect] = useState(true);
  const [brushSize, setBrushSize] = useState(DEFAULT_BRUSH_SIZE);

  const imageSizeRef = useRef<{ width: number; height: number } | null>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!open) {
      setLoadError(null);
      setIsReady(false);
      setExportWidth('');
      setExportHeight('');
      isDrawingRef.current = false;
      lastPointRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!file || !open) {
      setObjectUrl((current) => {
        if (current) {
          URL.revokeObjectURL(current);
        }
        return null;
      });
      return;
    }

    const nextObjectUrl = URL.createObjectURL(file);
    setObjectUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }
      return nextObjectUrl;
    });

    return () => {
      URL.revokeObjectURL(nextObjectUrl);
    };
  }, [file, open]);

  useEffect(() => {
    if (!open || !file || !objectUrl) {
      return;
    }

    let cancelled = false;

    setIsReady(false);
    setLoadError(null);

    const img = new Image();
    img.decoding = 'async';
    img.src = objectUrl;

    img.onload = () => {
      if (cancelled) {
        return;
      }

      const naturalWidth = img.naturalWidth || img.width;
      const naturalHeight = img.naturalHeight || img.height;

      if (!naturalWidth || !naturalHeight) {
        setLoadError('Unable to read image dimensions.');
        return;
      }

      imageSizeRef.current = { width: naturalWidth, height: naturalHeight };
      setExportWidth(String(naturalWidth));
      setExportHeight(String(naturalHeight));

      const baseCanvas = baseCanvasRef.current;
      const drawCanvas = drawCanvasRef.current;

      if (!baseCanvas || !drawCanvas) {
        setLoadError('Editor canvas is not ready.');
        return;
      }

      baseCanvas.width = naturalWidth;
      baseCanvas.height = naturalHeight;
      drawCanvas.width = naturalWidth;
      drawCanvas.height = naturalHeight;

      const baseCtx = baseCanvas.getContext('2d');
      const drawCtx = drawCanvas.getContext('2d');

      if (!baseCtx || !drawCtx) {
        setLoadError('Unable to create canvas context.');
        return;
      }

      baseCtx.clearRect(0, 0, naturalWidth, naturalHeight);
      baseCtx.drawImage(img, 0, 0, naturalWidth, naturalHeight);

      drawCtx.clearRect(0, 0, naturalWidth, naturalHeight);
      drawCtx.lineCap = 'round';
      drawCtx.lineJoin = 'round';

      setIsReady(true);
    };

    img.onerror = () => {
      if (cancelled) {
        return;
      }
      setLoadError('Unable to load image for editing.');
    };

    return () => {
      cancelled = true;
    };
  }, [file, objectUrl, open]);

  const canEdit = useMemo(() => !!file && !!objectUrl && isReady && !loadError, [file, objectUrl, isReady, loadError]);

  const getCanvasPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = drawCanvasRef.current;
    if (!canvas) {
      return null;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!canEdit) {
      return;
    }

    const point = getCanvasPoint(event);
    if (!point) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    isDrawingRef.current = true;
    lastPointRef.current = point;
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!canEdit || !isDrawingRef.current) {
      return;
    }

    const point = getCanvasPoint(event);
    const previous = lastPointRef.current;
    if (!point || !previous) {
      return;
    }

    const ctx = drawCanvasRef.current?.getContext('2d');
    if (!ctx) {
      return;
    }

    ctx.strokeStyle = DEFAULT_BRUSH_COLOR;
    ctx.lineWidth = brushSize;
    ctx.beginPath();
    ctx.moveTo(previous.x, previous.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
    lastPointRef.current = point;
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!canEdit) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const handleClearDrawing = () => {
    const canvas = drawCanvasRef.current;
    if (!canvas) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleExport = async () => {
    if (!file) {
      return;
    }

    const baseCanvas = baseCanvasRef.current;
    const drawCanvas = drawCanvasRef.current;
    const imageSize = imageSizeRef.current;

    if (!baseCanvas || !drawCanvas || !imageSize) {
      throw new Error('Editor is not ready.');
    }

    const targetWidth = clampInt(exportWidth, imageSize.width);
    const targetHeight = clampInt(exportHeight, imageSize.height);

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = targetWidth;
    exportCanvas.height = targetHeight;

    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) {
      throw new Error('Unable to export image.');
    }

    exportCtx.drawImage(baseCanvas, 0, 0, targetWidth, targetHeight);
    exportCtx.drawImage(drawCanvas, 0, 0, targetWidth, targetHeight);

    const editedFile = await canvasToFile(exportCanvas, file.name, file.type);
    await onSave(editedFile);
  };

  const handleExportWidthChange = (value: string) => {
    setExportWidth(value);
    if (!keepAspect) {
      return;
    }
    const imageSize = imageSizeRef.current;
    if (!imageSize) {
      return;
    }
    const width = clampInt(value, imageSize.width);
    const height = Math.max(1, Math.round((width * imageSize.height) / imageSize.width));
    setExportHeight(String(height));
  };

  const handleExportHeightChange = (value: string) => {
    setExportHeight(value);
    if (!keepAspect) {
      return;
    }
    const imageSize = imageSizeRef.current;
    if (!imageSize) {
      return;
    }
    const height = clampInt(value, imageSize.height);
    const width = Math.max(1, Math.round((height * imageSize.width) / imageSize.height));
    setExportWidth(String(width));
  };

  return (
    <Dialog fullScreen onClose={onClose} open={open}>
      <Stack sx={{ height: '100%' }}>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: 'center',
            borderBottom: '1px solid',
            borderColor: 'divider',
            justifyContent: 'space-between',
            px: { xs: 2, md: 3 },
            py: 1.5,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: { xs: '1.2rem', md: '1.45rem' }, fontWeight: 700 }}>
              Resize & draw before upload
            </Typography>
            <Typography color="text.secondary" variant="body2">
              Set output size and draw on top, then save into the normal upload flow.
            </Typography>
          </Box>
          <Button color="inherit" onClick={onClose} startIcon={<CloseRoundedIcon />} variant="outlined">
            Close
          </Button>
        </Stack>

        <DialogContent sx={{ display: 'grid', flex: 1, gap: 2, gridTemplateColumns: { xs: '1fr', lg: '360px 1fr' }, p: { xs: 2, md: 3 } }}>
          <Stack spacing={2}>
            {loadError ? <Alert severity="warning">{loadError}</Alert> : null}
            {!file ? null : (
              <Alert severity="info">
                Tip: drawing uses the original image resolution. The exported file will be resized to the output dimensions.
              </Alert>
            )}

            <Stack direction="row" spacing={1.5}>
              <TextField
                disabled={!isReady}
                inputMode="numeric"
                label="Width"
                onChange={(event) => handleExportWidthChange(event.target.value)}
                value={exportWidth}
              />
              <TextField
                disabled={!isReady}
                inputMode="numeric"
                label="Height"
                onChange={(event) => handleExportHeightChange(event.target.value)}
                value={exportHeight}
              />
            </Stack>

            <Button
              color={keepAspect ? 'primary' : 'inherit'}
              disabled={!isReady}
              onClick={() => setKeepAspect((current) => !current)}
              variant="outlined"
            >
              {keepAspect ? 'Aspect ratio: locked' : 'Aspect ratio: free'}
            </Button>

            <Stack direction="row" spacing={1.5}>
              <TextField
                disabled={!isReady}
                inputMode="numeric"
                label="Brush size"
                onChange={(event) => setBrushSize(clampInt(event.target.value, DEFAULT_BRUSH_SIZE))}
                value={String(brushSize)}
              />
              <Button
                disabled={!isReady}
                onClick={handleClearDrawing}
                startIcon={<DeleteOutlineRoundedIcon />}
                variant="outlined"
              >
                Clear drawing
              </Button>
            </Stack>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ alignItems: { sm: 'center' } }}>
              <Button onClick={onClose} variant="outlined">
                Back
              </Button>
              <Button
                disabled={!isReady || !!loadError || !file}
                onClick={() => void handleExport().catch((error: unknown) => setLoadError(error instanceof Error ? error.message : 'Unable to export image.'))}
                variant="contained"
              >
                Save & upload
              </Button>
              {file ? (
                <Button color="inherit" onClick={() => void onSave(file)} variant="text">
                  Upload without changes
                </Button>
              ) : null}
            </Stack>
          </Stack>

          <Box
            sx={{
              alignItems: 'center',
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1.5,
              display: 'flex',
              justifyContent: 'center',
              minHeight: 320,
              overflow: 'hidden',
              p: { xs: 1, md: 2 },
            }}
          >
            {!objectUrl || !file ? null : loadError ? null : (
              <Box sx={{ position: 'relative', width: 'min(100%, 960px)' }}>
                <canvas
                  ref={baseCanvasRef}
                  style={{ display: 'block', height: 'auto', maxWidth: '100%', width: '100%' }}
                />
                <canvas
                  ref={drawCanvasRef}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  style={{
                    cursor: isReady ? 'crosshair' : 'default',
                    height: 'auto',
                    left: 0,
                    maxWidth: '100%',
                    position: 'absolute',
                    top: 0,
                    touchAction: 'none',
                    width: '100%',
                  }}
                />
              </Box>
            )}
          </Box>
        </DialogContent>
      </Stack>
    </Dialog>
  );
}
