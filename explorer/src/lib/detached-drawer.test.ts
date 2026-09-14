import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  openDetachedWindow,
  createChannel,
  broadcastNodeChange,
  onDetachedDrill,
  CHANNEL_NAME,
} from './detached-drawer';

class MockBroadcastChannel {
  name: string;
  listeners: Array<(event: MessageEvent) => void> = [];
  static channels: Map<string, Set<MockBroadcastChannel>> = new Map();

  constructor(name: string) {
    this.name = name;
    if (!MockBroadcastChannel.channels.has(name)) {
      MockBroadcastChannel.channels.set(name, new Set());
    }
    MockBroadcastChannel.channels.get(name)!.add(this);
  }

  postMessage(data: any) {
    const channelSet = MockBroadcastChannel.channels.get(this.name);
    if (channelSet) {
      channelSet.forEach((ch) => {
        ch.listeners.forEach((listener) => listener({ data } as MessageEvent));
      });
    }
  }

  addEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (type === 'message') {
      this.listeners.push(listener);
    }
  }

  removeEventListener(type: string, listener: (event: MessageEvent) => void) {
    if (type === 'message') {
      this.listeners = this.listeners.filter((l) => l !== listener);
    }
  }

  close() {
    const channelSet = MockBroadcastChannel.channels.get(this.name);
    if (channelSet) {
      channelSet.delete(this);
    }
  }
}

describe('detached-drawer', () => {
  beforeEach(() => {
    vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);
    MockBroadcastChannel.channels.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('openDetachedWindow opens popup window with correct arguments', () => {
    const mockOpen = vi.fn().mockReturnValue({});
    vi.stubGlobal('open', mockOpen);

    const win = openDetachedWindow();
    expect(mockOpen).toHaveBeenCalledWith('/detached.html', 'investigator', 'width=500,height=800');
    expect(win).toBeDefined();
  });

  it('createChannel creates a BroadcastChannel with CHANNEL_NAME', () => {
    const channel = createChannel();
    expect(channel.name).toBe(CHANNEL_NAME);
  });

  it('broadcastNodeChange posts node-changed message', () => {
    const channel = createChannel();
    const spy = vi.spyOn(channel, 'postMessage');

    broadcastNodeChange(channel, 'ApexClass:AccountService');
    expect(spy).toHaveBeenCalledWith({ type: 'node-changed', nodeId: 'ApexClass:AccountService' });
  });

  it('onDetachedDrill listens for drill messages and calls callback', () => {
    const mainChannel = createChannel();
    const detachedChannel = createChannel();
    const callback = vi.fn();

    const unsubscribe = onDetachedDrill(mainChannel, callback);

    detachedChannel.postMessage({ type: 'drill', nodeId: 'ApexClass:OrderService' });
    expect(callback).toHaveBeenCalledWith('ApexClass:OrderService');

    unsubscribe();
    detachedChannel.postMessage({ type: 'drill', nodeId: 'ApexClass:AnotherService' });
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
