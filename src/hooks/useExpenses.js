import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

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

  async function deleteExpense(id) {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  return { expenses, loading, refetch, deleteExpense };
}
