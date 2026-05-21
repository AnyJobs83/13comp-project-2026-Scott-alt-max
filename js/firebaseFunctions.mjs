// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, set, get, update, query, orderByChild, limitToFirst, limitToLast, onValue } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";

var database;
var googleAuth;
var userID;

// Functions to initialise and authenticate
function initialiseFirebase() {
    console.log("initalising Firebase...") //DIAG
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
    console.info(database); //DIAG
}
function authFirebase() {
    const AUTH = getAuth();
    const PROVIDER = new GoogleAuthProvider();

    // The following makes Google ask the user to select the account
    PROVIDER.setCustomParameters({
        prompt: 'select_account'
    });
    return signInWithPopup(AUTH, PROVIDER).then((result) => {
        googleAuth = result;
        console.log(googleAuth); //DIAG

        console.log("Authentication successful"); //DIAG
        console.log("User Email: " + googleAuth._tokenResponse.email); //DIAG
        console.log("User Local ID: " + googleAuth.user.uid); //DIAG

        userID = googleAuth.user.uid;

        return googleAuth;
    }).catch((error) => {
        console.log("Authentication unsuccessful"); //DIAG
        console.log(error); //DIAG
    });
}
function getUserIDFirebase() {
    console.log("getting user ID"); //DIAG
    var auth = getAuth();
    if (auth.currentUser == null) {
        return null;
    } else {
        return auth.currentUser.uid;
    }
}
function signInWithPreviousAccount() {
    hideBody();
    const AUTH = getAuth();
    var currentPage = window.location.href;

    onAuthStateChanged(AUTH, (user) => {
        if (user) {
            // console.log("User doesn't need to sign in"); //DIAG

            showBody();
            
            // if (currentPage.includes("registration.html")) {
            //     window.location.href = "index.html";
            // }
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
        console.log("Authorisation state detection error");
        console.log(error);
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
    signOut(AUTH).then(() => {
        console.log("Sign out successful");
    }).catch((error) => {
        console.log("Error with signing out");
        console.log(error);
    });
}

// Functions to read stuff from the database
function readFirebase(FILEPATH) {
    const REF = ref(database, FILEPATH);

    return get(REF).then((snapshot) => {
        var data = snapshot.val();

        if (data != null) {
            console.log("Successfully read database information:");
            console.log(data);
            return data;
        } else {
            console.log("Attempting to read a value that doesn't exist");
            console.log(data);
            return null
        }
    }).catch((error) => {
        console.log("Error with reading the database");
        console.log(error);
        return null
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
        console.log("Error with reading the sorted database");
        console.log(error);
        return null;
    });
}

// Functions to write to the database
function writeFirebase(FILEPATH, DATA) {
    if (typeof FILEPATH != "string") {
        console.log(FILEPATH);
        throw new Error("You are passing a filepath to the write function that isnt a string");
    }

    const REF = ref(database, FILEPATH);

    set(REF, DATA).then(() => {
        console.log("Written the following information to the database:");
        console.log(DATA);
    }).catch((error) => {
        console.log("Error with writing to the database");
        console.log(error);
    });
}

window.authFirebase = authFirebase;
window.getUserIDFirebase = getUserIDFirebase;
window.logoutFirebase = logoutFirebase;
window.readFirebase = readFirebase;
window.readSortedFirebase = readSortedFirebase;
window.writeFirebase = writeFirebase;
initialiseFirebase();
signInWithPreviousAccount();