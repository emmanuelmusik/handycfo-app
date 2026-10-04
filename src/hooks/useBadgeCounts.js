import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Numbers shown on the Inbox and Messages tabs.
export function useBadgeCounts(businessId, refreshKey) {
  const [counts, setCounts] = useState({ inbox: 0, messages: 0 });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [inbox, unread] = await Promise.all([
        businessId
          ? supabase.from('inbox_documents').select('id', { count: 'exact', head: true }).eq('business_id', businessId).eq('state', 'ready')
          : Promise.resolve({ count: 0 }),
        supabase.from('messages').select('id', { count: 'exact', head: true }).eq('sender', 'them').is('read_at', null),
      ]);
      if (!cancelled) setCounts({ inbox: inbox.count || 0, messages: unread.count || 0 });
    }
    load();
    const t = setInterval(load, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, [businessId, refreshKey]);

  return counts;
}
