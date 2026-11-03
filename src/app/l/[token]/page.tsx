import React from 'react';
import dbConnect from '@/lib/dbConnect';
import { findLinkByToken } from '@/lib/authHelper';
import Content from '@/models/Content';
import Log from '@/models/Log';
import FileUploader from '@/components/FileUploader';
import { Download, Eye, UploadCloud, ShieldAlert, Calendar, Database } from 'lucide-react';
import LinkRefreshWrapper from '@/components/LinkRefreshWrapper';
import SiteHeader from '@/components/SiteHeader';
import FileTile from '@/components/FileTile';
import { getI18n } from '@/lib/i18nServer';

interface PageProps {
    params: Promise<{ token: string }>;
}

export default async function LinkLandingPage({ params }: PageProps) {
    const { token } = await params;
    const { lang, t } = await getI18n();
    const locale = lang === 'hu' ? 'hu-HU' : 'en-GB';

    await dbConnect();

    // 1. Locate and validate link token
    const link = await findLinkByToken(token);

    if (!link) {
        // Log invalid or expired token attempts for security audits
        await Log.create({
            level: 'warning',
            message: 'Attempted to access non-existent, invalid, or expired shared link',
            details: { tokenExcerpt: token.substring(0, 8) + '...' }
        });

        return (
            <div className="flex min-h-screen flex-col">
                <SiteHeader />
                <main className="flex flex-grow items-center justify-center p-4">
                    <div className="card w-full max-w-md space-y-4 p-8 text-center">
                        <ShieldAlert className="mx-auto h-12 w-12 text-red-500" aria-hidden="true" />
                        <h1 className="text-xl font-bold">{t('linkExpiredTitle')}</h1>
                        <p className="text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">{t('linkExpiredText')}</p>
                    </div>
                </main>
            </div>
        );
    }

    // 2. Fetch all content/files attached to this collection
    const rawFiles = await Content.find({ contentCollectionId: link.contentCollectionId })
        .sort({ createdAt: -1 })
        .lean();

    // Convert Mongoose Documents to plain objects with string IDs for Client Components
    const files = rawFiles.map(file => ({
        id: file._id.toString(),
        originalName: file.originalName,
        size: file.size,
        mimeType: file.mimeType,
        createdAt: file.createdAt.toISOString(),
    }));

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const showDownloads = link.type === 'send' || link.type === 'share';
    const showUploads = link.type === 'receive' || link.type === 'share';

    const title =
        link.type === 'send' ? t('linkTitleSend') : link.type === 'receive' ? t('linkTitleReceive') : t('linkTitleShare');
    const description =
        link.type === 'send' ? t('linkDescSend') : link.type === 'receive' ? t('linkDescReceive') : t('linkDescShare');

    return (
        <LinkRefreshWrapper>
            <div className="flex min-h-screen flex-col">
                <SiteHeader />

                <main className="mx-auto w-full max-w-5xl flex-grow space-y-6 px-4 py-8 sm:px-6 sm:py-10">

                    {/* Header metadata */}
                    <section className="card flex flex-col justify-between gap-5 p-5 sm:p-7 md:flex-row md:items-center">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">{title}</h1>
                            <p className="mt-1.5 text-[15px] text-slate-600 dark:text-slate-400">{description}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            <span className="badge badge-neutral">
                                <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                                {t('linkExpires', { date: new Date(link.availableTo).toLocaleDateString(locale) })}
                            </span>
                            {showDownloads && link.availableDownloads !== null && (
                                <span className="badge badge-info">{t('linkDownloadsLeft', { n: link.availableDownloads })}</span>
                            )}
                            {showUploads && (
                                <span className="badge badge-neutral">
                                    <Database className="h-3.5 w-3.5" aria-hidden="true" />
                                    {t('linkQuota', {
                                        left: formatBytes(link.availableBytesToUpload),
                                        max: formatBytes(link.maxBytesToUpload),
                                    })}
                                </span>
                            )}
                        </div>
                    </section>

                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">

                        {/* File download view (send / share) */}
                        {showDownloads && (
                            <section className={showUploads ? 'lg:col-span-7' : 'lg:col-span-12'}>
                                <div className="card overflow-hidden">
                                    <h2 className="border-b border-slate-200 px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800">
                                        {t('sharedFiles', { n: files.length })}
                                    </h2>

                                    {files.length === 0 ? (
                                        <p className="p-8 text-center text-[15px] text-slate-500">{t('noFiles')}</p>
                                    ) : (
                                        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {files.map((file) => (
                                                <li key={file.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <FileTile name={file.originalName} />
                                                        <div className="min-w-0">
                                                            <p className="truncate text-[15px] font-semibold">{file.originalName}</p>
                                                            <p className="text-sm text-slate-500">{formatBytes(file.size)}</p>
                                                        </div>
                                                    </div>
                                                    {/* Action buttons */}
                                                    <div className="flex shrink-0 items-center gap-2">
                                                        {/\.(jpe?g|png|gif|webp|svg|mp4|webm|mov|mp3|wav|ogg|pdf|txt)$/i.test(file.originalName) && (
                                                            <a
                                                                href={`/api/download/${file.id}?token=${token}&inline=true`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="btn btn-secondary flex-1 sm:flex-none"
                                                            >
                                                                <Eye className="h-4 w-4" aria-hidden="true" />
                                                                {t('previewBtn')}
                                                            </a>
                                                        )}
                                                        <a
                                                            href={`/api/download/${file.id}?token=${token}`}
                                                            className="btn btn-primary flex-1 sm:flex-none"
                                                        >
                                                            <Download className="h-4 w-4" aria-hidden="true" />
                                                            {t('downloadBtn')}
                                                        </a>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* File upload view (receive / share) */}
                        {showUploads && (
                            <section className={showDownloads ? 'lg:col-span-5' : 'lg:col-span-12'}>
                                <div className="card overflow-hidden">
                                    <h2 className="flex items-center gap-2 border-b border-slate-200 px-5 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800">
                                        <UploadCloud className="h-4 w-4" aria-hidden="true" />
                                        {t('uploadFiles')}
                                    </h2>
                                    <div className="p-4 sm:p-5">
                                        <FileUploader
                                            linkToken={token}
                                            collectionId={link.contentCollectionId.toString()}
                                            availableBytesToUpload={link.availableBytesToUpload}
                                        />
                                    </div>
                                </div>
                            </section>
                        )}

                    </div>
                </main>
            </div>
        </LinkRefreshWrapper>
    );
}
