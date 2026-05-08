

const tbody = document.querySelector(".leaderboard tbody");
var desiredNumberOfRows = 5;

// Functions for sorting the leaderboard and adding rows to the table

async function sortBy(key, element) {
    // Read the highscores from firebase
    const FILEPATH = "userPublicDetails";
    const sortedData = Object.values(
        await readSortedFirebase(FILEPATH, key, desiredNumberOfRows));

    //Add the top scores to the highscore table
    tbody.innerHTML = "";

    sortedData.forEach((userInformation) => {
        prependRow(userInformation, sortedData.length);
    });

    // Change the arrow to be on the column that is being sorted by
    document.querySelectorAll(".sortable").forEach((header) => {
        header.classList.remove("sort-by");
    });
    element.classList.add("sort-by");
}
function prependRow(userInformation, totalRows) {
    const row = document.createElement("tr");
    var rank = totalRows - tbody.childElementCount;
    row.innerHTML = `
        <td>${rank}</td>
        <td>${userInformation.name}</td>
        <td>${userInformation.mazeGameHighScore}</td>
        <td>${userInformation.gamesPlayed}</td>
        <td>${userInformation.winRate}</td>
        <span class="material-symbols-outlined" onclick="editCell(this.parentElement)">edit</span>`;
    tbody.prepend(row);
}

// Functions for all of the admin functionality
function editCell(cell) {
    var currentValue = cell.innerText;
    var input = document.createElement("input");
    input.type = "text";
    input.value = currentValue;
    cell.innerHTML = "";
    cell.appendChild(input);
    input.focus();
}



// By default, sort by maze game high score
sortBy("mazeGameHighScore", document.querySelector(".sort-by"));
