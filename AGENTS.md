# AGENTS.md

Ez a fájl a projekt élő dokumentációja emberi fejlesztőknek és AI-ügynököknek. Minden módosításkor frissítsd, ha a felépítés, a konfiguráció, az API, a formátumok vagy az üzleti szabályok változnak.

## 0. Alapelvek (kötelező)

- **Projekt típusa:** **külső projekt** (a felhasználó megerősítette, 2026-11-03). Nem KEDD-alkalmazás, ezért a KEDD-specifikus szabályok (AD-környezet, KEDD-Intranet API) nem kötelezőek. Ha ez változik, ezt a pontot és a 12. pontot frissíteni kell.
- **Kód-stílus:** a kód legyen emberi fejlesztő és másik AI számára is érthető. Kommenteld a nem triviális üzleti szabályokat és a biztonsági döntéseket; a meglévő kommentsűrűséget és elnevezési stílust kövesd.
- **Meglévő működés megőrzése:** módosításkor csak a feladathoz szükséges részt változtasd. Indokolatlan refaktorálás, framework-, nyelv-, adatbázis- vagy buildrendszer-váltás tilos. Meglévő fájlt, funkciót, konfigurációt vagy dependency-t ne törölj, amíg a szerepét nem értetted meg.
- **Visszafelé kompatibilitás:** breaking change esetén migráció vagy egyértelmű figyelmeztetés kell.
- **Secret-kezelés:** jelszót, API-kulcsot, tokent, privát kulcsot vagy valós érzékeny adatot **nem commitolunk**. Tesztekhez szintetikus fixture-t használjunk. Ha secret már került a repositoryba, jelezni kell, javasolni kell a törlését a Git-előzményből, és a credential visszavonását/rotációját. Ettől csak kifejezett felhasználói kérésre lehet eltérni, és azt itt dokumentálni kell.
- **Környezetfüggő értékek** (URL-ek, kulcsok, hostok) ne kerüljenek a forráskódba, konfigurációból olvassuk őket.
- **Hibakezelés és naplózás:** nincs silent failure. A felhasználó érthető hibaüzenetet kap, a részletes technikai információ a `Log` kollekcióba kerül. Secret vagy felesleges személyes adat nem kerülhet naplóba.
- **Új dependency:** csak indokolt esetben, aktívan karbantartott, megbízható csomagból.
- **Ellenőrzés módosítás után:** `npx tsc --noEmit`, `npx eslint src`, `npm run build`. Hibajavításhoz lehetőleg regressziós teszt.
- **Biztonság és reszponzivitás:** webes alkalmazásnál alapkövetelmény. A legkisebb szükséges jogosultság elve érvényes.
- **KEDD-specifikus szabály:** KEDD-alkalmazásoknál Windows- és AD-környezettel kell számolni. Központi konfigurációt lehetőleg a KEDD-Intranet hivatalos API-ján keresztül kell tárolni/lekérni; közvetlen adatbázis-hozzáférés helyett a hivatalos API-t kell használni. (Csak akkor relevns, ha a projekt KEDD-es — lásd 0. pont.)

## 1. Projekt célja

Fájlmegosztó webalkalmazás, amely **időkorlátos, tokennel védett linkeken** keresztül teszi lehetővé:
- fájlok **letöltését** (`send`),
- fájlok **feltöltését** kért felületre (`receive`),
- mindkettőt egy megosztott mappán (`share`).

Az adminisztrátor linkeket és gyűjteményeket (ContentCollection) kezel, és a gyűjteményeket nyilvánosan is közzéteheti lejárati idővel. Fájlok fizikai tárolása egy Synology NAS-on van (WebDAV + saját Storage API), a metaadatok MongoDB-ben.

Nyelv: a UI angol nyelvű (jelenleg), a dokumentáció magyar.

## 2. Technológiai stack

| Réteg | Technológia |
|---|---|
| Framework | Next.js `16.3.2` (App Router), React `19.2.8`, TypeScript `^5` (strict) |
| Stílus | Tailwind CSS `^4` (`@tailwindcss/postcss`), `globals.css` |
| Ikonok | `lucide-react` |
| Adatbázis | MongoDB via Mongoose `^9.9.3` |
| Fájltár | WebDAV (`webdav` npm csomag) a Synology NAS-on |
| Fájlszolgáltatás | Külső Storage API (NASiS3 uploader/downloader) a NAS-on |
| Jelszó-hash | `bcryptjs` |
| Lint | ESLint 9 + `eslint-config-next` |

