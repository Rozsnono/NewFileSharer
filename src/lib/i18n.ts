/**
 * Minimal i18n: Hungarian (default) and English dictionaries.
 *
 * - Server components: `getI18n()` from '@/lib/i18nServer'.
 * - Client components: `useI18n()` from '@/components/I18nProvider'.
 * Both return `{ lang, t }`, where `t(key, vars?)` replaces `{name}` placeholders.
 * The active language is stored in the `lang` cookie (set by the LanguageSwitcher).
 */

export type Lang = 'hu' | 'en';
export const LANGS: Lang[] = ['hu', 'en'];
export const DEFAULT_LANG: Lang = 'hu';
export const LANG_COOKIE = 'lang';

const hu = {
    appName: 'NewFileSharer',
    adminPanel: 'Admin',
    language: 'Nyelv',

    // Home page
    homeEmptyTitle: 'Privát fájlmegosztás',
    homeEmptyText:
        'Ez a szerver privát megosztási módban működik. A fájlok csak a rendszergazda által küldött, egyedi linkeken keresztül érhetők el.',
    homeTitle: 'Nyilvános fájlok',
    homeSubtitle: 'Az alábbi gyűjtemények átmenetileg nyilvánosan elérhetők.',
    expires: 'Lejár: {date}',
    previewBtn: 'Előnézet',
    downloadBtn: 'Letöltés',
    filesCount: '{n} fájl',
    footer: '© {year} NewFileSharer',
    publicCollectionFallback: 'Nyilvános gyűjtemény',
    homeCrumbRoot: 'Kezdőlap',
    homeFolders: 'Mappák',
    homeFiles: 'Fájlok',
    homeNotFound: 'A mappa nem található, vagy már nem nyilvános.',
    homeCollectionsCount: '{n} nyilvános gyűjtemény',
    homeHeroText: 'Böngészd a nyilvánosan megosztott mappákat, és töltsd le a fájlokat regisztráció nélkül.',

    // Link page
    linkTitleSend: 'Fájlok a feladótól',
    linkTitleReceive: 'Fájlok küldése',
    linkTitleShare: 'Megosztott mappa',
    linkDescSend: 'A feladó fájlokat osztott meg veled letöltésre.',
    linkDescReceive: 'A feladó fájlokat kér tőled. Töltsd fel őket ide.',
    linkDescShare: 'Letölthetsz fájlokat, és feltölthetsz újakat.',
    linkExpires: 'Lejár: {date}',
    linkQuota: 'Kvóta: {left} / {max}',
    linkDownloadsLeft: 'Még {n} letöltés',
    sharedFiles: 'Fájlok ({n})',
    noFiles: 'Még nincs feltöltött fájl.',
    uploadFiles: 'Fájlok feltöltése',
    linkExpiredTitle: 'A link lejárt vagy nem található',
    linkExpiredText:
        'Ez a link nem létezik, lejárt, vagy elfogyott a letöltési kerete. Kérj új linket a feladótól.',

    // Uploader
    dropText: 'Húzd ide a fájlokat, vagy',
    browse: 'válassz a gépedről',
    uploadHint: 'A fájlok közvetlenül a gyors tárhelyre töltődnek. Maximum: {max}.',
    uploadQueue: 'Feltöltési sor',
    uploading: 'Feltöltés {p}%',
    finalizing: 'Összefűzés…',
    ready: 'Kész',
    errorLabel: 'Hiba',
    quotaExceeded: 'A fájl mérete meghaladja a rendelkezésre álló kvótát.',
    remove: 'Eltávolítás',

    // Login
    loginTitle: 'Admin bejelentkezés',
    loginSubtitle: 'A fájlok és linkek kezeléséhez add meg az admin jelszót.',
    password: 'Jelszó',
    signIn: 'Belépés',
    loginRejected: 'Érvénytelen jelszó. Próbáld újra.',

    // Admin shell
    navLinks: 'Linkek',
    navCollections: 'Gyűjtemények',
    navLogs: 'Naplók',
    logout: 'Kijelentkezés',

    // File manager
    fmRoot: 'Gyűjtemények',
    fmBreadcrumb: 'Mappa útvonal',
    fmNewFolderName: 'Új mappa neve',
    fmNewFolder: 'Új mappa',
    fmLoading: 'Betöltés…',
    fmEmpty: 'Ez a mappa üres.',
    fmLoadFailed: 'A mappa betöltése nem sikerült.',
    fmCreateFailed: 'Nem sikerült létrehozni a mappát.',
    fmFolderMeta: '{folders} mappa · {files} fájl · {date}',
    fmPublic: 'Nyilvános',
    fmUnnamed: 'Névtelen mappa',
    fmBack: 'Vissza',
    fmForward: 'Előre',
    fmUp: 'Szülőmappa',
    fmViewIcons: 'Ikonok',
    fmViewList: 'Lista',
    fmViewColumns: 'Oszlopok',
    fmViewAs: 'Nézet',
    fmSearch: 'Keresés',
    fmSidebar: 'Mappák',
    fmColName: 'Név',
    fmColCreated: 'Létrehozva',
    fmColSize: 'Méret',
    fmColKind: 'Típus',
    fmKindFolder: 'Mappa',
    fmKindFile: '{ext} fájl',
    fmKindFileGeneric: 'Fájl',
    fmItems: '{n} elem',
    fmItemsSelected: '{n} elem, 1 kiválasztva',
    fmNoResults: 'Nincs találat.',
    fmCreate: 'Létrehozás',
    fmInfoWhere: 'Hely',
    fmInfoContains: 'Tartalom',
    fmContains: '{folders} mappa · {files} fájl',
    fmInfoVisibility: 'Láthatóság',
    fmPrivate: 'Privát',
    fmPublicUntil: 'Nyilvános eddig: {date}',
    fmOpen: 'Megnyitás',
    fmSelectHint: 'Válassz ki egy elemet a részletekhez.',
    fmExpand: 'Kinyitás / becsukás',
    fmVisibility: 'Láthatóság',
    fmCreateLink: 'Link készítése',
    fmActiveLinks: 'Aktív linkek',
    fmActionsHint: 'Válassz ki egy mappát vagy lépj be egybe a művelethez.',

    // Links page (cards)
    lnkFilterAll: 'Mind',
    lnkSearch: 'Keresés gyűjtemény szerint',
    lnkExpiresIn: '{n} nap múlva lejár',
    lnkExpiresToday: 'Ma lejár',
    lnkExpiredAgo: '{n} napja lejárt',
    lnkUploaded: 'Feltöltve: {used} / {max}',
    lnkOpenCollection: 'Megnyitás a gyűjteményben',
    lnkCreated: 'Létrehozva: {date}',
    lnkNoMatch: 'Nincs a szűrésnek megfelelő link.',

    // Logs page
    logSearch: 'Keresés az üzenetekben',
    logDetails: 'Részletek',
    logHideDetails: 'Elrejtés',
    logToday: 'Ma',
    logYesterday: 'Tegnap',
    logCount: '{n} bejegyzés',
    logRefresh: 'Frissítés',

    // Admin common
    close: 'Bezárás',
    admLoading: 'Betöltés…',
    admLoadFailed: 'Nem sikerült betölteni az adatokat.',
    typeSend: 'Letöltés',
    typeReceive: 'Feltöltés',
    typeShare: 'Megosztás',
    typeSendDesc: 'Csak letöltés',
    typeReceiveDesc: 'Csak feltöltés',
    typeShareDesc: 'Mindkettő, megosztott mappa',
    statusActive: 'Aktív',
    statusSoon: 'Hamarosan lejár',
    statusExpired: 'Lejárt',

    // Admin links tab
    admLinksTitle: 'Linkek',
    admLinksSubtitle: '{active} aktív link · {soon} hamarosan lejár',
    admNewLink: 'Új link',
    admColCollection: 'Gyűjtemény',
    admColType: 'Típus',
    admColDownloads: 'Letöltések',
    admColUpload: 'Feltöltési keret',
    admColExpires: 'Lejárat',
    admColStatus: 'Állapot',
    admColActions: 'Művelet',
    admNoLinks: 'Még nincs link.',
    admCollectionDeleted: 'Törölt gyűjtemény',
    admUnlimited: 'Korlátlan',
    admDeleteLink: 'Link törlése',
    admConfirmDeleteLink: 'Biztosan törlöd ezt a megosztási linket?',

    // Link wizard
    wizTitle: 'Új megosztási link',
    wizStep: '{n}. lépés a {total}-ból',
    wizStep1Title: 'Mit tehet a címzett?',
    wizStep2Title: 'Gyűjtemény, keret és lejárat',
    wizStep3Title: 'Összegzés',
    wizCollection: 'Gyűjtemény',
    wizNewFolder: 'Új, üres mappa létrehozása',
    wizQuota: 'Feltöltési kvóta (GB)',
    wizMaxDownloads: 'Letöltések száma',
    wizExpiry: 'Lejárat',
    wizBack: 'Vissza',
    wizNext: 'Tovább',
    wizCreate: 'Link létrehozása',
    wizCancel: 'Mégse',
    wizErrExpiry: 'Add meg a lejárat dátumát (legkorábban holnap).',
    wizErrQuota: 'A kvóta legalább 1 GB legyen.',
    wizErrDownloads: 'A letöltések száma legalább 1 legyen, vagy hagyd üresen.',
    wizCreateFailed: 'Nem sikerült létrehozni a linket.',

    // Generated link dialog
    tokTitle: 'A link elkészült',
    tokWarn: 'Fontos: ezt a linket csak most látod. Másold ki, mielőtt bezárod az ablakot.',
    tokCopy: 'Link másolása',
    tokCopied: 'Másolva',
    tokDone: 'Kész',

    // Collections (legacy) tab
    pubTitle: 'Nyilvánosság beállítása',
    pubDesc: 'Nyilvános láthatóságnál a gyűjtemény fájljai és az összes almappája link nélkül, a főoldalon (/) is elérhető.',
    pubEnable: 'Nyilvános láthatóság',
    pubExpiry: 'Nyilvánosság lejárata',
    pubExpiryHint: 'Ezen a napon a gyűjtemény újra privát lesz.',
    pubSave: 'Mentés',
    pubFailed: 'Nem sikerült menteni a beállítást.',

    // Logs tab
    logTitle: 'Naplók',
    logAll: 'Minden szint',
    logInfo: 'Információ',
    logWarnings: 'Figyelmeztetések',
    logErrors: 'Hibák',
    logTime: 'Időpont',
    logMessage: 'Üzenet',
    logEmpty: 'Nincs naplóbejegyzés.',
};

