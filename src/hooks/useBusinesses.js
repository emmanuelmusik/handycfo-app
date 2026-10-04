import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './useAuth';

const AVATAR_PALETTE = ['#3FBF9C', '#E3A768', '#7FA8D9', '#C77DBE', '#D97C63', '#8FBF6A', '#B79ADB', '#5FB8B8'];

function initials(name) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '??';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function useBusinesses() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) console.error('Failed to load businesses:', error);
    setBusinesses(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { refetch(); }, [refetch]);

  async function createBusiness({ name, businessType }) {
    const color = AVATAR_PALETTE[businesses.length % AVATAR_PALETTE.length];
    const { data, error } = await supabase
      .from('businesses')
      .insert({ owner_id: user.id, name, business_type: businessType, short_code: initials(name), color })
      .select()
      .single();
    if (error) throw error;
    setBusinesses((prev) => [...prev, data]);
    return data;
  }

  async function deleteBusiness(id) {
    // Relies on ON DELETE CASCADE from businesses -> invoices/expenses/inbox_documents.
    const { error } = await supabase.from('businesses').delete().eq('id', id);
    if (error) throw error;
    setBusinesses((prev) => prev.filter((b) => b.id !== id));
  }

  return { businesses, loading, refetch, createBusiness, deleteBusiness };
}