Nincs automatizált teszt-keretrendszer (lásd 9. pont).

## 3. Felépítés

```
src/
  middleware.ts              /admin/* útvonalak védelme (admin_session cookie)
  app/
    layout.tsx, page.tsx     Főoldal (nyilvános fájllista, collection-ök)
    globals.css
    admin/
      page.tsx               Admin dashboard (AdminDashboardClient)
      login/page.tsx         Admin belépés
    l/[token]/page.tsx       Link-landing: letöltés / feltöltés token alapján (SSR)
    api/
      admin/login|logout     Admin belépés / kilépés (cookie)
      admin/links            Link CRUD (GET/POST/DELETE)
      admin/collections      Gyűjtemények listázása (GET)
      admin/collections/public  Gyűjtemény nyilvánosítása (POST)
      admin/logs             Logok listázása (GET, max 100)
      download/[fileId]     Fájl letöltés / előnézet (token vagy public)
      upload/record          Feltöltés metaadatainak rögzítése (kliens hívja)
      upload/chunk|finalize  Helyi chunk/merge útvonalak (lásd 11. pont — valószínűleg elavult)
      storage/[...path]      Proxy a Storage API felé (HTTPS mixed-content elkerülésére)
  components/
    AdminDashboardClient.tsx Admin keret (oldalsáv) + három oldal: Linkek, Gyűjtemények (= fájlkezelő), Naplók
    LinksPanel.tsx           Linkek oldal: kártyák, állapotszűrő-chipek számlálóval, keresés, lejárat-sáv, feltöltési keret-sáv
    LogsPanel.tsx            Naplók oldal: szint-chipek számlálóval, keresés, napok szerint csoportosítva, kinyitható részletek
    TokenDialog.tsx          "Link elkészült" ablak (a nyers token csak itt látszik, egyszer)
    VisibilityDialog.tsx     Gyűjtemény nyilvánosságának beállítása (POST /api/admin/collections/public)
    FileManager.tsx          Admin fájlkezelő, macOS Finder stílusban: mappafa-oldalsáv, vissza/előre/fel, ikon-/lista-/oszlopnézet, útvonalsáv, állapotsor, info panel, billentyűzet (nyilak, Enter, Cmd/Ctrl+↑/↓), nézet megjegyzése (localStorage `filemanager-view`)
    fm/folderData.ts         Fájlkezelő típusai, lekérés (`fetchListing`), segédfüggvények
    fm/FinderSidebar.tsx     Mappafa (lusta betöltés, ARIA tree)
    fm/FinderViews.tsx       IconView, ListView (rendezhető fejlécek), ColumnView (Miller-oszlopok + előnézet), InfoPanel
    FileUploader.tsx         Chunkolt, adaptív méretű feltöltés a Storage API-ra
    LinkRefreshWrapper.tsx   Oldal-frissítés wrapper
    SiteHeader.tsx           Nyilvános oldalak fejléce (logó, nyelvváltó)
    LanguageSwitcher.tsx     HU/EN váltó (cookie: `lang`)
    I18nProvider.tsx         Kliens oldali fordítás (`useI18n()`)
    FileTile.tsx             Fájltípus-jelölő csempe (kiterjesztés szerint színezve)
    Modal.tsx                Hozzáférhető párbeszédablak (közös)
    LinkWizard.tsx           3 lépéses link-létrehozó varázsló (POST /api/admin/links)
  lib/
    i18n.ts, i18nServer.ts   Magyar (alap) és angol szótár; szerveren `getI18n()`, kliensen `useI18n()`
    dbConnect.ts             Mongoose kapcsolat-cache (global)
    session.ts               Admin session token (HMAC-SHA256, Web Crypto)
    authHelper.ts            Link token ellenőrzés (bcrypt, lejárat-szűrés)
    storageApi.ts            Storage API URL/kulcs feloldás, letöltő URL építés
    webdav.ts                WebDAV kliens + ensureDirectoryExists
    errorLogger.ts           writeLog() — Log kollekcióba írás
  models/
    Content.ts               Egy feltöltött fájl metaadata
    ContentCollection.ts     Fájlok csoportja (gyűjtemény), nyilvánosság
    Link.ts                  Megosztási link (hash-elt token, jogosultságok)
    Log.ts                   Rendszernapló
public/                      Statikus SVG-k (alapértelmezett Next.js-minták)
```

