var isHost;
var hostID;

async function createLobby() {
    isHost = true;

    // Write lobby to firebase
    const numToGuess = Math.floor(Math.random() * 101);
    const firstGuesser = (Math.random() < 0.5 ? "host" : "guest")

    hostID = await getUserIDFirebase();

    const hostNameFilePath = "userPublicDetails/" + hostID + "/name";
    const hostName = await readFirebase(hostNameFilePath);

    if (hostName == null || hostID == null) {
        console.log("hostName:" + hostName);
        console.log("hostID:" + hostID);
        return;
    }

    const lobbyInformation = {
        "gameInformation": {
            "number": numToGuess,
            "currentRound" : 0,
            "whoseTurn": firstGuesser
        },
        "playerInformation": {
            "host": {
                "name": hostName
            }
        }
    };

    const lobbyFilePath = "lobbies/" + hostID;
    await writeFirebase(lobbyFilePath, lobbyInformation);

    // Change user to the waiting page
    await changeToGTNBox("waiting-for-guest-box");

    // Set up listener that will redirect to the game-box when a guest joins
    const playerInformationFilePath = "lobbies/" + hostID + "/playerInformation";
    const unsubscribe = addListenerFirebase(playerInformationFilePath, (data) => {
        if (data.guest != null) {
            displayGameBox();
            unsubscribe();
        }
    });
}
async function searchForLobby() {
    const lobbyList = await readFirebase("lobbies");
    
    Object.entries(lobbyList).forEach(([lobbyHostID, lobbyInfo]) => {
        if (lobbyInfo.playerInformation.guest == null) {
            isHost = false;
            hostID = lobbyHostID;
            joinLobby(lobbyInfo);
        }
    });
}
async function joinLobby(lobbyInfo) {
    // Write the guestName to firebase
    const guestNameFilePath = `userPublicDetails/${await getUserIDFirebase()}/name`;
    const guestName = await readFirebase(guestNameFilePath);

    const playerInfoFilepath = `lobbies/${hostID}/playerInformation/guest`;
    writeFirebase(playerInfoFilepath, {"name": guestName});
    
    // Change user to the game page
    displayGameBox();
}
async function deleteLobby() {
    if (hostID == null) {
        console.log("hostID is null, so cannot delete lobby");
        return;
    }
    
    const lobbyFilePath = "lobbies/" + hostID;
    writeFirebase(lobbyFilePath, null);

    // Change user to the landing page
    await changeToGTNBox("landing-page-box");
}

/**
 * Write the guess to firebase
 * Either writes to hostGuess or guestGuess
 * Will increase the current round if it is the guestGuess
 * Will also change whoseTurn in firebase, which will trigger the box to change
 */
async function guess() {
    const guess = document.getElementById("guess-input").value;
    
    const currentRoundFilepath = "lobbies/" + hostID + "/gameInformation/currentRound";
    var currentRound = await readFirebase(currentRoundFilepath);

    const whoseTurnFilePath = "lobbies/" + hostID + "/gameInformation/whoseTurn";
    var whoseTurn = await readFirebase(whoseTurnFilePath);

    // Increase the currentRound
    writeFirebase(currentRoundFilepath, currentRound + 0.5);

    // Write the guess to firebase
    var guessFilePath = "lobbies/" + hostID + "/rounds/" + Math.floor(currentRound) + "/" + whoseTurn + "Guess";
    writeFirebase(guessFilePath, guess);

    // Change whose turn it is
    var newWhoseTurn = (whoseTurn == "host" ? "guest" : "host");
    writeFirebase(whoseTurnFilePath, newWhoseTurn);
}

async function displayGameBox() {
    const whoseTurnFilePath = "lobbies/" + hostID + "/gameInformation/whoseTurn";
    const whoseTurn = await readFirebase(whoseTurnFilePath);

    if ((whoseTurn == "host" && isHost) || (whoseTurn == "guest" && !isHost)) {
        changeToGTNBox("your-turn-box");
    } else {
        changeToGTNBox("not-your-turn-box");
    }

    // When you change whose turn it is, change the box accordingly
    const unsubscribe = addListenerFirebase(whoseTurnFilePath, (data) => {
        if (data != whoseTurn) {
            displayGameBox();
            unsubscribe();
        }
    });
}
function changeToGTNBox(GTNBox) {
	var allGTNBoxes = document.getElementsByClassName("gtn-box");
	for (var i = 0; i < allGTNBoxes.length; i++) {
		allGTNBoxes[i].style.display = ("none");
	}
   document.getElementById(GTNBox).style.display = ("block");

	/**
	 * GTNboxes:
     * landing-page-box
     * waiting-for-guest-box
     * your-turn-box
     * not-your-turn-box
     * game-over-box
     * waiting-for-rematch-box
     * opponent-left-box
     */
}