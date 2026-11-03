import React from 'react';

/** Color classes per file-type group (tile background + text). */
const GROUPS: { match: RegExp; classes: string }[] = [
    { match: /^(pdf)$/i, classes: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300' },
    { match: /^(png|jpe?g|gif|webp|svg|bmp)$/i, classes: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
    { match: /^(docx?|txt|rtf|odt|log)$/i, classes: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' },
    { match: /^(zip|rar|7z|tar|gz|msi|exe|apk)$/i, classes: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
    { match: /^(mp4|webm|mov|mkv|mp3|wav|ogg)$/i, classes: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
];
const FALLBACK = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300';

/** Small square tile showing the file extension, colored by type. */
export default function FileTile({ name, size = 40 }: { name: string; size?: number }) {
    const ext = name.includes('.') ? name.split('.').pop()!.slice(0, 4).toUpperCase() : 'FILE';
    const classes = GROUPS.find((g) => g.match.test(ext))?.classes ?? FALLBACK;

    return (
        <span
            aria-hidden="true"
            style={{ width: size, height: size }}
            className={`flex shrink-0 items-center justify-center rounded-[10px] text-[11px] font-bold ${classes}`}
        >
            {ext}
        </span>
    );
}

/** Finder-style blue folder icon. Width in px; the height follows the 64:52 aspect ratio. */
export function FolderIcon({ size = 64 }: { size?: number }) {
    return (
        <svg width={size} height={Math.round((size * 52) / 64)} viewBox="0 0 64 52" aria-hidden="true" focusable="false">
            <path d="M4,8 Q4,4 8,4 L24,4 L30,10 L56,10 Q60,10 60,14 L60,44 Q60,48 56,48 L8,48 Q4,48 4,44 Z" fill="#4FA3F0" />
            <path d="M4,18 Q4,14 8,14 L56,14 Q60,14 60,18 L60,44 Q60,48 56,48 L8,48 Q4,48 4,44 Z" fill="#7CC4FB" />
        </svg>
    );
}

/** Label color of the file page icon, by extension group (hex, same groups as FileTile). */
function labelColor(ext: string): string {
    if (/^(pdf)$/i.test(ext)) return '#DC2626';
    if (/^(png|jpe?g|gif|webp|svg|bmp)$/i.test(ext)) return '#2563EB';
    if (/^(docx?|txt|rtf|odt|log)$/i.test(ext)) return '#16A34A';
    if (/^(zip|rar|7z|tar|gz|msi|exe|apk)$/i.test(ext)) return '#D97706';
    if (/^(mp4|webm|mov|mkv|mp3|wav|ogg)$/i.test(ext)) return '#7C3AED';
    return '#64748B';
}

/** Finder-style document icon (page with folded corner and a colored extension label). */
export function FilePageIcon({ name, size = 56 }: { name: string; size?: number }) {
    const ext = name.includes('.') ? name.split('.').pop()!.slice(0, 4).toUpperCase() : 'FILE';
    return (
        <svg width={Math.round((size * 48) / 60)} height={size} viewBox="0 0 48 60" aria-hidden="true" focusable="false">
            <path d="M6,4 Q6,2 8,2 L30,2 L42,14 L42,56 Q42,58 40,58 L8,58 Q6,58 6,56 Z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1.5" />
            <path d="M30,2 L30,12 Q30,14 32,14 L42,14 Z" fill="#E2E8F0" />
            <rect x="10" y="36" width="28" height="14" rx="3" fill={labelColor(ext)} />
            <text x="24" y="46.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="#FFFFFF" fontFamily="Inter, system-ui, sans-serif">
                {ext}
            </text>
        </svg>
    );
}
