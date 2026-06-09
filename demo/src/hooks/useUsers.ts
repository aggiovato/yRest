import { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { useAppContext } from '../context/AppContext';
import type { User } from '../types';

export function useUsers() {
  const { state } = useAppContext();
  const [users, setUsers] = useState<Map<number, User>>(new Map());

  useEffect(() => {
    if (!state.connected) return;
    fetchApi('GET', '/users').then(r => {
      if (Array.isArray(r.data)) {
        const map = new Map<number, User>();
        for (const u of r.data as User[]) map.set(u.id, u);
        setUsers(map);
      }
    });
  }, [state.connected]);

  return users;
}
