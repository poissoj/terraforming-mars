import {Request} from '../Request';

function firstHeader(value: string | Array<string> | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Public origin of this server, used for absolute Open Graph image URLs.
 *
 * URL_ROOT is the configured public address (also used for login redirects). Without it, the
 * origin comes from the request; proxies pass their external host and protocol in the headers.
 */
export function publicOrigin(req: Pick<Request, 'headers' | 'socket'>, environment: Record<string, string | undefined> = process.env): string | undefined {
  const configured = environment.URL_ROOT?.trim();
  if (configured !== undefined && configured !== '') {
    return configured.replace(/\/+$/, '');
  }

  const forwardedHost = firstHeader(req.headers['x-forwarded-host'])?.split(',')[0].trim();
  const host = forwardedHost || req.headers.host;
  if (host === undefined || host === '') {
    return undefined;
  }

  const forwardedProto = firstHeader(req.headers['x-forwarded-proto'])?.split(',')[0].trim();
  const encrypted = (req.socket as {encrypted?: boolean}).encrypted === true;
  const protocol = forwardedProto || (encrypted ? 'https' : 'http');
  return `${protocol}://${host}`;
}
