import { useEffect, useMemo, useState } from 'react';
import { BarChart3, ChevronRight, LayoutDashboard, LogOut, Menu, Palette, Save, Settings, ShieldCheck, Users, X } from 'lucide-react';
import { PRINT_SIZES, type Orientation, type PrintSizeId } from '@photobooth/shared';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';
import type { SettingsState } from '../types';

type Role = 'user' | 'admin' | 'super_admin';
type Profile = { id: string; email: string; full_name: string | null; role: Role; created_at: string; updated_at: string };
type UserRow = Profile & { last_activity: string | null };
type Stats = { users: number; sessions: number; photos: number; downloads: number; todayUsers: number; todaySessions: number; todayPhotos: number; todayDownloads: number };
type ActivityRow = { created_at: string; status: string; download_count: number; print_count: number };
type AdminTemplate = { id: string; name: string; description: string | null; print_size: PrintSizeId; physical_width: number; physical_height: number; width_pixels: number; height_pixels: number; dpi: 300 | 600; orientation: Orientation; aspect_ratio: string; background: string; accent_color: string; slots: Array<{ id: string; type: 'photo'; x: number; y: number; width: number; height: number; fit: 'cover' }>; active: boolean };

type AdminDashboardProps = { session: Session; onLogout: () => void };

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'templates', label: 'Templates & styles', icon: Palette },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const defaultSettings: SettingsState = {
  businessName: 'Studio Booth', countdownDuration: 3, mirrorCamera: false, outputFormat: 'jpeg', photoQuality: 95,
  enableQr: true, autoReturnSeconds: 20, primaryColor: '#d5c28b', secondaryColor: '#8db3a2', defaultPrintSize: '4x6',
  defaultOrientation: 'portrait', dpi: 300, enablePng: true, enabledPrintSizes: ['2x6', '4x6', '5x7', '6x8'],
};

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

async function countRows(table: string, filter?: { column: string; value: string }) {
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  if (filter) query = query.gte(filter.column, filter.value);
  const result = await query;
  if (result.error) throw result.error;
  return result.count ?? 0;
}

