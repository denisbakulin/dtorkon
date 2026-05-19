import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import AttachFileRoundedIcon from '@mui/icons-material/AttachFileRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import GraphicEqRoundedIcon from '@mui/icons-material/GraphicEqRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import MovieRoundedIcon from '@mui/icons-material/MovieRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';

import { useAuth } from '../../../app/providers/auth-provider';
import { getApiErrorMessage, getApiErrorStatus } from '../../../shared/api/api-error';
import { getPublicPost } from '../../../shared/api/blog-api';
import type { PublicAttachment, PublicPostDetail } from '../../../shared/api/blog-contract';
import { getAdminEditPostPath } from '../../../shared/lib/admin-access';
import { triggerBrowserDownload } from '../../../shared/lib/download';
import { formatDateLabel } from '../../../shared/lib/format-date';
import type { AudioCollection } from '../../../shared/lib/persistent-audio';
import { isAudioUrl, prettifyMediaName } from '../../../shared/lib/media';
import { type GalleryImage, ImageGalleryDialog } from '../../../shared/ui/image-gallery-dialog/image-gallery-dialog';
import { LightboxImage } from '../../../shared/ui/lightbox-image/lightbox-image';
import { MarkdownRenderer } from '../../../shared/ui/markdown-renderer/markdown-renderer';
import { MediaPlaylist } from '../../../shared/ui/media-playlist/media-playlist';
import { MediaPlayer } from '../../../shared/ui/media-player/media-player';
import { SiteShell } from '../../../shared/ui/site-shell/site-shell';

function extractMarkdownImages(content: string): GalleryImage[] {
  const imagePattern = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;

  return Array.from(content.matchAll(imagePattern), ([, alt, src]) => ({
    alt: alt?.trim() || null,
    caption: alt?.trim() || null,
    src,
  }));
}

function extractMarkdownAudioTracks(content: string) {
  const linkPattern = /\[([^\]]*)\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;

  return Array.from(content.matchAll(linkPattern))
    .map(([_, label, href], index) => ({
      href,
      index,
      label: label?.trim() || null,
    }))
    .filter((item) => isAudioUrl(item.href));
}

function PostSkeleton() {
  return (
    <Stack spacing={2.5}>
      <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: { xs: 0, md: 2 } }}>
        <Stack spacing={1.5}>
          <Skeleton width="34%" />
          <Skeleton height={56} width="72%" />
          <Skeleton width="88%" />
          <Skeleton width="63%" />
        </Stack>
      </Paper>
      <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: { xs: 0, md: 2 } }}>
        <Stack spacing={1.5}>
          {Array.from({ length: 7 }, (_, index) => (
            <Skeleton
              key={index}
              height={index === 0 ? 24 : 18}
              width={index % 2 === 0 ? '100%' : '90%'}
            />
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}

function AttachmentCard({
  attachment,
  onOpenImage,
}: {
  attachment: PublicAttachment;
  onOpenImage?: (() => void) | null;
}) {
  const isImage = attachment.kind === 'image';
  const isAudio = attachment.kind === 'audio';
  const isVideo = attachment.kind === 'video';

  if (isAudio || isVideo) {
    const primaryTitle = attachment.title?.trim() || prettifyMediaName(attachment.asset.originalName);
    return (
      <Paper sx={{ p: 2, borderRadius: { xs: 0, md: 2 } }} variant="outlined">
        <Stack spacing={1.25}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            {isAudio ? <GraphicEqRoundedIcon color="primary" /> : <MovieRoundedIcon color="primary" />}
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {primaryTitle}
              </Typography>
            </Stack>
          </Stack>

          <MediaPlayer asset={attachment.asset} kind={isVideo ? 'video' : 'audio'} />
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper
      component={isImage ? 'div' : 'a'}
      href={isImage ? undefined : attachment.asset.url}
      rel={isImage ? undefined : 'noreferrer'}
      sx={{
        borderRadius: { xs: 0, md: 2 },
        color: 'inherit',
        display: 'block',
        overflow: 'hidden',
        p: isImage ? 0 : 2,
        textDecoration: 'none',
      }}
      target={isImage ? undefined : '_blank'}
      variant="outlined"
    >
      {isImage ? (
        <Box>
          <LightboxImage
            alt={attachment.title || attachment.asset.originalName}
            onOpen={onOpenImage}
            src={attachment.asset.url}
            sx={{
              aspectRatio: '16 / 10',
              borderRadius: 0,
              display: 'block',
              objectFit: 'cover',
              width: '100%',
            }}
          />
          <Stack spacing={0.5} sx={{ p: 2 }}>
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', justifyContent: 'space-between' }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                <ImageRoundedIcon color="primary" fontSize="small" />
                <Typography
                  sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  variant="subtitle2"
                >
                  {attachment.title || attachment.asset.originalName}
                </Typography>
              </Stack>
              <Tooltip title="Скачать">
                <IconButton
                  aria-label="Скачать"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    triggerBrowserDownload(attachment.asset.url, attachment.asset.originalName);
                  }}
                  size="small"
                >
                  <DownloadRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
            <Typography color="text.secondary" variant="body2">
              Откроется в полноэкранной галерее с перелистыванием.
            </Typography>
          </Stack>
        </Box>
      ) : (
        <Stack spacing={1.25}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            <AttachFileRoundedIcon color="primary" />
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontWeight: 600,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {attachment.title || attachment.asset.originalName}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                {attachment.asset.originalName}
              </Typography>
            </Stack>
          </Stack>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
              <Typography color="primary.main" variant="body2">
                Открыть файл
              </Typography>
              <OpenInNewRoundedIcon color="primary" fontSize="small" />
            </Stack>
            <Tooltip title="Скачать">
              <IconButton
                aria-label="Скачать"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  triggerBrowserDownload(attachment.asset.url, attachment.asset.originalName);
                }}
                size="small"
              >
                <DownloadRoundedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>
      )}
    </Paper>
  );
}

