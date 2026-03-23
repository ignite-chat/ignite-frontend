import { useEffect } from 'react';

export function useMountEffect(callback: () => void | (() => void)) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(callback, []);
}
