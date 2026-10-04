import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// All of the user's messages (RLS only returns their own threads),
// refreshed every 15 seconds so replies show up without a reload.
export function useMessages() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1000);
    if (error) console.error('Failed to load messages:', error);
    setMessages(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
    const t = setInterval(refetch, 15000);
    return () => clearInterval(t);
  }, [refetch]);

  async function markRead(contactId) {
    const stamp = new Date().toISOString();
    setMessages((prev) => prev.map((m) => (m.contact_id === contactId && m.sender === 'them' && !m.read_at ? { ...m, read_at: stamp } : m)));
    await supabase
      .from('messages')
      .update({ read_at: stamp })
      .eq('contact_id', contactId)
      .eq('sender', 'them')
      .is('read_at', null);
  }

  return { messages, loading, refetch, markRead };
}
