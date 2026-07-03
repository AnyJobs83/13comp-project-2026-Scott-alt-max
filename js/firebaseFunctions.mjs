// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, set, get, update, query, orderByChild, limitToFirst, limitToLast, onValue, onDisconnect } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

var database;

// Functions for initilisation and authentication
function initialiseFirebase() {
    const FB_GAMECONFIG = {
        apiKey: "AIzaSyDyKVbIE0T5C62PV7mFtLm4gAuewL0zPVQ",
        authDomain: "scott-barlow-y13-compsci.firebaseapp.com",
        projectId: "scott-barlow-y13-compsci",
        storageBucket: "scott-barlow-y13-compsci.firebasestorage.app",
        messagingSenderId: "14148227974",
        appId: "1:14148227974:web:73630eff747dc5d0e21207",
        measurementId: "G-2DY0WENQT4",
        databaseURL: "https://scott-barlow-y13-compsci-default-rtdb.asia-southeast1.firebasedatabase.app"
    };
    
    const FB_GAMEAPP = initializeApp(FB_GAMECONFIG);
    database = getDatabase(FB_GAMEAPP);
}
function authFirebase() {
    const AUTH = getAuth();
    const PROVIDER = new GoogleAuthProvider();

    // The following makes Google ask the user to select the account
    PROVIDER.setCustomParameters({
        prompt: 'select_account'
    });
    return signInWithPopup(AUTH, PROVIDER).then((googleAuth) => {
        return googleAuth;
    }).catch((error) => {
        console.log(error);
        return error;
    });
}
function getUserIDFirebase() {
    var auth = getAuth();
    if (auth.currentUser == null) {
        return null;
    } else {
        return auth.currentUser.uid;
    }
}
function checkIfAdmin() {
    const adminFilepath = `admins/${getUserIDFirebase()}`;

    return readFirebase(adminFilepath).then((snapshot) => {
        if (snapshot == true) {
            return true;
        } else {
            return false;
        }
    });
}
function signInWithPreviousAccount() {
    hideBody();
    const AUTH = getAuth();
    var currentPage = window.location.href;

    return onAuthStateChanged(AUTH, (user) => {
        if (user) {
            showBody();
        } else {
            // Go to registration page and show it            
            if (currentPage.includes("registration.html")) {
                showBody();
            } else {
                window.location.href = "registration.html";
            }
        }
    }, (error) => {
        showBody();
        console.log(error);
        return error;
    });

    function hideBody() {
        document.body.style.display = "none";
        document.documentElement.style.cursor = 'progress';
    }
    function showBody() {
        document.body.style.display = "";
        document.documentElement.style.cursor = 'default';
    }
}
function logoutFirebase() {
    const AUTH = getAuth();
    return signOut(AUTH).then(() => {
        sessionStorage.removeItem("userPhotoURL");
        sessionStorage.removeItem("username");
    }).catch((error) => {
        console.log(error);
        return(error);
    });
}

// Functions to read stuff from the database
function readFirebase(FILEPATH) {
    const REF = ref(database, FILEPATH);

    return get(REF).then((snapshot) => {
        var data = snapshot.val();

        if (data != null) {
            return data;
        } else {
            return null
        }
    }).catch((error) => {
        console.log(error);
        return error;
    });
}
function readSortedFirebase(FILEPATH, KEY, LIMIT) {
    const REF = query(ref(database, FILEPATH), orderByChild(KEY), limitToLast(LIMIT));

    return get(REF).then((snapshot) => {
        if (snapshot == null) throw ("Attempting to read a value that doesn't exist");
        
        var data = [];

        snapshot.forEach((child) => {
            data.push({
                userID: child.key, 
                userInformation: child.val()
            });
        });

        return data;
    }).catch((error) => {
        return error;
    });;
}

// Functions to write to the database
function writeFirebase(FILEPATH, DATA) {
    const REF = ref(database, FILEPATH);

    return set(REF, DATA).then(() => {
    }).catch((error) => {
        return error;
    });
}

// Functions to create listeners
function addListenerFirebase(FILEPATH, FUNCTION) {
    const REF = ref(database, FILEPATH);

    return onValue(REF, (snapshot) => {
        const data = snapshot.val();

        FUNCTION(data);
    });
}
function deleteOnDisconnectFirebase(FILEPATH) {
    const REF = ref(database, FILEPATH);

    onDisconnect(REF).remove();
}
function onConnectToFirebase(func) {
    const connectedRef = ref(database, ".info/connected");

    return onValue(connectedRef, (snapshot) => {
        const connected = snapshot.val();

        if (connected) {
            func();
        }
    });
}

// Function to return an error as a string
function getErrorMessageFirebase(error) {
    switch (error.code) {
        case "auth/network-request-failed":
            return "No internet connection.";

        case "auth/invalid-credential":
            return "Incorrect email or password.";

        case "PERMISSION_DENIED":
            return "You don't have permission.";

        case "NETWORK_ERROR":
            return "Network error.";

        default:
            console.error(error);
            return "Error.";
    }
}

window.authFirebase = authFirebase;
window.getUserIDFirebase = getUserIDFirebase;
window.logoutFirebase = logoutFirebase;
window.readFirebase = readFirebase;
window.readSortedFirebase = readSortedFirebase;
window.addListenerFirebase = addListenerFirebase;
window.checkIfAdmin = checkIfAdmin;
window.deleteOnDisconnectFirebase = deleteOnDisconnectFirebase;
window.onConnectToFirebase = onConnectToFirebase;
window.writeFirebase = writeFirebase;
initialiseFirebase();
signInWithPreviousAccount();