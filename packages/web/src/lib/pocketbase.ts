/**
 * PocketBase Client for GuitarMind
 * Replaces Supabase with a free, self-hosted, SQLite-backed backend.
 *
 * PocketBase runs locally at http://localhost:8090 (or the configured URL).
 * No API key needed for local use — all endpoints are open for local dev.
 *
 * PocketBase REST API:
 *   GET    /api/collections/{name}/records          — list / filter
 *   POST   /api/collections/{name}/records          — create
 *   PATCH  /api/collections/{name}/records/{id}     — update
 *   DELETE /api/collections/{name}/records/{id}     — delete
 */

const PB_BASE_URL = import.meta.env.VITE_PB_URL || 'http://localhost:8090';

export interface PBRecord {
  id: string;
  created: string;
  updated: string;
  [key: string]: any;
}

export interface PBListResponse<T extends PBRecord> {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
  items: T[];
}

class PocketBaseError extends Error {
  constructor(public status: number, public data: any) {
    super(`PocketBase error ${status}: ${JSON.stringify(data)}`);
    this.name = 'PocketBaseError';
  }
}

async function pbFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${PB_BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (res.status === 204) return {} as T;

  const data = await res.json();
  if (!res.ok) {
    throw new PocketBaseError(res.status, data);
  }
  return data as T;
}

export const pb = {
  baseUrl: PB_BASE_URL,

  /** Create a record in a collection */
  async create<T extends PBRecord>(collection: string, body: Record<string, any>): Promise<T> {
    return pbFetch<T>(`/api/collections/${collection}/records`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  /** Fetch a single record by id */
  async getOne<T extends PBRecord>(collection: string, id: string, expand?: string): Promise<T> {
    const q = expand ? `?expand=${encodeURIComponent(expand)}` : '';
    return pbFetch<T>(`/api/collections/${collection}/records/${id}${q}`);
  },

  /** List records with optional filter, sort, and pagination */
  async list<T extends PBRecord>(
    collection: string,
    options: {
      filter?: string;
      sort?: string;
      page?: number;
      perPage?: number;
      expand?: string;
    } = {}
  ): Promise<PBListResponse<T>> {
    const params = new URLSearchParams();
    if (options.filter) params.set('filter', options.filter);
    if (options.sort) params.set('sort', options.sort);
    if (options.page) params.set('page', String(options.page));
    if (options.perPage) params.set('perPage', String(options.perPage));
    if (options.expand) params.set('expand', options.expand);
    const q = params.toString() ? `?${params}` : '';
    return pbFetch<PBListResponse<T>>(`/api/collections/${collection}/records${q}`);
  },

  /** Get first record matching filter, or null */
  async getFirst<T extends PBRecord>(collection: string, filter: string): Promise<T | null> {
    try {
      const res = await this.list<T>(collection, { filter, perPage: 1 });
      return res.items[0] ?? null;
    } catch (e: any) {
      if (e instanceof PocketBaseError && e.status === 404) return null;
      throw e;
    }
  },

  /** Update a record */
  async update<T extends PBRecord>(collection: string, id: string, body: Record<string, any>): Promise<T> {
    return pbFetch<T>(`/api/collections/${collection}/records/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  /** Delete a record */
  async delete(collection: string, id: string): Promise<void> {
    await pbFetch(`/api/collections/${collection}/records/${id}`, { method: 'DELETE' });
  },

  /** Upsert: update if id known, else create */
  async upsert<T extends PBRecord>(collection: string, filter: string, body: Record<string, any>): Promise<T> {
    const existing = await this.getFirst<T>(collection, filter);
    if (existing) {
      return this.update<T>(collection, existing.id, body);
    }
    return this.create<T>(collection, body);
  },

  /** Health check */
  async isOnline(): Promise<boolean> {
    try {
      await pbFetch('/api/health');
      return true;
    } catch {
      return false;
    }
  },
};

export default pb;
