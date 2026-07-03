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
    hostID = await getUserIDFirebase();

    // Check the user isn't already in a game
    const lobbyList = await readFirebase("lobbies");
    if (checkIfUserInGame(lobbyList) == true) return;

    // Write lobby to firebase
    const numToGuess = Math.floor(Math.random() * 101);
    const firstGuesser = (Math.random() < 0.5 ? "host" : "guest");


    const lobbyInformation = {
        "gameInformation": {
            "number": numToGuess,
            "whoseTurn": firstGuesser
        },
        "playerInformation": {
            "host": {
                "ID": hostID,
                "name": sessionStorage.getItem("username"),
                "photoURL" : sessionStorage.getItem("userPhotoURL"),
                "latestGuess" : "null",
                "wantsRematch" : "null"
            },
            "guest": {
                "ID": "null",
                "name" : "null",
                "photoURL" : "null",
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
    const guestIDFilepath = "lobbies/" + hostID + "/playerInformation/guest/ID";
    removeOnOpponentJoinListener = addListenerFirebase(guestIDFilepath, (name) => {
        if (name != "null" && name != undefined) {
            startGame();
            removeOnOpponentJoinListener();
        }
    });
}
async function searchForLobby() {
    const lobbyList = await readFirebase("lobbies");

    if (lobbyList == null || lobbyList == undefined) {
        document.getElementById("landing-page-box-error").innerHTML = ("There are no lobbies available at the moment");
        return;
    }

    if (checkIfUserInGame(lobbyList) == true) return;

    var haveFoundLobby = false;
    Object.entries(lobbyList).forEach(([lobbyHostID, lobbyInfo]) => {
        if (lobbyInfo.playerInformation.guest.ID == "null") {
            haveFoundLobby = true;
            isHost = false;
            hostID = lobbyHostID;
            joinLobby(lobbyInfo);
        }
    });
    if (!haveFoundLobby) {
        document.getElementById("landing-page-box-error").innerHTML = ("There are no lobbies available at the moment");
    }
    
    async function joinLobby(lobbyInfo) {
        // Write the guest's name, photoURL, and ID to firebase
        const guestName = sessionStorage.getItem("username");
        const guestPhotoURL = sessionStorage.getItem("userPhotoURL");
        const guestID = await getUserIDFirebase();
        
        // Create a listner that checks for the lobby getting deleted, which happens when anyone quits or disconnects
        setUpOnDisconnect();

        const newGuestInfo = {
            "ID" : guestID,
            "name" : guestName,
            "photoURL" : guestPhotoURL,
            "latestGuess" : "null",
            "wantsRematch" : "null"
        }

        const guestInfoFilepath = `lobbies/${hostID}/playerInformation/guest`;
        await writeFirebase(guestInfoFilepath, newGuestInfo);
        
        // Change user to the game page and start the game
        startGame();
    }
}
function checkIfUserInGame(lobbyList) {
    if (lobbyList == null || lobbyList == undefined) return false;

    const userID = getUserIDFirebase();
    
    var userInGame = false;
    Object.entries(lobbyList).forEach(([lobbyHostID, lobbyInfo]) => {
        if (lobbyHostID == userID) {
            document.getElementById("landing-page-box-error").innerHTML = (`
                You may not perform this action, <br> you already have an active lobby
            `);
            userInGame = true;
        }
    });
    return userInGame;
}
function setUpOnDisconnect() {
    const lobbyFilepath = "lobbies/" + hostID;

    // Make on disconnect that, when the player disconnects, it deletes the lobby
    deleteOnDisconnectFirebase(lobbyFilepath);

    // Make a listener that checks for the lobby being deleted and switches to the opponent left screen
    removeLobbyListener = addListenerFirebase(lobbyFilepath, (value) => {
        if (value == null) {
            // Cancel all of the listeners
            if (removeLobbyListener != null) removeLobbyListener();
            if (removeGuessListener != null) removeGuessListener();
            if (removeRematchListener != null) removeRematchListener();
            if (removeOnOpponentJoinListener != null) removeOnOpponentJoinListener();

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
    // Each player resets their wants rematch at the start of the game
    if (isHost) {
        const rematchFilepath = "lobbies/" + hostID + "/playerInformation/host/wantsRematch"
        await writeFirebase(rematchFilepath, "null");
    } else {
        const rematchFilepath = "lobbies/" + hostID + "/playerInformation/guest/wantsRematch"
        await writeFirebase(rematchFilepath, "null");
    }

    // Patch the players profile pictures and usernames
    await patchPlayersProfiles();

    // This is the first time the user has landed on the game page
    // Therefore, they cannot be shown the other users guess, or if they are too high or too low,
    // Because they have not guessed yet
    // Therefore, do not set up the box, just show the defaults
    displayGameBox(null, true);

    // Make a listener that, when whoseTurn changes, that checks for winning and swaps the gamebox
    const whoseTurnFilepath = "lobbies/" + hostID + "/gameInformation/whoseTurn";
    removeGuessListener = addListenerFirebase(whoseTurnFilepath, async () => {
        const lobbyFilePath = "lobbies/" + hostID;
        const lobby = await readFirebase(lobbyFilePath);
        
        if (lobby == undefined) return;

        if (lobby.playerInformation.guest.latestGuess == lobby.gameInformation.number) {
            endGame("guest", lobby.gameInformation.number, removeGuessListener);
        } else if (lobby.playerInformation.host.latestGuess == lobby.gameInformation.number) {
            endGame("host", lobby.gameInformation.number, removeGuessListener);
        } else {
            displayGameBox(lobby.playerInformation, false);
        }
    });

    async function patchPlayersProfiles() {
        const playerInformationFilepath = "lobbies/" + hostID + "/playerInformation";
        var playerInformation = await readFirebase(playerInformationFilepath);

        if (isHost) {
            document.querySelectorAll(".user-username").forEach(element => element.innerHTML = playerInformation.host.name);
            document.querySelectorAll(".user-profile-pic").forEach(element => element.style.backgroundImage = `url(${playerInformation.host.photoURL})`);
            document.querySelectorAll(".opponent-username").forEach(element => element.innerHTML = playerInformation.guest.name);
            document.querySelectorAll(".opponent-profile-pic").forEach(element => element.style.backgroundImage = `url(${playerInformation.guest.photoURL})`);
        } else {
            document.querySelectorAll(".user-username").forEach(element => element.innerHTML = playerInformation.guest.name);
            document.querySelectorAll(".user-profile-pic").forEach(element => element.style.backgroundImage = `url(${playerInformation.guest.photoURL})`);
            document.querySelectorAll(".opponent-username").forEach(element => element.innerHTML = playerInformation.host.name);
            document.querySelectorAll(".opponent-profile-pic").forEach(element => element.style.backgroundImage = `url(${playerInformation.host.photoURL})`);
        }
    }
}
async function displayGameBox(playerInformation, isFirstTurn) {
    const whoseTurnFilepath = "lobbies/" + hostID + "/gameInformation/whoseTurn";
    const whoseTurn = await readFirebase(whoseTurnFilepath);

    const targetFilepath = "lobbies/" + hostID + "/gameInformation/number";
    const target = await readFirebase(targetFilepath);

    if ((whoseTurn == "host" && isHost) || (whoseTurn == "guest" && !isHost)) {
        setupYourTurnBox(isFirstTurn, playerInformation, target);
        changeToGTNBox("your-turn-box");
    } else {
        setupNotYourTurnBox(isFirstTurn, playerInformation, target);
        changeToGTNBox("not-your-turn-box");
    }

    function setupNotYourTurnBox(isFirstTurn, playerInformation, target) {
        if (isFirstTurn) {
            document.getElementById("how-far-off").innerHTML = "";
            return;
        }

        // Read the user's previous guess and tell them if they are too high or too low
        const usersGuess = (isHost) ? playerInformation.host.latestGuess : playerInformation.guest.latestGuess;

        if (usersGuess > target) {
            document.getElementById("how-far-off").innerHTML = usersGuess + " is too high";
        } else if (usersGuess < target) {
            document.getElementById("how-far-off").innerHTML = usersGuess + " is too low";
        } else {
            // Someone has won, listener will redirect
        }
    }
    function setupYourTurnBox(isFirstTurn, playerInformation, target) {
        if (isFirstTurn) {
            document.getElementById("opponent-guess").innerHTML = "";
            return;
        }

        // Display the opponents lastest guess unless they haven't had their first guess yet
        const opponentsGuess = (isHost) ? playerInformation.guest.latestGuess : playerInformation.host.latestGuess;
           
        if (opponentsGuess > target) {
            document.getElementById("opponent-guess").innerHTML = "Your opponent guessed: " + opponentsGuess + " (it was too high) \n";
        } else if (opponentsGuess < target) {
            document.getElementById("opponent-guess").innerHTML = "Your opponent guessed: " + opponentsGuess + " (it was too low) \n";
        } else {
            // Someone has won, listener will redirect
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
    
    // update all of the user's relvent stats in the data
    updateStats(whoWon);

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

    async function updateStats(whoWon) {
        const userInformationFilepath = `userPublicDetails/${getUserIDFirebase()}`;
        const oldStats = await readFirebase(userInformationFilepath);

        const newGamesPlayed = Number(oldStats.gamesPlayed) + 1;
        
        var gamesWon = Math.round(Number(oldStats.gamesPlayed) * Number(oldStats.winRate));
        if (whoWon == "host" && isHost || whoWon == "guest" && !isHost) gamesWon++;
        const newWinRate = gamesWon / newGamesPlayed;

        var newStats = {
            "gamesPlayed": Number(newGamesPlayed),
            "mazeGameHighScore": oldStats.mazeGameHighScore,
            "name": oldStats.name,
            "photoURL": oldStats.photoURL,
            "winRate": newWinRate
        }

        writeFirebase(userInformationFilepath, newStats);
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