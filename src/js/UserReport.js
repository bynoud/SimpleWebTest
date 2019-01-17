

/**
 * This is wrapper utilities for Firebase, include it as *module*
 */



function _log(cmd, args) {
    for (var i=0; i<args.length; i++) cmd(args[i]);
}
function logd() {  _log(console.log, arguments); }
function loge() {  _log(console.error, arguments); }

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

var signedIn = false;
var auth = firebase.auth();
var db = firebase.database();
var provider = new firebase.auth.GoogleAuthProvider(); /* only support Google login */


function doLogin(successCB/*(result)*/, errorCB/*(error)*/) {
    return auth.signInWithPopup(provider)
        .then(function(result) {
            console.log("Login success", result.user, result.credential);
            if (successCB) successCB(result);
        })
        .catch(function(error) {
            console.log("Login failed", error.code);
            if (errorCB) errorCB(error);
        });
}

function doLogout(doneCB) {
    auth.signOut().then(function() {
        logd("Logged out")
        if (doneCB) doneCB();
    });
}

/* get all value under a 'path' */
function fetchValueEach(path, eachDO/*(item,id)*/, errorCB/*(error)*/, doneCB) {
    console.log("FFF", path, eachDO, errorCB, doneCB);
    // once(eventType, successCallback, failureCallbackOrContext, context) returns firebase.Promise
    firebase.database().ref(path).once('value') // query for 'value' to available
        .then( function(snapshot) {
            logd("fetchValueEach successed", path, snapshot);
            if (eachDO) {
                console.log("here", snapshot.numChildren());
                var id = 0;
                snapshot.forEach(function(itemSS) {
                    console.log("each", itemSS, id);
                    eachDO(itemSS, id++);
                });
            }
            if (doneCB) doneCB();
        })
        .catch( function(error) {
            loge("fetchValueEach failed", path, error);
            if (errorCB) errorCB(error);
        });
}

/* update single path */
function UpdatePath(path, obj, doneCB, errorCB) {
    var updates = {};
    updates[path] = obj;
    UpdateMultiPaths(updates, doneCB, errorCB);
}

/* update multilpe paths at once, need prepare {path: obj, path: value ....} */
function UpdateMultiPaths(updates, doneCB, errorCB) {
    db.ref(path).update(updates)
        .then( function() {
            logd("updateMulti done", updates);
            if (doneCB) doneCB();
        })
        .catch( function(error) {
            loge("update failed", path, error);
            if (errorCB) errorCB();
        })
}

/* new child node under 'path', return UID */
function newChild(path, obj, doneCB, errorCB) {
    return db.ref(path).push(obj)
        .then( function() {
            logd("push done", path);
            if (doneCB) doneCB();
        })
        .catch( function(error) {
            loge("push failed", path, error);
            if (errorCB) errorCB();
        });
}

const P_USER = "/users/";
const P_ACTIVE_RPT = "/active_reports/";
const P_ARCHIVE_RPT = "/archived_reports/";

/* get all User general Info */
// function fetchAlluserInfo(successCB, errorCB, doneCB) {
//     fetchValueEach(P_USER, successCB, errorCB, doneCB)
// }

/* utility to update object */
function object_update(obj/*, …*/) {
    for (var i=1; i<arguments.length; i++) {
        for (var prop in arguments[i]) {
            var val = arguments[i][prop];
            if (typeof val == "object") // this also applies to arrays or null!
                object_update(obj[prop], val);
            else
                obj[prop] = val;
        }
    }
    return obj;
}


/**
 * 
 * @param {Firebase.database.DataSnapshot} rptSnapshot : '/(active|archived)_reports/<userID>/<uid>'
 */
function ReportEntry(rptSnapshot) {
    this.ref = null;
    this.addedStatus = "";

    if (rptSnapshot) {
        this.ref = rptSnapshot.ref;
        Object.assign(this, rptSnapshot.val());
        // rpt.forEach ( function(itemSS) {
        //     if (itemSS.key == "status") {
        //         this.addStatusFromSnapshot(itemSS);
        //     } else {
        //         // other item just plain value
        //         this[itemSS.key] = itemSS.val();
        //     }
        // });
    };

    // this.create = (function(path, rpt, doneCB, errorCB) {
    //     for (var key in rpt) {
    //         if (key == 'status') {
    //             this.addStatus(rpt[key]);
    //         } else {
    //             this.props[key] = rpt[key];
    //         }
    //     }
    //     var ref = newChild(path, this.val(), doneCB, errorCB)
    //     // also listen for change to get UID for status
    //     ref.once('value') (function(snapshot) {
    //         console.log("DD", snapshot);
    //         snapshot.child('status').forEach( (function(ss, id) {
    //             this.status[id].statusid = ss.key;
    //         }).bind(this));
    //     }).bind(this);
    //     this.ref = ref;
    //     this.taskid = ref.key;
    //     return this;
    // }).bind(this);

    // /* This one intented as create whole new report, NOT send Server
    //     query inidvidial. NO UID at this time, update later */
    // this.addStatus = (function(stt) {
    //     var s = {statusid: -1, date: Date.now(), text: stt};
    //     this.status.push(s);
    // }).bind(this);

    // this.addStatusFromSnapshot = (function(ss){
    //     ss.forEach( (function(childSS) {
    //         var s = {statusid: childSS.key,
    //                  date: childSS.child('date').val(),
    //                  text: childSS.child('text').val()};
    //         this.status.push(s);
    //     }).bind(this) );
    // }).bind(this);

    // this.updateStatus = (function(id, stt) {
    //     // TODO
    // }).bind(this);

    // /* ISSUE server query */
    // this.newReport = (function(stt){
    //     var ref = newChild()
    // }).bind(this);

    // /* NO UID is output */
    // this.val = (function(){
    //     var v = {status: {}};
    //     for (var key in this.status) {
    //         v.status[key] = {date: this.status[key]['date'],
    //                          text: this.status[key]['text']}
    //     }
    //     for (var key in this.props) {
    //         v[key] = this.props[key];
    //     }
    //     return v;
    // }).bind(this);

    this.liveUpdate = function(prop, uid, value) {
        let cur;
        if (uid) cur = this[prop][uid];
        else cur = this[prop];
        if (cur != value) {
            this.hasUpdate = true;
            if (uid) this[prop][uid] = value;
            else this[prop] = value;
            console.log(`report is updated [${prop}][${uid}] = `, value);
        }
    };
}


