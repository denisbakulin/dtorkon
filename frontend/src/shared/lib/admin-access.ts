const ADMIN_HOSTNAME = 'admin.denisbakulin.ru';
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1']);

function readHostname() {
  if (typeof window === 'undefined') {
    return '';
  }

  return window.location.hostname.toLowerCase();
}

export function isAdminHost(hostname = readHostname()) {
  return hostname === ADMIN_HOSTNAME;
}

export function isLocalHost(hostname = readHostname()) {
  return LOCAL_HOSTNAMES.has(hostname);
}

export function canUseAdminInterface(hostname = readHostname()) {
  return isAdminHost(hostname) || isLocalHost(hostname);
}

export function getAdminOverviewPath() {
  return isAdminHost() ? '/' : '/admin';
}

export function getAdminLoginPath() {
  return '/login';
}

export function getAdminCreatePostPath() {
  return isAdminHost() ? '/posts/new' : '/admin/posts/new';
}

export function getAdminEditPostPath(postId: string) {
  return isAdminHost() ? `/posts/${postId}` : `/admin/posts/${postId}`;
}
