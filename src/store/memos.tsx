import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type Priority = 'none' | 'mid' | 'high';

export type Memo = {
  id: string;
  text: string;
  createdAt: number;
  // Corkboard layout
  x: number; // 0..1 relative to board width
  y: number; // 0..1 relative to board height
  rotation: number; // -10..10 degrees
  seed: number; // for jagged edge shape
  priority: Priority;
};

type Ctx = {
  memos: Memo[];
  pin: (input: { text: string; seed: number }) => Memo;
  move: (id: string, x: number, y: number) => void;
  setPriority: (id: string, priority: Priority) => void;
  trash: (id: string) => void;
  undoTrash: () => void;
  canUndo: boolean;
  hydrated: boolean;
};

export function nextPriority(p: Priority): Priority {
  return p === 'none' ? 'mid' : p === 'mid' ? 'high' : 'none';
}

const MemoContext = createContext<Ctx | null>(null);

const STORAGE_KEY = 'memo-pad/memos/v1';

function randomPlacement(): Pick<Memo, 'x' | 'y' | 'rotation'> {
  return {
    x: 0.1 + Math.random() * 0.8,
    y: 0.1 + Math.random() * 0.75,
    rotation: (Math.random() - 0.5) * 8,
  };
}

const UNDO_WINDOW_MS = 5000;

export function MemoProvider({ children }: { children: React.ReactNode }) {
  const [memos, setMemos] = useState<Memo[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [trashed, setTrashed] = useState<Memo | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Memo[];
          setMemos(parsed.map((m) => ({ ...m, priority: m.priority ?? 'none' })));
        }
      } catch {}
      setHydrated(true);
    })();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(memos)).catch(() => {});
    }, 250);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [memos, hydrated]);

  const pin = useCallback((input: { text: string; seed: number }): Memo => {
    const memo: Memo = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      text: input.text,
      createdAt: Date.now(),
      seed: input.seed,
      priority: 'none',
      ...randomPlacement(),
    };
    setMemos((cur) => [...cur, memo]);
    return memo;
  }, []);

  const move = useCallback((id: string, x: number, y: number) => {
    setMemos((cur) => cur.map((m) => (m.id === id ? { ...m, x, y } : m)));
  }, []);

  const setPriority = useCallback((id: string, priority: Priority) => {
    setMemos((cur) => cur.map((m) => (m.id === id ? { ...m, priority } : m)));
  }, []);

  const trash = useCallback((id: string) => {
    setMemos((cur) => {
      const m = cur.find((x) => x.id === id) ?? null;
      if (m) {
        setTrashed(m);
        if (trashTimer.current) clearTimeout(trashTimer.current);
        trashTimer.current = setTimeout(() => setTrashed(null), UNDO_WINDOW_MS);
      }
      return cur.filter((x) => x.id !== id);
    });
  }, []);

  const undoTrash = useCallback(() => {
    setTrashed((prev) => {
      if (prev) {
        setMemos((cur) => [...cur, prev]);
        if (trashTimer.current) {
          clearTimeout(trashTimer.current);
          trashTimer.current = null;
        }
      }
      return null;
    });
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      memos,
      pin,
      move,
      setPriority,
      trash,
      undoTrash,
      canUndo: trashed !== null,
      hydrated,
    }),
    [memos, pin, move, setPriority, trash, undoTrash, trashed, hydrated]
  );

  return <MemoContext.Provider value={value}>{children}</MemoContext.Provider>;
}

export function useMemos(): Ctx {
  const ctx = useContext(MemoContext);
  if (!ctx) throw new Error('useMemos must be used within MemoProvider');
  return ctx;
}
