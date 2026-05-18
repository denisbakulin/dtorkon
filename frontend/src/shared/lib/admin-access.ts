export function getAdminOverviewPath() {
  return '/admin';
}

export function getAdminLoginPath() {
  return '/admin/login';
}

export function getAdminCreatePostPath() {
  return '/editor/new';
}

export function getAdminEditPostPath(postId: string) {
  return `/editor/${postId}`;
}
