import {UserDirectory} from './UserReport.js';
import {createTemplate} from './Template.js';

var userdir,
    logoutBtn, loginBtn, mainView, appStack,
    appTemps = {},
    reportViews = {},
    appPanes = {}
;

initApp();

function initApp() {
    activePane('loading-view');

    userdir = new UserDirectory(onSignedIn, onSignedOut, onAuthError);
    userdir.init();
    console.log(userdir);

    // get all element
    logoutBtn = document.getElementById('app--logout');
    loginBtn = document.getElementById('app--login');
    mainView = document.getElementById('app-main-view');
    appStack = document.getElementById('app-stack');

    for (var n in {'report-view':1, 'login-view':1, 'loading-view':1}) {
        appPanes[n] = document.getElementById(n);
        console.log(n, appPanes[n]);
    }

    // get all Template Element out, element with 'id' will be in separated slot
    var temps = document.getElementById('app-templates').querySelectorAll('template');
    console.log(temps);
    for (var i=0; i<temps.length; i++) {
        appTemps[temps[i].id] = createTemplate(temps[i]);
    }
    console.log("temps", appTemps);
    // test
    // var t = appTemps['t-report-view'].render({
    //     user: 'USERID',
    //     tasks: [
    //         {
    //             taskid: 'TASK1',
    //             title: 'TASK1 TITLE',
    //             desc: 'TASK1 DESC',
    //             oldstatus: [
    //                 {
    //                     date: '12 Jan, 2018',
    //                     text: 'TASK1 old status 1 text'
    //                 },
    //                 {
    //                     date: '30 Oct, 2018',
    //                     text: 'TASK1 old status 2 text'
    //                 }
    //             ],
    //             latestdate: '21 Dec, 2018',
    //             latesttext: 'TASK1 latest status'
    //         },
    //         {
    //             taskid: 'TASK2',
    //             title: 'TASK2 TITLE',
    //             desc: 'TASK2 DESC',
    //             oldstatus: [ ],
    //             latestdate: '21 Feb, 2019',
    //             latesttext: 'TASK2 latest status'
    //         },
    //         {
    //             taskid: 'TASK3',
    //             title: 'TASK3 TITLE',
    //             desc: 'TASK3 DESC',
    //             latestdate: '13 Jun, 2020',
    //             latesttext: 'TASK3 latest status'
    //         }
    //     ]
    // });
    // console.log("rendered", t);
    // mainView.appendChild(t);

    loginBtn.addEventListener('click', function() {
        activePane('loading-view');
        userdir.signIn();
    });
    logoutBtn.addEventListener('click', function() {
        activePane('loading-view');
        userdir.signOut();
    });
}

function onSignedIn() {
    console.log("in callback");
    // loginBtn.classList.add("d-none");
    logoutBtn.classList.remove("d-none");
    setWaitingMsg("Loading Report");
    setActiveAsUserReport(userdir.user());
}

function onSignedOut() {
    console.log("out callback");
    // loginBtn.classList.remove("d-none");
    logoutBtn.classList.add("d-none");
    activePane('login-view');
}

function onAuthError(error) {
    console.log("erro callback", error);
    //onSignedOut(); // return to signIn???
}

/* generate Report View based user data */
function setActiveAsUserReport(user) {
    var userID = user.uid;
    // if there's already, dont regerate
    if (userID in reportViews) {
        activeReportView(userID);
        return;
    }

    // else, create it
    var userReports = {user: userID, tasks: []};
    // latestid latestdate latesttext
    user.eachActiveDo(
        /*each*/ function(rpt) {
            console.log("main", rpt, userReports);
            var id = userReports.tasks.length;
            userReports.tasks.push({
                taskid: rpt.uid,
                title: rpt.props['title'],
                desc: rpt.props['desc'],
                oldstatus: [],
            });
            var t = userReports.tasks[id];
            if (rpt.status.length > 0) {
                for (var i=0; i<rpt.status.length; i++) {
                    var date = new Date(rpt.status[i].date);
                    t.oldstatus.push({
                        statusid: rpt.status[i].uid,
                        date: date.toLocaleDateString('en-US', {day: '2-digit', month:'short', year:'numeric'}),
                        text: rpt.status[i].text
                    })
                }
                // get last status as latest, if any
                var latest = t.oldstatus.pop();
                t['latestid'] = latest.statusid;
                t['latestdate'] = latest.date;
                t['latesttext'] = latest.text;
            }
        }, onError,
        /*done*/ function() {
            
            // render HTML
            reportViews[userID] = appTemps['t-report-user-view'].render(userReports, onError);
            activeReportView(userID);
        }
    );

}

function activeReportView(userID) {
    var v = appPanes['report-view'];
    while (v.firstChild) v.removeChild(v.firstChild);
    v.appendChild(reportViews[userID]);
    activePane('report-view');
}

function setWaitingMsg(msg) {
    var p = appPanes['loading-view'].querySelector(".loading-message");
    p.innerText = msg + " ...";
}

/* Show/Hide view from 'app-main-view' */
function activePane(id) {
    console.log("active", id);
    for(var p in appPanes) {
        var pane = appPanes[p];
        if (p==id) {
            if (pane.parentElement !== mainView) mainView.appendChild(pane); // show this
        } else {
            if (pane.parentElement !== appStack) appStack.appendChild(pane);  // hide others
        }
    }
}

/**
 * ERRPR Handler
 */
function onError(error) {
    console.error("error callback", error);
}