/**
 * 
 * @param {Firebase.database.DataSnapshot} userSnapshot : Snapshot under /user/<uid>
 */
export function UserEntry(userSnapshot) {
    console.log("UU", userSnapshot.val());
    this.hasUpdate = false;
    this.uid = userSnapshot.key;
    this.role = userSnapshot.child('role').val();
    if (userSnapshot.hasChild('avatar')) {
        this.avatar = userSnapshot.child('avatar').val();
    } else {
        this.avatar = 'imgs/img_avatar.png';
    }
    this.actives = {};
    this.archives = {};

    this._get = (function(arr, path, doneCB/*(reports)*/, errorCB/*(error)*/) {
        
        // FIXME: debug
        for (var i=0; i<4; i++) {
            var rpt = new ReportEntry();
            rpt.title = "Task title " + i;
            rpt.desc = 'task desc ' + i;
            rpt.targets = {};
            for (var j=0; j<i; j++) {
                rpt.targets["TUID" + j + i] = {targetStatus: (j==0) ? "TODO" : (j==1) ? "DONE" : "REMOVED", targetText:"target of " + j + i};
            }
            rpt.status = {};
            for (var j=0; j<i; j++) {
                rpt.status["SUID" + j + i] = {date:1547199432660, text: "status " + j + " " + i };
            }
            rpt.newstatus = {};
            for (var j=0; j<i; j++) {
                rpt.newstatus["NUID" + j + i] = {date:1547199432660, text: "status " + j + " " + i };
            }
            arr["UID"+i] = rpt;
        }
        if(doneCB) doneCB(arr);
        return;


        if (arr.length==0) { // need fetch from server
            fetchValueEach(path + this.uid,
                function(itemSS, id) {
                    arr.push(new ReportEntry(itemSS));
                    if (doCB) doCB(arr[arr.length-1], id);
                }, errorCB, doneCB
            )
        } else {
            for (var i=0; i<arr.length; i++) {
                doCB(arr[i], i);
            }
        }
    }).bind(this);

    this.getActive = (function(doneCB, errorCB/*(error)*/) {
        this._get(this.actives, P_ACTIVE_RPT, doneCB, errorCB);
    }).bind(this);

    this.eachArchiveDo = (function(doneCB, errorCB/*(error)*/) {
        this._get(this.archives, P_ARCHIVE_RPT, doneCB, errorCB);
    }).bind(this);

    this.newReport = (function(rpt, doneCB, errorCB) {
        var id = this.actives.length;
        var r = (new ReportEntry()).create(P_ACTIVE_RPT + this.uid, rpt, doneCB, errorCB);
        this.actives.push(r);
        return id;
    }).bind(this);

    this.activeRpt = (function(id){
        return this.actives[id];
    }).bind(this);

    this.archiveRpt = (function(id) {
        return this.archives[id];
    }).bind(this);

    this.liveUpdate = function(prop, uid, value) {
        const cur = this[prop][uid];
        if (cur != value) {
            this.hasUpdate = true;
            this[prop][uid] = value;
            console.log(`user ${this.uid} is updated [${prop}][${uid}] = `, value);
        }
    };

 }

/* All user here */
var userDir;    // include all user information here
var curUser; // only 1 user logged in
var credential;

/**
 * 
 * @param {function} onSignedIn 
 * @param {function} onSignedOut 
 * @param {function} onError 
 */

