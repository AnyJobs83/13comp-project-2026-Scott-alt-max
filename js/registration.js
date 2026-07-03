/**
 * Sign up button logic, will check if the user is already signed up
 * If they are, take them to the already a user box,
 * if they aren't take them to the sign up page
 */

async function signUp() {
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
	const googleAuth = await authFirebase();
	const userID = googleAuth.user.uid;
	sessionStorage.setItem("photoURL", googleAuth.user.photoURL);

	var isUser = await checkIsUser(userID);
	if (isUser) {
		goToHomePage();
	} else {
		changeToRegBox("not-a-user-box");
	}
}
// Checks if the user is in the database, returns true or false
async function checkIsUser(userID) {
	const FILEPATH = "userPublicDetails/";
	const USERLIST = await readFirebase(FILEPATH);
	
	for (var user in USERLIST) {
		if (user == userID) {
			return true;
		}
	}
	return false;
}

async function submit() {
	if (checkFormIsValid() == false) return;

	const USER_PRIVATE_DETAILS = {
		age: Number(document.getElementById('age').value),
		address: document.getElementById('address').value,
		email: document.getElementById('email').value,
	};
	const USER_PUBLIC_DETAILS = {
		name: document.getElementById('name').value,
		photoURL: sessionStorage.getItem("photoURL"),
		skill: document.getElementById('skill').value,
		winRate: 0.00,
		gamesPlayed: Number(document.getElementById('games-played').value),
		mazeGameHighScore: 0
	};
	
	var userID = await getUserIDFirebase();

	const PRIVATE_FILEPATH = "userPrivateDetails/" + userID;
	const PUBLIC_FILEPATH = "userPublicDetails/" + userID;
	await writeFirebase(PRIVATE_FILEPATH, USER_PRIVATE_DETAILS);
	await writeFirebase(PUBLIC_FILEPATH, USER_PUBLIC_DETAILS);

	goToHomePage();

	function checkFormIsValid() {
		// Reset the error messages
		document.getElementById("error-messages-cont").innerHTML = "";
		document.querySelectorAll(".invalid").forEach((element) => {
			element.classList.remove("invalid");
		});

		var isValid = true;
		var shownNullError = false;
		var messageCount = 0;

		// Check everything
		const NAME = document.getElementById('name');
		const AGE = document.getElementById('age');
		const ADDRESS = document.getElementById('address');
		const EMAIL = document.getElementById('email');
		const SKILL = document.getElementById('skill');
		const GAMES_PLAYED = document.getElementById('games-played');

		checkNull(NAME);
		checkName(NAME);
		checkNull(AGE);
		checkAge(AGE);
		checkNull(ADDRESS);
		checkNull(EMAIL);
		checkNull(SKILL);
		checkNull(GAMES_PLAYED);
		checkGamesPlayed(GAMES_PLAYED);
		
		return isValid;

		function checkNull(inputObject) {
			var value = inputObject.value;

			if (!value || value == "null") {
				inputObject.classList.add("invalid");
				if (isValid) inputObject.focus();
				isValid = false;

				if (messageCount <= 3 && shownNullError == false) {
					messageCount++;
					shownNullError = true;
					showError("You must fill out all fields to continue");
				}
			}
		}
		function checkName(inputObject) {
			var value = inputObject.value;

			if (value.length > 30) {
				inputObject.classList.add("invalid");
				if (isValid) inputObject.focus();
				isValid = false;

				if (messageCount <= 3) {
					messageCount++;
					showError("Name cannot be longer than 30 characters");
				}
			}
		}
		function checkAge(inputObject) {
			var value = inputObject.value;

			if (Number(value) < 0 || Number(value) > 130) {
				inputObject.classList.add("invalid");
				if (isValid) inputObject.focus();
				isValid = false;

				if (messageCount <= 3) {
					messageCount++;
					showError("Age must be bewteen 0 and 130");
				}
			}
		}
		function checkGamesPlayed(inputObject) {
			var value = inputObject.value;

			if (Number(value) < 0) {
				inputObject.classList.add("invalid");
				if (isValid) inputObject.focus();
				isValid = false;

				if (messageCount <= 3) {
					messageCount++;
					showError("You cannot have played a game less than 0 times");
				}
			}
		}
		function showError(message) {
			const errorDiv = document.createElement("div");
			errorDiv.innerHTML = `<p>${message}</p>`;

			document.getElementById("error-messages-cont").appendChild(errorDiv);
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