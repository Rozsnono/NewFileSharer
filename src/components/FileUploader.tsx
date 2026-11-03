'use client';

import React, { useState, useRef } from 'react';
import { Upload, File as FileIcon, X, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';

interface FileUploaderProps {
    linkToken: string;
    collectionId: string;
    availableBytesToUpload: number;
    onUploadSuccess?: () => void;
}

interface UploadingFile {
    id: string;
    name: string;
    size: number;
    progress: number;
    status: 'idle' | 'uploading' | 'finalizing' | 'completed' | 'error';
    errorMessage?: string;
}

// Fallback chunk size (20MB), used only when the Storage API does not return a size
// recommendation. Normally the API's adaptive chunking decides (recommendedChunkSize at
// /upload/start, then nextChunkSize after every chunk), clamped to its min/maxChunkSize.
const FALLBACK_CHUNK_SIZE = 20 * 1024 * 1024;
const UPLOAD_API_KEY = process.env.NEXT_PUBLIC_UPLOAD_API_KEY || '';

/**
 * Resolves the upload endpoint.
 * Points directly to the high-performance Synology NAS HTTPS endpoint.
 */
function resolveUploadApiUrl(): string {
    let configured = (process.env.NEXT_PUBLIC_UPLOAD_API_URL || '').trim();
    if (!configured) {
        configured = 'https://api.filesharer.rozsnorbert.hu:9443';
    }
    // Upgrade http:// to https:// when on an HTTPS page
    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && configured.startsWith('http://')) {
        configured = configured.replace(/^http:\/\//, 'https://');
    }
    return configured;
}

export default function FileUploader({
    linkToken,
    collectionId,
    availableBytesToUpload,
    onUploadSuccess,
}: FileUploaderProps) {
    const { t } = useI18n();
    const [dragActive, setDragActive] = useState(false);
    const [files, setFiles] = useState<UploadingFile[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const generateFileId = () => {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            addFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            addFiles(Array.from(e.target.files));
        }
    };

    const addFiles = (selectedFiles: File[]) => {
        const newFiles: UploadingFile[] = selectedFiles.map((file) => ({
            id: generateFileId(),
            name: file.name,
            size: file.size,
            progress: 0,
            status: 'idle',
        }));

        setFiles((prev) => [...prev, ...newFiles]);

        // Process files sequentially or in parallel
        selectedFiles.forEach((file, index) => {
            uploadFile(file, newFiles[index].id);
        });
    };

    const uploadFile = async (file: File, clientFileId: string) => {
        // Relative path: the Storage API places it under its upload root (and under the folder
        // of a folder-bound API key). Absolute paths must already be inside that root.
        const targetPath = `uploads/${collectionId}`;

        // Check local upload limit
        if (file.size > availableBytesToUpload) {
            updateFileStatus(clientFileId, {
                status: 'error',
                errorMessage: t('quotaExceeded'),
            });
            return;
        }

        updateFileStatus(clientFileId, { status: 'uploading', progress: 0 });

        const uploadApiUrl = resolveUploadApiUrl();
        let remoteUploadId: string | null = null;

        try {
            // 1. Start Upload Session on the dedicated Upload API (or same-origin proxy on HTTPS)
            const startResponse = await fetch(`${uploadApiUrl}/upload/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': UPLOAD_API_KEY,
                },
                // fileSize enables the API's size-based (adaptive) chunk recommendation.
                // The final chunk count is only known at the end, so none is announced here.
                body: JSON.stringify({
                    filename: file.name,
                    fileSize: file.size,
                    targetPath,
                }),
            });

            if (!startResponse.ok) {
                const startData = await startResponse.json().catch(() => ({}));
                throw new Error(startData.message || startData.error || `Upload start failed (${startResponse.status})`);
            }

            const startData = await startResponse.json();
            remoteUploadId = startData.uploadId;

            const minChunkSize: number = startData.minChunkSize || 1024 * 1024;
            const maxChunkSize: number = startData.maxChunkSize || FALLBACK_CHUNK_SIZE;
            const clampChunkSize = (size: number) => Math.min(Math.max(size, minChunkSize), maxChunkSize);

            let chunkSize = clampChunkSize(startData.recommendedChunkSize || FALLBACK_CHUNK_SIZE);
            let offset = 0;
            let totalChunks = 0;

            // 2. Upload chunks sequentially (adaptive size) with retry mechanism.
            // `do…while` so an empty file still sends one (empty) chunk, as before.
            do {
                const chunkIndex = totalChunks;
                const end = Math.min(offset + chunkSize, file.size);
                const chunkBlob = file.slice(offset, end);

                const formData = new FormData();
                formData.append('file', chunkBlob, file.name);
                formData.append('uploadId', remoteUploadId!);
                formData.append('chunkIndex', chunkIndex.toString());
                formData.append('filename', file.name);

                let chunkUploaded = false;
                let chunkError = '';
                let nextChunkSize: number | undefined;

                // Try uploading chunk up to 3 times
                for (let attempt = 1; attempt <= 3; attempt++) {
                    try {
                        const chunkResponse = await fetch(`${uploadApiUrl}/upload/chunk`, {
                            method: 'POST',
                            headers: {
                                'x-api-key': UPLOAD_API_KEY,
                            },
                            body: formData,
                        });

                        if (chunkResponse.ok) {
                            // The API suggests the size of the next chunk based on measured speed.
                            const chunkData = await chunkResponse.json().catch(() => ({}));
                            nextChunkSize = chunkData.nextChunkSize;
                            chunkUploaded = true;
                            break;
                        } else {
                            const errData = await chunkResponse.json().catch(() => ({}));
                            chunkError = errData.message || errData.error || `HTTP ${chunkResponse.status}`;
                        }
                    } catch (netErr) {
                        chunkError = (netErr as Error).message;
                    }

                    // Exponential wait before retrying chunk
                    if (attempt < 3) {
                        await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
                    }
                }

                if (!chunkUploaded) {
                    throw new Error(`Failed uploading chunk ${chunkIndex + 1}: ${chunkError}`);
                }

                offset = end;
                totalChunks += 1;
                if (nextChunkSize) {
                    chunkSize = clampChunkSize(nextChunkSize);
                }

                // Progress (by bytes) calculated smoothly up to 90%
                const percent = file.size > 0 ? Math.round((offset / file.size) * 90) : 90;
                updateFileStatus(clientFileId, { progress: percent });
            } while (offset < file.size);

            // 3. Finalize & Stream Merge on WebDAV
            updateFileStatus(clientFileId, { status: 'finalizing', progress: 95 });

            const finishResponse = await fetch(`${uploadApiUrl}/upload/finish`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': UPLOAD_API_KEY,
                },
                body: JSON.stringify({
                    uploadId: remoteUploadId,
                    totalChunks,
                    filename: file.name,
                    targetPath,
                }),
            });

            if (!finishResponse.ok) {
                const finishData = await finishResponse.json().catch(() => ({}));
                throw new Error(finishData.message || finishData.error || `Finalize merge failed (${finishResponse.status})`);
            }

            const finishData = await finishResponse.json();
            const destinationPath = finishData.destination || `/${targetPath}/${file.name}`;

            // 4. Record file metadata in Next.js MongoDB & deduct quota
            const recordResponse = await fetch('/api/upload/record', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    linkToken,
                    originalName: file.name,
                    mimeType: file.type || 'application/octet-stream',
                    totalSize: file.size,
                    webdavPath: destinationPath,
                }),
            });

            if (!recordResponse.ok) {
                const recordData = await recordResponse.json().catch(() => ({}));
                throw new Error(recordData.error || 'Failed saving metadata to database');
            }

            updateFileStatus(clientFileId, { status: 'completed', progress: 100 });

            if (onUploadSuccess) {
                onUploadSuccess();
            }
        } catch (error) {
            const err = error as Error;

            // Trigger remote abort & cleanup if upload session was created
            if (remoteUploadId) {
                fetch(`${uploadApiUrl}/upload/failed`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-api-key': UPLOAD_API_KEY,
                    },
                    body: JSON.stringify({
                        uploadId: remoteUploadId,
                        filename: file.name,
                    }),
                }).catch(() => {});
            }

            updateFileStatus(clientFileId, {
                status: 'error',
                errorMessage: err.message,
            });
        }
    };

    const updateFileStatus = (id: string, updates: Partial<UploadingFile>) => {
        setFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, ...updates } : f))
        );
    };

    const removeFileRecord = (id: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== id));
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="w-full space-y-5">
            {/* Dropzone area */}
            <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex cursor-pointer flex-col items-center justify-center rounded-[14px] border-2 border-dashed px-4 py-8 text-center transition-colors duration-200 ${
                    dragActive
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30'
                        : 'border-blue-300 bg-blue-50/40 hover:bg-blue-50 dark:border-blue-900 dark:bg-slate-900/50 dark:hover:bg-slate-900'
                }`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileInput}
                />
                <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-[14px] bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    <Upload className="h-6 w-6" aria-hidden="true" />
                </span>
                <p className="text-[15px] font-semibold text-slate-800 dark:text-slate-200">
                    {t('dropText')} <span className="text-blue-600 underline dark:text-blue-400">{t('browse')}</span>
                </p>
                <p className="mt-1 text-sm text-slate-500">
                    {t('uploadHint', { max: formatBytes(availableBytesToUpload) })}
                </p>
            </div>

            {/* File list / progress tracking */}
            {files.length > 0 && (
                <div className="space-y-1">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t('uploadQueue')}</h3>
                    <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                        {files.map((file) => (
                            <li key={file.id} className="space-y-2 py-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-2.5">
                                        <FileIcon className="h-5 w-5 shrink-0 text-slate-400" aria-hidden="true" />
                                        <div className="min-w-0">
                                            <p className="truncate text-[15px] font-semibold">{file.name}</p>
                                            <p className="text-sm text-slate-500">{formatBytes(file.size)}</p>
                                        </div>
                                    </div>

                                    {/* Status indicator / actions */}
                                    <div className="flex shrink-0 items-center gap-1">
                                        {file.status === 'uploading' && (
                                            <span className="badge badge-info">
                                                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> {t('uploading', { p: file.progress })}
                                            </span>
                                        )}
                                        {file.status === 'finalizing' && (
                                            <span className="badge badge-warning">
                                                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> {t('finalizing')}
                                            </span>
                                        )}
                                        {file.status === 'completed' && (
                                            <span className="badge badge-success">
                                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> {t('ready')}
                                            </span>
                                        )}
                                        {file.status === 'error' && (
                                            <span className="badge badge-danger">
                                                <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" /> {t('errorLabel')}
                                            </span>
                                        )}

                                        <button
                                            onClick={() => removeFileRecord(file.id)}
                                            disabled={file.status === 'uploading' || file.status === 'finalizing'}
                                            aria-label={t('remove')}
                                            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                        >
                                            <X className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                {file.status !== 'idle' && (
                                    <div className="space-y-1">
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                                            <div
                                                style={{ width: `${file.progress}%` }}
                                                className={`h-full rounded-full transition-all duration-300 ${
                                                    file.status === 'error'
                                                        ? 'bg-red-500'
                                                        : file.status === 'finalizing'
                                                            ? 'bg-amber-500'
                                                            : file.status === 'completed'
                                                                ? 'bg-green-600'
                                                                : 'bg-blue-600'
                                                }`}
                                            />
                                        </div>
                                        {file.errorMessage && (
                                            <p role="alert" className="text-sm text-red-600 dark:text-red-400">{file.errorMessage}</p>
                                        )}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
