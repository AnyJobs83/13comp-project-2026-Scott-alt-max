var isHost;
var hostID;
var lobbyListener = null;

/*******************************************
 * Functions that handle all lobby logic
 * Creating, joining, deleting, opponentLeaving
 *******************************************/
async function createLobby() {
    isHost = true;

    // Write lobby to firebase
    const numToGuess = Math.floor(Math.random() * 101);
    const firstGuesser = (Math.random() < 0.5 ? "host" : "guest");

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
            "whoseTurn": firstGuesser
        },
        "playerInformation": {
            "host": {
                "name": hostName,
                "latestGuess" : "null",
                "wantsRematch" : "null"
            },
            "guest": {
                "name" : "null",
                "latestGuess" : "null",
                "wantsRematch" : "null"
            }
        }
    };

    const lobbyFilePath = "lobbies/" + hostID;
    await writeFirebase(lobbyFilePath, lobbyInformation);

    // Create a listner that checks for the lobby getting deleted, which happens when anyone quits or disconnects
    setUpOnDisconnect();

    // Change user to the waiting page
    await changeToGTNBox("waiting-for-guest-box");

    // Set up listener that will redirect to the game-box when a guest joins
    // Knows that a guest joins because their name will get written to firebase
    const playerInformationFilePath = "lobbies/" + hostID + "/playerInformation/guest/name";
    const unsubscribe = addListenerFirebase(playerInformationFilePath, (data) => {
        if (data != "null") {
            console.log("host");
            startGame();
            unsubscribe();
        }
    });
}
async function searchForLobby() {
    const lobbyList = await readFirebase("lobbies");
    
    var haveFoundLobby = false;
    Object.entries(lobbyList).forEach(([lobbyHostID, lobbyInfo]) => {
        if (lobbyInfo.playerInformation.guest.name == "null") {
            isHost = false;
            haveFoundLobby = true;
            console.log("guest");
            hostID = lobbyHostID;
            joinLobby(lobbyInfo);
        }
    });
    if (!haveFoundLobby) {
        // TODO
        // show no lobbies available
    }
    
    async function joinLobby(lobbyInfo) {
        // Write the guestName to firebase
        const guestNameFilePath = `userPublicDetails/${await getUserIDFirebase()}/name`;
        const guestName = await readFirebase(guestNameFilePath);

        const playerNameFilepath = `lobbies/${hostID}/playerInformation/guest/name`;
        await writeFirebase(playerNameFilepath, guestName);
        
        // Change user to the game page
        startGame();
    }
}
function setUpOnDisconnect() {
    const lobbyFilepath = "lobbies/" + hostID;

    // Make on disconnect that, when the player disconnects, it deletes the lobby
    if (lobbyListener != null) lobbyListener.unsubscribe();
    deleteOnDisconnectFirebase(lobbyFilepath);

    // Make a listener that checks for the lobby being deleted and switches to the opponent left screen
    lobbyListener = addListenerFirebase(lobbyFilepath, (value) => {
        if (value == null) {
            hostID = null;
            isHost = null;
            changeToGTNBox("opponent-left-box");
        }
    });
}
function leaveLobby() {
    
}
async function deleteLobby() {
    if (hostID == null) {
        console.log("hostID is null, so cannot delete lobby");
        return;
    }
    
    const lobbyFilePath = "lobbies/" + hostID;
    await writeFirebase(lobbyFilePath, null);
}

/*******************************************
 * Functions that handle all game logic
 * Guessing, swapping the GTN box if its not your turn
 *******************************************/
