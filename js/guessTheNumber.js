var isHost;
var hostID;

async function createLobby() {
    isHost = true;

    // Write lobby to firebase
    const numToGuess = Math.floor(Math.random() * 101);

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
            "currentRound" : 0
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
    // TODO
}

/**
 * Write the guess to firebase
 * Either writes to hostGuess or guestGuess
 * Will increase the current round if it is the guestGuess
 */
async function guess(number) {
    const currentRoundFilepath = "lobbies/" + hostID + "/gameInformation/currentRound";
    var currentRound = await readFirebase(currentRoundFilepath);

    var filePath;
    if (isHost) {
        filePath = "lobbies/" + hostID + "/rounds/" + currentRound + "/hostGuess";
    } else {
        filePath = "lobbies/" + hostID + "/rounds/" + currentRound + "/guestGuess";
        
        writeFirebase(currentRoundFilepath, currentRound + 1);
    }
    
    writeFirebase(filePath, number);
}