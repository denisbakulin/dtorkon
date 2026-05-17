export function triggerBrowserDownload(url: string, filename?: string) {
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.rel = 'noreferrer';
  anchor.style.display = 'none';
  if (filename) {
    anchor.download = filename;
  } else {
    anchor.download = '';
  }

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