### Dizájn és nyelv (2026-11-03-tól)

- Dizájn-terv: Claude Design canvas "NewFileSharer redesign" (világos/sötét, mobil-first, külső címzettek a fő célcsoport). A tokenek és közös osztályok a `src/app/globals.css`-ben vannak (`.card`, `.btn`, `.btn-primary/-secondary/-danger`, `.input`, `.badge-*`); új oldalaknál ezeket használd, ne új egyedi stílust.
- Betűtípus: Inter (`next/font`). Minden interaktív elem legalább 44 px magas, vízszintes görgetés nélkül működik mobilon.
- **Nyelv:** magyar az alapértelmezett, angol is támogatott. Új felirat = új kulcs mindkét szótárban (`src/lib/i18n.ts`); a `Dict` típus miatt hiányzó angol kulcs fordítási hiba.
- **Átállítva az új dizájnra (hu/en):** főoldal, link-oldal (`/l/[token]`), feltöltő, admin belépés, admin keret (oldalsáv), Linkek (kártyák), 3 lépéses link-varázsló (`LinkWizard.tsx`), Gyűjtemények = Fájlkezelő, Naplók, valamint a párbeszédablakok (`Modal.tsx`: role="dialog", Escape zárja).
- **Főoldal (nyilvános böngésző):** `/` a nyilvános "share root" mappákat mutatja kártyákon; `/?f=<mappaId>` a mappa tartalmát (almappák + fájlok) szerveroldalon rendereli, a breadcrumb a share roottól indul (a fölötte lévő privát mappák nem látszanak). **A nyilvánosság öröklődik:** ha egy mappa vagy bármely szülője nyilvános és nem járt le, az almappák és fájlok is elérhetők link nélkül (`src/lib/publicAccess.ts`: `resolvePublic`, `isPubliclyReachable`, `listPublicRoots`). A `/api/download/[fileId]` ugyanezt használja. A Linkek (token) továbbra is csak a link gyűjteményének közvetlen fájljait érik el, almappákat nem. A lejárat a legfelső nyilvános mappáé.
- **A régi "Gyűjtemények" fül megszűnt:** a fájlkezelő a gyűjteménykezelő. A kijelölt mappán (vagy ha nincs kijelölés, a megnyitotton) a **Láthatóság** és **Link készítése** művelet érhető el az eszköztárból és az info panelből; az info panel mutatja a nyilvánosságot és az aktív linkek számát (`linkCount` a `/api/admin/files` válaszában). A Linkek oldalon a kártya "Megnyitás a gyűjteményben" gombja a fájlkezelőbe ugrik.
- **Fájlkezelő (Finder-stílus):** egy kattintás kijelöl, dupla kattintás (érintőképernyőn egy koppintás) megnyit; oszlopnézetben egy kattintás nyit. A mappák mindig elöl vannak. Még nincs: átnevezés, törlés, áthelyezés, fájl feltöltése/letöltése az adminból (ehhez API kell; a Storage API `DELETE /files` végpontja használható lesz).
- A varázsló lejárati dátuma legkorábban holnap lehet; a gyűjtemény-lista a varázslóban saját lekéréssel töltődik (a Linkek fülről indítva is működik).
- A `/api/admin/files` mappa-nevek hiányzó név esetén magyar tartalék szöveget ("Névtelen mappa") adnak vissza, ez nyelvfüggetlen; később érdemes a klienssel fordíttatni.

## 4. Indítás, build, konfiguráció

```bash
npm install
npm run dev      # fejlesztői szerver: http://localhost:3000
npm run build    # production build
npm run start    # production szerver
npm run lint     # ESLint
npx tsc --noEmit # típusellenőrzés
```