export function AdminDashboard({ session, onLogout }: AdminDashboardProps) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);
  const [activeView, setActiveView] = useState(window.location.pathname.split('/')[2] || 'dashboard');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let current = true;
    const loadAdminData = async () => {
      setLoading(true);
      setError(null);
      const profileResult = await supabase.from('profiles').select('id,email,full_name,role,created_at,updated_at').eq('id', session.user.id).maybeSingle();
      if (profileResult.error) {
        if (current) setError(profileResult.error.message);
        setLoading(false);
        return;
      }
      const currentProfile = profileResult.data as Profile | null;
      if (!currentProfile || !['admin', 'super_admin'].includes(currentProfile.role)) {
        window.location.replace('/');
        return;
      }
      const today = startOfToday();
      try {
        const [usersResult, usersCount, sessionsCount, photosCount, downloadsCount, todayUsers, todaySessions, todayPhotos, todayDownloads, sessionsResult, settingsResult] = await Promise.all([
          supabase.from('profiles').select('id,email,full_name,role,created_at,updated_at').order('created_at', { ascending: false }).limit(100),
          countRows('profiles'),
          countRows('photobooth_sessions'),
          countRows('photos'),
          countRows('photo_downloads'),
          countRows('profiles', { column: 'created_at', value: today }),
          countRows('photobooth_sessions', { column: 'created_at', value: today }),
          countRows('photos', { column: 'created_at', value: today }),
          countRows('photo_downloads', { column: 'created_at', value: today }),
          supabase.from('photobooth_sessions').select('created_at,status,download_count,print_count').order('created_at', { ascending: false }).limit(1000),
          supabase.from('app_settings').select('settings').eq('id', 'global').maybeSingle(),
        ]);
        if (usersResult.error) throw usersResult.error;
        if (sessionsResult.error) throw sessionsResult.error;
        if (settingsResult.error) throw settingsResult.error;
        if (!current) return;
        setProfile(currentProfile);
        setUsers((usersResult.data ?? []) as UserRow[]);
        setStats({ users: usersCount, sessions: sessionsCount, photos: photosCount, downloads: downloadsCount, todayUsers, todaySessions, todayPhotos, todayDownloads });
        setActivity((sessionsResult.data ?? []) as ActivityRow[]);
        if (settingsResult.data?.settings) setSettings({ ...defaultSettings, ...(settingsResult.data.settings as Partial<SettingsState>) });
      } catch (loadError) {
        const message = loadError instanceof Error
          ? loadError.message
          : loadError && typeof loadError === 'object' && 'message' in loadError
            ? String(loadError.message)
            : 'Could not load admin data.';
        if (current) setError(message);
      } finally {
        if (current) setLoading(false);
      }
    };
    void loadAdminData();
    return () => { current = false; };
  }, [session.user.id]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => [user.email, user.full_name ?? '', user.role].some((value) => value.toLowerCase().includes(query)));
  }, [search, users]);

  const navigate = (view: string) => {
    setActiveView(view);
    window.history.pushState({}, '', view === 'dashboard' ? '/admin' : `/admin/${view}`);
    setSidebarOpen(false);
  };

  if (loading) return <main className="admin-shell"><div className="admin-loading">Loading your admin workspace...</div></main>;
  if (error) return <main className="admin-shell"><div className="admin-state"><h1>Admin data unavailable</h1><p>{error}</p><button className="primary-button" onClick={() => window.location.reload()}>Retry</button></div></main>;
  if (!profile || !stats) return null;

  return (
    <main className="admin-shell">
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-brand"><span className="brand-mark"><img src="/logo.svg" alt="Studio Booth logo" /></span><div><strong>Studio Booth</strong><small>Admin workspace</small></div></div>
        <nav className="admin-nav" aria-label="Admin navigation">
          {navigation.map(({ id, label, icon: Icon }) => <button type="button" className={activeView === id ? 'active' : ''} key={id} onClick={() => navigate(id)}><Icon size={18} /><span>{label}</span><ChevronRight size={15} /></button>)}
        </nav>
        <div className="admin-sidebar-footer"><div className="admin-identity"><ShieldCheck size={18} /><span>{profile.full_name || profile.email}<small>{profile.role.replace('_', ' ')}</small></span></div><button type="button" className="admin-logout" onClick={onLogout}><LogOut size={16} /> Sign out</button></div>
      </aside>
      {sidebarOpen && <button type="button" className="admin-overlay" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} />}
      <section className="admin-content">
        <header className="admin-header"><button type="button" className="admin-menu" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}>{sidebarOpen ? <X size={20} /> : <Menu size={20} />}</button><div><p className="eyebrow">Private photo studio</p><h1>{activeView === 'users' ? 'Users' : activeView === 'analytics' ? 'Analytics' : activeView === 'templates' ? 'Templates & styles' : activeView === 'settings' ? 'Settings' : 'Good evening.'}</h1></div><span className="admin-date">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date())}</span></header>
        {activeView === 'users' ? <UsersView users={filteredUsers} search={search} onSearch={setSearch} /> : activeView === 'dashboard' ? <Overview stats={stats} users={users} /> : activeView === 'analytics' ? <AnalyticsView stats={stats} activity={activity} /> : activeView === 'templates' ? <TemplateManager /> : <SettingsView settings={settings} message={settingsMessage} onChange={setSettings} onSaved={setSettingsMessage} />}
      </section>
    </main>
  );
}

function Overview({ stats, users }: { stats: Stats; users: UserRow[] }) {
  const cards = [['Total users', stats.users], ['Sessions', stats.sessions], ['Photos created', stats.photos], ['Downloads', stats.downloads], ["Today's sessions", stats.todaySessions], ["Today's downloads", stats.todayDownloads]];
  return <div className="admin-view"><div className="admin-stat-grid">{cards.map(([label, value]) => <article className="admin-stat" key={label as string}><span>{label}</span><strong>{value}</strong><small>Live from Supabase</small></article>)}</div><div className="admin-panels"><section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow">Latest accounts</p><h2>New users</h2></div><span>{users.length} loaded</span></div>{users.length === 0 ? <div className="admin-empty">No users yet.</div> : <div className="admin-user-list">{users.slice(0, 5).map((user) => <div className="admin-user-row" key={user.id}><span className="user-avatar">{(user.full_name || user.email).slice(0, 1).toUpperCase()}</span><span><strong>{user.full_name || 'Unnamed user'}</strong><small>{user.email}</small></span><time>{new Date(user.created_at).toLocaleDateString()}</time></div>)}</div>}</section><section className="admin-panel admin-note-panel"><p className="eyebrow">System status</p><h2>Data-backed from day one.</h2><p>Dashboard totals are queried directly from Supabase and show empty states until the booth records sessions and photos.</p></section></div></div>;
}