export function UserDirectory(onSignedInCB/*()*/, onSignedOutCB/*()*/, onErrorCB/*(error)*/) {

    // init observer
    this.onSignedIn = onSignedInCB;
    this.onSignedOut = onSignedOutCB;
    this.onError = onErrorCB;


    this.init = (function(){
        console.log("init")
        firebase.auth().onAuthStateChanged( (function(user) {
            this.reset();
            if (user) {
                logd(" >> IN");
                curUser = user;
                /* Initial setup after login in */
                // load all user information
                fetchValueEach(P_USER,
                    function(item, id) {
                        var u = new UserEntry(item);
                        userDir[u.uid] = u;
                    },
                    this.onError,
                    this.onSignedIn
                );
            } else {
                logd(" >> OUT");
                /* clean up if needed */
                if (this.onSignedOut) this.onSignedOut();
            }
        }).bind(this) );

        this._userDir = userDir; // debug only
        this._curUser = curUser;
    
    }).bind(this);

    this.reset = (function() {
        userDir = {};
        curUser = null;
        credential = null;
    }).bind(this);

    this.isIn = (function() {
        return (curUser!=null);
    }).bind(this);



    this.signIn = (function() {
        // fetchAlluserInfo(
        //                 /*success*/ function(item, id) {
        //                     console.log("X", item, id);
        //                     var u = new UserEntry(item);
        //                     if (u.uid == result.user.uid) curUser = u;
        //                     userDir[u.uid] = u;
        //                 },
        //                 /*error*/ onError
        //             );


        if (curUser==null) {
            doLogin(null, this.onError
                // function() {
                //     fetchAlluserInfo(
                //         function(item, id) {
                //             var u = new UserEntry(item);
                //             userDir[u.uid] = u;
                //         },
                //         this.onError,
                //         this.onSignedIn
                //     )
                // }, this.onError
            );
        }

    }).bind(this);


    this.signOut = (function() {
        doLogout();
        this.reset();
    }).bind(this);

    this.user = (function(uid) {
        if (uid==null) uid = curUser.uid; // default is current used
        return userDir[uid];
    }).bind(this);



}


/* intent tobe privated */


function fetchDB(path) {
    console.log("feacthDB", path);
    return firebase.database().ref(path).once('value')
        .then(snapshot => {
            let target = {};
            snapshot.forEach( itemSS => {
                if (itemSS.key === 'placeholder') return;
                target[itemSS.key] = itemSS.val();
            })
            return target;
        })
}

function commitDB(path, source) {
    return firebase.database().ref(path).push(source)
        .then((ref) => {
            return ref.key;
        })
};

function updateDB(path, updates) {
    return firebase.database().ref(path).update(updates);
}

// source need 'uid'
function moveDB(record, frmPath, toPath) {
    const updates  = {};
    const uid = record.uid;
    delete record.uid;
    updates[`${frmPath}/${uid}`] = null;   // delete
    updates[`${toPath}/${uid}`] = record;
    return updateDB(updates);
}

class UserTask {
    constructor(parent, taskID) {
        this.parent = parent;
        this.taskID = taskID;
        this.pathNewStatus = `${parent.pathActive}/${taskID}/newStatus`;
        this.pathStatus = `${parent.pathActive}/${taskID}/status`;
        this.pathArchive = `${parent.pathArchive}/${taskID}`;
    }
    
    commitNewStatus(status) {
        return commitDB(this.pathNewStatus, status);
    }

    // move newStatus -> status
    commitStatus(status) {
        return moveDB(status, this.pathNewStatus, this.pathStatus);
    }

    // move to archive
    archiveStatus(status) {
        return moveDB(status, this.pathStatus, this.pathArchive);
    }



}

export class UserReport {

    constructor(userID) {
        this.userID = userID;
        this.pathActive = P_ACTIVE_RPT + userID;
        this.pathArchive = P_ARCHIVE_RPT + userID;
        this.tasks = {};
        this.archives = {};
    }


    commitNewTask(task) {
        return commitDB(this.pathActive, task)
    }

    getTasks() {
        //return (this.tasks || fetchReportTo(this.tasks, this.pathActive));
        console.log("getTasks", this.tasksPromise);
        this.tasksPromise = this.tasksPromise || fetchDB(this.pathActive);
        return this.tasksPromise;
    }

    getTask(taskID) {
        if (!(taskID in this.tasks)) this.tasks[taskID] = new UserTask(this, taskID);
        return this.tasks[taskID];
    }


    getArchives() {
        this.archivesPromise = this.archivesPromise || fetchDB(this.pathArchive);
        return this.archivesPromise;
    }
    

    static doLogin() {
        return auth.signInWithPopup(provider)
            .then( result => {
                console.log("Login success", result.user, result.credential);
                return result;  // chainning 'then'
            })
            .catch( error => {
                console.log("Login failed", error.code);
                throw error;    // chainning error
            });
    }

    static doLogout() {
        return auth.signOut()
            .then( () => {
                console.log("loged out success");
            })
            .catch( error => {
                console.log("login failed", error);
                throw error;
            })
    }
    

    static onAuthCallback(onSignedIn, onSignedOut) {
        firebase.auth().onAuthStateChanged( user => {
            if (user) {
                logd(" >> IN");
                onSignedIn(user);
            } else {
                logd(" >> OUT");
                onSignedOut();
            }
        });
    }

    static getUserInfo() {
        return firebase.database().ref(P_USER).once('value')
            .then(snapshot => {
                let info = snapshot.val();
                return info;
            })
    }
}

