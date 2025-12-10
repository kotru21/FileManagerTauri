import { useState, useCallback } from "react";

export interface DialogState<T = string | null> {
  isOpen: boolean;
  value: string;
  data: T;
}

export interface UseDialogStateReturn<T = string | null> {
  state: DialogState<T>;
  open: (data?: T, initialValue?: string) => void;
  close: () => void;
  setValue: (value: string) => void;
  setOpen: (isOpen: boolean) => void;
}

/**
 * Хук для управления состоянием диалога
 * Объединяет isOpen, value и дополнительные данные в одно состояние
 */
export function useDialogState<T = string | null>(
  defaultValue: string = ""
): UseDialogStateReturn<T> {
  const [state, setState] = useState<DialogState<T>>({
    isOpen: false,
    value: defaultValue,
    data: null as T,
  });

  const open = useCallback((data?: T, initialValue?: string) => {
    setState({
      isOpen: true,
      value: initialValue ?? "",
      data: data ?? (null as T),
    });
  }, []);

  const close = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  const setValue = useCallback((value: string) => {
    setState((prev) => ({
      ...prev,
      value,
    }));
  }, []);

  const setOpen = useCallback((isOpen: boolean) => {
    setState((prev) => ({
      ...prev,
      isOpen,
    }));
  }, []);

  return {
    state,
    open,
    close,
    setValue,
    setOpen,
  };
}