export function PostPage() {
  const { slug } = useParams();
  const { isAuthenticated } = useAuth();
  const [post, setPost] = useState<PublicPostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!slug) {
      setPost(null);
      setNotFound(true);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    setIsLoading(true);
    setErrorMessage(null);
    setNotFound(false);

    getPublicPost(slug, controller.signal)
      .then((postResponse) => {
        if (!controller.signal.aborted) {
          setPost(postResponse);
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted || axios.isCancel(error)) {
          return;
        }

        const status = getApiErrorStatus(error);
        if (status === 404) {
          setNotFound(true);
          setPost(null);
          return;
        }

        setErrorMessage(getApiErrorMessage(error, 'Не получилось загрузить статью. Попробуй открыть ее еще раз.'));
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [slug]);

  const attachmentCountLabel = useMemo(() => {
    if (!post) {
      return null;
    }

    return `${post.attachments.length} влож.`;
  }, [post]);

  const markdownImages = useMemo(() => extractMarkdownImages(post?.bodyMarkdown ?? ''), [post?.bodyMarkdown]);
  const markdownAudioCollection = useMemo<AudioCollection | null>(() => {
    if (!post) {
      return null;
    }

    const tracks = extractMarkdownAudioTracks(post.bodyMarkdown).map((track) => ({
      id: `markdown-audio:${track.index}`,
      src: track.href,
      title: track.label || `Аудио ${track.index + 1}`,
      subtitle: 'Текст поста',
    }));

    if (tracks.length === 0) {
      return null;
    }

    return {
      id: `post-markdown-audio:${post.id}`,
      title: post.title,
      subtitle: 'Аудио в тексте',
      contextLabel: 'Пост',
      tracks,
    };
  }, [post]);

  const visibleAttachments = useMemo(
    () => post?.attachments.filter((attachment) => attachment.kind !== 'audio' && attachment.kind !== 'video') ?? [],
    [post?.attachments],
  );

  const galleryImages = useMemo(() => {
    if (!post) {
      return [];
    }

    const images: GalleryImage[] = [];

    if (post.coverAsset) {
      images.push({
        alt: post.title,
        caption: post.title,
        src: post.coverAsset.url,
      });
    }

    images.push(...markdownImages);

    images.push(
      ...post.attachments
        .filter((attachment) => attachment.kind === 'image')
        .map((attachment) => ({
          alt: attachment.title || attachment.asset.originalName,
          caption: attachment.title || attachment.asset.originalName,
          src: attachment.asset.url,
        })),
    );

    return images;
  }, [markdownImages, post]);

  const markdownGalleryIndexBySrc = useMemo(() => {
    const coverOffset = post?.coverAsset ? 1 : 0;

    return markdownImages.reduce<Record<string, number>>((accumulator, image, index) => {
      accumulator[image.src] = coverOffset + index;
      return accumulator;
    }, {});
  }, [markdownImages, post?.coverAsset]);

  const attachmentGalleryStartIndex = (post?.coverAsset ? 1 : 0) + markdownImages.length;

  return (
    <SiteShell>
      <Box component="main" sx={{ pb: 10, pt: { xs: 0, md: 5 } }}>
        <Container
          disableGutters
          maxWidth={false}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            px: { xs: 0, sm: 3, md: 4, lg: 6, xl: 8 },
          }}
        >
          <Stack
            spacing={{ xs: 0, md: 2.5 }}
            sx={{
              maxWidth: { xs: '100%', lg: '50%' },
              width: { xs: '100%', lg: '50%' },
            }}
          >
            <Button
              component={RouterLink}
              size="small"
              startIcon={<ArrowBackRoundedIcon />}
              sx={{ alignSelf: 'flex-start', px: { xs: 2, sm: 0 } }}
              to="/blog"
              variant="text"
            >
              Вернуться в блог
            </Button>

            {isAuthenticated && post ? (
              <Button
                component={RouterLink}
                size="small"
                sx={{ alignSelf: 'flex-start', px: { xs: 2, sm: 0 } }}
                to={getAdminEditPostPath(post.id)}
                variant="outlined"
              >
                Edit post
              </Button>
            ) : null}

            {isLoading ? <PostSkeleton /> : null}

            {!isLoading && notFound ? (
              <Paper sx={{ p: { xs: 3, md: 4 }, borderRadius: { xs: 0, md: 2 } }}>
                <Stack spacing={1.25}>
                  <Typography variant="h5">Статья не найдена</Typography>
                  <Typography color="text.secondary">
                    Возможно, публикация еще не была опубликована или ссылка уже устарела.
                  </Typography>
                </Stack>
              </Paper>
            ) : null}

            {!isLoading && errorMessage ? <Alert severity="warning">{errorMessage}</Alert> : null}

            {post ? (
              <>
                <Paper sx={{ overflow: 'hidden', p: { xs: 2, md: 4 }, borderRadius: { xs: 0, md: 2 } }}>
                  <Stack spacing={2.25}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                      <Chip color="primary" label={formatDateLabel(post.publishedAt)} size="small" />
                      {attachmentCountLabel ? (
                        <Chip label={attachmentCountLabel} size="small" variant="outlined" />
                      ) : null}
                    </Stack>

                    <Stack spacing={1.25}>
                      <Typography sx={{ fontSize: { xs: '2rem', md: '3.2rem' }, fontWeight: 700, lineHeight: 1.05 }}>
                        {post.title}
                      </Typography>
                      {post.excerpt ? (
                        <Typography
                          color="text.secondary"
                          sx={{ fontSize: { xs: '1rem', md: '1.12rem' }, lineHeight: 1.8 }}
                        >
                          {post.excerpt}
                        </Typography>
                      ) : null}
                    </Stack>

                    {post.coverAsset ? (
                      <LightboxImage
                        alt={post.title}
                        onOpen={() => setActiveGalleryIndex(0)}
                        src={post.coverAsset.url}
                        sx={{
                          display: 'block',
                          maxHeight: 440,
                          objectFit: 'cover',
                          width: '100%',
                        }}
                      />
                    ) : null}
                  </Stack>
                </Paper>

                <Paper sx={{ p: { xs: 2, md: 4 }, borderRadius: { xs: 0, md: 2 } }}>
                  <MarkdownRenderer
                    audioCollection={markdownAudioCollection}
                    content={post.bodyMarkdown}
                    imageGalleryIndexBySrc={markdownGalleryIndexBySrc}
                    onImageOpen={setActiveGalleryIndex}
                  />
                </Paper>

                {post.attachments.length > 0 ? (
                  <Paper sx={{ p: { xs: 2, md: 4 }, borderRadius: { xs: 0, md: 2 } }}>
                    <Stack spacing={2}>
                      <Typography variant="h6">Вложения</Typography>
                      <MediaPlaylist
                        attachments={post.attachments}
                        audioCollectionContextLabel="Пост"
                        audioCollectionSubtitle="Вложения"
                        audioCollectionTitle={post.title}
                        showTitle={false}
                      />
                      <Box
                        sx={{
                          display: 'grid',
                          gap: 1.5,
                          gridTemplateColumns: {
                            xs: '1fr',
                            sm: 'repeat(2, minmax(0, 1fr))',
                          },
                        }}
                      >
                        {(() => {
                          let imageOffset = 0;

                          return visibleAttachments.map((attachment) => {
                            const galleryIndex =
                              attachment.kind === 'image' ? attachmentGalleryStartIndex + imageOffset++ : null;

                            return (
                              <AttachmentCard
                                attachment={attachment}
                                key={attachment.id}
                                onOpenImage={galleryIndex !== null ? () => setActiveGalleryIndex(galleryIndex) : null}
                              />
                            );
                          });
                        })()}
                      </Box>
                    </Stack>
                  </Paper>
                ) : null}
              </>
            ) : null}
          </Stack>
        </Container>
      </Box>
      <ImageGalleryDialog
        images={galleryImages}
        index={activeGalleryIndex ?? 0}
        onClose={() => setActiveGalleryIndex(null)}
        onIndexChange={setActiveGalleryIndex}
        open={activeGalleryIndex !== null && galleryImages.length > 0}
      />
    </SiteShell>
  );
}

