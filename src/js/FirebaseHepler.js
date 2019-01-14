
var auth = firebase.auth();
var provider = new firebase.auth.GoogleAuthProvider(); /* only support Google login */

function doLogin(successCB, errorCB) {
    var scb = successCB || (function(result) {
        console.log("Login success", result.user, result.credential)
    });
    var ecb = errorCB || (function(error) {
        console.log("Login failed", error.code)
    });
    auth.signInWithPopup(provider).then(scb, ecb);
}

function doLogout(doneCB) {
    var cb = doneCB || (function() { console.log("Logged out")});
    auth.signOut();
}
