import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { api } from '../lib/api';

export function useExpenses(businessId) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('business_id', businessId)
      .order('expense_date', { ascending: false });
    if (error) console.error('Failed to load expenses:', error);
    setExpenses(data || []);
    setLoading(false);
  }, [businessId]);

  useEffect(() => { refetch(); }, [refetch]);

  async function createExpense(fields) {
    const { data, error } = await supabase
      .from('expenses')
      .insert({ business_id: businessId, ...fields })
      .select()
      .single();
    if (error) throw error;
    setExpenses((prev) => [data, ...prev].sort((a, b) => (a.expense_date < b.expense_date ? 1 : -1)));
    return data;
  }

  async function deleteExpense(id) {
    await api.deleteExpense(id); // server also removes our stored copy of the receipt
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  return { expenses, loading, refetch, createExpense, deleteExpense };
}
