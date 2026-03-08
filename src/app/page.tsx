import fs from "fs";
import path from "path";
import Bracket from "@/components/Bracket";
import type { BracketData } from "@/types/bracket";

export default function Home() {
  const filePath = path.join(process.cwd(), "dummy", "bracket.json");
  const data: BracketData = JSON.parse(
    fs.readFileSync(filePath, "utf-8")
  );
  return <Bracket data={data} />;
}
