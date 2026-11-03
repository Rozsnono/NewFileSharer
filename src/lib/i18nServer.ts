import { cookies, headers } from 'next/headers';
import { DEFAULT_LANG, LANG_COOKIE, isLang, makeT, type Lang } from './i18n';

/**
 * Resolves the UI language on the server: `lang` cookie first, then the browser's
 * Accept-Language header (English only if it is the first preference), else Hungarian.
 */
export async function getLang(): Promise<Lang> {
    const cookieLang = (await cookies()).get(LANG_COOKIE)?.value;
    if (isLang(cookieLang)) return cookieLang;

    const accept = (await headers()).get('accept-language')?.toLowerCase() || '';
    if (accept.startsWith('en')) return 'en';
    return DEFAULT_LANG;
}

/** Server-side `{ lang, t }` for the current request. */
export async function getI18n() {
    const lang = await getLang();
    return { lang, t: makeT(lang) };
}
