var isHost;
var hostID;
var removeLobbyListener = null;
var removeGuessListener = null;
var removeOnOpponentJoinListener = null;
var removeRematchListener = null;

/*******************************************
 * Functions that handle all lobby logic
 * Creating, joining, deleting, disconnecting, opponent leaving
 *******************************************/
async function createLobby() {
    isHost = true;

    // Write lobby to firebase
    const numToGuess = Math.floor(Math.random() * 101);
    const firstGuesser = (Math.random() < 0.5 ? "host" : "guest");

    hostID = await getUserIDFirebase();

    const userInfoFilepath = "userPublicDetails/" + hostID;
    const userInfo = await readFirebase(userInfoFilepath);
    const hostName = userInfo.name;
    const hostPhotoURL = userInfo.photoURL;
    //TODOTODOTODOTODOTODOTODOTODOTODOTODOTODOTODOTODOTODOTODOTODOTODOTODOTODOTODOTODO

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
    const guestNameFilepath = "lobbies/" + hostID + "/playerInformation/guest/name";
    removeOnOpponentJoinListener = addListenerFirebase(guestNameFilepath, (name) => {
        if (name != "null" && name != undefined) {
            console.log("host");
            startGame();
            removeOnOpponentJoinListener();
        }
    });
}
async function searchForLobby() {
    const lobbyList = await readFirebase("lobbies");
    if (lobbyList == null || lobbyList == undefined) {
        document.getElementById("no-lobbies").innerHTML = ("There are no lobbies available at the moment");
        return;
    }
    
    var haveFoundLobby = false;
    Object.entries(lobbyList).forEach(([lobbyHostID, lobbyInfo]) => {
        if (lobbyInfo.playerInformation.guest.name == "null") {
            haveFoundLobby = true;
            isHost = false;
            hostID = lobbyHostID;
            joinLobby(lobbyInfo);
        }
    });
    if (!haveFoundLobby) {
        document.getElementById("no-lobbies").innerHTML = ("There are no lobbies available at the moment");
    }
    
    async function joinLobby(lobbyInfo) {
        console.log("guest");

        // Create a listner that checks for the lobby getting deleted, which happens when anyone quits or disconnects
        setUpOnDisconnect();

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
    if (removeLobbyListener != null) removeLobbyListener();
    deleteOnDisconnectFirebase(lobbyFilepath);

    // Make a listener that checks for the lobby being deleted and switches to the opponent left screen
    removeLobbyListener = addListenerFirebase(lobbyFilepath, (value) => {
        if (value == null) {
            hostID = null;
            isHost = null;
            changeToGTNBox("opponent-left-box");
        }
    });
}
function leaveLobby() {
    // Cancel all of the listeners
    if (removeLobbyListener != null) removeLobbyListener();
    if (removeGuessListener != null) removeGuessListener();
    if (removeRematchListener != null) removeRematchListener();
    if (removeOnOpponentJoinListener != null) removeOnOpponentJoinListener();
    
    changeToGTNBox("landing-page-box");

    // Delete the lobby
    const lobbyFilePath = "lobbies/" + hostID;
    writeFirebase(lobbyFilePath, null);
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
    const playerInformationFilepath = "lobbies/" + hostID + "/playerInformation";
    const lobbyFilePath = "lobbies/" + hostID;

    // Reset both players wantsRematch if the players want to player again
    if (isHost) {
        var playerInformation = await readFirebase(playerInformationFilepath);
        playerInformation.guest.wantsRematch = "null";
        playerInformation.host.wantsRematch = "null";
        await writeFirebase(playerInformationFilepath, playerInformation);
    }

    // Patch the players profile pictures and usernames
    await patchPlayersProfiles();

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
    removeGuessListener = addListenerFirebase(whoseTurnFilepath, async () => {
        const lobby = await readFirebase(lobbyFilePath);
        if (lobby == undefined) return;

        if (lobby.playerInformation.guest.latestGuess == lobby.gameInformation.number) {
            endGame("guest", lobby.gameInformation.number, unsubscribe);
        } else if (lobby.playerInformation.host.latestGuess == lobby.gameInformation.number) {
            endGame("host", lobby.gameInformation.number, unsubscribe);
        } else {
            displayGameBox(lobby.playerInformation);
        }
    });

    async function patchPlayersProfiles() {
        var playerInformation = await readFirebase(playerInformationFilepath);

        if (isHost) {
            document.getElementById("user-username").innerHTML = playerInformation.host.name;
            //document.getElementById("user-profile-pic").style.backgroundImage = `url(${playerInformation.host.photoURL})`;
            document.getElementById("opponent-username").innerHTML = playerInformation.guest.name;
            //document.getElementById("user-profile-pic").style.backgroundImage = `url(${playerInformation.host.photoURL})`;
        }
    }
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
    removeRematchListener = addListenerFirebase(opponentWantsRematchFilepath, (data) => {
        if (data == true) {
            document.getElementById("rematch").innerHTML = "Your friend wants to play again!";
            removeRematchListener();
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

        removeRematchListener = addListenerFirebase(opponentWantsRematchFilepath, (data) => {
            if (data == true) {
                startGame();
                removeRematchListener();
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