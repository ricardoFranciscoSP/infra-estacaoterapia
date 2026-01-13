"use client";
import { User } from '@/hooks/user/userHook';
import React, { createContext, useContext, ReactNode } from 'react';

interface UserContextType {
  user: User | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ user: User | null; children: ReactNode }> = ({ user, children }) => {
  return (
    <UserContext.Provider value={{ user }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    // Em vez de lançar erro, retorna um objeto vazio para permitir fallbacks
    console.warn('useUser was called outside UserProvider, returning empty context');
    return { user: null };
  }
  return context;
};
