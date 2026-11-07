// The app is served from the site root, also when the current page is a nested lobby route
// such as /lobby/create. Resolve app paths against the origin instead of the current path.
export function appUrl(path: string): string {
  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
  return new URL(path, `${origin}/`).href;
}