### Környezeti változók (`.env.local`, nincs verziókezelve)

Az értékeket soha ne írd ide vagy a kódba. Csak a nevek:

| Változó | Használat |
|---|---|
| `MONGODB_URI` | MongoDB kapcsolat (kötelező, `dbConnect.ts` dob hibát nélküle) |
| `ADMIN_PASSWORD` | Admin belépési jelszó (összehasonlítás plain-text, lásd 10. pont) |
| `NEXTAUTH_SECRET` | Admin session HMAC-kulcs (**ha hiányzik, fallback érték lép életbe** — lásd 10. pont) |
| `WEBDAV_URL`, `WEBDAV_USERNAME`, `WEBDAV_PASSWORD` | NAS WebDAV elérés (kötelező, `webdav.ts` dob hibát nélküle) |
| `UPLOAD_API_URL` | Storage API alap-URL (szerver oldal) |
| `UPLOAD_API_KEY` | Storage API kulcs (szerver oldal) |
| `NEXT_PUBLIC_UPLOAD_API_URL`, `NEXT_PUBLIC_UPLOAD_API_KEY` | Ugyanaz kliens oldalon — **figyelem: a `NEXT_PUBLIC_` prefix a kulcsot a böngésző JS-kódjába építi**, lásd 10. pont |

Alapértelmezett Storage API URL kódban: `https://api.filesharer.rozsnorbert.hu:9443` (a `storageApi.ts`-ben és a storage proxy-ban is). A konfigurált URL-t a proxy nem írja át (korábban `https`→`http` visszaminősített, ez az API HTTPS-re váltása óta hibás lett volna). Hardcoded fallback API-kulcs nincs.

## 5. Külső API-k és interfészek

1. **MongoDB** — Mongoose-on keresztül, a `dbConnect` globális cache-ét használja. A `bufferCommands: false` miatt DB-hiba azonnal hibát ad.
2. **WebDAV (NAS)** — `webdav` csomag. Útvonalak:
   - `/temp/<fileId>/chunk_<n>` — ideiglenes chunkok
   - `/uploads/<collectionId>/<sanitizedName>` — véglegesen tárolt fájlok
3. **Storage API ("Synology WebDAV Chunked Uploader API" v1.1.0)** — `https://api.filesharer.rozsnorbert.hu:9443`, **csak HTTPS** (érvényes tanúsítvány, sima HTTP már nem érhető el). Dokumentáció: `GET /docs` (HTML) vagy `Accept: application/json`. Hitelesítés: `x-api-key` fejléc (a `GET /download*` az `?apiKey=` query paramétert is elfogadja, de az a kulcsot az URL-ben kiteszi). A kulcsok lehetnek a szerver `.env`-jében lévő statikus kulcs, vagy az API admin felületén létrehozott, névvel ellátott, lejáratható, tiltható, **mappához köthető** kulcsok (mappához kötött kulcs csak a saját mappájában dolgozhat). Nyilvános végpontok: `/`, `/docs`, `/health`.
   - `POST /upload/start` `{filename, fileSize?, targetPath?}` → `uploadId`, `recommendedChunkSize`, `minChunkSize`, `maxChunkSize`. A `targetPath` az API feltöltési gyökerén belül kell legyen; relatív útvonalat a gyökér alá helyez, `..` tilos (400).
   - `POST /upload/chunk` (multipart: `file`, `uploadId`, `chunkIndex`, opcionálisan `filename`) → `nextChunkSize` (**adaptív chunk-méret**, a sebesség alapján).
   - `POST /upload/finish` `{uploadId, totalChunks, filename?, targetPath?}` → `destination` (abszolút WebDAV-útvonal, ez kerül a `Content.webdavPath`-ba). Az API ellenőrzi, hogy pontosan a `0..totalChunks-1` részek léteznek.
   - `POST /upload/failed` `{uploadId}` — takarítás; `GET /upload/status/:uploadId` — folyamat/újraindítás.
   - `GET /download?path=<abszolút útvonal>[&inline=true]` — streamelt letöltés Range-támogatással; `GET /download/info?path=` (metaadat); `GET /download/list?path=` (könyvtár tartalma).
   - `DELETE /files?path=<útvonal>[&recursive=true]` — fájl/mappa törlése (mappához mappa-kulccsal csak a saját mappájában). Az admin fájlkezelő ezt fogja használni a törléshez (még nincs bekötve).
   - `GET /health/key` — a hívó kulcs állapota (név, mappa, lejárat, tárhelyhasználat).
   - CORS: `Access-Control-Allow-Origin: *`; engedélyezett fejlécek: `Content-Type, x-api-key, Range`; metódusok: GET, POST, DELETE, OPTIONS.
