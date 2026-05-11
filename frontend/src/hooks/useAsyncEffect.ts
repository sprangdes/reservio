import React, { useEffect } from 'react';

export function useAsyncEffect(asyncFn: () => Promise<void> | void, deps: React.DependencyList) {
  useEffect(() => {
    void asyncFn();
  }, deps);
}
