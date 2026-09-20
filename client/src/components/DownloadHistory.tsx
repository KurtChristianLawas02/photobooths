import { useEffect, useState } from 'react';
import { ArrowLeft, Download, ImageIcon, LogOut } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../utils/supabase';

type DownloadRecord = {
  id: string;
  file_name: string;
  public_url: string;
  format: 'jpeg' | 'png';
  print_size: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
};

type DownloadHistoryProps = { session: Session; onLogout: () => void };

export function DownloadHistory({ session, onLogout }: DownloadHistoryProps) {
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    const loadDownloads = async () => {
      const result = await supabase
        .from('photo_downloads')
        .select('id,file_name,public_url,format,print_size,width,height,created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(40);
      if (!current) return;
      if (result.error) setError(result.error.message);
      else setDownloads((result.data ?? []) as DownloadRecord[]);
      setLoading(false);
    };
    void loadDownloads();
    return () => { current = false; };
  }, [session.user.id]);

  return <main className="downloads-shell"><header className="downloads-header"><div><p className="eyebrow">Your studio archive</p><h1>Recent downloads</h1><p>Layouts you saved from your photobooth sessions.</p></div><div className="downloads-actions"><button type="button" className="secondary-button" onClick={() => window.location.assign('/')}><ArrowLeft size={17} /> Back to booth</button><button type="button" className="icon-button" onClick={onLogout} aria-label="Sign out"><LogOut size={18} /></button></div></header>{loading ? <div className="admin-loading">Loading your downloads...</div> : error ? <div className="admin-state"><h2>Downloads unavailable</h2><p>{error}</p></div> : downloads.length === 0 ? <section className="downloads-empty"><ImageIcon size={30} /><h2>No downloads yet</h2><p>When you download a finished layout, it will appear here.</p><button type="button" className="primary-button" onClick={() => window.location.assign('/')}>Create a layout</button></section> : <section className="downloads-grid">{downloads.map((download) => <article className="download-card" key={download.id}><a href={download.public_url} target="_blank" rel="noreferrer"><img src={download.public_url} alt={download.file_name} /></a><div className="download-card-copy"><div><strong>{download.print_size ?? 'Photobooth layout'}</strong><small>{new Date(download.created_at).toLocaleString()}</small></div><a className="download-link" href={download.public_url} download={download.file_name} aria-label={`Download ${download.file_name}`}><Download size={17} /></a></div></article>)}</section>}</main>;
}
