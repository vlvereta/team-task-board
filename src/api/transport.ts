// The transport is the seam between the API client and whatever answers the
// requests. This build uses the in-browser mock server; a real backend would
// use `createFetchTransport` instead, with no UI changes.

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface ApiRequest {
  method: HttpMethod;
  /** Path with optional query string, e.g. `/tasks?assignee=me`. */
  path: string;
  headers: Record<string, string>;
  /** Parsed JSON body, or undefined when there is none. */
  body?: unknown;
}

export interface ApiResponse<T = unknown> {
  status: number;
  /** Parsed JSON body; `null` for 204 responses. */
  body: T;
}

export interface Transport {
  send(request: ApiRequest): Promise<ApiResponse>;
}

/** Real-network transport, for when an Express (or any REST) server exists. */
export function createFetchTransport(baseUrl: string): Transport {
  return {
    async send({ method, path, headers, body }) {
      const res = await fetch(baseUrl + path, {
        method,
        headers: body === undefined ? headers : { 'Content-Type': 'application/json', ...headers },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await res.text();
      return { status: res.status, body: text ? JSON.parse(text) : null };
    },
  };
}