function AnalyticsView({ stats, activity }: { stats: Stats; activity: ActivityRow[] }) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return { date, label: date.toLocaleDateString(undefined, { weekday: 'short' }), value: activity.filter((item) => item.created_at.slice(0, 10) === key).length };
  });
  const max = Math.max(...days.map((day) => day.value), 1);
  return <div className="admin-view"><div className="admin-analytics-summary"><article className="admin-panel"><span>Downloads</span><strong>{stats.downloads}</strong><small>All-time layouts saved</small></article><article className="admin-panel"><span>Prints</span><strong>{activity.reduce((total, item) => total + item.print_count, 0)}</strong><small>Recorded print actions</small></article><article className="admin-panel"><span>Sessions this week</span><strong>{days.reduce((total, day) => total + day.value, 0)}</strong><small>Last seven days</small></article></div><section className="admin-panel admin-chart-panel"><div className="admin-panel-heading"><div><p className="eyebrow">Session activity</p><h2>Last seven days</h2></div><span>Live from Supabase</span></div><div className="admin-chart">{days.map((day) => <div className="admin-chart-column" key={day.date.toISOString()}><strong>{day.value}</strong><div className="admin-chart-bar" style={{ height: `${Math.max((day.value / max) * 100, day.value ? 8 : 2)}%` }} /><span>{day.label}</span></div>)}</div></section></div>;
}

