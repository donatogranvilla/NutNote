import React, { createContext, useContext, useState, useEffect } from 'react';
import { usersApi } from '../lib/api';

export interface UserData {
  id: string;
  displayName: string;
  avatarColor: string;
  role: 'admin' | 'user';
  teamId?: string | null;
  teamName?: string | null;
  teamColor?: string | null;
  createdAt: string;
}

interface UserContextType {
  activeUser: UserData | null;
  setActiveUser: (user: UserData | null) => Promise<void>;
  login: (id: string, password: string) => Promise<UserData>;
  logout: () => Promise<void>;
  refreshActiveUser: () => Promise<void>;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [activeUser, setActiveUserState] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshActiveUser = async () => {
    try {
      const user = await usersApi.getActive();
      setActiveUserState(user);
    } catch (err) {
      console.error('Failed to refresh active user:', err);
    }
  };

  useEffect(() => {
    const savedUserId = localStorage.getItem('nutnote_active_user_id') || localStorage.getItem('nution_active_user_id');
    if (savedUserId) {
      usersApi.setActive(savedUserId)
        .then(() => usersApi.getActive())
        .then((user) => {
          setActiveUserState(user);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (id: string, password: string): Promise<UserData> => {
    const user = await usersApi.authenticate(id, password);
    localStorage.setItem('nutnote_active_user_id', user.id);
    setActiveUserState(user);
    return user;
  };

  const logout = async () => {
    await usersApi.setActive('');
    localStorage.removeItem('nutnote_active_user_id');
    localStorage.removeItem('nution_active_user_id');
    setActiveUserState(null);
  };

  const setActiveUser = async (user: UserData | null) => {
    if (user) {
      await usersApi.setActive(user.id);
      localStorage.setItem('nutnote_active_user_id', user.id);
      setActiveUserState(user);
    } else {
      await logout();
    }
  };

  return (
    <UserContext.Provider value={{ activeUser, setActiveUser, login, logout, refreshActiveUser, isLoading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
