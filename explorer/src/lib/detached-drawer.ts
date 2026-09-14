export const CHANNEL_NAME = 'investigator';

export function openDetachedWindow(): Window | null {
  if (typeof window === 'undefined') return null;
  return window.open('/detached.html', 'investigator', 'width=500,height=800');
}

export function createChannel(): BroadcastChannel {
  return new BroadcastChannel(CHANNEL_NAME);
}

export function broadcastNodeChange(channel: BroadcastChannel, nodeId: string): void {
  channel.postMessage({ type: 'node-changed', nodeId });
}

export function onDetachedDrill(
  channel: BroadcastChannel,
  cb: (nodeId: string) => void
): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data && event.data.type === 'drill' && typeof event.data.nodeId === 'string') {
      cb(event.data.nodeId);
    }
  };

  channel.addEventListener('message', handler);

  return () => {
    channel.removeEventListener('message', handler);
  };
}
