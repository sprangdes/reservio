export type RequestGeneration = Readonly<{ generation: number; signal: AbortSignal }>;

export function createRequestGuard() {
  let controller: AbortController | null = null;
  let generation = 0;
  let disposed = false;

  return {
    begin(): RequestGeneration {
      controller?.abort();
      controller = new AbortController();
      generation += 1;
      return { generation, signal: controller.signal };
    },
    isCurrent(request: RequestGeneration): boolean {
      return !disposed && request.generation === generation && !request.signal.aborted;
    },
    abort(): void {
      controller?.abort();
      controller = null;
      generation += 1;
    },
    dispose(): void {
      disposed = true;
      controller?.abort();
      controller = null;
      generation += 1;
    }
  };
}

export function isIntentionalAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}
