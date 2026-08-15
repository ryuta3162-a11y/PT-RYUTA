"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Phase = "idle" | "hint" | "ready" | "progress" | "done" | "hidden";

export function PwaRegister() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("準備中");
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

    if (standalone) {
      setPhase("hidden");
      return;
    }

    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;
    if (isIos) {
      setIosHint(true);
      setPhase("hint");
    }

    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || data.type !== "RY_LOG_PROGRESS") return;
      setProgress(Number(data.progress) || 0);
      setStatus(String(data.status || "準備中"));
    };
    navigator.serviceWorker.addEventListener("message", onMessage);

    void navigator.serviceWorker
      .register("/sw.js")
      .then(async (reg) => {
        setPhase((p) => (p === "idle" ? "progress" : p));
        setStatus("ダウンロード準備");
        const sw = reg.installing || reg.waiting || reg.active;
        sw?.postMessage({ type: "GET_PROGRESS" });
        // 初回は install イベントで進捗が来る。既存SWならすぐ100へ
        if (reg.active && !reg.installing) {
          setProgress(100);
          setStatus("準備完了");
          setTimeout(() => {
            setPhase((p) => (p === "progress" ? "idle" : p));
          }, 600);
        }
      })
      .catch(() => {
        setPhase("idle");
      });

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setPhase("ready");
    };
    const onInstalled = () => {
      setDeferred(null);
      setProgress(100);
      setStatus("完了");
      setPhase("done");
      window.setTimeout(() => setPhase("hidden"), 3200);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    setPhase("progress");
    setStatus("インストール中");
    setProgress(20);
    // OS側の実%は取れないため、体感用に段階表示
    const tick = window.setInterval(() => {
      setProgress((p) => Math.min(p + 12, 90));
    }, 180);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      window.clearInterval(tick);
      if (choice.outcome === "accepted") {
        setProgress(100);
        setStatus("完了");
        setPhase("done");
        window.setTimeout(() => setPhase("hidden"), 3200);
      } else {
        setPhase("ready");
        setProgress(0);
      }
    } catch {
      window.clearInterval(tick);
      setPhase("ready");
    } finally {
      setDeferred(null);
    }
  }

  if (phase === "hidden" || phase === "idle") return null;

  if (phase === "done") {
    return (
      <div className="pwa-banner done">
        <div className="pwa-banner-icon" aria-hidden>
          RY
        </div>
        <div style={{ flex: 1 }}>
          <strong>インストールが完了しました</strong>
          <p className="muted tiny" style={{ margin: "2px 0 0" }}>
            ホーム画面の RY-LOG から起動できます
          </p>
          <div className="pwa-progress">
            <div className="pwa-progress-bar" style={{ width: "100%" }} />
          </div>
        </div>
      </div>
    );
  }

  if (phase === "progress") {
    return (
      <div className="pwa-banner">
        <div className="pwa-banner-icon" aria-hidden>
          RY
        </div>
        <div style={{ flex: 1 }}>
          <strong>
            {status} {progress}%
          </strong>
          <p className="muted tiny" style={{ margin: "2px 0 0" }}>
            RY-LOG を準備しています
          </p>
          <div className="pwa-progress">
            <div className="pwa-progress-bar" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>
    );
  }

  if (phase === "ready" && deferred) {
    return (
      <div className="pwa-banner">
        <div className="pwa-banner-icon" aria-hidden>
          RY
        </div>
        <div style={{ flex: 1 }}>
          <strong>RY-LOG を追加</strong>
          <p className="muted tiny" style={{ margin: "2px 0 0" }}>
            ホーム画面にインストール
          </p>
        </div>
        <button type="button" className="btn primary sm" onClick={install}>
          追加
        </button>
      </div>
    );
  }

  if (iosHint && phase === "hint") {
    return (
      <div className="pwa-banner">
        <div className="pwa-banner-icon" aria-hidden>
          RY
        </div>
        <div style={{ flex: 1 }}>
          <strong>RY-LOG を追加</strong>
          <p className="muted tiny" style={{ margin: "2px 0 0" }}>
            共有 →「ホーム画面に追加」
          </p>
        </div>
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => setPhase("hidden")}
          style={{ color: "#fff", borderColor: "#444" }}
        >
          閉じる
        </button>
      </div>
    );
  }

  return null;
}
