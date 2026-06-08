'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { z } from 'zod';

const STORAGE_KEY = 'therapy_sessions';
const STORAGE_VERSION = 1;

const sessionSchema = z.object({
  id: z.string(),
  date: z.coerce.date(),
  duration: z.number().nonnegative(),
  pattern: z.string(),
  emotionalData: z.unknown().optional(),
  notes: z.string().optional(),
});

const storedShapeSchema = z.object({
  version: z.number(),
  sessions: z.array(sessionSchema),
});

type SessionData = z.infer<typeof sessionSchema>;

interface TherapyContextType {
  currentSession: SessionData | null;
  sessions: SessionData[];
  isSessionActive: boolean;
  startSession: (pattern: string) => void;
  endSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  getSessions: () => SessionData[];
  getSessionById: (id: string) => SessionData | undefined;
}

const TherapyContext = createContext<TherapyContextType | undefined>(undefined);

export const useTherapy = () => {
  const context = useContext(TherapyContext);
  if (!context) {
    throw new Error('useTherapy must be used within a TherapyProvider');
  }
  return context;
};

export const TherapyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSession, setCurrentSession] = useState<SessionData | null>(null);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      // Backward compat: ранее хранился голый массив sessions
      const candidate = Array.isArray(parsed)
        ? { version: 0, sessions: parsed }
        : parsed;
      const result = storedShapeSchema.safeParse(candidate);
      if (result.success) {
        setSessions(result.data.sessions);
        if (result.data.version !== STORAGE_VERSION) {
          persist(result.data.sessions);
        }
      } else {
        console.warn('[TherapyContext] Invalid stored sessions, clearing', result.error);
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.warn('[TherapyContext] Failed to parse stored sessions, clearing', err);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const persist = (list: SessionData[]) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ version: STORAGE_VERSION, sessions: list }),
      );
    } catch (err) {
      console.warn('[TherapyContext] Failed to persist sessions', err);
    }
  };

  const startSession = (pattern: string) => {
    const newSession: SessionData = {
      id: Date.now().toString(),
      date: new Date(),
      duration: 0,
      pattern
    };
    setCurrentSession(newSession);
    setIsSessionActive(true);
    setSessionStartTime(new Date());
  };

  const endSession = () => {
    if (currentSession && sessionStartTime) {
      const duration = Math.floor((Date.now() - sessionStartTime.getTime()) / 1000);
      const completedSession = {
        ...currentSession,
        duration
      };

      const updatedSessions = [...sessions, completedSession];
      setSessions(updatedSessions);
      persist(updatedSessions);

      setCurrentSession(null);
      setIsSessionActive(false);
      setSessionStartTime(null);
    }
  };

  const pauseSession = () => {
    setIsSessionActive(false);
  };

  const resumeSession = () => {
    setIsSessionActive(true);
  };

  const getSessions = () => sessions;

  const getSessionById = (id: string) => {
    return sessions.find(session => session.id === id);
  };

  return (
    <TherapyContext.Provider
      value={{
        currentSession,
        sessions,
        isSessionActive,
        startSession,
        endSession,
        pauseSession,
        resumeSession,
        getSessions,
        getSessionById
      }}
    >
      {children}
    </TherapyContext.Provider>
  );
};
