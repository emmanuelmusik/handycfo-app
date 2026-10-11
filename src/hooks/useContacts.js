import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { readCache, writeCache } from '../lib/offlineCache';

export function useContacts() {
  const [contacts, setContacts] = useState(() => readCache('contacts')?.data || []);
  const [loading, setLoading] = useState(() => !readCache('contacts'));

  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('name', { ascending: true });
    if (error) {
      console.error('Failed to load contacts:', error);
      if (!readCache('contacts')) setContacts([]);
    } else {
      setContacts(data || []);
      writeCache('contacts', data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { contacts, loading, refetch };
}
