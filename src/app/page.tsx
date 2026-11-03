import React from 'react';
import Link from 'next/link';
import mongoose from 'mongoose';
import dbConnect from '@/lib/dbConnect';
import ContentCollection from '@/models/ContentCollection';
import Content from '@/models/Content';
import { ChevronRight, Clock, Database, Download, Eye } from 'lucide-react';
import { getI18n } from '@/lib/i18nServer';
import { listPublicRoots, resolvePublic } from '@/lib/publicAccess';
import SiteHeader from '@/components/SiteHeader';
import { FilePageIcon, FolderIcon } from '@/components/FileTile';

export const revalidate = 0; // Disable caching to fetch live public files on load

interface HomeProps {
  searchParams: Promise<{ f?: string | string[] }>;
}

interface FolderCard {
  id: string;
  name: string;
  folderCount: number;
  fileCount: number;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const PREVIEWABLE = /\.(jpe?g|png|gif|webp|svg|mp4|webm|mov|mp3|wav|ogg|pdf|txt)$/i;

/** Child folders of a folder (or the given share roots) with their item counts. */
async function toCards(folders: { _id: mongoose.Types.ObjectId; name?: string }[], fallbackName: string): Promise<FolderCard[]> {
  return Promise.all(
    folders.map(async (folder) => ({
      id: folder._id.toString(),
      name: folder.name || fallbackName,
      folderCount: await ContentCollection.countDocuments({ parentId: folder._id }),
      fileCount: await Content.countDocuments({ contentCollectionId: folder._id }),
    }))
  );
}

export default async function HomePage({ searchParams }: HomeProps) {
  const { lang, t } = await getI18n();
  const locale = lang === 'hu' ? 'hu-HU' : 'en-GB';
  const { f } = await searchParams;
  const requestedFolderId = Array.isArray(f) ? f[0] : f;

  await dbConnect();

  // A folder was requested: it must be inside a public tree, otherwise show the start page.
  const resolution = requestedFolderId ? await resolvePublic(requestedFolderId) : null;
  const folderNotFound = !!requestedFolderId && !resolution;

  let folders: FolderCard[] = [];
  let files: { id: string; name: string; size: number }[] = [];
  let currentName = '';

  if (resolution) {
    const currentId = resolution.path[resolution.path.length - 1].id;
    currentName = resolution.path[resolution.path.length - 1].name || t('publicCollectionFallback');
    const children = await ContentCollection.find({ parentId: currentId }).sort({ name: 1 }).lean();
    folders = await toCards(children, t('fmUnnamed'));
    const rawFiles = await Content.find({ contentCollectionId: currentId }).sort({ originalName: 1 }).lean();
    files = rawFiles.map((file) => ({ id: file._id.toString(), name: file.originalName, size: file.size }));
  } else {
    const roots = await listPublicRoots();
    folders = await toCards(roots, t('publicCollectionFallback'));
  }

  // Expiry of each share root card
  const rootExpiry = new Map<string, Date>();
  if (!resolution) {
    const roots = await ContentCollection.find({ _id: { $in: folders.map((c) => c.id) } }).lean();
    roots.forEach((r) => r.publicExpiresAt && rootExpiry.set(r._id.toString(), new Date(r.publicExpiresAt)));
  }

  const hasPublic = folders.length > 0 || files.length > 0 || !!resolution;

  const folderCard = (card: FolderCard, size: number) => (
    <li key={card.id}>
      <Link
        href={`/?f=${card.id}`}
        className="card group flex h-full items-center gap-4 p-4 transition hover:border-blue-300 hover:shadow-md dark:hover:border-blue-800"
      >
        <FolderIcon size={size} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base font-semibold">{card.name}</span>
          <span className="block text-sm text-slate-500">{t('fmContains', { folders: card.folderCount, files: card.fileCount })}</span>
          {rootExpiry.has(card.id) && (
            <span className="badge badge-warning mt-2">
              <Clock className="h-3 w-3" aria-hidden="true" />
              {t('expires', { date: rootExpiry.get(card.id)!.toLocaleDateString(locale) })}
            </span>
          )}
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-0.5" aria-hidden="true" />
      </Link>
    </li>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader showAdminLink />

      <main className="mx-auto w-full max-w-5xl flex-grow px-4 py-8 sm:px-6 sm:py-12">
        {folderNotFound && (
          <p role="alert" className="mb-6 rounded-[10px] bg-amber-100 px-4 py-3 text-sm font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
            {t('homeNotFound')}
          </p>
        )}

        {!hasPublic ? (
          /* Private mode: nothing is public */
          <div className="mx-auto mt-10 max-w-md space-y-4 text-center">
            <div className="inline-flex rounded-full bg-blue-100 p-4 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
              <Database className="h-8 w-8" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t('homeEmptyTitle')}</h1>
            <p className="text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">{t('homeEmptyText')}</p>
          </div>
        ) : !resolution ? (
          /* Start page: hero + the public collections */
          <div className="space-y-8">
            <section className="card relative overflow-hidden bg-gradient-to-br from-blue-50 via-white to-sky-50 p-6 sm:p-10 dark:from-blue-950/40 dark:via-slate-900 dark:to-slate-900">
              <div className="max-w-xl space-y-3">
                <span className="badge badge-info">{t('homeCollectionsCount', { n: folders.length })}</span>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('homeTitle')}</h1>
                <p className="text-base leading-relaxed text-slate-600 dark:text-slate-400">{t('homeHeroText')}</p>
              </div>
              <div aria-hidden="true" className="pointer-events-none absolute -bottom-6 right-6 hidden opacity-90 sm:block">
                <FolderIcon size={150} />
              </div>
            </section>

            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">{folders.map((card) => folderCard(card, 56))}</ul>
          </div>
        ) : (
          /* Folder view */
          <div className="space-y-6">
            <nav aria-label={t('fmBreadcrumb')} className="flex flex-wrap items-center gap-1 text-sm">
              <Link href="/" className="rounded-md px-2 py-1 font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                {t('homeCrumbRoot')}
              </Link>
              {resolution.path.map((crumb, index) => {
                const last = index === resolution.path.length - 1;
                return (
                  <React.Fragment key={crumb.id}>
                    <ChevronRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                    {last ? (
                      <span aria-current="page" className="px-2 py-1 font-semibold">{crumb.name || t('publicCollectionFallback')}</span>
                    ) : (
                      <Link href={`/?f=${crumb.id}`} className="rounded-md px-2 py-1 font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
                        {crumb.name || t('publicCollectionFallback')}
                      </Link>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>

            <header className="flex flex-wrap items-center gap-4">
              <FolderIcon size={64} />
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-2xl font-bold tracking-tight sm:text-3xl">{currentName}</h1>
                <p className="text-sm text-slate-500">{t('fmContains', { folders: folders.length, files: files.length })}</p>
              </div>
              <span className="badge badge-warning">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {t('expires', { date: resolution.expiresAt.toLocaleDateString(locale) })}
              </span>
            </header>

            {folders.length > 0 && (
              <section className="space-y-3">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('homeFolders')}</h2>
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">{folders.map((card) => folderCard(card, 44))}</ul>
              </section>
            )}

            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('homeFiles')} ({files.length})</h2>
              {files.length === 0 ? (
                <div className="card p-8 text-center text-[15px] text-slate-500">{folders.length === 0 ? t('fmEmpty') : t('noFiles')}</div>
              ) : (
                <ul className="card divide-y divide-slate-200 overflow-hidden dark:divide-slate-800">
                  {files.map((file) => (
                    <li key={file.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                      <div className="flex min-w-0 items-center gap-3">
                        <FilePageIcon name={file.name} size={40} />
                        <div className="min-w-0">
                          <p className="truncate text-[15px] font-semibold">{file.name}</p>
                          <p className="text-sm text-slate-500">{formatBytes(file.size)}</p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {PREVIEWABLE.test(file.name) && (
                          <a href={`/api/download/${file.id}?inline=true`} target="_blank" rel="noopener noreferrer" className="btn btn-secondary flex-1 sm:flex-none">
                            <Eye className="h-4 w-4" aria-hidden="true" />
                            {t('previewBtn')}
                          </a>
                        )}
                        <a href={`/api/download/${file.id}`} className="btn btn-primary flex-1 sm:flex-none">
                          <Download className="h-4 w-4" aria-hidden="true" />
                          {t('downloadBtn')}
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
        {t('footer', { year: new Date().getFullYear() })}
      </footer>
    </div>
  );
}
