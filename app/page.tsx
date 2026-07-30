import type { Metadata } from "next";
import { getChatGPTUser } from "./chatgpt-auth";
import { LegacyApp } from "./legacy-app";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legacy OS — Daily Command Center",
  description:
    "An evidence-led operating system for creative work, clients, and AI-assisted decisions.",
};

export default async function Home() {
  const user = await getChatGPTUser();
  const firstName = user?.fullName?.split(" ")[0] || "Joshua";

  return <LegacyApp firstName={firstName} />;
}
