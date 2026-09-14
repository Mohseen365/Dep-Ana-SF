/**
 * Spike 2: Detached Window BroadcastChannel Receiver.
 * Listens for node selection events broadcast from main window and displays state.
 */

const channel = new BroadcastChannel('explorer-detached-sync');

const displayEl = document.getElementById('node-id-display');
const historyEl = document.getElementById('history-list');
const statusPillEl = document.getElementById('status-pill');

let isFirstEvent = true;

channel.onmessage = (event) => {
  if (event.data?.type === 'NODE_SELECTED') {
    const { nodeId, timestamp } = event.data;

    if (displayEl) {
      displayEl.textContent = nodeId;
    }

    if (historyEl) {
      if (isFirstEvent) {
        historyEl.innerHTML = '';
        isFirstEvent = false;
      }
      const timeStr = new Date(timestamp).toLocaleTimeString();
      const li = document.createElement('li');
      li.textContent = `[${timeStr}] ${nodeId}`;
      historyEl.prepend(li);
    }
  }
};

window.addEventListener('beforeunload', () => {
  if (statusPillEl) {
    statusPillEl.textContent = 'DISCONNECTED';
    statusPillEl.style.backgroundColor = '#450a0a';
    statusPillEl.style.color = '#fca5a5';
  }
  channel.close();
});
