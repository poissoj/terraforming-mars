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
import {withManifestIdentity, withServerIdentity} from '../server/serverIdentity';
import {faviconFile} from '../../common/admin/favicons';

type Encoding = 'gzip' | 'br';

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
  private mainEntryFile: string | undefined;
  private mainCssFile: string | undefined;
  private mainEntryLoaded = false;

  // Public for tests
  public constructor(private cacheAgeSeconds: string | number = process.env.ASSET_CACHE_MAX_AGE || 0,
    // only production caches resources
    private cacheAssets: boolean = isProduction(),
    private fileApi: FileAPI = FileAPI.INSTANCE) {
    super();
    // prime the cache with styles.css and a compressed copy of it styles.css
    const styles = fileApi.readFileSync('build/styles.css');
    this.cache.set('build/styles.css', styles);
    const compressed = fileApi.readFileSync('build/styles.css.gz');
    this.cache.set('build/styles.css.gz', compressed);
    const brotli = fileApi.readFileSync('build/styles.css.br');
    this.cache.set('build/styles.css.br', brotli);
    // client.css only exists after a Vite build (and not while Vite serves the app in development)
    for (const file of ['build/client.css', 'build/client.css.gz', 'build/client.css.br']) {
      if (fileApi.existsSync(file)) {
        this.cache.set(file, fileApi.readFileSync(file));
      }
    }
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

    // asset caching
    const buffer = this.cacheAssets ? this.cache.get(file) : undefined;
    if (buffer !== undefined) {
      if (req.headers['if-none-match'] === buffer.hash) {
        responses.notModified(res);
        return;
      }
      res.setHeader('Cache-Control', 'must-revalidate');
      res.setHeader('ETag', buffer.hash);
    } else if (this.cacheAssets === false && req.url !== '/main.js' && req.url !== '/main.js.map') {
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
      const data = this.withIdentity(file, raw);
      if (this.cacheAssets === true) {
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

  // Page and PWA manifest carry this server's titles and name (TITLE_LONG, TITLE_SHORT, SERVER_NAME)
  private withIdentity(file: string, raw: Buffer): Buffer {
    switch (file) {
    case 'assets/index.html': {
      let html = withServerIdentity(raw.toString('utf8'));
      const entry = this.mainEntry();
      if (entry !== undefined) {
        html = html.replace('src="main.js"', `src="${entry}"`);
      }
      if (this.mainCssFile !== undefined) {
        html = html.replace('href="client.css"', `href="${this.mainCssFile}"`);
      }
      return Buffer.from(html);
    }
    case 'assets/pwa/manifest.webmanifest':
      return Buffer.from(withManifestIdentity(raw.toString('utf8')));
    default:
      return raw;
    }
  }

  // The Vite build emits a hashed entry file; assets/index.html keeps main.js as the development fallback.
  private mainEntry(): string | undefined {
    if (this.mainEntryLoaded === false) {
      this.mainEntryLoaded = true;
      try {
        if (this.fileApi.existsSync('build/main-manifest.json')) {
          const manifest = JSON.parse(this.fileApi.readFileSync('build/main-manifest.json').toString('utf8')) as
            Record<string, {isEntry?: boolean, file?: string}>;
          const entry = manifest['src/client/main.ts'] ?? Object.values(manifest).find((item) => item.isEntry === true);
          if (entry !== undefined && typeof entry.file === 'string') {
            this.mainEntryFile = entry.file;
          }
          const style = manifest['style.css'] ??
            Object.values(manifest).find((item) => item.file?.endsWith('.css') === true);
          if (style !== undefined && typeof style.file === 'string') {
            this.mainCssFile = style.file;
          }
        }
      } catch (err) {
        // No manifest (development) or unreadable manifest: keep main.js, which Vite serves in dev.
        console.log('Cannot read build/main-manifest.json', err);
      }
    }
    return this.mainEntryFile;
  }

  private toMainFile(urlPath: string, encodings: Set<Encoding>): { file?: string, encoding?: Encoding } {
    const file = `build/${urlPath}`;

    // Only serve compressed versions in production. Development mode serves
    // uncompressed versions because they can be hot-swapped.
    if (isProduction()) {
      if (encodings.has('br')) {
        return {file: file + '.br', encoding: 'br'};
      } else if (encodings.has('gzip')) {
        return {file: file + '.gz', encoding: 'gzip'};
      }
    }

    // Fallback on uncompressed file if in development or no compressed
    // file exists.
    return {file, encoding: undefined};
  }

  private toServiceWorkerFile(urlPath: string): { file?: string, encoding?: Encoding } {
    return {
      file: `build/${urlPath}`,
    };
  }

  private toFile(urlPath: string, encodings: Set<Encoding>): { file?: string, encoding?: Encoding } {
    switch (urlPath) {
    case 'assets/index.html':
    case 'assets/Prototype.ttf':
    case 'assets/Prototype-ru.ttf':
    case 'assets/Prototype-pl.ttf':
    case 'assets/futureforces.ttf':
    case 'assets/pwa/manifest.webmanifest': // PWA manifest: fixed path, since the extension is otherwise not allowed
      return {file: urlPath};

    case 'styles.css':
      if (encodings.has('br')) {
        return {file: 'build/styles.css.br', encoding: 'br'};
      }
      if (encodings.has('gzip')) {
        return {file: 'build/styles.css.gz', encoding: 'gzip'};
      }
      return {file: 'build/styles.css'};

    case 'client.css':
      if (encodings.has('br') && this.fileApi.existsSync('build/client.css.br')) {
        return {file: 'build/client.css.br', encoding: 'br'};
      }
      if (encodings.has('gzip') && this.fileApi.existsSync('build/client.css.gz')) {
        return {file: 'build/client.css.gz', encoding: 'gzip'};
      }
      return {file: 'build/client.css'};

    // Source maps are not served: they would publish the full source with comments, including optional
    // extensions that are not part of the public repository
    case 'main.js':
      return this.toMainFile(urlPath, encodings);

    // Service worker (client/sw.ts): lobby push messages, and the notification fallback of the game
    case 'sw.js':
    case '/sw.js':
      return this.toServiceWorkerFile(urlPath);

    // Icon and color chosen on the admin page (FAVICON_ICON, FAVICON_COLOR), the original otherwise
    case 'favicon.ico':
      return {file: faviconFile(process.env.FAVICON_ICON, process.env.FAVICON_COLOR)};

    default:
      // The hashed entry file emitted by Vite (named in assets/index.html at serve time).
      if (/^main-[A-Za-z0-9_-]+\.js$/.test(urlPath)) {
        return this.toMainFile(urlPath, encodings);
      }
      if (/^client-[A-Za-z0-9_-]+\.css$/.test(urlPath)) {
        return this.toMainFile(urlPath, encodings);
      }
      // Serve JS chunks produced by the Vite build.
      if (urlPath.startsWith('chunks/')) {
        const chunksRoot = path.resolve('./build/chunks');
        const resolvedFile = path.resolve(path.normalize('build/' + urlPath));
        if (resolvedFile.startsWith(chunksRoot + path.sep)) {
          if (urlPath.endsWith('.js')) {
            return this.toMainFile(urlPath, encodings);
          }
        }
      }

      if (urlPath.endsWith('.png') || urlPath.endsWith('.jpg') || urlPath.endsWith('.webp') || urlPath.endsWith('.avif') || urlPath.endsWith('.json') || urlPath.endsWith('.svg') || urlPath.endsWith('.woff2')) {
        // Images referenced from component CSS are emitted by Vite (hashed) into build/assets and
        // take precedence over the original file in the assets directory.
        if (urlPath.startsWith('assets/')) {
          const buildAssetsRoot = path.resolve('./build/assets');
          const buildFile = path.resolve(path.normalize('build/' + urlPath));
          if (buildFile.startsWith(buildAssetsRoot + path.sep) && this.fileApi.existsSync(buildFile)) {
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
