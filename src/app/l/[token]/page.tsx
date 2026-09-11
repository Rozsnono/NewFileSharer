import React from 'react';
import { notFound } from 'next/navigation';
import dbConnect from '@/lib/dbConnect';
import { findLinkByToken } from '@/lib/authHelper';
import Content from '@/models/Content';
import Log from '@/models/Log';
import FileUploader from '@/components/FileUploader';
import { Download, Eye, FileIcon, UploadCloud, ShieldAlert, Calendar, Database } from 'lucide-react';
import LinkRefreshWrapper from '@/components/LinkRefreshWrapper';

interface PageProps {
    params: Promise<{ token: string }>;
}

export default async function LinkLandingPage({ params }: PageProps) {
    const { token } = await params;

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
            <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
                <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-4 shadow-sm">
                    <ShieldAlert className="h-12 w-12 text-red-500 mx-auto" />
                    <h1 className="text-xl font-bold text-slate-950 dark:text-slate-50">Link Expired or Not Found</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                        This transfer link does not exist, has expired, or has reached its download limit. Please contact the sender to request a new link.
                    </p>
                </div>
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
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const showDownloads = link.type === 'send' || link.type === 'share';
    const showUploads = link.type === 'receive' || link.type === 'share';

    return (
        <LinkRefreshWrapper>
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6">
                <div className="max-w-4xl mx-auto space-y-8">

                    {/* Header Metadata */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-950 dark:text-slate-50 capitalize">
                                {link.type === 'send' ? 'File Download' : link.type === 'receive' ? 'Upload Request' : 'Shared Folder'}
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                                {link.type === 'send'
                                    ? 'The sender shared files for you to download.'
                                    : link.type === 'receive'
                                        ? 'The sender is requesting files from you.'
                                        : 'You can upload files and download shared files.'}
                            </p>
                        </div>

                        <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-4 md:pt-0 md:border-none">
                            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                                <Calendar className="h-3.5 w-3.5" />
                                <span>Expires: {new Date(link.availableTo).toLocaleDateString()}</span>
                            </div>
                            {showUploads && (
                                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                                    <Database className="h-3.5 w-3.5" />
                                    <span>Quota: {formatBytes(link.availableBytesToUpload)} of {formatBytes(link.maxBytesToUpload)}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                        {/* File Download View (send / share) */}
                        {showDownloads && (
                            <div className={`space-y-4 ${showUploads ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <FileIcon className="h-5 w-5 text-slate-400" />
                                    Shared Files ({files.length})
                                </h2>

                                {files.length === 0 ? (
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center">
                                        <p className="text-sm text-slate-500">No files uploaded yet.</p>
                                    </div>
                                ) : (
                                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm divide-y divide-slate-100 dark:divide-slate-800">
                                        {files.map((file) => (
                                            <div key={file.id} className="p-4 flex items-center justify-between gap-4">
                                                <div className="min-w-0 flex items-center gap-3">
                                                    <FileIcon className="h-8 w-8 text-blue-500 shrink-0" />
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                                            {file.originalName}
                                                        </p>
                                                        <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                                                    </div>
                                                </div>
                                                {/* Action Buttons */}
                                                <div className="shrink-0 flex items-center gap-2">
                                                    {/\.(jpe?g|png|gif|webp|svg|mp4|webm|mov|mp3|wav|ogg|pdf|txt)$/i.test(file.originalName) && (
                                                        <a
                                                            href={`/api/download/${file.id}?token=${token}&inline=true`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            title="Preview file in browser"
                                                            className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-2.5 py-1.5 rounded-lg text-xs font-medium transition"
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                            <span>Preview</span>
                                                        </a>
                                                    )}
                                                    <a
                                                        href={`/api/download/${file.id}?token=${token}`}
                                                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition shadow-sm"
                                                    >
                                                        <Download className="h-3.5 w-3.5" />
                                                        <span>Download</span>
                                                    </a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* File Upload View (receive / share) */}
                        {showUploads && (
                            <div className={`space-y-4 ${showDownloads ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    <UploadCloud className="h-5 w-5 text-slate-400" />
                                    Upload Files
                                </h2>
                                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
                                    {/* File Uploader component */}
                                    <FileUploader
                                        linkToken={token}
                                        collectionId={link.contentCollectionId.toString()}
                                        availableBytesToUpload={link.availableBytesToUpload}
                                    />
                                </div>
                            </div>
                        )}

                    </div>

                </div>
            </div>
        </LinkRefreshWrapper>
    );
}