4. **Saját HTTP API** — lásd 3. pont. Admin végpontok `admin_session` cookie-t várnak.

## 6. Adat- és fájlformátumok

**Admin session token:** `admin_session_<timestampMs>.<hexHmacSha256>`, cookie `admin_session`, `httpOnly`, `sameSite=strict`, `secure` csak production-ben, lejárat 7 nap (`session.ts`).

**Link token:** a kiadott token 16 bájt véletlen hex (32 karakter). Az adatbázisban **bcrypt hash** (`Link.token`), az admin a plain értéket egyszer látja. A linkek URL-ben `?token=` paraméterként szerepelnek.

**Mongoose modellek** (`src/models/`):

| Modell | Mezők |
|---|---|
| `Content` | `contentCollectionId`, `originalName`, `mimeType`, `size` (bájt), `webdavPath`, `createdAt` |
| `ContentCollection` | `name?`, `isPublic` (bool), `publicExpiresAt` (Date\|null), `createdAt` |
| `Link` | `token` (bcrypt hash, unique), `type` (`send`\|`receive`\|`share`), `contentCollectionId`, `availableDownloads` (szám, `null` = korlátlan), `availableBytesToUpload`, `maxBytesToUpload`, `availableTo` (lejárat), `createdAt` |
| `Log` | `level` (`info`\|`warning`\|`error`), `message`, `details` (Mixed), `createdAt` |

**Fájlnév-sanitizálás:** feltöltéskor a nem `[a-zA-Z0-9._-]` karakterek `_`-ra cserélődnek (`upload/finalize`). A tárolt `originalName` megmarad.

**Chunk-méret:** 20 MB (`FileUploader.tsx`, `CHUNK_SIZE`).

## 7. Fontos üzleti szabályok

- **Link típusok:**
  - `send` — csak letöltés; feltöltés tilos (403).
  - `receive` — csak feltöltés; letöltés tilos (403).
  - `share` — mindkettő.
- **Lejárat:** `availableTo` múltbeli érték esetén a link érvénytelen (a lekérdezés `availableTo > now` szűrőt használ).
- **Letöltési limit:** `availableDownloads` csökken minden letöltésnél; 0-nál a link törlődik. `null` = korlátlan.
- **Feltöltési kvóta:** `availableBytesToUpload` csökken a feltöltött méret szerint; a feltöltés elutasítandó, ha nem fér bele (`Upload quota exceeded`).
- **Nyilvános gyűjtemény:** `isPublic=true` ÉS `publicExpiresAt > now` esetén a fájl tokennel nem kell (`/api/download`).
- **Gyűjtemény-egyezés:** token-alapú letöltésnél a fájlnak a link gyűjteményében kell lennie (különben 403 + log).
- **Admin létrehozáskor** gyűjtemény nélkül automatikusan `Transfer_<timestamp>` nevű gyűjtemény jön létre.
- **Admin-jelszó:** `ADMIN_PASSWORD` egyezés; session 7 napig érvényes (cookie- és token-oldali is).

## 8. Ismert korlátozások

- Nincs felhasználó-kezelés; egyetlen admin jelszó van.
- Nincs rate limiting (login, link-token próbálkozás, letöltés).
- A letöltési limit csökkentése nem atomi (race condition több párhuzamos kérésnél).
- A kvóta-ellenőrzés nem atomi; párhuzamos feltöltések túlléphetik a kvótát.
- A `/temp/<fileId>` és a `/tmp/<fileId>_merged` útvonalak a kliens által megadott `fileId`-ből épülnek, **nincs sanitizálás** (lásd 10. pont).
- A UI szövegek angolul vannak, nincs i18n.
- Nincs `.env.example`; a szükséges változók csak ebben a fájlban vannak felsorolva.

