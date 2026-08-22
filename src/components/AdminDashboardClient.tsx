'use client';

import React, { useState, useEffect } from 'react';
import { 
  Link2, Files, Terminal, LogOut, Trash2, Calendar, FileText, 
  ChevronDown, ChevronRight, Copy, Check, Plus, Clock, Eye, EyeOff 
} from 'lucide-react';

type Tab = 'links' | 'collections' | 'logs';

export default function AdminDashboardClient() {
  const [activeTab, setActiveTab] = useState<Tab>('links');
  const [links, setLinks] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [logLevel, setLogLevel] = useState('all');
  const [loading, setLoading] = useState(true);

  // Expanded collection tracking
  const [expandedCol, setExpandedCol] = useState<Record<string, boolean>>({});

  // Form State for creating links
  const [showCreateLink, setShowCreateLink] = useState(false);
  const [formData, setFormData] = useState({
    type: 'send',
    contentCollectionId: '',
    availableDownloads: '',
    maxBytesToUploadGB: '5',
    availableTo: '',
  });

  // Modal display for plain text tokens on creation
  const [generatedTokenModal, setGeneratedTokenModal] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // States for Collection Public/Privacy Settings
  const [showPublicModal, setShowPublicModal] = useState(false);
  const [selectedColForPublic, setSelectedColForPublic] = useState<any>(null);
  const [publicForm, setPublicForm] = useState({
    isPublic: false,
    publicExpiresAt: '',
  });

  useEffect(() => {
    fetchData();
  }, [activeTab, logLevel]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'links') {
        const res = await fetch('/api/admin/links');
        const data = await res.json();
        setLinks(data);
      } else if (activeTab === 'collections') {
        const res = await fetch('/api/admin/collections');
        const data = await res.json();
        setCollections(data);
      } else if (activeTab === 'logs') {
        const res = await fetch(`/api/admin/logs?level=${logLevel}`);
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error('Failed to load dashboard telemetries:', err);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    window.location.reload();
  };

  const handleDeleteLink = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sharing link?')) return;
    await fetch(`/api/admin/links?id=${id}`, { method: 'DELETE' });
    fetchData();
  };

  const handleCreateLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const maxBytes = parseFloat(formData.maxBytesToUploadGB) * 1024 * 1024 * 1024;
    
    try {
      const res = await fetch('/api/admin/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: formData.type,
          contentCollectionId: formData.contentCollectionId || null,
          availableDownloads: formData.availableDownloads ? parseInt(formData.availableDownloads, 10) : null,
          maxBytesToUpload: maxBytes,
          availableTo: formData.availableTo,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setGeneratedTokenModal(data.plainToken);
      setShowCreateLink(false);
      setFormData({
        type: 'send',
        contentCollectionId: '',
        availableDownloads: '',
        maxBytesToUploadGB: '5',
        availableTo: '',
      });
      fetchData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleUpdatePublicSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/collections/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedColForPublic.id,
          isPublic: publicForm.isPublic,
          publicExpiresAt: publicForm.isPublic ? publicForm.publicExpiresAt : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update privacy configurations');

      setShowPublicModal(false);
      fetchData();
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const copyToClipboard = (text: string) => {
    const shareUrl = `${window.location.origin}/l/${text}`;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-12">
      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between shadow-sm">
        <h1 className="text-lg font-bold tracking-tight">WeTransfer Storage Core Admin</h1>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg text-xs font-semibold transition"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </header>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 mt-8">
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('links')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
              activeTab === 'links'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Link2 className="h-4 w-4" /> Links
          </button>
          <button
            onClick={() => setActiveTab('collections')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
              activeTab === 'collections'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Files className="h-4 w-4" /> File Manager
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition ${
              activeTab === 'logs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Terminal className="h-4 w-4" /> System Logs
          </button>
        </div>

        {/* Tab Contents */}
        <div className="mt-6">
          {loading ? (
            <div className="py-24 text-center text-slate-500 text-sm">Loading telemetry...</div>
          ) : (
            <>
              {/* TAB 1: LINKS */}
              {activeTab === 'links' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold">Transfer Links</h2>
                    <button
                      onClick={() => setShowCreateLink(true)}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition"
                    >
                      <Plus className="h-4 w-4" /> Generate New Link
                    </button>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase font-semibold">
                        <tr>
                          <th className="px-6 py-3">Collection Name</th>
                          <th className="px-6 py-3">Link Type</th>
                          <th className="px-6 py-3">Downloads Allowed</th>
                          <th className="px-6 py-3">Max Upload Size</th>
                          <th className="px-6 py-3">Expiration Date</th>
                          <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {links.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No links active.</td>
                          </tr>
                        ) : (
                          links.map((link) => (
                            <tr key={link._id}>
                              <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-200">
                                {link.contentCollectionId?.name || 'Collection Deleted'}
                              </td>
                              <td className="px-6 py-4 capitalize">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  link.type === 'send' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20' :
                                  link.type === 'receive' ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/20' :
                                  'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20'
                                }`}>
                                  {link.type}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                {link.availableDownloads === null ? 'Infinite' : link.availableDownloads}
                              </td>
                              <td className="px-6 py-4">{formatBytes(link.maxBytesToUpload)}</td>
                              <td className="px-6 py-4">{new Date(link.availableTo).toLocaleDateString()}</td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => handleDeleteLink(link._id)}
                                  className="text-red-500 hover:text-red-700 transition"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 2: FILE MANAGER */}
              {activeTab === 'collections' && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold">Remote Folder Manager</h2>
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 shadow-sm">
                    {collections.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs">No local collections present.</div>
                    ) : (
                      collections.map((col) => (
                        <div key={col.id} className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => setExpandedCol(prev => ({ ...prev, [col.id]: !prev[col.id] }))}
                              className="flex items-center gap-2 text-sm font-semibold hover:text-blue-500 transition"
                            >
                              {expandedCol[col.id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              {col.name} ({col.files.length} Files)
                              {col.isPublic && (
                                <span className="ml-2 text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1">
                                  <Eye className="h-3 w-3" /> Public Active
                                </span>
                              )}
                            </button>
                            
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setSelectedColForPublic(col);
                                  setPublicForm({
                                    isPublic: col.isPublic,
                                    publicExpiresAt: col.publicExpiresAt ? col.publicExpiresAt.split('T')[0] : '',
                                  });
                                  setShowPublicModal(true);
                                }}
                                className="text-xs border border-slate-200 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1"
                              >
                                {col.isPublic ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                Privacy Settings
                              </button>
                              <button
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, contentCollectionId: col.id }));
                                  setShowCreateLink(true);
                                }}
                                className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-lg font-semibold transition"
                              >
                                Share Collection
                              </button>
                            </div>
                          </div>

                          {expandedCol[col.id] && (
                            <div className="pl-6 space-y-2 border-l-2 border-slate-100 dark:border-slate-800 pt-2">
                              {col.files.length === 0 ? (
                                <p className="text-xs text-slate-500">Folder is currently empty.</p>
                              ) : (
                                col.files.map((file: any) => (
                                  <div key={file.id} className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400 py-1">
                                    <div className="flex items-center gap-1.5">
                                      <FileText className="h-3.5 w-3.5 text-slate-400" />
                                      <span>{file.originalName}</span>
                                    </div>
                                    <span>{formatBytes(file.size)}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: LOGS */}
              {activeTab === 'logs' && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-lg font-bold">System Telemetry Logs</h2>
                    <select
                      value={logLevel}
                      onChange={(e) => setLogLevel(e.target.value)}
                      className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs px-3 py-1.5 focus:outline-none"
                    >
                      <option value="all">All Levels</option>
                      <option value="info">Info</option>
                      <option value="warning">Warnings</option>
                      <option value="error">Errors</option>
                    </select>
                  </div>

                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 uppercase font-semibold">
                        <tr>
                          <th className="px-6 py-3 w-40">Timestamp</th>
                          <th className="px-6 py-3 w-28">Severity</th>
                          <th className="px-6 py-3">Message</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {logs.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="px-6 py-8 text-center text-slate-500">No logs generated.</td>
                          </tr>
                        ) : (
                          logs.map((log) => (
                            <tr key={log._id}>
                              <td className="px-6 py-4 text-slate-500">
                                {new Date(log.createdAt).toLocaleString()}
                              </td>
                              <td className="px-6 py-4 font-bold">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                                  log.level === 'error' ? 'bg-red-50 text-red-700 dark:bg-red-950/20' :
                                  log.level === 'warning' ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/20' :
                                  'bg-blue-50 text-blue-700 dark:bg-blue-950/20'
                                }`}>
                                  {log.level}
                                </span>
                              </td>
                              <td className="px-6 py-4">{log.message}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* CREATE LINK DIALOG / MODAL */}
      {showCreateLink && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-md font-bold">Generate Sharing Link</h3>
            <form onSubmit={handleCreateLinkSubmit} className="space-y-4 text-sm">
              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-semibold">Permission Action Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-950"
                >
                  <option value="send">Send (Download Only)</option>
                  <option value="receive">Receive (Upload Only)</option>
                  <option value="share">Share (Two-Way Folder)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-semibold">Associated Collection</label>
                <select
                  value={formData.contentCollectionId}
                  onChange={(e) => setFormData(prev => ({ ...prev, contentCollectionId: e.target.value }))}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-950"
                >
                  <option value="">-- Create New Empty Folder --</option>
                  {collections.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-semibold">Quota Size Limit (GB)</label>
                  <input
                    type="number"
                    value={formData.maxBytesToUploadGB}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxBytesToUploadGB: e.target.value }))}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-950"
                    min="1"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-semibold">Max Downloads</label>
                  <input
                    type="number"
                    placeholder="Infinite"
                    value={formData.availableDownloads}
                    onChange={(e) => setFormData(prev => ({ ...prev, availableDownloads: e.target.value }))}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-950"
                    min="1"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-500 font-semibold">Expiration Date</label>
                <input
                  type="date"
                  value={formData.availableTo}
                  onChange={(e) => setFormData(prev => ({ ...prev, availableTo: e.target.value }))}
                  className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-950"
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateLink(false)}
                  className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GENERATED TOKEN ONCE MODAL */}
      {generatedTokenModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-md w-full space-y-4">
            <h3 className="text-md font-bold text-slate-900 dark:text-slate-50">Share Link Generated Successfully</h3>
            <p className="text-xs text-red-500 font-medium">
              Important: This is the only time you will ever be shown this link. Ensure you copy it before closing this dialog.
            </p>
            <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-800 rounded-lg p-3 bg-slate-50 dark:bg-slate-950">
              <span className="text-xs font-mono select-all line-clamp-1 truncate w-full">
                {`${window.location.origin}/l/${generatedTokenModal}`}
              </span>
              <button
                onClick={() => copyToClipboard(generatedTokenModal)}
                className="shrink-0 p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
                title="Copy Link URL"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <button
              onClick={() => setGeneratedTokenModal(null)}
              className="w-full text-xs bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition"
            >
              Done / Copied
            </button>
          </div>
        </div>
      )}

      {/* PRIVACY / PUBLIC CONFIGURATION MODAL */}
      {showPublicModal && selectedColForPublic && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 max-w-sm w-full space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
              <Eye className="h-5 w-5 text-blue-500" />
              <h3 className="text-md font-bold">Public Privacy Settings</h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Enable public visibility to display this folder and its files directly on the public root home page (<span className="font-mono">/</span>) without link tokens.
            </p>
            <form onSubmit={handleUpdatePublicSettings} className="space-y-4 text-sm">
              <div className="flex items-center justify-between border-y border-slate-100 dark:border-slate-800 py-3">
                <label className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Enable Public Visibility</label>
                <input
                  type="checkbox"
                  checked={publicForm.isPublic}
                  onChange={(e) => setPublicForm(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                />
              </div>

              {publicForm.isPublic && (
                <div className="space-y-1 animate-fadeIn">
                  <label className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-slate-400" /> Public Expiration Date
                  </label>
                  <input
                    type="date"
                    value={publicForm.publicExpiresAt}
                    onChange={(e) => setPublicForm(prev => ({ ...prev, publicExpiresAt: e.target.value }))}
                    className="w-full border border-slate-300 dark:border-slate-700 rounded-lg p-2 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-[10px] text-slate-400">Visibility reverts to private on this date.</p>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowPublicModal(false)}
                  className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}