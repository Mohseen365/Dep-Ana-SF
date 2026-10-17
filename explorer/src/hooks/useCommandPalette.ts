import { useState, useEffect, useCallback } from "react";

export interface CommandItem {
  id: string;
  label: string;
  category?: string;
  shortcut?: string[];
  disabled?: boolean;
  run: () => void;
}

export interface UseCommandPaletteReturn {
  isOpen: boolean;
  query: string;
  setQuery: (query: string) => void;
  open: () => void;
  close: () => void;
  toggle: () => void;
  commands: CommandItem[];
  registerCommand: (cmd: CommandItem) => void;
  unregisterCommand: (id: string) => void;
  runCommand: (id: string) => boolean;
}

export function useCommandPalette(initialCommands: CommandItem[] = []): UseCommandPaletteReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [commands, setCommands] = useState<CommandItem[]>(initialCommands);

  const registerCommand = useCallback((cmd: CommandItem) => {
    setCommands((prev) => {
      const idx = prev.findIndex((c) => c.id === cmd.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = cmd;
        return next;
      }
      return [...prev, cmd];
    });
  }, []);

  const unregisterCommand = useCallback((id: string) => {
    setCommands((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const runCommand = useCallback(
    (id: string) => {
      const cmd = commands.find((c) => c.id === id);
      if (cmd && !cmd.disabled) {
        cmd.run();
        setIsOpen(false);
        setQuery("");
        return true;
      }
      return false;
    },
    [commands]
  );

  const setQueryMemo = useCallback((q: string) => {
    setQuery(q);
  }, []);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      if (prev) {
        setQuery("");
        return false;
      }
      return true;
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        toggle();
      } else if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        close();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggle, close, isOpen]);

  return {
    isOpen,
    query,
    setQuery: setQueryMemo,
    open,
    close,
    toggle,
    commands,
    registerCommand,
    unregisterCommand,
    runCommand,
  };
}
