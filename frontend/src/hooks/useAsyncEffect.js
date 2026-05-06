import { useEffect } from 'react';

export function useAsyncEffect(asyncFn, deps) {
  useEffect(() => {
    asyncFn();
  }, deps);
}
