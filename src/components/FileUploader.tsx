'use client';

import React, { useState, useRef } from 'react';
import { Upload, File as FileIcon, X, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

interface FileUploaderProps {
    linkToken: string;
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

const CHUNK_SIZE = 3 * 1024 * 1024; // 3MB chunks (well under Vercel's 4.5MB limit)

export default function FileUploader({
    linkToken,
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
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
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

        // Sequentially process each file upload
        selectedFiles.forEach((file, index) => {
            uploadFileInChunks(file, newFiles[index].id);
        });
    };

    const uploadFileInChunks = async (file: File, uploadId: string) => {
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

        // Check local upload limit
        if (file.size > availableBytesToUpload) {
            updateFileStatus(uploadId, {
                status: 'error',
                errorMessage: 'File size exceeds available storage quota.',
            });
            return;
        }

        updateFileStatus(uploadId, { status: 'uploading', progress: 0 });

        try {
            // 1. Send Chunks sequentially
            for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
                const start = chunkIndex * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, file.size);
                const chunk = file.slice(start, end);

                const formData = new FormData();
                formData.append('linkToken', linkToken);
                formData.append('fileId', uploadId);
                formData.append('chunkIndex', chunkIndex.toString());
                formData.append('chunk', chunk, file.name);

                const response = await fetch('/api/upload/chunk', {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const resData = await response.json();
                    throw new Error(resData.error || `Failed uploading chunk ${chunkIndex + 1}/${totalChunks}`);
                }

                // Calculate progress based on chunk completion
                const percentComplete = Math.round(((chunkIndex + 1) / totalChunks) * 90); // Cap chunk progress at 90%
                updateFileStatus(uploadId, { progress: percentComplete });
            }

            // 2. Trigger Finalize & Merge on NAS
            updateFileStatus(uploadId, { status: 'finalizing', progress: 95 });

            const finalizeResponse = await fetch('/api/upload/finalize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    linkToken,
                    fileId: uploadId,
                    originalName: file.name,
                    mimeType: file.type || 'application/octet-stream',
                    totalSize: file.size,
                    totalChunks,
                }),
            });

            if (!finalizeResponse.ok) {
                const finalizeData = await finalizeResponse.json();
                throw new Error(finalizeData.error || 'Failed finalizing upload merge.');
            }

            updateFileStatus(uploadId, { status: 'completed', progress: 100 });

            if (onUploadSuccess) {
                onUploadSuccess();
            }
        } catch (error) {
            const err = error as Error;
            updateFileStatus(uploadId, {
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
                className={`relative flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 cursor-pointer transition-colors duration-200 ${dragActive
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
                    Files are secure and streamed straight to local storage. Max limit per file: {formatBytes(availableBytesToUpload)}.
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
                                                <Loader2 className="h-3 w-3 animate-spin" /> Finalizing on NAS...
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
                                                className={`h-full transition-all duration-300 rounded-full ${file.status === 'error'
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