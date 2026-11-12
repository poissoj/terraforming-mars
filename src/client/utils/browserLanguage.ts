import {ALL_LANGUAGES, LANGUAGE} from '@/common/constants';

const SUPPORTED = new Set<string>(ALL_LANGUAGES);

// Browser language codes that differ from the app's internal codes. Region variants are reduced to
// their base language first (fr-CA -> fr, pt-BR -> pt, zh-CN -> zh).
const ALIASES: Record<string, string | undefined> = {
  pt: 'br', // Portuguese: the app only has Brazilian Portuguese
  zh: 'cn',
  no: 'nb',
  nn: 'nb',
  uk: 'ua',
  ja: 'jp',
};

function isLanguage(value: string): value is LANGUAGE {
  return SUPPORTED.has(value);
}

/**
 * First language of the browser that this app supports, or English.
 *
 * `navigator.languages` is ordered by the user's preference; `navigator.language` is the fallback
 * for browsers without that list. Tests pass an explicit list.
 */
export function browserLanguage(languages?: ReadonlyArray<string>): LANGUAGE {
  const candidates = languages ??
    (typeof navigator === 'undefined' ?
      [] :
      (navigator.languages !== undefined && navigator.languages.length > 0 ? navigator.languages : [navigator.language]));

  for (const tag of candidates) {
    const base = tag.toLowerCase().split(/[-_]/)[0];
    const language = ALIASES[base] ?? base;
    if (isLanguage(language)) {
      return language;
    }
  }
  return 'en';
}
