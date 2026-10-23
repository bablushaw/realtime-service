export type JobChrome = { title: string; body: string };

export type JobStatusMessage = {
  jobId: string;
  status: string;
  event: string;
  tenantId: string;
  customerId: string;
  helperId: string | null;
  recipientUserRoleIds: string[];
  chrome: JobChrome;
  data: { jobId: string; status: string; event: string };
  sound: boolean;
};

export type JobStatusSocketEvent = {
  jobId: string;
  status: string;
  event: string;
  title: string;
  body: string;
  at: string;
};

export function userRooms(ids: string[]): string[] {
  const rooms: string[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    rooms.push(`user:${id}`);
  }
  return rooms;
}

export function parseJobStatus(raw: unknown): JobStatusMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const body = (
    typeof obj.jobId === 'string' ? obj : obj.data
  ) as Partial<JobStatusMessage> | undefined;
  if (!body || typeof body.jobId !== 'string') return null;
  if (!Array.isArray(body.recipientUserRoleIds)) return null;
  const chrome = body.chrome;
  if (!chrome || typeof chrome.title !== 'string' || typeof chrome.body !== 'string') {
    return null;
  }
  const status = String(body.status ?? '');
  const event = String(body.event ?? '');
  return {
    jobId: body.jobId,
    status,
    event,
    tenantId: String(body.tenantId ?? ''),
    customerId: String(body.customerId ?? ''),
    helperId: body.helperId ? String(body.helperId) : null,
    recipientUserRoleIds: body.recipientUserRoleIds.map(String),
    chrome: { title: chrome.title, body: chrome.body },
    data: {
      jobId: String(body.data?.jobId ?? body.jobId),
      status: String(body.data?.status ?? status),
      event: String(body.data?.event ?? event),
    },
    sound: body.sound !== false,
  };
}
