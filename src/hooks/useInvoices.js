import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useInvoices(businessId) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('business_id', businessId)
      .order('due_date', { ascending: true });
    if (error) console.error('Failed to load invoices:', error);
    setInvoices(data || []);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { refetch(); }, [refetch]);

  async function createInvoice(fields) {
    const { data, error } = await supabase
      .from('invoices')
      .insert({ business_id: businessId, ...fields })
      .select()
      .single();
    if (error) throw error;
    setInvoices((prev) => [...prev, data]);
    return data;
  }

  async function updateInvoice(id, patch) {
    const { data, error } = await supabase
      .from('invoices')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    setInvoices((prev) => prev.map((inv) => (inv.id === id ? data : inv)));
    return data;
  }

  async function deleteInvoice(id) {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) throw error;
    setInvoices((prev) => prev.filter((inv) => inv.id !== id));
  }

  return { invoices, loading, refetch, createInvoice, updateInvoice, deleteInvoice };
}
