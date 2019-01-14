'use strict';
const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize the app with a service account, granting admin privileges
admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: 'https://mrvl-report-weekly.firebaseio.com'
});

// add new entry to 'users' in first login
exports.addNewUser = functions.auth.user().onCreate((user/*UserRecord*/) => {
    return admin.database().ref('/users/'+user.uid).set({
            name: user.displayName,
            email: user.email, googleAvatar: user.photoURL,
            rptAvatar: '', role: 'user', quote: ''})
        .then( function() { console.log("Add new user", user)} )
        .catch( function(error) { console.log("Failed to add new user", user, error) })
});
