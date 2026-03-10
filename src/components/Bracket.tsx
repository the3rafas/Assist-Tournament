"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import type { BracketData, BracketRound, Match } from "@/types/bracket";
import styles from "./Bracket.module.css";

const WINNERS_STORAGE_KEY = "bracket-winners";

/** Knock-out pool: paired as index vs index+1 in one card */
const KNOCK_OUT_DATA: {
  id: number;
  name: string;
  phone: string;
  age: string;
  group?: boolean;
}[] = [
  { id: 2, name: "باقي", phone: "01027369809", age: "25" },
  { id: 7, name: "فادي", phone: "01553205057", age: "18" },
  { id: 15, name: "محمد فتحي", phone: "01009605918", age: "22" },
  { id: 9, name: "محمد ود", phone: "01099875533", age: "25" },
  { id: 12, name: "MahmoudOmar", phone: "01095039367", age: "23" },
  { id: 145, name: "خالد العطار", phone: "01018028452", age: "22" },
  { id: 104, name: "خالد السيد", phone: "01009721497", age: "20" },
  { id: 97, name: "عمرو خالد", phone: "01158146088", age: "23" },
];

/** Derive round label from data: round 1 = 128, round 2 = 64, etc. */
function getRoundLabel(round: BracketRound): string {
  switch (round.round) {
    case 1:
      return "Round of 32";
    case 2:
      return "Round of 16";
    case 3:
      return "Quarter Final";
    case 4:
      return "Semi Final";
    case 5:
      return "Final";
    default:
      return "Final";
  }
}

/**
 * Tournament schedule: every 4 matches share the same time; next block of 4 gets the next time; then repeat.
 * e.g. indices 0–3 → 7:30, 4–7 → 7:45, 8–11 → 7:30, …
 * When knockOut is true, scheduling resets: use knockOutMatchIndex (0-based within KO) so time starts at 7:30 again; date stays on KO start day.
 */
function getMatchSchedule(
  roundNumber: number,
  matchIndexInRound: number,
  knockOut: boolean = false,
  /** When knockOut, use this as the match index so time blocks reset (0 → first block 7:30 again) */
  knockOutMatchIndex?: number
): { date: string; time: string } {
  const startDate = new Date(2026, 2, knockOut ? 10 : 11);
  const times = ["7:30", "7:45"];
  // Knockout: reset — every 4 share same time from KO index 0; bracket: continuous block index
  const indexForBlocks =
    knockOut && knockOutMatchIndex !== undefined ? knockOutMatchIndex : matchIndexInRound;
  const blockIndex = Math.floor(indexForBlocks / 4);
  const time = times[blockIndex % times.length] ?? "7:30";

  const dayIndex = knockOut ? 0 : Math.min(Math.floor(Math.floor(matchIndexInRound / 4) / 8), 5);
  const d = new Date(startDate);
  d.setDate(d.getDate() + dayIndex);
  const dateStr = d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
  return { date: dateStr, time };
}

/** Style class for round label pill based on match count (from data). */
function getLabelClass(round: BracketRound): string {
  const n = round.matches.length;
  if (n >= 64) return styles.roundLabelR128;
  if (n >= 32) return styles.roundLabelR64;
  if (n >= 16) return styles.roundLabelR32;
  if (n >= 8) return styles.roundLabelR16;
  if (n >= 4) return styles.roundLabelQf;
  if (n >= 2)
    return n === 2 && round.round >= 7
      ? styles.roundLabelFin
      : styles.roundLabelSf;
  return styles.roundLabelFin;
}

