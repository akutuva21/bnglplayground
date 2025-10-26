import type {
  BNGLModel,
  SimulationOptions,
  SimulationResults,
  WorkerRequest,
  WorkerResponse,
  SerializedWorkerError,
} from '../types';

type RequestOptions = {
  timeoutMs?: number;
  signal?: AbortSignal;
  description?: string;
};

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  cleanup: () => void;
  description?: string;
};

const DEFAULT_TIMEOUT_MS = 30_000;

const extractErrorMessage = (payload: SerializedWorkerError | unknown): string => {
  if (payload && typeof payload === 'object' && 'message' in payload && typeof (payload as { message?: unknown }).message === 'string') {
    return (payload as { message: string }).message;
  }
  if (payload instanceof Error) {
    return payload.message;
  }
  if (typeof payload === 'string') {
    return payload;
  }
  try {
    return JSON.stringify(payload);
  } catch {
    return 'Worker error';
  }
};

const toError = (type: 'parse' | 'simulate', payload: SerializedWorkerError | unknown): Error => {
  if (payload && typeof payload === 'object') {
    const name = (payload as { name?: unknown }).name;
    const message = extractErrorMessage(payload) || `${type} failed`;
    if (name === 'AbortError') {
      return new DOMException(message || 'Operation cancelled', 'AbortError');
    }
    if (name === 'TimeoutError') {
      const error = new Error(message);
      error.name = 'TimeoutError';
      return error;
    }
  }

  const detail = extractErrorMessage(payload) || `${type} failed`;
  const error = new Error(detail);
  if (payload && typeof payload === 'object') {
    Object.assign(error, { cause: payload });
  }
  return error;
};

class BnglService {
  private worker: Worker;
  private messageId = 0;
  private promises = new Map<number, PendingRequest>();
  private terminated = false;
  private lastCachedModelId?: number;

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

      if (typeof id !== 'number') {
        console.warn('[BnglService] Received response without numeric id:', event.data);
        return;
      }

      if (!this.promises.has(id)) {
        console.warn('[BnglService] Received response for unknown message id:', event.data);
        return;
      }

      const pending = this.promises.get(id)!;
      this.promises.delete(id);
      pending.cleanup();

      if (type === 'parse_success' || type === 'simulate_success') {
        pending.resolve(payload);
        return;
      }
      // handle cache model responses as well
      if (type === 'cache_model_success') {
        pending.resolve(payload);
        return;
      }

      if (type === 'parse_error' || type === 'simulate_error' || type === 'cache_model_error') {
        const errType = type === 'parse_error' ? 'parse' : type === 'simulate_error' ? 'simulate' : 'cache_model';
        const err = toError(errType === 'parse' ? 'parse' : 'simulate', payload);
        pending.reject(err);
        return;
      }

      console.warn('[BnglService] Received response with unexpected type:', event.data);
      pending.reject(new Error('Unexpected worker response type'));
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

  private sendCancel(targetId: number) {
    if (this.terminated) return;
    try {
      const cancelRequest: WorkerRequest = { id: this.messageId++, type: 'cancel', payload: { targetId } };
      this.worker.postMessage(cancelRequest);
    } catch (error) {
      console.warn('[BnglService] Failed to post cancel message', error);
    }
  }

  private rejectAllPending(message: string) {
    const err = new Error(message);
    this.promises.forEach((pending, requestId) => {
      this.promises.delete(requestId);
      pending.cleanup();
      pending.reject(err);
    });
  }