function SettingsView({ settings, message, onChange, onSaved }: { settings: SettingsState; message: string | null; onChange: (settings: SettingsState) => void; onSaved: (message: string | null) => void }) {
  const saveSettings = async () => {
    onSaved(null);
    const { error } = await supabase.from('app_settings').upsert({ id: 'global', settings, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    onSaved(error ? error.message : 'Settings saved.');
  };
  return <div className="admin-view"><section className="admin-panel admin-settings-panel"><div className="admin-panel-heading"><div><p className="eyebrow">Studio defaults</p><h2>Booth settings</h2></div><button type="button" className="primary-button" onClick={() => void saveSettings()}><Save size={17} /> Save settings</button></div><div className="admin-settings-grid"><label className="setting-field">Business name<input value={settings.businessName} onChange={(event) => onChange({ ...settings, businessName: event.target.value })} /></label><label className="setting-field">Default print size<select value={settings.defaultPrintSize} onChange={(event) => onChange({ ...settings, defaultPrintSize: event.target.value as SettingsState['defaultPrintSize'] })}><option value="2x6">2 × 6</option><option value="4x6">4 × 6</option><option value="5x7">5 × 7</option><option value="6x8">6 × 8</option></select></label><label className="setting-field">Default orientation<select value={settings.defaultOrientation} onChange={(event) => onChange({ ...settings, defaultOrientation: event.target.value as SettingsState['defaultOrientation'] })}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label><label className="setting-field">Countdown<select value={settings.countdownDuration} onChange={(event) => onChange({ ...settings, countdownDuration: Number(event.target.value) as SettingsState['countdownDuration'] })}><option value="0">No countdown</option><option value="3">3 seconds</option><option value="5">5 seconds</option><option value="10">10 seconds</option></select></label><label className="setting-field">Output format<select value={settings.outputFormat} onChange={(event) => onChange({ ...settings, outputFormat: event.target.value as SettingsState['outputFormat'] })}><option value="jpeg">JPEG</option><option value="png" disabled={!settings.enablePng}>PNG</option></select></label><label className="setting-field">JPEG quality<select value={settings.photoQuality} onChange={(event) => onChange({ ...settings, photoQuality: Number(event.target.value) })}><option value="80">80%</option><option value="90">90%</option><option value="95">95%</option><option value="100">100%</option></select></label></div><label className="setting-check"><input type="checkbox" checked={settings.enablePng} onChange={(event) => onChange({ ...settings, enablePng: event.target.checked })} /> Enable PNG export</label>{message && <p className="admin-save-message">{message}</p>}</section></div>;
}

function createTemplateSlots(width: number, height: number, photoCount: number): AdminTemplate['slots'] {
  const columns = photoCount > 2 ? 2 : 1;
  const rows = Math.ceil(photoCount / columns);
  const gap = Math.round(width * 0.03);
  const margin = Math.round(width * 0.08);
  const slotWidth = Math.floor((width - margin * 2 - gap * (columns - 1)) / columns);
  const slotHeight = Math.floor((height - margin * 2 - gap * (rows - 1)) / rows);
  return Array.from({ length: photoCount }, (_, index) => ({
    id: `slot-${index + 1}`,
    type: 'photo' as const,
    x: margin + (index % columns) * (slotWidth + gap),
    y: margin + Math.floor(index / columns) * (slotHeight + gap),
    width: slotWidth,
    height: slotHeight,
    fit: 'cover' as const,
  }));
}

function TemplateManager() {
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', printSize: '4x6' as PrintSizeId, orientation: 'portrait' as Orientation, requiredPhotos: 3, background: '#161411', accentColor: '#d5c28b' });

  const loadTemplates = async () => {
    const { data, error } = await supabase.from('templates').select('*').order('created_at', { ascending: false });
    if (error) setMessage(error.message);
    else setTemplates((data ?? []) as AdminTemplate[]);
  };

  useEffect(() => { void loadTemplates(); }, []);

  const addTemplate = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    setMessage(null);
    const size = PRINT_SIZES[form.printSize];
    const width = form.orientation === 'portrait' ? size.widthPixels : size.heightPixels;
    const height = form.orientation === 'portrait' ? size.heightPixels : size.widthPixels;
    const physicalWidth = form.orientation === 'portrait' ? size.widthInches : size.heightInches;
    const physicalHeight = form.orientation === 'portrait' ? size.heightInches : size.widthInches;
    const { error } = await supabase.from('templates').insert({
      id: `${form.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now()}`,
      name: form.name.trim(), description: form.description.trim() || null, print_size: form.printSize,
      physical_width: physicalWidth, physical_height: physicalHeight, width_pixels: width, height_pixels: height,
      dpi: 300, orientation: form.orientation, aspect_ratio: form.orientation === 'portrait' ? size.aspectRatio : `${size.heightInches}:${size.widthInches}`,
      background: form.background, accent_color: form.accentColor, slots: createTemplateSlots(width, height, form.requiredPhotos), active: true,
    });
    setSaving(false);
    if (error) setMessage(error.message);
    else { setMessage('Template added.'); setShowForm(false); setForm({ ...form, name: '', description: '' }); void loadTemplates(); }
  };

  return <div className="admin-view"><div className="admin-template-toolbar"><div><p className="eyebrow">Booth library</p><p className="admin-helper-text">Create reusable layouts and visual styles for new sessions.</p></div><button type="button" className="primary-button" onClick={() => setShowForm(!showForm)}><Palette size={17} /> {showForm ? 'Close form' : 'Add template / style'}</button></div>{showForm && <section className="admin-panel admin-template-form"><div className="admin-settings-grid"><label className="setting-field">Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Summer party" /></label><label className="setting-field">Print size<select value={form.printSize} onChange={(event) => setForm({ ...form, printSize: event.target.value as PrintSizeId })}>{Object.values(PRINT_SIZES).map((size) => <option key={size.id} value={size.id}>{size.label}</option>)}</select></label><label className="setting-field">Orientation<select value={form.orientation} onChange={(event) => setForm({ ...form, orientation: event.target.value as Orientation })}><option value="portrait">Portrait</option><option value="landscape">Landscape</option></select></label><label className="setting-field">Photo slots<select value={form.requiredPhotos} onChange={(event) => setForm({ ...form, requiredPhotos: Number(event.target.value) })}>{[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count} photo{count === 1 ? '' : 's'}</option>)}</select></label><label className="setting-field">Background color<input type="color" value={form.background} onChange={(event) => setForm({ ...form, background: event.target.value })} /></label><label className="setting-field">Accent color<input type="color" value={form.accentColor} onChange={(event) => setForm({ ...form, accentColor: event.target.value })} /></label><label className="setting-field admin-template-description">Description<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="A warm layout for evening events." /></label></div><button type="button" className="primary-button" disabled={saving || !form.name.trim()} onClick={() => void addTemplate()}><Save size={17} /> {saving ? 'Adding...' : 'Add template'}</button></section>}{message && <p className="admin-save-message">{message}</p>}<section className="admin-template-grid">{templates.map((template) => <article className="admin-template-card" key={template.id}><div className="admin-template-swatch" style={{ background: template.background, borderColor: template.accent_color }}><span style={{ color: template.accent_color }}>{template.name}</span></div><strong>{template.name}</strong><small>{template.print_size} · {template.orientation} · {template.slots.length} photos</small></article>)}</section>{templates.length === 0 && !message && <div className="admin-empty">No custom templates yet.</div>}</div>;
}

function UsersView({ users, search, onSearch }: { users: UserRow[]; search: string; onSearch: (value: string) => void }) {
  return <div className="admin-view"><div className="admin-toolbar"><label className="admin-search">Search users<input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Name, email, or role" /></label><span>{users.length} users</span></div><section className="admin-panel admin-table-panel">{users.length === 0 ? <div className="admin-empty">No users match this search.</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>User</th><th>Role</th><th>Registered</th><th>Last updated</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.full_name || 'Unnamed user'}</strong><small>{user.email}</small></td><td><span className={`role-pill role-${user.role}`}>{user.role.replace('_', ' ')}</span></td><td>{new Date(user.created_at).toLocaleDateString()}</td><td>{new Date(user.updated_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>}</section></div>;
}

