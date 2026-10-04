import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useContacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('name', { ascending: true });
    if (error) console.error('Failed to load contacts:', error);
    setContacts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { contacts, loading, refetch };
}
