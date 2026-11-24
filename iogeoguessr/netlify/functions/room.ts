import { getStore } from '@netlify/blobs';
import { handleRoomRequest, type RoomStore } from '../../shared/roomEngine';

function createNetlifyBlobStore(): RoomStore {
  const store = getStore({ name: 'oecd-geoguessr-rooms', consistency: 'strong' });

  return {
    async getJson<T>(key: string): Promise<T | null> {
      const value = await store.get(key, { type: 'json' });
      return (value as T) ?? null;
    },
    async setJson<T>(key: string, value: T): Promise<void> {
      await store.setJSON(key, value);
    },
    async deleteKey(key: string): Promise<void> {
      await store.delete(key);
    },
    async listKeys(prefix: string): Promise<string[]> {
      const { blobs } = await store.list({ prefix });
      return blobs.map((b) => b.key);
    },
  };
}

export default async (req: Request): Promise<Response> => {
  try {
    const url = new URL(req.url);
    const query: Record<string, string | undefined> = {};
    url.searchParams.forEach((value, key) => {
      query[key] = value;
    });

    const headers: Record<string, string | undefined> = {};
    req.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });

    let body: unknown = null;
    if (req.method === 'POST') {
      const text = await req.text();
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          return new Response(JSON.stringify({ error: 'Ugyldig JSON-data.' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
          });
        }
      }
    }

    const result = await handleRoomRequest({
      method: req.method,
      query,
      headers,
      body,
      store: createNetlifyBlobStore(),
    });

    return new Response(JSON.stringify(result.body), {
      status: result.status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('Netlify room function error:', err);
    return new Response(
      JSON.stringify({ error: 'Midlertidig serverfejl i klasserummet. Prøv igen.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );
  }
};

export const config = {
  path: '/api/room',
};
