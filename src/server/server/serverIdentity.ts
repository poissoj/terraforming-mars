import {APP_NAME} from '../../common/constants';

// How this server presents itself, set in its .env: tab titles and a name under the start page title.
// Written into index.html (ServeAsset.ts), so the very first frame already has the right tab title.
export type ServerIdentity = {
  /** Tab title of the start page and pages without their own title, e.g. "Terraforming Mars" */
  titleLong: string,
  /** End of all other tab titles, e.g. "Cards List | TM" */
  titleShort: string,
  /** Shown under the start page title; empty: nothing shown */
  name: string,
};

export function serverIdentity(environment: Record<string, string | undefined> = process.env): ServerIdentity {
  return {
    titleLong: environment.TITLE_LONG?.trim() || APP_NAME,
    titleShort: environment.TITLE_SHORT?.trim() || 'TM',
    name: environment.SERVER_NAME?.trim() ?? '',
  };
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/**
 * index.html with <title> and the identity as meta tags (read by the client in serverIdentity.ts);
 * the home screen name on iOS (apple-mobile-web-app-title) is the short title.
 */
export function withServerIdentity(html: string, identity: ServerIdentity = serverIdentity()): string {
  const tags = [
    `<title>${escapeHtml(identity.titleLong)}</title>`,
    `<meta name="server-title-long" content="${escapeHtml(identity.titleLong)}" />`,
    `<meta name="server-title-short" content="${escapeHtml(identity.titleShort)}" />`,
    `<meta name="server-name" content="${escapeHtml(identity.name)}" />`,
  ].join('\n        ');
  // index.html indents with four spaces per level
  return html
    .replace(/(<meta name="apple-mobile-web-app-title" content=")[^"]*(")/, `$1${escapeHtml(identity.titleShort)}$2`)
    .replace(/( *)<\/head>/, `        ${tags}\n$1</head>`);
}

/**
 * Open Graph tags for link previews (WhatsApp, Facebook, Discord …). The image URL must be absolute,
 * so the caller passes the public origin. Without an origin the page stays unchanged.
 */
export function withSocialPreview(html: string, identity: ServerIdentity, origin: string | undefined): string {
  if (origin === undefined) {
    return html;
  }
  const image = `${origin}/assets/social-preview.jpg`;
  const tags = [
    '<meta property="og:type" content="website" />',
    `<meta property="og:title" content="${escapeHtml(identity.titleLong)}" />`,
    '<meta property="og:description" content="Terraforming Mars Open Source Web Application" />',
    `<meta property="og:site_name" content="${escapeHtml(identity.titleLong)}" />`,
    `<meta property="og:image" content="${escapeHtml(image)}" />`,
    '<meta property="og:image:type" content="image/jpeg" />',
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    '<meta property="og:image:alt" content="Terraforming Mars board and playing cards" />',
  ].join('\n        ');
  // index.html indents with four spaces per level
  return html.replace(/( *)<\/head>/, `        ${tags}\n$1</head>`);
}

/** PWA manifest with this server's titles: name in install dialogs, short_name under the home screen icon. */
export function withManifestIdentity(manifest: string, identity: ServerIdentity = serverIdentity()): string {
  return JSON.stringify({...JSON.parse(manifest), name: identity.titleLong, short_name: identity.titleShort}, null, 2);
}
