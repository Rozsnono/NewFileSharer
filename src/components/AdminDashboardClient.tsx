'use client';

import React, { useState } from 'react';
import { FolderOpen, Link2, LogOut, Terminal } from 'lucide-react';
import FileManager from '@/components/FileManager';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import LinksPanel from '@/components/LinksPanel';
import LinkWizard from '@/components/LinkWizard';
import LogsPanel from '@/components/LogsPanel';
import TokenDialog from '@/components/TokenDialog';
import { useI18n } from '@/components/I18nProvider';

type Tab = 'links' | 'collections' | 'logs';

/**
 * Admin shell: sidebar navigation plus the three pages
 * - Links (cards), - Collections (file manager with visibility and link actions), - Logs.
 */
export default function AdminDashboardClient() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<Tab>('links');

  // Link wizard started from the Links page ("New link"); the file manager has its own wizard.
  const [showWizard, setShowWizard] = useState(false);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [linksReloadKey, setLinksReloadKey] = useState(0);

  // Collection to open when jumping from a link card to the file manager
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout request failed:', err);
    }
    window.location.reload();
  };

  const openCollection = (collectionId: string) => {
    setOpenFolderId(collectionId);
    setActiveTab('collections');
  };

  const navItems: { tab: Tab; label: string; icon: React.ReactNode }[] = [
    { tab: 'links', label: t('navLinks'), icon: <Link2 className="h-4 w-4" aria-hidden="true" /> },
    { tab: 'collections', label: t('navCollections'), icon: <FolderOpen className="h-4 w-4" aria-hidden="true" /> },
    { tab: 'logs', label: t('navLogs'), icon: <Terminal className="h-4 w-4" aria-hidden="true" /> },
  ];

  return (
    <div className="min-h-screen md:flex text-slate-900 dark:text-slate-100">
      {/* Sidebar (top bar on phones) */}
      <aside className="flex flex-col gap-3 border-b border-slate-200 bg-white p-3 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r md:p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between gap-3 md:px-2 md:pb-3">
          <div className="flex items-center gap-2.5 text-[15px] font-semibold">
            <span aria-hidden="true" className="h-7 w-7 rounded-[9px] bg-accent" />
            {t('appName')}
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <LanguageSwitcher />
            <button
              onClick={handleLogout}
              aria-label={t('logout')}
              title={t('logout')}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        <nav className="-mx-1 flex gap-1 overflow-x-auto px-1 md:mx-0 md:flex-col md:overflow-visible md:px-0">
          {navItems.map((item) => (
            <button
              key={item.tab}
              onClick={() => {
                if (item.tab === 'collections') setOpenFolderId(null);
                setActiveTab(item.tab);
              }}
              aria-current={activeTab === item.tab ? 'page' : undefined}
              className={`flex min-h-10 shrink-0 items-center gap-2.5 rounded-[10px] px-3 text-sm font-semibold transition ${
                activeTab === item.tab
                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        <div className="hidden md:mt-auto md:flex md:flex-col md:gap-2">
          <LanguageSwitcher />
          <button
            onClick={handleLogout}
            className="flex min-h-10 items-center gap-2.5 rounded-[10px] px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" /> {t('logout')}
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">
        {activeTab === 'links' && (
          <LinksPanel reloadKey={linksReloadKey} onNewLink={() => setShowWizard(true)} onOpenCollection={openCollection} />
        )}

        {activeTab === 'collections' && <FileManager key={openFolderId ?? 'root'} initialFolderId={openFolderId} />}

        {activeTab === 'logs' && <LogsPanel />}
      </main>

      {showWizard && (
        <LinkWizard
          onClose={() => setShowWizard(false)}
          onCreated={(token) => {
            setShowWizard(false);
            setCreatedToken(token);
            setLinksReloadKey((k) => k + 1);
          }}
        />
      )}

      {createdToken && <TokenDialog token={createdToken} onClose={() => setCreatedToken(null)} />}
    </div>
  );
}
