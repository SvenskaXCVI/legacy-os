"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function InstallAppButton() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    const initialState = window.setTimeout(() => setInstalled(standalone), 0);
    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const handleInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", handlePrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handlePrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      window.clearTimeout(initialState);
    };
  }, []);

  async function install() {
    if (installed) return;
    if (prompt) {
      await prompt.prompt();
      const result = await prompt.userChoice;
      if (result.outcome === "accepted") setInstalled(true);
      setPrompt(null);
      return;
    }
    window.alert(
      "Use your browser menu and choose Install app or Add to Home Screen. On iPhone or iPad, tap Share, then Add to Home Screen.",
    );
  }

  return (
    <button className="outline-button install-app-button" onClick={install}>
      <Download size={15} /> {installed ? "Legacy OS installed" : "Install Legacy OS"}
    </button>
  );
}
