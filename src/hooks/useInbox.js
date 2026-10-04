import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

// Documents waiting for review (scans and invoices sent by suppliers).
export function useInbox(businessId) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!businessId) return;
    const { data, error } = await supabase
      .from('inbox_documents')
      .select('*')
      .eq('business_id', businessId)
      .neq('state', 'reviewed')
      .order('created_at', { ascending: false });
    if (error) console.error('Failed to load inbox:', error);
    setDocs(data || []);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { setLoading(true); refetch(); }, [refetch]);

  // New supplier invoices can arrive while the page is open.
  useEffect(() => {
    const t = setInterval(refetch, 20000);
    return () => clearInterval(t);
  }, [refetch]);

  return { docs, loading, refetch };
}
