"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Phase = "idle" | "hint" | "ready" | "progress" | "done" | "hidden";

export function PwaRegister() {
  const pathname = usePathname() || "/";
  const isAdmin = pathname.startsWith("/ops");
  const isPta = pathname.startsWith("/pta");
  const appName = isPta ? "PT" : isAdmin ? "work-admin" : "workout-log";
  const mark = isPta ? "PT" : isAdmin ? "WA" : "WL";

  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("準備中");
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    const href = isPta
      ? "/pta/manifest.webmanifest"
      : isAdmin
        ? "/ops/manifest.webmanifest"
        : "/manifest.webmanifest";
    const appleIcon = isPta
      ? "/pta-apple-touch-icon.png?v=pt3"
      : isAdmin
        ? "/ops-apple-touch-icon.png?v=wa3"
        : "/apple-touch-icon.png?v=wl3";
    const title = isPta ? "PT" : isAdmin ? "WA" : "WL";

    let link = document.querySelector(
      'link[rel="manifest"]'
    ) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      document.head.appendChild(link);
    }
    link.href = href;

    document
      .querySelectorAll('link[rel="apple-touch-icon"]')
      .forEach((el) => el.remove());
    const apple = document.createElement("link");
    apple.rel = "apple-touch-icon";
    apple.sizes = "180x180";
    apple.href = appleIcon;
    document.head.appendChild(apple);

    let appleTitle = document.querySelector(
      'meta[name="apple-mobile-web-app-title"]'
    ) as HTMLMetaElement | null;
    if (!appleTitle) {
      appleTitle = document.createElement("meta");
      appleTitle.name = "apple-mobile-web-app-title";
      document.head.appendChild(appleTitle);
    }
    appleTitle.content = title;

    let appNameMeta = document.querySelector(
      'meta[name="application-name"]'
    ) as HTMLMetaElement | null;
    if (!appNameMeta) {
      appNameMeta = document.createElement("meta");
      appNameMeta.name = "application-name";
      document.head.appendChild(appNameMeta);
    }
    appNameMeta.content = appName;
  }, [isAdmin, isPta, appName]);

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
      if (!data || data.type !== "WL_PROGRESS") return;
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
          {mark}
        </div>
        <div style={{ flex: 1 }}>
          <strong>インストールが完了しました</strong>
          <p className="muted tiny" style={{ margin: "2px 0 0" }}>
            ホーム画面の {appName} から起動できます
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
          {mark}
        </div>
        <div style={{ flex: 1 }}>
          <strong>
            {status} {progress}%
          </strong>
          <p className="muted tiny" style={{ margin: "2px 0 0" }}>
            {appName} を準備しています
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
          {mark}
        </div>
        <div style={{ flex: 1 }}>
          <strong>{appName} を追加</strong>
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
          {mark}
        </div>
        <div style={{ flex: 1 }}>
          <strong>{appName} を追加</strong>
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
