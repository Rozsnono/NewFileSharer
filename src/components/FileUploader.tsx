'use client';

import React, { useState, useRef } from 'react';
import { Upload, File as FileIcon, X, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

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

// 3.5MB chunk size: fits safely within Vercel's 4.5MB payload limit while maximizing transfer speed
const CHUNK_SIZE = Math.floor(3.5 * 1024 * 1024);
const UPLOAD_API_KEY = process.env.NEXT_PUBLIC_UPLOAD_API_KEY || '';

/**
 * Resolves the upload endpoint safely.
 * If running in a browser over HTTPS and the configured URL is unencrypted HTTP,
 * automatically routes through the same-origin /api/storage proxy to prevent (blocked:mixed-content).
 */
function resolveUploadApiUrl(): string {
    const configured = (process.env.NEXT_PUBLIC_UPLOAD_API_URL || '').trim();
    if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
        if (!configured || configured.startsWith('http://')) {
            return '/api/storage';
        }
    }
    return configured || '/api/storage';
}

export default function FileUploader({
    linkToken,
    collectionId,
    availableBytesToUpload,
    onUploadSuccess,
}: FileUploaderProps) {
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
        const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
        const targetPath = `/uploads/${collectionId}`;

        // Check local upload limit
        if (file.size > availableBytesToUpload) {
            updateFileStatus(clientFileId, {
                status: 'error',
                errorMessage: 'File size exceeds available storage quota.',
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
                body: JSON.stringify({
                    filename: file.name,
                    totalChunks,
                    chunkSize: CHUNK_SIZE,
                    targetPath,
                }),
            });

            if (!startResponse.ok) {
                const startData = await startResponse.json().catch(() => ({}));
                throw new Error(startData.message || startData.error || `Upload start failed (${startResponse.status})`);
            }

            const startData = await startResponse.json();
            remoteUploadId = startData.uploadId;

            // 2. Upload Chunks sequentially with retry mechanism
            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                const start = chunkIndex * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, file.size);
                const chunkBlob = file.slice(start, end);

                const formData = new FormData();
                formData.append('file', chunkBlob, file.name);
                formData.append('uploadId', remoteUploadId!);
                formData.append('chunkIndex', chunkIndex.toString());
                formData.append('totalChunks', totalChunks.toString());
                formData.append('filename', file.name);

                let chunkUploaded = false;
                let chunkError = '';

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
                    throw new Error(`Failed uploading chunk ${chunkIndex + 1}/${totalChunks}: ${chunkError}`);
                }

                // Progress calculated smoothly up to 90%
                const percent = Math.round(((chunkIndex + 1) / totalChunks) * 90);
                updateFileStatus(clientFileId, { progress: percent });
            }

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
            const destinationPath = finishData.destination || `${targetPath}/${file.name}`;

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
        <div className="w-full max-w-xl mx-auto space-y-6">
            {/* Dropzone Area */}
            <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors duration-200 ${
                    dragActive
                        ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-900'
                }`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileInput}
                />
                <Upload className="h-10 w-10 text-slate-400 mb-3" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 text-center">
                    Drag and drop your files here, or <span className="text-blue-500 underline">browse</span>
                </p>
                <p className="text-xs text-slate-500 mt-1 text-center">
                    Files are uploaded directly to fast storage. Max limit per file: {formatBytes(availableBytesToUpload)}.
                </p>
            </div>

            {/* File List / Progress Tracking */}
            {files.length > 0 && (
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 bg-white dark:bg-slate-950 divide-y divide-slate-100 dark:divide-slate-900">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">Upload Queue</h3>
                    <div className="space-y-4 pt-3">
                        {files.map((file) => (
                            <div key={file.id} className="space-y-2">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-2">
                                        <FileIcon className="h-5 w-5 text-slate-400 shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 line-clamp-1">
                                                {file.name}
                                            </p>
                                            <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                                        </div>
                                    </div>

                                    {/* Status Indicator / Actions */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {file.status === 'uploading' && (
                                            <span className="text-xs text-blue-500 flex items-center gap-1">
                                                <Loader2 className="h-3 w-3 animate-spin" /> Uploading {file.progress}%
                                            </span>
                                        )}
                                        {file.status === 'finalizing' && (
                                            <span className="text-xs text-yellow-600 flex items-center gap-1">
                                                <Loader2 className="h-3 w-3 animate-spin" /> Finalizing on WebDAV...
                                            </span>
                                        )}
                                        {file.status === 'completed' && (
                                            <span className="text-xs text-emerald-600 flex items-center gap-1 font-medium">
                                                <CheckCircle2 className="h-4 w-4" /> Ready
                                            </span>
                                        )}
                                        {file.status === 'error' && (
                                            <span className="text-xs text-red-500 flex items-center gap-1 font-medium">
                                                <AlertCircle className="h-4 w-4" /> Error
                                            </span>
                                        )}

                                        <button
                                            onClick={() => removeFileRecord(file.id)}
                                            disabled={file.status === 'uploading' || file.status === 'finalizing'}
                                            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded disabled:opacity-50"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Progress bar */}
                                {file.status !== 'idle' && (
                                    <div className="space-y-1">
                                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                            <div
                                                style={{ width: `${file.progress}%` }}
                                                className={`h-full transition-all duration-300 rounded-full ${
                                                    file.status === 'error'
                                                        ? 'bg-red-500'
                                                        : file.status === 'finalizing'
                                                            ? 'bg-yellow-500'
                                                            : file.status === 'completed'
                                                                ? 'bg-emerald-500'
                                                                : 'bg-blue-500'
                                                }`}
                                            />
                                        </div>
                                        {file.errorMessage && (
                                            <p className="text-xs text-red-500 mt-1">{file.errorMessage}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}