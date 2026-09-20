import { useEffect, useMemo, useState } from 'react';
import { BarChart3, ChevronRight, LayoutDashboard, LogOut, Menu, Settings, ShieldCheck, Users, X } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';

type Role = 'user' | 'admin' | 'super_admin';
type Profile = { id: string; email: string; full_name: string | null; role: Role; created_at: string; updated_at: string };
type UserRow = Profile & { last_activity: string | null };
type Stats = { users: number; sessions: number; photos: number; todayUsers: number; todaySessions: number; todayPhotos: number };

type AdminDashboardProps = { session: Session; onLogout: () => void };

const navigation = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

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
        const [usersResult, usersCount, sessionsCount, photosCount, todayUsers, todaySessions, todayPhotos] = await Promise.all([
          supabase.from('profiles').select('id,email,full_name,role,created_at,updated_at').order('created_at', { ascending: false }).limit(100),
          countRows('profiles'),
          countRows('photobooth_sessions'),
          countRows('photos'),
          countRows('profiles', { column: 'created_at', value: today }),
          countRows('photobooth_sessions', { column: 'created_at', value: today }),
          countRows('photos', { column: 'created_at', value: today }),
        ]);
        if (usersResult.error) throw usersResult.error;
        if (!current) return;
        setProfile(currentProfile);
        setUsers((usersResult.data ?? []) as UserRow[]);
        setStats({ users: usersCount, sessions: sessionsCount, photos: photosCount, todayUsers, todaySessions, todayPhotos });
      } catch (loadError) {
        if (current) setError(loadError instanceof Error ? loadError.message : 'Could not load admin data.');
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
        <header className="admin-header"><button type="button" className="admin-menu" aria-label="Open navigation" onClick={() => setSidebarOpen(true)}>{sidebarOpen ? <X size={20} /> : <Menu size={20} />}</button><div><p className="eyebrow">Private photo studio</p><h1>{activeView === 'users' ? 'Users' : activeView === 'analytics' ? 'Analytics' : activeView === 'settings' ? 'Settings' : 'Good evening.'}</h1></div><span className="admin-date">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date())}</span></header>
        {activeView === 'users' ? <UsersView users={filteredUsers} search={search} onSearch={setSearch} /> : activeView === 'dashboard' ? <Overview stats={stats} users={users} /> : <EmptyAdminView title={activeView === 'analytics' ? 'Analytics is ready for your data' : 'Settings'} description={activeView === 'analytics' ? 'Once sessions and photos are recorded, this view will show trends without inventing numbers.' : 'System controls will appear here as they are connected to the database.'} />}
      </section>
    </main>
  );
}

function Overview({ stats, users }: { stats: Stats; users: UserRow[] }) {
  const cards = [['Total users', stats.users], ['Sessions', stats.sessions], ['Photos created', stats.photos], ["Today's users", stats.todayUsers], ["Today's sessions", stats.todaySessions], ["Today's photos", stats.todayPhotos]];
  return <div className="admin-view"><div className="admin-stat-grid">{cards.map(([label, value]) => <article className="admin-stat" key={label as string}><span>{label}</span><strong>{value}</strong><small>Live from Supabase</small></article>)}</div><div className="admin-panels"><section className="admin-panel"><div className="admin-panel-heading"><div><p className="eyebrow">Latest accounts</p><h2>New users</h2></div><span>{users.length} loaded</span></div>{users.length === 0 ? <div className="admin-empty">No users yet.</div> : <div className="admin-user-list">{users.slice(0, 5).map((user) => <div className="admin-user-row" key={user.id}><span className="user-avatar">{(user.full_name || user.email).slice(0, 1).toUpperCase()}</span><span><strong>{user.full_name || 'Unnamed user'}</strong><small>{user.email}</small></span><time>{new Date(user.created_at).toLocaleDateString()}</time></div>)}</div>}</section><section className="admin-panel admin-note-panel"><p className="eyebrow">System status</p><h2>Data-backed from day one.</h2><p>Dashboard totals are queried directly from Supabase and show empty states until the booth records sessions and photos.</p></section></div></div>;
}

function UsersView({ users, search, onSearch }: { users: UserRow[]; search: string; onSearch: (value: string) => void }) {
  return <div className="admin-view"><div className="admin-toolbar"><label className="admin-search">Search users<input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Name, email, or role" /></label><span>{users.length} users</span></div><section className="admin-panel admin-table-panel">{users.length === 0 ? <div className="admin-empty">No users match this search.</div> : <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>User</th><th>Role</th><th>Registered</th><th>Last updated</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.full_name || 'Unnamed user'}</strong><small>{user.email}</small></td><td><span className={`role-pill role-${user.role}`}>{user.role.replace('_', ' ')}</span></td><td>{new Date(user.created_at).toLocaleDateString()}</td><td>{new Date(user.updated_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>}</section></div>;
}

function EmptyAdminView({ title, description }: { title: string; description: string }) {
  return <div className="admin-view"><section className="admin-panel admin-empty-view"><BarChart3 size={28} /><h2>{title}</h2><p>{description}</p></section></div>;
}
