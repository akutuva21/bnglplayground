import type {
  BNGLModel,
  SimulationOptions,
  SimulationResults,
  WorkerRequest,
  WorkerResponse,
} from '../types';

const extractErrorMessage = (payload: unknown): string => {
  if (payload instanceof Error) {
    return payload.message;
  }
  if (typeof payload === 'string') {
    return payload;
  }
  if (payload && typeof payload === 'object') {
    if ('message' in payload && typeof (payload as { message?: unknown }).message === 'string') {
      return (payload as { message: string }).message;
    }
    try {
      return JSON.stringify(payload);
    } catch {
      // fall through to default
    }
  }
  return 'Worker error';
};

class BnglService {
  private worker: Worker;
  private messageId = 0;
  private promises = new Map<number, { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }>();
  private terminated = false;

  constructor() {
    // Vite needs the URL construction inline so it treats this import as a worker entry.
    this.worker = new Worker(new URL('./bnglWorker.ts', import.meta.url), { type: 'module' });

    this.worker.addEventListener('message', (event: MessageEvent<WorkerResponse>) => {
      const { id, type, payload } = event.data ?? {};

      if (id === -1 && type === 'worker_internal_error') {
        const detail = extractErrorMessage(payload);
        const location =
          payload && typeof payload === 'object'
            ? `${(payload as { filename?: string }).filename ?? 'unknown'}:${(payload as { lineno?: number }).lineno ?? '?'}:${(payload as { colno?: number }).colno ?? '?'}`
            : 'unknown:?';
        const stack =
          payload && typeof payload === 'object' && 'stack' in payload && typeof (payload as { stack?: unknown }).stack === 'string'
            ? (payload as { stack: string }).stack
            : undefined;
        if (stack) {
          console.error(`[Worker] ${detail} (${location})\n${stack}`);
        } else {
          console.error(`[Worker] ${detail} (${location})`);
        }
        return;
      }

      if (typeof id !== 'number' || !this.promises.has(id)) {
        console.warn('[BnglService] Received response for unknown message id:', event.data);
        return;
      }

      const { resolve, reject } = this.promises.get(id)!;
      this.promises.delete(id);

      if (typeof type === 'string' && type.endsWith('_success')) {
        resolve(payload);
      } else {
        reject(new Error(extractErrorMessage(payload)));
      }
    });

    this.worker.addEventListener('error', (event) => {
      const baseMessage = event.message || (event.error && event.error.message) || 'unknown error';
      const details = `Worker error: ${baseMessage} at ${event.filename ?? 'unknown file'}:${event.lineno ?? '?'}:${event.colno ?? '?'}`;
      if (event.error && event.error.stack) {
        console.error(details, '\n', event.error.stack);
      } else {
        console.error(details, event);
      }
      this.rejectAllPending(details);
    });

    this.worker.addEventListener('messageerror', (event) => {
      console.error('[BnglService] Worker failed to deserialize message:', event.data);
      this.rejectAllPending('Worker posted an unserializable message');
    });
  }

  private rejectAllPending(message: string) {
    const err = new Error(message);
    this.promises.forEach(({ reject }) => reject(err));
    this.promises.clear();
  }

  private postMessage<T>(type: WorkerRequest['type'], payload: WorkerRequest['payload']): Promise<T> {
    if (this.terminated) {
      return Promise.reject(new Error('Worker has been terminated'));
    }
    const id = this.messageId++;
    return new Promise<T>((resolve, reject) => {
      this.promises.set(id, { resolve, reject });
      const request: WorkerRequest = { id, type, payload };
      this.worker.postMessage(request);
    });
  }

  public terminate(reason?: string) {
    if (this.terminated) return;
    this.terminated = true;
    try {
      this.worker.terminate();
    } catch (error) {
      console.warn('[BnglService] Error terminating worker', error);
    }
    this.rejectAllPending(reason ?? 'Worker terminated');
  }

  public cancelAllPending(reason?: string) {
    const err = new Error(reason ?? 'Requests cancelled');
    this.promises.forEach(({ reject }) => reject(err));
    this.promises.clear();
  }

  public parse(code: string): Promise<BNGLModel> {
    return this.postMessage<BNGLModel>('parse', code);
  }

  public simulate(model: BNGLModel, options: SimulationOptions): Promise<SimulationResults> {
    return this.postMessage<SimulationResults>('simulate', { model, options });
  }
}

export const bnglService = new BnglService();
