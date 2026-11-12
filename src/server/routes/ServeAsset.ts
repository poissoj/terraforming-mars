import fs from 'fs';
import path from 'path';
import * as responses from '../server/responses';

import {Context} from './IHandler';
import {BufferCache} from './BufferCache';
import {ContentType} from './ContentType';
import {Handler} from './Handler';
import {isProduction} from '../utils/server';
import {Request} from '../Request';
import {Response} from '../Response';
import {RouteError} from './RouteError';
import {serverIdentity, withManifestIdentity, withServerIdentity, withSocialPreview} from '../server/serverIdentity';
import {publicOrigin} from '../server/publicOrigin';
import {faviconFile} from '../../common/admin/favicons';

type Encoding = 'gzip' | 'br';

// Served as they are, under exactly this path
const FIXED_FILES: ReadonlyArray<string> = [
  'build/index.html',
  'assets/Prototype.ttf',
  'assets/Prototype-ru.ttf',
  'assets/Prototype-pl.ttf',
  'assets/futureforces.ttf',
  'assets/pwa/manifest.webmanifest', // PWA manifest: fixed path, since the extension is otherwise not allowed
];

export class FileAPI {
  public static readonly INSTANCE: FileAPI = new FileAPI();

  protected constructor() {}

  public readFileSync(path: string): Buffer {
    return fs.readFileSync(path);
  }
  public readFile(path: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      fs.readFile(path, (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      });
    });
  }
  public existsSync(path: string): boolean {
    return fs.existsSync(path);
  }
}
export class ServeAsset extends Handler {
  public static readonly INSTANCE: ServeAsset = new ServeAsset();
  private readonly cache = new BufferCache();
  private readonly existsCache = new Map<string, boolean>();

  // Public for tests
  public constructor(private cacheAgeSeconds: string | number = process.env.ASSET_CACHE_MAX_AGE || 0,
    // only production caches resources
    private cacheAssets: boolean = isProduction(),
    private fileApi: FileAPI = FileAPI.INSTANCE) {
    super();
  }

  public override async get(req: Request, res: Response, _ctx: Context): Promise<void> {
    if (req.url === undefined) {
      throw RouteError.internalServerError('no url on request');
    }

    // Remove leading slash.
    const path = req.url.substring(1);

    const supportedEncodings = this.supportedEncodings(req);
    const toFile: {file?: string, encoding?: Encoding } = this.toFile(path, supportedEncodings);

    if (toFile.file === undefined) {
      throw RouteError.notFound();
    }

    const file = toFile.file;

    // asset caching. The app page carries the request origin in its Open Graph tags, so it must
    // not be shared between requests with different hosts.
    const cacheable = file !== 'assets/index.html';
    const buffer = this.cacheAssets && cacheable ? this.cache.get(file) : undefined;
    if (buffer !== undefined) {
      if (req.headers['if-none-match'] === buffer.hash) {
        responses.notModified(res);
        return;
      }
      res.setHeader('Cache-Control', 'must-revalidate');
      res.setHeader('ETag', buffer.hash);
    } else if (this.cacheAssets === false) {
      res.setHeader('Cache-Control', 'max-age=' + this.cacheAgeSeconds);
    }

    const contentType = ContentType.getContentType(file);
    if (contentType !== undefined) {
      res.setHeader('Content-Type', contentType);
    }

    if (toFile.encoding !== undefined) {
      res.setHeader('Content-Encoding', toFile.encoding);
    }

    if (buffer !== undefined) {
      res.setHeader('Content-Length', buffer.buffer.length);
      res.end(buffer.buffer);
      return;
    }

    try {
      const raw = await this.fileApi.readFile(file);
      const data = this.withIdentity(file, raw, publicOrigin(req));
      if (this.cacheAssets === true && cacheable) {
        this.cache.set(file, data);
      }
      res.setHeader('Content-Length', data.length);
      res.end(data);
    } catch (err) {
      if ((err as {code?: string}).code === 'ENOENT') {
        throw RouteError.notFound();
      }
      console.log(err);
      throw RouteError.internalServerError('Cannot serve ' + path);
    }
  }

