import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const port = Number(process.env.MOCK_API_PORT ?? 8787);
const drafts = new Map();

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PATCH,OPTIONS',
    'access-control-allow-headers': 'content-type'
  });
  response.end(JSON.stringify(payload));
}

function toDraftMetadata(draft) {
  return {
    draftId: draft.id,
    status: draft.status,
    createdAt: draft.createdAt,
    updatedAt: draft.updatedAt,
    submittedAt: draft.submittedAt
  };
}

function parseJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', chunk => {
      body += chunk;
      if (body.length > 1_000_000) {
        reject(new Error('Body too large'));
      }
    });
    request.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    request.on('error', reject);
  });
}

function getIdFromPath(pathname) {
  const parts = pathname.split('/').filter(Boolean);
  return parts[2] ?? null;
}

const server = createServer(async (request, response) => {
  const { method = 'GET', url = '/' } = request;
  const parsed = new URL(url, `http://localhost:${port}`);
  const pathname = parsed.pathname;

  if (method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  if (method === 'POST' && pathname === '/api/drafts') {
    const id = randomUUID();
    const now = Date.now();
    const draft = {
      id,
      status: 'draft',
      values: {},
      createdAt: now,
      updatedAt: now,
      submittedAt: null
    };
    drafts.set(id, draft);
    console.log(`[POST /api/drafts] created draft ${id}`);
    sendJson(response, 201, { draftId: id, metadata: toDraftMetadata(draft) });
    return;
  }

  if (method === 'PATCH' && pathname.startsWith('/api/drafts/')) {
    const id = getIdFromPath(pathname);
    const draft = id ? drafts.get(id) : null;

    if (!draft) {
      console.log(`[PATCH ${pathname}] draft not found`);
      sendJson(response, 404, { error: 'Draft not found' });
      return;
    }

    if (draft.status === 'submitted') {
      console.log(`[PATCH ${pathname}] already submitted`);
      sendJson(response, 409, { error: 'Draft has already been submitted' });
      return;
    }

    try {
      const body = await parseJsonBody(request);
      const values = body?.values ?? {};
      console.log(`[PATCH ${pathname}] payload`, body);

      if (values.simulateError === true) {
        console.log(`[PATCH ${pathname}] simulated error`);
        sendJson(response, 500, { error: 'Mock remote update failure' });
        return;
      }

      draft.values = {
        ...draft.values,
        ...values
      };
      draft.updatedAt = Date.now();
      console.log(`[PATCH ${pathname}] updated draft`, draft.values);
      sendJson(response, 200, { draftId: id, metadata: toDraftMetadata(draft) });
    } catch {
      console.log(`[PATCH ${pathname}] invalid payload`);
      sendJson(response, 400, { error: 'Invalid request payload' });
    }
    return;
  }

  if (method === 'POST' && pathname.startsWith('/api/drafts/') && pathname.endsWith('/submit')) {
    const id = getIdFromPath(pathname);
    const draft = id ? drafts.get(id) : null;

    if (!draft) {
      console.log(`[POST ${pathname}] draft not found`);
      sendJson(response, 404, { error: 'Draft not found' });
      return;
    }

    if (draft.status === 'submitted') {
      console.log(`[POST ${pathname}] already submitted`);
      sendJson(response, 409, { error: 'Draft has already been submitted' });
      return;
    }

    try {
      const body = await parseJsonBody(request);
      const values = body?.values ?? {};
      console.log(`[POST ${pathname}] payload`, body);

      draft.values = {
        ...draft.values,
        ...values
      };
      draft.status = 'submitted';
      draft.updatedAt = Date.now();
      draft.submittedAt = draft.updatedAt;

      console.log(`[POST ${pathname}] submitted draft`, draft.values);
      sendJson(response, 200, {
        draftId: id,
        metadata: toDraftMetadata(draft),
        message: 'Draft submitted'
      });
    } catch {
      console.log(`[POST ${pathname}] invalid payload`);
      sendJson(response, 400, { error: 'Invalid request payload' });
    }
    return;
  }

  console.log(`[${method} ${pathname}] not found`);
  sendJson(response, 404, { error: 'Not found' });
});

server.listen(port, () => {
  console.log(`Mock API listening on http://localhost:${port}`);
});
