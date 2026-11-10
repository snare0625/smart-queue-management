import type { Metadata } from "next";
import { DisplayScreen } from "@/components/display/DisplayScreen";

export const metadata: Metadata = { title: "QueuePro — Waiting Room", description: "Public queue display" };

export default function Page() {
  return <DisplayScreen />;
}