function MatchSlot({
  match,
  matchLabel,
  slotClassName,
  schedule,
  isAdminMode,
  onAdminClick,
}: {
  match: Match;
  matchLabel?: string;
  slotClassName?: string;
  schedule?: { date: string; time: string };
  isAdminMode?: boolean;
  onAdminClick?: () => void;
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

  const handleClick = () => {
    if (isAdminMode && onAdminClick) {
      onAdminClick();
    } else {
      setShowInfo((v) => !v);
    }
  };

  return (
    <div
      ref={slotRef}
      role="button"
      tabIndex={0}
      className={`${styles.matchSlot} ${slotClassName ?? ""} ${
        isAdminMode ? styles.matchSlotAdmin : ""
      }`.trim()}
      onClick={handleClick}
      onKeyDown={(e) => e.key === "Enter" && handleClick()}
    >
      {matchLabel && (
        <span className={styles.matchSlotTitle}>{matchLabel}</span>
      )}
      {schedule && (
        <span className={styles.matchSlotSchedule}>
          {schedule.date} 
        </span>
      )}
      <div className={styles.matchSlotLine}>
        <span
          className={`${styles.matchSlotName} ${
            match.winnerId != null
              ? match.winnerId === match.player1?.id
                ? styles.matchSlotWinner
                : styles.matchSlotLoser
              : ""
          }`}
          title={p1}
        >
          {p1}
        </span>
        <span className={styles.matchSlotVs}>VS</span>
        <span
          className={`${styles.matchSlotName} ${
            match.winnerId != null
              ? match.winnerId === match.player2?.id
                ? styles.matchSlotWinner
                : styles.matchSlotLoser
              : ""
          }`}
          title={p2}
        >
          {p2}
        </span>
      </div>
    </div>
  );
}

interface BracketProps {
  data: BracketData;
  title?: string;
}

export default function Bracket({
  data,
  title = "Assist Ramadan Cup",
}: BracketProps) {
  const searchParams = useSearchParams();
  const isAdminSupport =
    searchParams.get("admin") === "support" ||
    searchParams.get("adminSupport") === "true";

  const [minVisibleRound, setMinVisibleRound] = useState(1);
  const [openAdminMatch, setOpenAdminMatch] = useState<{
    round: number;
    matchIndex: number;
  } | null>(null);
  const [selectedWinner, setSelectedWinner] = useState<
    "player1" | "player2" | null
  >(null);
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "done" | "error"
  >("idle");

  const targetRound = data.find((r) => r.round === minVisibleRound);
  const roundLabelsList = data
    .filter((r) => r.round >= 1 && r.round <= 7)
    .sort((a, b) => a.round - b.round);

  const openMatchRound = openAdminMatch
    ? data.find((r) => r.round === openAdminMatch.round)
    : null;
  const isThirdPlaceMatch =
    openAdminMatch &&
    openMatchRound &&
    openMatchRound.thirdPlaceMatch &&
    openAdminMatch.matchIndex === openMatchRound.matches.length;
  const openMatchData =
    openAdminMatch && openMatchRound
      ? isThirdPlaceMatch
        ? openMatchRound.thirdPlaceMatch
        : openMatchRound.matches[openAdminMatch.matchIndex] ?? null
      : null;
  const openMatchKey = openAdminMatch
    ? `R${openAdminMatch.round}-${openAdminMatch.matchIndex + 1}${
        isThirdPlaceMatch ? " (3rd Place)" : ""
      }`
    : null;

  const openAdminPopup = (round: number, matchIndex: number) => {
    setOpenAdminMatch({ round, matchIndex });
    const key = `R${round}-${matchIndex + 1}`;
    setSaveStatus("idle");
  };

  const saveWinner = async () => {
    if (!openAdminMatch || selectedWinner === null) return;
    const key = `R${openAdminMatch.round}-${openAdminMatch.matchIndex + 1}`;
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/bracket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchKey: key,
          winner: selectedWinner,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? res.statusText);
      }
      setSaveStatus("done");
      setTimeout(() => {
        setOpenAdminMatch(null);
        setSelectedWinner(null);
        setSaveStatus("idle");
      }, 400);
    } catch (e) {
      setSaveStatus("error");
    }
  };

  const closeAdminPopup = () => {
    setOpenAdminMatch(null);
    setSelectedWinner(null);
    setSaveStatus("idle");
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.titleBanner}>{title}</h1>
        {isAdminSupport && (
          <p className={styles.adminBadge}>
            Admin support mode — click a card to set winner
          </p>
        )}

        <div className={styles.roundLabels}>
          {roundLabelsList.map((r) => (
            <button
              key={r.round}
              type="button"
              className={`${styles.roundLabel} ${getLabelClass(r)} ${
                r.round === minVisibleRound ? styles.roundLabelActive : ""
              } ${r.active ? "" : styles.roundLabelInactive}`}
              onClick={() => (r.active ? setMinVisibleRound(r.round) : null)}
            >
              {getRoundLabel(r)}
            </button>
          ))}
        </div>
        {KNOCK_OUT_DATA.length > 0 && (
          <div className={styles.knockOutCard}>
            <div className={styles.knockOutCardTitle}>Knock out</div>
            <span
              className={styles.matchSlotSchedule}
              style={{ textAlign: "center" }}
            >
              10 March  · 7:00 PM
            </span>

            {Array.from({ length: Math.ceil(KNOCK_OUT_DATA.length / 2) }).map(
              (_, pairIdx) => {
                const i = pairIdx * 2;
                const p1 = KNOCK_OUT_DATA[i];
                const p2 = KNOCK_OUT_DATA[i + 1];
                return (
                  <div key={pairIdx} className={styles.knockOutCardRow}>
                    <span className={styles.knockOutCardLabel}>
                      KO-{pairIdx + 1}
                    </span>
                    <span className={styles.knockOutCardName} title={p1?.name}>
                      {p1?.name ?? "—"}
                    </span>
                    <span className={styles.knockOutCardVs}>VS</span>
                    <span className={styles.knockOutCardName} title={p2?.name}>
                      {p2?.name ?? "—"}
                    </span>
                  </div>
                );
              }
            )}
          </div>
        )}
        {targetRound && (
          <div className={styles.bracketMobile}>
            {targetRound.matches.map((match, i) => (
              <MatchSlot
                key={`${targetRound.round}-${i}`}
                match={match}
                matchLabel={
                  targetRound.round === 7 && i === 0
                    ? "Final"
                    : `R${targetRound.round}-${i + 1}`
                }
                schedule={getMatchSchedule(
                  targetRound.round,
                  i,
                  i <= 5,
                  i <= 5 ? i : undefined
                )}
                isAdminMode={isAdminSupport}
                onAdminClick={
                  isAdminSupport
                    ? () => openAdminPopup(targetRound.round, i)
                    : undefined
                }
              />
            ))}
            {targetRound.round === 5 && targetRound.thirdPlaceMatch && (
              <MatchSlot
                key={`${targetRound.round}-3rd`}
                match={targetRound.thirdPlaceMatch}
                matchLabel="3rd Place"
                schedule={getMatchSchedule(
                  targetRound.round,
                  targetRound.matches.length
                )}
                isAdminMode={isAdminSupport}
                onAdminClick={
                  isAdminSupport
                    ? () =>
                        openAdminPopup(
                          targetRound.round,
                          targetRound.matches.length
                        )
                    : undefined
                }
              />
            )}
          </div>
        )}
      </div>

      {isAdminSupport && openAdminMatch && openMatchData && (
        <div className={styles.adminOverlay} onClick={closeAdminPopup}>
          <div
            className={styles.adminPopup}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className={styles.adminPopupTitle}>Select winner</h3>
            <p className={styles.adminPopupMatch}>{openMatchKey}</p>
            <div className={styles.adminPopupOptions}>
              <button
                type="button"
                className={`${styles.adminPopupBtn} ${
                  selectedWinner === "player1"
                    ? styles.adminPopupBtnSelected
                    : ""
                }`}
                onClick={() => setSelectedWinner("player1")}
              >
                {openMatchData.player1?.name ?? "—"}
              </button>
              <button
                type="button"
                className={`${styles.adminPopupBtn} ${
                  selectedWinner === "player2"
                    ? styles.adminPopupBtnSelected
                    : ""
                }`}
                onClick={() => setSelectedWinner("player2")}
              >
                {openMatchData.player2?.name ?? "—"}
              </button>
            </div>
            {saveStatus === "error" && (
              <p className={styles.adminPopupError}>
                Failed to save. Try again.
              </p>
            )}
            <div className={styles.adminPopupActions}>
              <button
                type="button"
                className={styles.adminPopupCancel}
                onClick={closeAdminPopup}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.adminPopupSave}
                onClick={saveWinner}
                disabled={selectedWinner === null || saveStatus === "saving"}
              >
                {saveStatus === "saving"
                  ? "Saving…"
                  : saveStatus === "done"
                  ? "Saved"
                  : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