export type Dict = typeof hu;
export type DictKey = keyof Dict;

const en: Dict = {
    appName: 'NewFileSharer',
    adminPanel: 'Admin',
    language: 'Language',

    homeEmptyTitle: 'Private file sharing',
    homeEmptyText:
        'This server runs in private sharing mode. Files can only be accessed through unique links sent by the administrator.',
    homeTitle: 'Public files',
    homeSubtitle: 'The collections below are temporarily available to everyone.',
    expires: 'Expires: {date}',
    previewBtn: 'Preview',
    downloadBtn: 'Download',
    filesCount: '{n} files',
    footer: '© {year} NewFileSharer',
    publicCollectionFallback: 'Public collection',
    homeCrumbRoot: 'Home',
    homeFolders: 'Folders',
    homeFiles: 'Files',
    homeNotFound: 'The folder was not found or is no longer public.',
    homeCollectionsCount: '{n} public collections',
    homeHeroText: 'Browse the publicly shared folders and download the files, no sign-up needed.',

    linkTitleSend: 'Files from the sender',
    linkTitleReceive: 'Send files',
    linkTitleShare: 'Shared folder',
    linkDescSend: 'The sender shared files with you to download.',
    linkDescReceive: 'The sender is requesting files from you. Upload them here.',
    linkDescShare: 'You can download files and upload new ones.',
    linkExpires: 'Expires: {date}',
    linkQuota: 'Quota: {left} / {max}',
    linkDownloadsLeft: '{n} downloads left',
    sharedFiles: 'Files ({n})',
    noFiles: 'No files uploaded yet.',
    uploadFiles: 'Upload files',
    linkExpiredTitle: 'Link expired or not found',
    linkExpiredText:
        'This link does not exist, has expired, or has reached its download limit. Please ask the sender for a new link.',

    dropText: 'Drag and drop your files here, or',
    browse: 'browse',
    uploadHint: 'Files are uploaded directly to fast storage. Maximum: {max}.',
    uploadQueue: 'Upload queue',
    uploading: 'Uploading {p}%',
    finalizing: 'Assembling…',
    ready: 'Ready',
    errorLabel: 'Error',
    quotaExceeded: 'File size exceeds the available upload quota.',
    remove: 'Remove',

    loginTitle: 'Admin sign-in',
    loginSubtitle: 'Enter the admin password to manage files and links.',
    password: 'Password',
    signIn: 'Sign in',
    loginRejected: 'Invalid password. Please try again.',

    navLinks: 'Links',
    navCollections: 'Collections',
    navLogs: 'Logs',
    logout: 'Sign out',

    fmRoot: 'Collections',
    fmBreadcrumb: 'Folder path',
    fmNewFolderName: 'New folder name',
    fmNewFolder: 'New folder',
    fmLoading: 'Loading…',
    fmEmpty: 'This folder is empty.',
    fmLoadFailed: 'Failed to load the folder.',
    fmCreateFailed: 'Failed to create the folder.',
    fmFolderMeta: '{folders} folders · {files} files · {date}',
    fmPublic: 'Public',
    fmUnnamed: 'Unnamed folder',
    fmBack: 'Back',
    fmForward: 'Forward',
    fmUp: 'Parent folder',
    fmViewIcons: 'Icons',
    fmViewList: 'List',
    fmViewColumns: 'Columns',
    fmViewAs: 'View',
    fmSearch: 'Search',
    fmSidebar: 'Folders',
    fmColName: 'Name',
    fmColCreated: 'Created',
    fmColSize: 'Size',
    fmColKind: 'Kind',
    fmKindFolder: 'Folder',
    fmKindFile: '{ext} file',
    fmKindFileGeneric: 'File',
    fmItems: '{n} items',
    fmItemsSelected: '{n} items, 1 selected',
    fmNoResults: 'No results.',
    fmCreate: 'Create',
    fmInfoWhere: 'Where',
    fmInfoContains: 'Contains',
    fmContains: '{folders} folders · {files} files',
    fmInfoVisibility: 'Visibility',
    fmPrivate: 'Private',
    fmPublicUntil: 'Public until {date}',
    fmOpen: 'Open',
    fmSelectHint: 'Select an item to see its details.',
    fmExpand: 'Expand / collapse',
    fmVisibility: 'Visibility',
    fmCreateLink: 'Create link',
    fmActiveLinks: 'Active links',
    fmActionsHint: 'Select a folder or open one to use this action.',

    // Links page (cards)
    lnkFilterAll: 'All',
    lnkSearch: 'Search by collection',
    lnkExpiresIn: 'Expires in {n} days',
    lnkExpiresToday: 'Expires today',
    lnkExpiredAgo: 'Expired {n} days ago',
    lnkUploaded: 'Uploaded: {used} / {max}',
    lnkOpenCollection: 'Open in collections',
    lnkCreated: 'Created {date}',
    lnkNoMatch: 'No links match the filter.',

    // Logs page
    logSearch: 'Search messages',
    logDetails: 'Details',
    logHideDetails: 'Hide',
    logToday: 'Today',
    logYesterday: 'Yesterday',
    logCount: '{n} entries',
    logRefresh: 'Refresh',

    // Admin common
    close: 'Close',
    admLoading: 'Loading…',
    admLoadFailed: 'Failed to load data.',
    typeSend: 'Download',
    typeReceive: 'Upload',
    typeShare: 'Share',
    typeSendDesc: 'Download only',
    typeReceiveDesc: 'Upload only',
    typeShareDesc: 'Both, shared folder',
    statusActive: 'Active',
    statusSoon: 'Expiring soon',
    statusExpired: 'Expired',

    // Admin links tab
    admLinksTitle: 'Links',
    admLinksSubtitle: '{active} active links · {soon} expiring soon',
    admNewLink: 'New link',
    admColCollection: 'Collection',
    admColType: 'Type',
    admColDownloads: 'Downloads',
    admColUpload: 'Upload quota',
    admColExpires: 'Expires',
    admColStatus: 'Status',
    admColActions: 'Action',
    admNoLinks: 'No links yet.',
    admCollectionDeleted: 'Deleted collection',
    admUnlimited: 'Unlimited',
    admDeleteLink: 'Delete link',
    admConfirmDeleteLink: 'Are you sure you want to delete this sharing link?',

    // Link wizard
    wizTitle: 'New sharing link',
    wizStep: 'Step {n} of {total}',
    wizStep1Title: 'What can the recipient do?',
    wizStep2Title: 'Collection, quota and expiry',
    wizStep3Title: 'Summary',
    wizCollection: 'Collection',
    wizNewFolder: 'Create a new empty folder',
    wizQuota: 'Upload quota (GB)',
    wizMaxDownloads: 'Number of downloads',
    wizExpiry: 'Expiry',
    wizBack: 'Back',
    wizNext: 'Next',
    wizCreate: 'Create link',
    wizCancel: 'Cancel',
    wizErrExpiry: 'Enter an expiry date (tomorrow at the earliest).',
    wizErrQuota: 'The quota must be at least 1 GB.',
    wizErrDownloads: 'The number of downloads must be at least 1, or leave it empty.',
    wizCreateFailed: 'Failed to create the link.',

    // Generated link dialog
    tokTitle: 'Link created',
    tokWarn: 'Important: you will only see this link now. Copy it before closing this window.',
    tokCopy: 'Copy link',
    tokCopied: 'Copied',
    tokDone: 'Done',

    // Collections (legacy) tab
    pubTitle: 'Public visibility',
    pubDesc: 'When public, the files of this collection and all of its subfolders are available on the home page (/) without a link.',
    pubEnable: 'Public visibility',
    pubExpiry: 'Public until',
    pubExpiryHint: 'On this date the collection becomes private again.',
    pubSave: 'Save',
    pubFailed: 'Failed to save the setting.',

    // Logs tab
    logTitle: 'Logs',
    logAll: 'All levels',
    logInfo: 'Info',
    logWarnings: 'Warnings',
    logErrors: 'Errors',
    logTime: 'Time',
    logMessage: 'Message',
    logEmpty: 'No log entries.',
};

export const dictionaries: Record<Lang, Dict> = { hu, en };

export function isLang(value: unknown): value is Lang {
    return value === 'hu' || value === 'en';
}

/** Builds a translate function for a language; `{name}` placeholders are replaced from `vars`. */
export function makeT(lang: Lang) {
    const dict = dictionaries[lang];
    return (key: DictKey, vars?: Record<string, string | number>): string => {
        let text: string = dict[key];
        if (vars) {
            for (const [name, value] of Object.entries(vars)) {
                text = text.replaceAll(`{${name}}`, String(value));
            }
        }
        return text;
    };
}
