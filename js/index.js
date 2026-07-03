

const tbody = document.querySelector("#leaderboard tbody");
var desiredNumberOfRows = 5;
var sortedBy = "mazeGameHighScore";

// ------------------------------------------------------------------------------
// Functions for sorting the leaderboard and adding rows to the table
// ------------------------------------------------------------------------------

async function sortBy(key, element) {
    // Show the loading sign while waiting for the database to respond
    tbody.innerHTML = `<tr><td>Loading leaderboard. . .</td></tr>`;

    sortedBy = key;

    // Read the highscores from firebase
    const sortedData = await readSortedFirebase("userPublicDetails", key, desiredNumberOfRows);
    
    // Clear the table then add the sorted data
    tbody.innerHTML = "";

    var trueNumberOfRows = sortedData.length;
    for(var i = 0; i < trueNumberOfRows; i++) {
        //console.log(sortedData[i].userInformation, tbody.childElementCount);
        prependRow(sortedData[i].userID, sortedData[i].userInformation, trueNumberOfRows);
    };

    // Change the arrow to be on the column that is being sorted by
    document.querySelectorAll(".sortable").forEach((header) => {
        header.classList.remove("sort-by");
    });
    element.classList.add("sort-by");
}
function prependRow(userID, userInformation, totalRows) {
    const row = document.createElement("tr");
    var rank = totalRows - tbody.childElementCount;
    row.innerHTML = `
        <td>${rank}</td>
        <td>${userInformation.name}</td>
        <td>${userInformation.mazeGameHighScore}</td>
        <td>${userInformation.gamesPlayed}</td>
        <td>${userInformation.winRate}</td>
        <td class="edit">
            <span class="material-symbols-outlined" onclick="editRow(this.parentElement.parentElement)">edit</span>
        </td>`;
    row.dataset.userID = userID;
    tbody.prepend(row);
}

// ------------------------------------------------------------------------------
// Functions for all of the admin editing stuff
// ------------------------------------------------------------------------------

async function showAdminIfAdmin() {
    if (await checkIfAdmin() == true) {
        document.getElementById("leaderboard-title").innerHTML = "Admin Leaderboard";
        document.getElementById("leaderboard").classList.toggle("admin");
    }
}
function editRow(row) {
    // Read the current values from the row and store them as HTML string
    const oldRowHTML = row.innerHTML;

    // Skip the rank and edit columns, but change the other cells to be inputs
    for (let i = 1; i < row.children.length - 1; i++) {
        row.children[i].innerHTML = `
            <input class="edit-input" type="text" value="${row.children[i].innerText}">`;
    }

    // Now change the edit icon to be both a check mark and an X
    const editCell = row.children[row.children.length - 1];
    
    editCell.innerHTML = `
        <span class="material-symbols-outlined close-btn">close</span>
        <span class="material-symbols-outlined check-btn">check</span>
    `;

    editCell.querySelector(".close-btn").addEventListener("click", () => cancelEdit(row, oldRowHTML));
    editCell.querySelector(".check-btn").addEventListener("click", () => submitEdit(row));
}
// Runs when the check is clicked for submitting an edit
async function submitEdit(row) {
    // Get the updated values from the input fields and store them in an object
    var editedInformation = {
        name: row.children[1].querySelector(".edit-input").value,
        mazeGameHighScore: Number(row.children[2].querySelector(".edit-input").value),
        gamesPlayed: Number(row.children[3].querySelector(".edit-input").value),
        winRate: Number(row.children[4].querySelector(".edit-input").value)
    }

    // Write the updated information to the database
    const FILEPATH = "userPublicDetails/" + row.dataset.userID;
    await writeFirebase(FILEPATH, editedInformation);
    
    // Redisplay the leaderboard
    sortBy(sortedBy, document.querySelector(".sort-by"));
}
// Runs when the X is clicked for canceling an edit
function cancelEdit(row, oldRowHTML) {
    // Change the cells back to their original values
    row.innerHTML = oldRowHTML;
}

// By default, sort by maze game high score
const cancelOnConnectedListener = onConnectToFirebase(() => {
    sortBy(sortedBy, document.querySelector(".default-sort-by"));
    showAdminIfAdmin();
    cancelOnConnectedListener();
});