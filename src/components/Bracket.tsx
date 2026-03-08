"use client";

import { useState, useRef, useEffect } from "react";
import type { BracketData, BracketRound, Match } from "@/types/bracket";
import styles from "./Bracket.module.css";

/** Derive round label from data: round 1 = 128, round 2 = 64, etc. */
function getRoundLabel(round: BracketRound): string {
  switch (round.round) {
    case 1:
      return "Round of 128";
    case 2:
      return "Round of 64";
    case 3:
      return "Round of 32";
    case 4:
      return "Round of 16";
    case 5:
      return "Quarter Final";
    case 6:
      return "Semi Final";
    case 7:
      return "Final";
    default:
      return "Final";
  }
}

/** Tournament schedule: March 8–13, 7:00–9:00. First 4 matches at 7:00, next 4 at 7:15, etc. */
function getMatchSchedule(roundNumber: number, matchIndexInRound: number): { date: string; time: string } {
  const startDate = new Date(2026, 2, 8); // March 8, 2026
  const times = ["7:00", "7:15", "7:30", "7:45", "8:00", "8:15", "8:30", "8:45"];
  const slotIndex = Math.floor(matchIndexInRound / 4);
  const dayIndex = Math.min(Math.floor(slotIndex / 8), 5); // 6 days: Mar 8–13
  const timeIndex = slotIndex % 8;
  const d = new Date(startDate);
  d.setDate(d.getDate() + dayIndex);
  const dateStr = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return { date: dateStr, time: times[timeIndex] ?? "7:00" };
}

/** Style class for round label pill based on match count (from data). */
function getLabelClass(round: BracketRound): string {
  const n = round.matches.length;
  if (n >= 64) return styles.roundLabelR128;
  if (n >= 32) return styles.roundLabelR64;
  if (n >= 16) return styles.roundLabelR32;
  if (n >= 8) return styles.roundLabelR16;
  if (n >= 4) return styles.roundLabelQf;
  if (n >= 2) return n === 2 && round.round >= 7 ? styles.roundLabelFin : styles.roundLabelSf;
  return styles.roundLabelFin;
}

function MatchSlot({
  match,
  matchLabel,
  slotClassName,
  schedule,
}: {
  match: Match;
  matchLabel?: string;
  slotClassName?: string;
  schedule?: { date: string; time: string };
}) {
  const [showInfo, setShowInfo] = useState(false);
  const slotRef = useRef<HTMLDivElement>(null);

  const p1 = match.player1?.name ?? "—";
  const p2 = match.player2?.name ?? "—";

  useEffect(() => {
    if (!showInfo) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (slotRef.current && !slotRef.current.contains(e.target as Node)) {
        setShowInfo(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [showInfo]);

  return (
    <div
      ref={slotRef}
      role="button"
      tabIndex={0}
      className={`${styles.matchSlot} ${slotClassName ?? ""}`.trim()}
      onClick={() => setShowInfo((v) => !v)}
      onKeyDown={(e) => e.key === "Enter" && setShowInfo((v) => !v)}
    >
      {matchLabel && <span className={styles.matchSlotTitle}>{matchLabel}</span>}
      {schedule && (
        <span className={styles.matchSlotSchedule}>
          {schedule.date} · {schedule.time} PM
        </span>
      )}
      <div className={styles.matchSlotLine}>
        <span className={styles.matchSlotName} title={p1}>
          {p1}
        </span>
        <span className={styles.matchSlotVs}>VS</span>
        <span className={styles.matchSlotName} title={p2}>
          {p2}
        </span>
      </div>
      {showInfo && (
        <div className={styles.matchSlotInfo} aria-live="polite">
          <div className={styles.matchSlotInfoRow}>{p1}</div>
          <div className={styles.matchSlotInfoRow}>{p2}</div>
        </div>
      )}
    </div>
  );
}

interface BracketProps {
  data: BracketData;
  title?: string;
}

export default function Bracket({ data, title = "Assist Ramadan Cup" }: BracketProps) {
  const [minVisibleRound, setMinVisibleRound] = useState(1);

  // Only the selected round's matches (same on mobile and desktop)
  const targetRound = data.find((r) => r.round === minVisibleRound);

  // Round labels: Round of 128, 64, 32, 16, Quarter, Semi, Final
  const roundLabelsList = data
    .filter((r) => r.round >= 1 && r.round <= 7)
    .sort((a, b) => a.round - b.round);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.titleBanner}>{title}</h1>

        <div className={styles.roundLabels}>
          {roundLabelsList.map((r) => (
            <button
              key={r.round}
              type="button"
              className={`${styles.roundLabel} ${getLabelClass(r)} ${r.round === minVisibleRound ? styles.roundLabelActive : ""} ${r.active ? "" : styles.roundLabelInactive}`}
              onClick={() => r.active? setMinVisibleRound(r.round) : null}
            >
              {getRoundLabel(r)}
            </button>
          ))}
        </div>

        {/* Single column: only target round's cards, spacing between (all viewports) */}
        {targetRound && (
          <div className={styles.bracketMobile}>
            {targetRound.matches.map((match, i) => (
              <MatchSlot
                key={`${targetRound.round}-${i}`}
                match={match}
                matchLabel={`R${targetRound.round}-${i + 1}`}
                schedule={getMatchSchedule(targetRound.round, i)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