async function guess() {
    const guess = document.getElementById("guess-input").value;

    const whoseTurnFilePath = "lobbies/" + hostID + "/gameInformation/whoseTurn";
    const whoseTurn = await readFirebase(whoseTurnFilePath);

    // Write the guess to firebase
    const guessFilePath = "lobbies/" + hostID + "/playerInformation/" + whoseTurn + "/latestGuess";
    await writeFirebase(guessFilePath, guess);

    // Change whose turn it is
    const newWhoseTurn = (whoseTurn == "host" ? "guest" : "host");
    writeFirebase(whoseTurnFilePath, newWhoseTurn);
}
async function startGame() {
    // Reset both players wantsRematch if the players want to player again
    if (isHost) {
        const playerInformationFilepath = "lobbies/" + hostID + "/playerInformation";
        var playerInformation = await readFirebase(playerInformationFilepath);
        playerInformation.guest.wantsRematch = "null";
        playerInformation.host.wantsRematch = "null";
        await writeFirebase(playerInformationFilepath, playerInformation);
    }

    // This is the first time the user has landed on the game page
    // Therefore, they cannot be shown the other users guess, or if they are too high or too low,
    // Because they have not guessed yet
    // Therefore, do not set up the box, just show the defaults
    const whoseTurnFilepath = "lobbies/" + hostID + "/gameInformation/whoseTurn";
    const whoseTurn = await readFirebase(whoseTurnFilepath);

    if ((whoseTurn == "host" && isHost) || (whoseTurn == "guest" && !isHost)) {
        changeToGTNBox("your-turn-box");
    } else {
        changeToGTNBox("not-your-turn-box");
    }

    // Make a listener that, when whoseTurn changes, that checks for winning and swaps the gamebox
    const lobbyFilePath = "lobbies/" + hostID;
    const unsubscribe = addListenerFirebase(whoseTurnFilepath, async (uselessInfo) => {
        const lobby = await readFirebase(lobbyFilePath);
        if (lobby.playerInformation.guest.latestGuess != "null" || lobby.playerInformation.host.latestGuess != "null") {
            if (lobby.playerInformation.guest.latestGuess == lobby.gameInformation.number) {
                endGame("guest", lobby.gameInformation.number, unsubscribe);
            } else if (lobby.playerInformation.host.latestGuess == lobby.gameInformation.number) {
                endGame("host", lobby.gameInformation.number, unsubscribe);
            } else {
                displayGameBox(lobby.playerInformation);
            }
        }
    });
}
async function displayGameBox(playerInformation) {
    const whoseTurnFilepath = "lobbies/" + hostID + "/gameInformation/whoseTurn";
    const whoseTurn = await readFirebase(whoseTurnFilepath);

    const targetFilepath = "lobbies/" + hostID + "/gameInformation/number";
    const target = await readFirebase(targetFilepath);

    if ((whoseTurn == "host" && isHost) || (whoseTurn == "guest" && !isHost)) {
        setupYourTurnBox(playerInformation, target);
        changeToGTNBox("your-turn-box");
    } else {
        setupNotYourTurnBox(playerInformation, target);
        changeToGTNBox("not-your-turn-box");
    }

    function setupNotYourTurnBox(playerInformation, target) {
        // Read the user's previous guess and tell them if they are too high or too low
        const usersGuess = (isHost) ? playerInformation.host.latestGuess : playerInformation.guest.latestGuess;

        if (usersGuess > target) {
            document.getElementById("how-far-off").innerHTML = usersGuess + " is too high";
        } else if (usersGuess < target) {
            document.getElementById("how-far-off").innerHTML = usersGuess + " is too low";
        } else {
            console.log("should get redirected");
        }
    }
    function setupYourTurnBox(playerInformation, target) {
        // Display the opponents lastest guess unless they haven't had their first guess yet
        const opponentsGuess = (isHost) ? playerInformation.guest.latestGuess : playerInformation.host.latestGuess;
           
        if (opponentsGuess > target) {
            document.getElementById("opponent-guess").innerHTML = "Your opponent guessed: " + opponentsGuess + " (it was too high)";
        } else if (opponentsGuess < target) {
            document.getElementById("opponent-guess").innerHTML = "Your opponent guessed: " + opponentsGuess + " (it was too low)";
        } else {
            console.log("should get redirected");
        }
    }
}

/*******************************************
 * Functions that handle all game over logic
 * Updating the gamebox, requesting a rematch, and resetting game state
 *******************************************/
function endGame(whoWon, number, unsub) {
    unsub();
    changeToGTNBox("game-over-box");

    // Start resetting the game so that when both players want a rematch all variables have been reset
    // Does create a race condition between resetting and both players wanting a rematch
    resetGame();

    // Fix the html
    if (whoWon == "host" && isHost || whoWon == "guest" && !isHost) {
        document.getElementById("winner").innerHTML = "You Won!!!";
    } else {
        document.getElementById("winner").innerHTML = "Shame. You lost :(";
    }

    document.getElementById("winning-number").innerHTML = number;

    // Set up listener that will tell the user if the other player wants to play again
    const opponentWantsRematchFilepath = (isHost) ? "lobbies/" + hostID + "/playerInformation/guest/wantsRematch" : "lobbies/" + hostID + "/playerInformation/host/wantsRematch";
    const unsubscribe = addListenerFirebase(opponentWantsRematchFilepath, (data) => {
        if (data == true) {
            document.getElementById("rematch").innerHTML = "Your friend wants to play again!";
            unsubscribe();
        }
    });
}
function resetGame() {
    if (isHost) {
        const numToGuess = Math.floor(Math.random() * 101);
        const firstGuesser = (Math.random() < 0.5 ? "host" : "guest");

        const newGameInformation = {
            "number": numToGuess,
            "whoseTurn": firstGuesser
        }

        // Do not need to await the writes because they do not affect each other
        const newGameInformationFilepath = "lobbies/" + hostID + "/gameInformation";
        writeFirebase(newGameInformationFilepath, newGameInformation);

        const guestLatestGuessFilepath = "lobbies/" + hostID + "/playerInformation/guest/latestGuess";
        writeFirebase(guestLatestGuessFilepath, "null");

        const hostLatestGuessFilepath = "lobbies/" + hostID + "/playerInformation/host/latestGuess";
        writeFirebase(hostLatestGuessFilepath, "null");
    }
}
async function requestRematch() {
    const userWantsRematchFilepath = (isHost) ? "lobbies/" + hostID + "/playerInformation/host/wantsRematch" : "lobbies/" + hostID + "/playerInformation/guest/wantsRematch";
    await writeFirebase(userWantsRematchFilepath, true);
    
    const opponentWantsRematchFilepath = (isHost) ? "lobbies/" + hostID + "/playerInformation/guest/wantsRematch" : "lobbies/" + hostID + "/playerInformation/host/wantsRematch";
    var opponentWantsRematch = await readFirebase(opponentWantsRematchFilepath);

    // If the opponent already wants a rematch, then rematch,
    // If they don't, add a listener to check for if they do
    if (opponentWantsRematch == true) {
        startGame();
    } else {
        changeToGTNBox("waiting-for-rematch-box");

        const unsubscribe = addListenerFirebase(opponentWantsRematchFilepath, (data) => {
            if (data == true) {
                startGame();
                unsubscribe();
            }
        });
    }
}

/*******************************************
 * Simple function to swap the GTN box
 *******************************************/
function changeToGTNBox(GTNBox) {
    //console.log("changing gtn box" + GTNBox);
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