## 9. Tesztelés

- **Jelenleg nincs automatizált teszt.** A `package.json` nem tartalmaz test scriptet.
- Ellenőrzés módosítás után: `npx tsc --noEmit` (jelenleg zöld), `npx eslint src` (jelenleg **6 hiba, 2 warning**, mind régebbi fájlokban: `no-explicit-any` a `errorLogger.ts`, `Log.ts` és a storage proxy fájljában, `prefer-const` a `dbConnect.ts`-ben), `npm run build`.
- Hibajavításhoz regressziós teszt legyen (javasolt: Vitest, lásd 13. pont).
- Kézi tesztelés: `npm run dev`, admin login, link létrehozás, feltöltés/letöltés a `/l/<token>` oldalon.

## 10. Biztonsági megjegyzések (felülvizsgálat alapján, 2026-11-03)

Ezeket javítani kell, mielőtt a rendszer éles használatra kerül:

1. **Admin API auth-bypass (KRITIKUS):** `src/app/api/admin/links/route.ts` (GET, POST, DELETE) és `src/app/api/admin/logs/route.ts` a `verifySession(session)` Promise-t **`await` nélkül** használja. A Promise mindig truthy, így a `!verifySession(...)` ellenőrzés sosem igaz → az admin link-kezelés és a logok **bejelentkezés nélkül is elérhetők**. Javítás: `await verifySession(...)`.
2. **Storage proxy nyitott (KRITIKUS):** `src/app/api/storage/[...path]/route.ts` minden metódusra (GET/POST/PUT/DELETE) továbbít tetszőleges útvonalat a Storage API-ra az `x-api-key` fejléccel, **autentikáció nélkül**. (A korábban a kódban lévő fallback kulcs eltávolítva; ha a kulcs bekerült a Git-előzménybe, rotálni kell — lásd 13. pont.)
3. **Kliens-oldali kulcs:** `NEXT_PUBLIC_UPLOAD_API_KEY` a böngészőbe kerül; a `FileUploader.tsx` ezt küldi a NAS-nak. A kulcs ezzel publikus. Javaslat: a feltöltést szerveroldali (session/link-token-alapú) engedélyezéssel kell fedni, a kulcsot nem szabad `NEXT_PUBLIC_` prefixszel kiadni.
4. **Tetszőleges `webdavPath` rögzítése:** `src/app/api/upload/record/route.ts` a kliens által küldött `webdavPath`-ot fogadja el, anélkül hogy ellenőrizné, hogy az a link gyűjteményéhez tartozik-e. Egy `share`/`receive` link birtokosa így olyan NAS-útvonalat is regisztrálhat, amit később a `/api/download` ki tud szolgálni → potenciális fájlolvasás.
5. **Path traversal:** a `fileId` (kliens-oldali) közvetlenül kerül a WebDAV és a helyi `/tmp` útvonalba (`upload/chunk`, `upload/finalize`).
6. **Fallback session secret:** ha `NEXTAUTH_SECRET` nincs beállítva, a `session.ts` a nyilvános fallback stringgel ír alá → token hamisítható. Javaslat: ne legyen fallback, hiba legyen.
7. **Plain-text admin jelszó összehasonlítás:** `admin/login/route.ts` — nem constant-time, és nincs brute-force védelem.
8. **Token-részlet logolása:** `download` és `l/[token]` logokban az első 8 karakter (`tokenExcerpt`) kerül a naplóba. Csökkentés javasolt.
9. **`dbConnect` és `webdav.ts` import-time hibát dob** hiányzó env esetén — ez build-időben zavaró lehet; fontolandó a késleltetett ellenőrzés.

## 11. Ismert kód-állapot / elavult részek

