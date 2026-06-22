import { useRef } from 'react';

export function useMutable(initial) {
  const ref = useRef(initial);
  return {
    get: () => ref.current,
    set: (next) => { ref.current = next; },
  };
}
