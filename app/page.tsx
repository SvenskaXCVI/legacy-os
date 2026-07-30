import type { Metadata } from "next";
import { AccessShell } from "./access-shell";
import { getChatGPTUser } from "./chatgpt-auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Legacy OS — Studio Command Center",
  description:
    "A connected operating system for tattoo projects, clients, and observable AI-assisted work.",
};

export default async function Home() {
  const user = await getChatGPTUser();
  const firstName = user?.fullName?.split(" ")[0] || "Owner";

  return <AccessShell ownerName={firstName} />;
}
