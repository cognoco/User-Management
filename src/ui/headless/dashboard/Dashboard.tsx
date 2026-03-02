import { useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/database/supabase';

export interface Item {
  id: string;
  title: string;
  description: string;
}

export interface DashboardProps {
  children: (props: {
    items: Item[];
    currentItem: Item | null;
    isEditing: boolean;
    isLoading: boolean;
    error: string | null;
    setIsEditing: (value: boolean) => void;
    setCurrentItem: (item: Item | null) => void;
    fetchItems: () => Promise<void>;
    handleCreate: (title: string, description: string) => Promise<void>;
    handleUpdate: (id: string, title: string, description: string) => Promise<void>;
    handleDelete: (id: string) => Promise<void>;
  }) => ReactNode;
}

/**
 * Headless Dashboard component handling CRUD operations for items.
 * Provides state and actions via render props without UI.
 */
export function Dashboard({ children }: DashboardProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchItems = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('items').select('*').returns<Item[]>();
    if (error) {
      setError(error.message);
    } else {
      setItems(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = async (title: string, description: string) => {
    setIsLoading(true);
    setError(null);
    const { error } = await supabase
      .from('items')
      .insert([{ title, description }]);

    if (error) {
      setError(error.message);
    } else {
      await fetchItems();
      setIsEditing(false);
    }
    setIsLoading(false);
  };

  const handleUpdate = async (id: string, title: string, description: string) => {
    setIsLoading(true);
    setError(null);
    const { error } = await supabase
      .from('items')
      .update({ title, description })
      .eq('id', id);

    if (error) {
      setError(error.message);
    } else {
      await fetchItems();
      setIsEditing(false);
      setCurrentItem(null);
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    setError(null);
    const { error } = await supabase
      .from('items')
      .delete()
      .eq('id', id);

    if (error) {
      setError(error.message);
    } else {
      await fetchItems();
    }
    setIsLoading(false);
  };

  return (
    <>{children({
      items,
      currentItem,
      isEditing,
      isLoading,
      error,
      setIsEditing,
      setCurrentItem,
      fetchItems,
      handleCreate,
      handleUpdate,
      handleDelete,
    })}</>
  );
}

export default Dashboard;