  /**
   * Renders the app page, optionally below the app root for the lobby's nested addresses.
   *
   * Public because LobbySubPage serves the same index.html with a <base> element.
   */
  public renderAppPage(raw: Buffer, base?: string, origin?: string): Buffer {
    const identity = serverIdentity();
    let html = withSocialPreview(withServerIdentity(raw.toString('utf8'), identity), identity, origin);
    if (base !== undefined) {
      html = html.replace('<head>', `<head>\n        <base href="${base}">`);
    }
    return Buffer.from(html);
  }
  // Page and PWA manifest carry this server's titles and name (TITLE_LONG, TITLE_SHORT, SERVER_NAME)
  private withIdentity(file: string, raw: Buffer, origin: string | undefined): Buffer {
    switch (file) {
    case 'build/index.html':
      return this.renderAppPage(raw, undefined, origin);
    case 'assets/pwa/manifest.webmanifest':
      return Buffer.from(withManifestIdentity(raw.toString('utf8')));
    default:
      if (file.startsWith('build/assets/') && file.endsWith('.webmanifest')) {
        return Buffer.from(withManifestIdentity(raw.toString('utf8')));
      }
      return raw;
    }
  }

  private exists(file: string): boolean {
    const cached = this.existsCache.get(file);
    if (cached !== undefined) {
      return cached;
    }
    const exists = this.fileApi.existsSync(file);
    this.existsCache.set(file, exists);
    return exists;
  }

  private toMainFile(file: string, encodings: Set<Encoding>): { file?: string, encoding?: Encoding } {
    // Only serve compressed versions in production. Development mode serves
    // uncompressed versions because they can be hot-swapped.
    if (isProduction()) {
      if (encodings.has('br') && this.exists(file + '.br')) {
        return {file: file + '.br', encoding: 'br'};
      } else if (encodings.has('gzip') && this.exists(file + '.gz')) {
        return {file: file + '.gz', encoding: 'gzip'};
      }
    }

    // Fallback on uncompressed file in development or when the compression
    // step skipped this file (source maps, for example).
    return {file, encoding: undefined};
  }

  private toFile(urlPath: string, encodings: Set<Encoding>): { file?: string, encoding?: Encoding } {
    // Fixed files: the path read from disk is the constant from the list, never the request path itself
    const fixedFile = FIXED_FILES.find((file) => file === urlPath);
    if (fixedFile !== undefined) {
      return {file: fixedFile};
    }
    switch (urlPath) {
    // Service worker (client/sw.ts): lobby push messages, and the notification fallback of the game
    case 'sw.js':
    case '/sw.js':
      return {file: 'build/sw.js'};

    // Icon and color chosen on the admin page (FAVICON_ICON, FAVICON_COLOR), the original otherwise
    case 'favicon.ico':
      return {file: faviconFile(process.env.FAVICON_ICON, process.env.FAVICON_COLOR)};

    default:
      // The hashed entry file and stylesheet emitted by Vite (named in build/index.html).
      if (/^main-[A-Za-z0-9_-]+\.js$/.test(urlPath)) {
        return this.toMainFile(`build/${urlPath}`, encodings);
      }
      if (/^client-[A-Za-z0-9_-]+\.css$/.test(urlPath)) {
        return this.toMainFile(`build/${urlPath}`, encodings);
      }
      // Serve JS chunks produced by the Vite build, but never source maps.
      if (urlPath.startsWith('chunks/')) {
        const chunksRoot = path.resolve('./build/chunks');
        const resolvedFile = path.resolve(path.normalize('build/' + urlPath));
        // With the separator: a sibling such as build/chunks-other is not inside
        if (resolvedFile.startsWith(chunksRoot + path.sep)) {
          if (urlPath.endsWith('.js')) {
            // The checked, resolved path – not the request path – reaches the file system
            return this.toMainFile(resolvedFile, encodings);
          }
        }
      }

      if (urlPath.endsWith('.png') || urlPath.endsWith('.jpg') || urlPath.endsWith('.webp') || urlPath.endsWith('.avif') || urlPath.endsWith('.json') || urlPath.endsWith('.svg') || urlPath.endsWith('.woff2') || urlPath.endsWith('.webmanifest')) {
        // Images referenced from component CSS are emitted by Vite (hashed) into build/assets and
        // take precedence over the original file in the assets directory.
        if (urlPath.startsWith('assets/')) {
          const buildAssetsRoot = path.resolve('./build/assets');
          const buildFile = path.resolve(path.normalize('build/' + urlPath));
          if (buildFile.startsWith(buildAssetsRoot + path.sep) && this.exists(buildFile)) {
            return {file: buildFile};
          }
        }
        const assetsRoot = path.resolve('./assets');
        const resolvedFile = path.resolve(path.normalize(urlPath));

        // Only allow assets inside of assets directory (with separator: "assets-other/" is not inside)
        if (resolvedFile.startsWith(assetsRoot + path.sep)) {
          return {file: resolvedFile};
        }
      }
    }

    return {};
  }

  private supportedEncodings(req: Request): Set<Encoding> {
    const result = new Set<Encoding>();
    for (const header of String(req.headers['accept-encoding']).split(', ')) {
      if (header === 'br' || header === 'gzip') {
        result.add(header);
      }
    }
    return result;
  }
}
