import { useEffect } from 'react';
import { useMutable } from './useMutable.js';

export function useLatestValue(value) {
  const cell = useMutable(value);
  useEffect(() => { cell.set(value); }, [value]);
  return cell;
}
