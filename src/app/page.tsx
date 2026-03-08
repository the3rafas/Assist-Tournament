import { Suspense } from "react";
import fs from "fs";
import path from "path";
import Bracket from "@/components/Bracket";
import type { BracketData } from "@/types/bracket";

export default function Home() {
  const filePath = path.join(process.cwd(), "dummy", "bracket.json");
  const data: BracketData = JSON.parse(
    fs.readFileSync(filePath, "utf-8")
  );
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#492E71", color: "#fff" }}>Loading…</div>}>
      <Bracket data={data} />
    </Suspense>
  );
}
