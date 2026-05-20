var isHost;

async function createLobby() {
    // Write lobby to firebase
    const numToGuess = Math.floor(Math.random() * 101);

    const hostID = await getUserIDFirebase();

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
    writeFirebase(lobbyFilePath, lobbyInformation);
    
    console.log("WRITE WORKING");

    // Change user to the waiting page
    isHost = true;
    // test change
}
function guess(number) {
    /*
    if host
        // Create new round
        stuff to write = {
            hostGuess: number
        }
        filePath {
            hostID/rounds/currentRound
        }

    if guest
        // write
        stuff to write = {
            guestGuess: number
        }
        filePath {
            hostID/rounds/currentRound
        }

        // uppdate currentRound
        currentRound++
    */
}