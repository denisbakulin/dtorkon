import { Box, CircularProgress } from '@mui/material';
import { Suspense, lazy } from 'react';
import type { ReactNode } from 'react';
import { createBrowserRouter } from 'react-router-dom';

import { RouteErrorPage } from '../pages/route-error/ui/route-error-page';
import { canUseAdminInterface, isAdminHost, isLocalHost } from '../shared/lib/admin-access';

const AdminPage = lazy(async () => ({ default: (await import('../pages/admin/ui/admin-page')).AdminPage }));
const BlogPage = lazy(async () => ({ default: (await import('../pages/blog/ui/blog-page')).BlogPage }));
const ContactPage = lazy(async () => ({ default: (await import('../pages/contact/ui/contact-page')).ContactPage }));
const EditorPage = lazy(async () => ({ default: (await import('../pages/editor/ui/editor-page')).EditorPage }));
const HomePage = lazy(async () => ({ default: (await import('../pages/home/ui/home-page')).HomePage }));
const LoginPage = lazy(async () => ({ default: (await import('../pages/login/ui/login-page')).LoginPage }));
const NotFoundPage = lazy(async () => ({ default: (await import('../pages/not-found/ui/not-found-page')).NotFoundPage }));
const PostPage = lazy(async () => ({ default: (await import('../pages/post/ui/post-page')).PostPage }));

function PageFallback() {
  return (
    <Box
      sx={{
        alignItems: 'center',
        display: 'flex',
        justifyContent: 'center',
        minHeight: '40vh',
      }}
    >
      <CircularProgress />
    </Box>
  );
}

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<PageFallback />}>{element}</Suspense>;
}

function route(path: string, element: ReactNode) {
  return {
    path,
    element: withSuspense(element),
    errorElement: <RouteErrorPage />,
  };
}

const adminHost = isAdminHost();
const localHost = isLocalHost();
const allowAdmin = canUseAdminInterface();

const routes = adminHost
  ? [
      route('/', <AdminPage />),
      route('/login', <LoginPage />),
      route('/posts/new', <EditorPage mode="create" />),
      route('/posts/:postId', <EditorPage mode="edit" />),
      route('*', <NotFoundPage />),
    ]
  : [
      route('/', <HomePage />),
      route('/blog', <BlogPage />),
      route('/posts/:slug', <PostPage />),
      route('/contact', <ContactPage />),
      ...(allowAdmin && localHost
        ? [
            route('/login', <LoginPage />),
            route('/admin', <AdminPage />),
            route('/admin/posts/new', <EditorPage mode="create" />),
            route('/admin/posts/:postId', <EditorPage mode="edit" />),
          ]
        : []),
      route('*', <NotFoundPage />),
    ];

export const appRouter = createBrowserRouter(routes);
