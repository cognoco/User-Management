import { useState, useEffect, ReactNode } from 'react';

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
    setError(null);
    try {
      // Replace with real API when available
      const res = await fetch('/api/admin/dashboard', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to fetch');
      // Map any server data to items if needed; keep empty for now
      setItems([]);
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch items');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleCreate = async (title: string, description: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await fetch('/api/items', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description }) });
      await fetchItems();
      setIsEditing(false);
    } catch (e: any) {
      setError(e?.message || 'Failed to create item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (id: string, title: string, description: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await fetch(`/api/items/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description }) });
      await fetchItems();
      setIsEditing(false);
      setCurrentItem(null);
    } catch (e: any) {
      setError(e?.message || 'Failed to update item');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await fetch(`/api/items/${id}`, { method: 'DELETE' });
      await fetchItems();
    } catch (e: any) {
      setError(e?.message || 'Failed to delete item');
    } finally {
      setIsLoading(false);
    }
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
