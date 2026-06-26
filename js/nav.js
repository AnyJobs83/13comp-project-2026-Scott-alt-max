
// Displays the user's name and profile pic
async function patchNavProfilePic() {
    if (sessionStorage.getItem("username") == null || sessionStorage.getItem("userPhotoURL") == null) {
        // Keep running until userID is not null
        if (getUserIDFirebase() == null) {
            setTimeout(patchNavProfilePic, 300);
            return;
        }
        
        const userDetailsFilepath = "userPublicDetails/" + getUserIDFirebase();
        var userDetails = await readFirebase(userDetailsFilepath);

        sessionStorage.setItem("username", userDetails.name);
        sessionStorage.setItem("userPhotoURL", userDetails.photoURL);
    }

    const usernameInDOM = document.getElementById("username");
    if (usernameInDOM) usernameInDOM.innerHTML = sessionStorage.getItem("username");

    document.getElementById("profile-picture").style.backgroundImage = `url(${sessionStorage.getItem("userPhotoURL")})`;
}

patchNavProfilePic();