

const tbody = document.querySelector(".leaderboard tbody");

var desiredNumberOfRows = 5;

async function readLeaderboardByKey(key) {
    const FILEPATH = "userPublicDetails";
    const snapshot = Object.values(
        await readSortedFirebase(FILEPATH, key, desiredNumberOfRows));

    console.log(snapshot); //DIAG
    
    //Add the top scores to the highscore table
    tbody.innerHTML = "";

    snapshot.forEach((userInformation) => {
        console.log(userInformation);
        prependRow(userInformation, snapshot.length);
    });

    // Remove arrows from all other elements and add it to this one
    // document.querySelectorAll(".arrows").forEach((span) => span.innerHTML = "");
    // element.querySelector("span").innerHTML = "▼";
}
function prependRow(userInformation, totalRows) {
    const row = document.createElement("tr");
    var rank = totalRows - tbody.childElementCount;
    row.innerHTML = `<td>${rank}</td>
                    <td>${userInformation.name}</td>
                    <td>${userInformation.mazeGameHighScore}</td>
                    <td>${userInformation.gamesPlayed}</td>
                    <td>${userInformation.winRate}</td>`;;
    tbody.prepend(row);
}

readLeaderboardByKey("mazeGameHighScore");