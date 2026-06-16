import { db } from "./firebase.js";
import { state } from "./state.js";
import { recalcMatchPoints, isMatchLocked } from "./points.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

let unsubAdminMatches = null;

/* -------------------------
   INIT
-------------------------- */
export function initAdmin() {
  window.createMatch = createMatch;
  window.saveResult = saveResult;
  window.deleteMatch = deleteMatch;
}

/* -------------------------
   ADMIN CHECK (REAL)
-------------------------- */
function isAdmin() {
  return state.isAdmin === true;
}

/* -------------------------
   CREATE MATCH
-------------------------- */
export async function createMatch() {

  if (!isAdmin()) return;

  const homeTeam = document.getElementById("homeTeam")?.value?.trim();
  const awayTeam = document.getElementById("awayTeam")?.value?.trim();
  const matchDateValue = document.getElementById("matchDate")?.value;

  if (!homeTeam || !awayTeam || !matchDateValue) {
    alert("Bitte Heimteam, Auswärtsteam und Datum ausfüllen.");
    return;
  }

  const matchDate = new Date(matchDateValue);
  if (Number.isNaN(matchDate.getTime())) {
    alert("Ungültiges Datum.");
    return;
  }

  try {
    await addDoc(collection(db, "matches"), {
      homeTeam,
      awayTeam,
      date: Timestamp.fromDate(matchDate),
      homeGoals: null,
      awayGoals: null,
      finished: false,
      createdAt: serverTimestamp()
    });

    document.getElementById("homeTeam").value = "";
    document.getElementById("awayTeam").value = "";
    document.getElementById("matchDate").value = "";

    alert("Spiel erstellt.");
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

/* -------------------------
   LOAD MATCHES (REALTIME)
-------------------------- */
export function loadAdminMatches() {
  const container = document.getElementById("adminMatches");
  if (!container) return;

  if (unsubAdminMatches) unsubAdminMatches();

  unsubAdminMatches = onSnapshot(query(collection(db, "matches")), (snapshot) => {
    const matches = snapshot.docs
      .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
      .sort((a, b) => {
        const ad = a.date?.toDate ? a.date.toDate() : new Date(a.date);
        const bd = b.date?.toDate ? b.date.toDate() : new Date(b.date);
        return ad - bd;
      });

    container.innerHTML =
      matches.map((match) => {
        const matchDate = match.date?.toDate ? match.date.toDate() : new Date(match.date);
        const locked = isMatchLocked(match);

        return `
          <article class="match-card">
            <div class="match-head">
              <div>
                <div class="match-title">
                  ${escapeHtml(match.homeTeam)} – ${escapeHtml(match.awayTeam)}
                </div>
                <div class="match-meta">${formatDate(matchDate)}</div>
              </div>

              <div class="badge-row">
                <span class="badge ${match.finished ? "green" : locked ? "red" : "gray"}">
                  ${match.finished ? "Ergebnis gesetzt" : locked ? "Gesperrt" : "Bearbeitbar"}
                </span>
              </div>
            </div>

            <div class="tip-row">
              <input class="score-input" type="number" min="0"
                id="realHome-${match.id}"
                value="${match.homeGoals ?? ""}" />

              <span class="tip-sep">:</span>

              <input class="score-input" type="number" min="0"
                id="realAway-${match.id}"
                value="${match.awayGoals ?? ""}" />

              <button class="primary save-btn" onclick="saveResult('${match.id}')">
                Ergebnis speichern
              </button>

              <button class="secondary save-btn" onclick="deleteMatch('${match.id}')">
                Löschen
              </button>
            </div>
          </article>
        `;
      }).join("") || `<div class="panel"><p>Noch keine Spiele angelegt.</p></div>`;
  });
}

/* -------------------------
   SAVE RESULT
-------------------------- */
export async function saveResult(matchId) {
  if (!isAdmin()) return;

  const homeGoals = Number(document.getElementById(`realHome-${matchId}`)?.value);
  const awayGoals = Number(document.getElementById(`realAway-${matchId}`)?.value);

  if (
    Number.isNaN(homeGoals) ||
    Number.isNaN(awayGoals) ||
    homeGoals < 0 ||
    awayGoals < 0
  ) {
    alert("Bitte gültige Ergebniswerte eingeben.");
    return;
  }

  try {
    await updateDoc(doc(db, "matches", matchId), {
      homeGoals,
      awayGoals,
      finished: true
    });

    await recalcMatchPoints(matchId);

    alert("Ergebnis gespeichert und Punkte neu berechnet.");
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

/* -------------------------
   DELETE MATCH
-------------------------- */
export async function deleteMatch(matchId) {
  if (!isAdmin()) return;

  const ok = confirm("Spiel wirklich löschen?");
  if (!ok) return;

  try {
    await deleteDoc(doc(db, "matches", matchId));
    alert("Spiel gelöscht.");
  } catch (error) {
    console.error(error);
    alert(error.message);
  }
}

/* -------------------------
   HELPERS
-------------------------- */
function formatDate(date) {
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[m]);
}

window.seedGroupE = async function () {

  const matches = [
    {
      homeTeam: "Deutschland",
      awayTeam: "Curaçao",
      date: "2026-06-14T19:00"
    },
    {
      homeTeam: "Elfenbeinküste",
      awayTeam: "Ecuador",
      date: "2026-06-15T01:00"
    },
    {
      homeTeam: "Deutschland",
      awayTeam: "Elfenbeinküste",
      date: "2026-06-20T22:00"
    },
    {
      homeTeam: "Ecuador",
      awayTeam: "Curaçao",
      date: "2026-06-21T02:00"
    },
    {
      homeTeam: "Ecuador",
      awayTeam: "Deutschland",
      date: "2026-06-25T22:00"
    },
    {
      homeTeam: "Curaçao",
      awayTeam: "Elfenbeinküste",
      date: "2026-06-25T22:00"
    }
  ];

  for (const match of matches) {
    await addDoc(collection(db, "matches"), {
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      date: Timestamp.fromDate(new Date(match.date)),
      homeGoals: null,
      awayGoals: null,
      finished: false,
      createdAt: serverTimestamp()
    });
  }

  alert("Gruppe E angelegt!");
};