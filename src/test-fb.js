
// import {FirebaseTemplate} from './js/FirebaseTemplate.js';

// Initialize Firebase
var config = {
    apiKey: "AIzaSyCACPsoN0KDRVrxd9UaEbML94cyEhZPTUs",
    authDomain: "mrvl-report-weekly.firebaseapp.com",
    databaseURL: "https://mrvl-report-weekly.firebaseio.com",
    projectId: "mrvl-report-weekly",
    storageBucket: "mrvl-report-weekly.appspot.com",
    messagingSenderId: "624015740768"
};
firebase.initializeApp(config);

const db = firebase.database();


var parsed = FirebaseTemplate.parse(document.getElementById('t-firebase'));

// 'public public/myname public/myobject'.split(/\s+/).forEach( path => {
//     db.ref(path).on('value', (dataSnapshot) => {
//         console.log(`'${path}' value`, dataSnapshot);
//     });
//     db.ref(path).on('child_added', (childSnapshot, prevChildKey) => {
//         console.log(`'${path}' child_added`, childSnapshot, prevChildKey);
//     });
//     db.ref(path).on('child_removed', function(oldChildSnapshot) {
//         console.log(`'${path}' child_removed`, oldChildSnapshot);
//     });
//     db.ref(path).on('child_changed', function(childSnapshot, prevChildKey) {
//         console.log(`'${path}' child_changed`, childSnapshot, prevChildKey);
//     });
// });

// db.ref('public/myobject').push({date: 110, text:"later push"});
