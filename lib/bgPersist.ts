/**
 * 最新スナップショットだけを順に裏書きするキュー。
 * 連打しても途中の状態は捨て、最後の内容だけ GAS に送る。
 */
export function createLatestWriter<T>(write: (snapshot: T) => Promise<void>) {
  let pending: T | null = null;
  let running = false;
  const listeners = new Set<(syncing: boolean) => void>();

  function notify(syncing: boolean) {
    listeners.forEach((cb) => cb(syncing));
  }

  async function pump() {
    if (running) return;
    running = true;
    notify(true);
    try {
      while (pending !== null) {
        const snap = pending;
        pending = null;
        await write(snap);
      }
    } finally {
      running = false;
      if (pending !== null) {
        void pump();
      } else {
        notify(false);
      }
    }
  }

  return {
    push(snapshot: T) {
      pending = snapshot;
      void pump();
    },
    onSyncing(cb: (syncing: boolean) => void) {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
  };
}
