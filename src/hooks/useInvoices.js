import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { api } from '../lib/api';

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

  // Totals, numbering rules and checks all happen on the server.
  async function createInvoice(fields) {
    const res = await api.createInvoice({ businessId, ...fields });
    setInvoices((prev) => [...prev, res.invoice]);
    return res;
  }

  async function saveDraft(id, fields) {
    const res = await api.saveInvoice(id, fields);
    setInvoices((prev) => prev.map((inv) => (inv.id === id ? res.invoice : inv)));
    return res;
  }

  async function loadItems(id) {
    const { data, error } = await supabase
      .from('invoice_items').select('*').eq('invoice_id', id).order('position', { ascending: true });
    if (error) throw error;
    return data || [];
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

  return { invoices, loading, refetch, createInvoice, saveDraft, loadItems, updateInvoice, deleteInvoice };
}
