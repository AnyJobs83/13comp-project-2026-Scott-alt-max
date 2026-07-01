/**
 * Sign up button logic, will check if the user is already signed up
 * If they are, take them to the already a user box,
 * if they aren't take them to the sign up page
 */

async function signUp() {
	console.log("sign up");

	// If the user isn't already signed in, run googleAuth
	var userID = getUserIDFirebase();
	if (userID == undefined || userID == null) {
		googleAuth = await authFirebase();
		userID = googleAuth.user.uid;
		sessionStorage.setItem("photoURL", googleAuth.user.photoURL);
	}

	// Redirect to the appropriate box
	var isUser = await checkIsUser(userID);
	if (isUser) {
		changeToRegBox("already-a-user-box");
	} else {
		changeToRegBox("sign-up-box");
	}
}
async function login() {
	console.log("login");
	
	const googleAuth = await authFirebase();
	const userID = googleAuth.user.uid;

	var isUser = await checkIsUser(userID);
	if (isUser) {
		goToHomePage();
	} else {
		changeToRegBox("not-a-user-box");
	}
}
// Checks if the user is in the database, returns true or false
async function checkIsUser(userID) {
	console.log("check is user");

	const FILEPATH = "userPublicDetails/";
	const USERLIST = await readFirebase(FILEPATH);

	console.log(USERLIST);
	
	for (var user in USERLIST) {
		if (user == userID) {
			console.log("User is already signed up");
			return true;
		}
	}
	return false;
}

async function submit() {
	console.log("submit");

	// Called in reverse order from the html so that the checkvalid function
	// puts the user on the first feild that they haven't filled out
	const GAMES_PLAYED = checkValid(document.getElementById('games-played'));
	const SKILL = checkValid(document.getElementById('skill'));
	const EMAIL = checkValid(document.getElementById('email'));
	const ADDRESS = checkValid(document.getElementById('address'));
	const AGE = checkValid(document.getElementById('age'));
	const NAME = checkValid(document.getElementById('name'));
	
	if (NAME == null || AGE == null || ADDRESS == null || EMAIL == null || SKILL == null || GAMES_PLAYED == null) {
		console.log("Not all fields are valid");
		return;
	}

	const USER_PRIVATE_DETAILS = {
		age: AGE,
		address: ADDRESS,
		email: EMAIL,
	};
	const USER_PUBLIC_DETAILS = {
		name: NAME,
		photoURL: sessionStorage.getItem("photoURL"),
		skill: SKILL,
		winRate: 0.00,
		gamesPlayed: GAMES_PLAYED,
		mazeGameHighScore: 0
	};
	
	var userID = await getUserIDFirebase();
	const PRIVATE_FILEPATH = "userPrivateDetails/" + userID;
	const PUBLIC_FILEPATH = "userPublicDetails/" + userID;
	await writeFirebase(PRIVATE_FILEPATH, USER_PRIVATE_DETAILS);
	await writeFirebase(PUBLIC_FILEPATH, USER_PUBLIC_DETAILS);

	goToHomePage();
	
	function checkValid(inputObject) {
		var value = inputObject.value;

		if (!value || value == "null") {
			inputObject.classList.add("invalid");
			inputObject.focus();

			document.getElementById("error-message").style.display = "flex";
			return null;
		} else { 
			inputObject.classList.remove("invalid");
			return value.trim();
		}
	}
}
function keepOldAccount() {
	goToHomePage();
}
function makeNewAccount() {
	changeToRegBox("sign-up-box");
}

function goToHomePage() { window.location.href = "index.html"; }

function changeToRegBox(regBox) {
	var allRegBoxes = document.getElementsByClassName("reg-box");
	for (var i = 0; i < allRegBoxes.length; i++) {
		allRegBoxes[i].style.display = ("none");
	}
	document.getElementById(regBox).style.display = "flex";

	/**
	 * Regboxes: 
	 * not-logged-in-box        - shown by default
	 * not-a-user-box           - shown by not-logged-in-box
	 * already-a-user-box       - shown by not-logged-in-box
	 * sign-up-box              - shown by not-logged-in-box, not-a-user-box, and already-a-user-box
	 */
}