  private postMessage<T>(type: WorkerRequest['type'], payload: WorkerRequest['payload'], options?: RequestOptions): Promise<T> {
    if (this.terminated) {
      return Promise.reject(new Error('Worker has been terminated'));
    }
    const id = this.messageId++;
    return new Promise<T>((resolve, reject) => {
      const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
      const signal = options?.signal ?? null;
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      let abortHandler: (() => void) | undefined;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
        if (signal && abortHandler) {
          signal.removeEventListener('abort', abortHandler);
          abortHandler = undefined;
        }
      };

      const pending: PendingRequest = {
        resolve: (value) => resolve(value as T),
        reject,
        cleanup,
        description: options?.description,
      };

      this.promises.set(id, pending);

      if (timeoutMs > 0 && Number.isFinite(timeoutMs)) {
        timeoutId = setTimeout(() => {
          if (!this.promises.has(id)) {
            return;
          }
          this.promises.delete(id);
          cleanup();
          this.sendCancel(id);
          const timeoutError = new Error(`${options?.description ?? type} timed out after ${timeoutMs} ms`);
          timeoutError.name = 'TimeoutError';
          reject(timeoutError);
        }, timeoutMs);
      }

      if (signal) {
        if (signal.aborted) {
          this.promises.delete(id);
          cleanup();
          this.sendCancel(id);
          reject(new DOMException(signal.reason ?? 'The operation was aborted.', 'AbortError'));
          return;
        }

        abortHandler = () => {
          if (!this.promises.has(id)) {
            return;
          }
          this.promises.delete(id);
          cleanup();
          this.sendCancel(id);
          reject(new DOMException(signal.reason ?? 'The operation was aborted.', 'AbortError'));
        };

        signal.addEventListener('abort', abortHandler);
      }

      let request: WorkerRequest;
      if (type === 'parse') {
        request = { id, type, payload: payload as string };
      } else if (type === 'simulate') {
        // payload may be one of the allowed simulate payload shapes (full model or modelId + overrides)
        request = { id, type, payload: payload as any };
      } else if (type === 'cache_model') {
        request = { id, type, payload: payload as { model: BNGLModel } };
      } else {
        request = { id, type, payload } as WorkerRequest;
      }

      try {
        this.worker.postMessage(request);
      } catch (error) {
        this.promises.delete(id);
        cleanup();
        reject(error instanceof Error ? error : new Error(String(error)));
      }
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
    const cancellation = new DOMException(reason ?? 'Requests cancelled', 'AbortError');
    this.promises.forEach((pending, requestId) => {
      this.promises.delete(requestId);
      this.sendCancel(requestId);
      pending.cleanup();
      pending.reject(cancellation);
    });
  }

  public parse(code: string, options?: RequestOptions): Promise<BNGLModel> {
    return this.postMessage<BNGLModel>('parse', code, { ...options, description: options?.description ?? 'Parse request' });
  }

  public simulate(model: BNGLModel, options: SimulationOptions, requestOptions?: RequestOptions): Promise<SimulationResults> {
    return this.postMessage<SimulationResults>('simulate', { model, options }, {
      ...requestOptions,
      description: requestOptions?.description ?? `Simulation (${options.method})`,
    });
  }

  /**
   * Cache a parsed/expanded model in the worker to avoid re-serializing/passing the full model
   * for each simulation run. Returns a numeric modelId that can be used with simulateCached.
   */
  public prepareModel(model: BNGLModel, requestOptions?: RequestOptions): Promise<number> {
    // If we previously cached a model, try to release it to keep worker memory bounded.
    const prev = this.lastCachedModelId;
    if (typeof prev === 'number') {
      // Fire-and-forget release; do not block the prepareModel call on release response.
      this.releaseModel(prev).catch((err) => {
        console.warn('[BnglService] Failed to release previous cached model', prev, err);
      });
    }

    return this.postMessage<{ modelId: number }>('cache_model', { model }, { ...requestOptions, description: 'Cache model' }).then((res) => {
      const modelId = (res as { modelId: number }).modelId;
      this.lastCachedModelId = modelId;
      return modelId;
    });
  }

  /**
   * Simulate using a cached model id and optional parameter overrides. This sends only the modelId and overrides
   * to the worker (much smaller payload), so repeated runs are cheaper on the main thread.
   */
  public simulateCached(modelId: number, parameterOverrides: Record<string, number> | undefined, options: SimulationOptions, requestOptions?: RequestOptions): Promise<SimulationResults> {
    return this.postMessage<SimulationResults>('simulate', { modelId, parameterOverrides, options }, {
      ...requestOptions,
      description: requestOptions?.description ?? `Simulation (${options.method}) (cached)`,
    });
  }

  /**
   * Release a previously cached model in the worker to free memory.
   */
  public releaseModel(modelId: number, requestOptions?: RequestOptions): Promise<{ modelId: number } | void> {
    return this.postMessage<{ modelId: number }>('release_model', { modelId }, { ...requestOptions, description: 'Release cached model' });
  }
}

export const bnglService = new BnglService();
