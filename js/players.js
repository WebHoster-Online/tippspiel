import { db } from "./firebase.js";

import {
    collection,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let allUsers = [];

export function initPlayers() {

    const search =
        document.getElementById("playerSearch");

    onSnapshot(
        collection(db, "users"),
        (snapshot) => {

            allUsers = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            renderPlayers(allUsers);
        }
    );

    search?.addEventListener("input", () => {

        const value =
            search.value.toLowerCase();

        const filtered =
            allUsers.filter(user =>
                (user.username || "")
                    .toLowerCase()
                    .includes(value)
            );

        renderPlayers(filtered);
    });
}

function renderPlayers(users) {

    const container =
        document.getElementById("playersList");

    if (!container) return;

    container.innerHTML = users.map(user => `

    <div
      class="panel"
      style="cursor:pointer"
      onclick="showPlayer('${user.id}')"
    >

      <h3>${user.username || "Unbekannt"}</h3>

      <p>
        Punkte:
        ${user.points || 0}
      </p>

    </div>

  `).join("");
}

window.showPlayer = function (id) {

    const user =
        allUsers.find(u => u.id === id);

    if (!user) return;

    alert(
        "Benutzer: " +
        (user.username || "Unbekannt") +
        "\nPunkte: " +
        (user.points || 0)
    );
};