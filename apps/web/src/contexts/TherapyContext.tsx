import React, { createContext, useContext, useState, useEffect } from 'react';

interface SessionData {
  id: string;
  date: Date;
  duration: number;
  pattern: string;
  emotionalData?: any;
  notes?: string;
}

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
    // Load sessions from localStorage
    const storedSessions = localStorage.getItem('therapy_sessions');
    if (storedSessions) {
      setSessions(JSON.parse(storedSessions));
    }
  }, []);

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
      localStorage.setItem('therapy_sessions', JSON.stringify(updatedSessions));
      
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