- `src/app/api/upload/chunk/route.ts` és `src/app/api/upload/finalize/route.ts` helyi chunk-tárolást és merge-et valósít meg, de a jelenlegi kliens (`FileUploader.tsx`) a Storage API `/upload/*` végpontjait hívja. **Valószínűleg nem használt**; a használatát ellenőrizni kell, mielőtt törlésről döntünk.
- `src/lib/webdav.ts` `ensureDirectoryExists` és a `upload/record` a jelenlegi folyamat része.
- Az `.next/` és `node_modules/` build/függőség-könyvtárak, nem verziókezeltek.
- `README.md` a `create-next-app` alap sablona; nem tükrözi a projekt valódi működését.

## 12. Kompatibilitási követelmények

- Node.js: a Next.js 16 minimum követelményei szerint (ellenőrizendő a `package.json` engines mező hiányában).
- Böngésző: modern evergreen böngészők; reszponzív layout (mobil nézet kötelező).
- Deployment: HTTPS-en futó frontend; a Storage API is HTTPS-en fut a 9443-as porton (korábban HTTP volt). A storage proxy (`/api/storage/*`) a korábbi mixed-content kerülőút maradványa; a kliens a feltöltésnél a Storage API-t közvetlenül hívja (CORS engedélyezett).
- Windows/AD-környezet: **megerősítendő**, ha KEDD-es projekt.

## 13. Nyitott kérdések / következő lépések

- [x] Megerősíteni: KEDD-es vagy külső projekt? → külső projekt (2026-11-03)
- [x] Auth-bypass javítva (`await verifySession`, 2026-11-03).
- [ ] Nyitott storage proxy (10. pont 2.) még javítandó: hitelesítés (admin session vagy link-token) kell elé.
- [ ] A `84c2db2` commitban a storage proxy hardcoded fallback kulcsot tartalmazott (egy tesztkulcs-szöveg, a szó szerinti értéket szándékosan nem ismételjük itt). Ha ez valós vagy valaha valós kulcs volt, a Git-előzményből el kell távolítani (pl. `git filter-repo`), és az API-n vissza kell vonni/rotálni. A jelenlegi kódban már nincs.
- [x] API-teszt az új, mappához kötött kulccsal (2026-11-03, `curl`, szintetikus 3 MB fájl, utána törölve): `/health/key`, `upload/start|chunk|finish` (relatív `targetPath`), `download` (header-auth, Range 206, bájtazonos), `download/info|list`, `DELETE /files?recursive=true` — mind rendben. A kulcs gyökere: `/EpochMedia/Filesharer`; a `destination` abszolút útvonal (ez kerül a `webdavPath`-ba). A kulcs mappáján kívüli útvonal 403.
- [ ] **Régi `webdavPath`-ok:** a korábban mentett `/uploads/<id>/<fájl>` alakú útvonalak az új kulccsal 403-at adnak (a gyökéren kívüliek). Relatív alakban (`uploads/<id>/<fájl>`) feloldhatók, de csak akkor, ha a fájlok fizikailag a `/EpochMedia/Filesharer` alatt vannak. Eldöntendő: létező régi fájlok migrálása/újrafeloldása.
- [ ] A kulcs a `NEXT_PUBLIC_UPLOAD_API_KEY` miatt a böngészőben látható, és a kulcs a mappájában törölni is tud. Szerveroldali közvetítés kell, vagy külön kulcs csak feltöltésre.
- [ ] Eldönteni, kell-e a `upload/chunk|finalize` helyi útvonal; ha nem, törölhető (csak jóváhagyással).
- [ ] Regressziós tesztek bevezetése (javasolt: Vitest).
- [ ] `.env.example` létrehozása a változók nevével (értékek nélkül).
- [ ] ESLint hibák javítása (`no-explicit-any`, `prefer-const`).
- [ ] Ellenőrizni, hogy a `.env.local` vagy secret került-e a Git-előzménybe (jelenlegi ellenőrzés: nincs találat `.env.local`-ra).
- [ ] Konfiguráció áthelyezése a KEDD-Intranet API-jára, ha a projekt KEDD-es.

## 14. Karbantartás

- Ezt a fájlt módosításkor frissítsd (felépítés, env-változók, API, modellek, szabályok, ismert problémák).
- GEMINI.md a repositoryban **nincs**; ha később létrejön, a benne lévő hasznos információt ide kell átvezetni, és a GEMINI.md-ben jelezni kell, hogy a projektinformáció az AGENTS.md-ben van.
