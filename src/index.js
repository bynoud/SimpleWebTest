import {UserDirectory} from './js/UserReport.mjs';
import {createTemplate} from './js/Template.mjs';

const CKEditor = require( '@ckeditor/ckeditor5-build-inline' );

import './app.css';
import './imgs/img_avatar.png';
import './imgs/btn_google_dark_normal_ios.svg';

const VIEW_REPORT = 'report-view',
      VIEW_LOGIN = 'login-view',
      VIEW_LOADING = 'loading-view',
      VIEW_MAIN = 'app-main-view';

let userdir,
    logoutBtn, loginBtn, mainView, appStack,
    appTemps = {},
    reportViews = {},
    appPanes = {}
;


initApp();

function initApp() {
    mainView = document.getElementById(VIEW_MAIN);
    activePane(VIEW_LOADING);

    userdir = new UserDirectory(onSignedIn, onSignedOut, onAuthError);
    userdir.init();
    console.log(userdir);

    // get all element
    logoutBtn = document.getElementById('app--logout');
    loginBtn = document.getElementById('app--login');
    appStack = document.getElementById('app-stack');

    [VIEW_REPORT, VIEW_LOGIN, VIEW_LOADING].forEach( n => {
        appPanes[n] = document.getElementById(n);
        console.log(n, appPanes[n]);
    });

    // get all Template Element out, element with 'id' will be in separated slot
    let temps = document.querySelectorAll('template');
    console.log(temps);
    for (let i=0; i<temps.length; i++) {
        appTemps[temps[i].id] = createTemplate(temps[i]);
    }
    console.log("temps", appTemps);

    // callback for login/logout
    loginBtn.addEventListener('click', function() {
        userdir.signIn();
    });
    logoutBtn.addEventListener('click', function() {
        activePane(VIEW_LOADING);
        userdir.signOut();
    });

    // LIVE callback for all collapsable item in report
    // $('#report-view').on('show.bs.collapse', '.collapse', ev => {
    //     activeEditorOn(ev.target);
    // });

    // change on open/close of collapsable item
    $('#report-view').on('show.bs.collapse', '.status-olditems', ev => {
        const p = $(ev.target).closest('.card');
        console.log(ev.target, p, p.find('.more-less', p.find('.truncate-on-close')));
        p.find('.more-less').addClass('fa-rotate-180');
        p.find('.truncate-on-close').removeClass('text-truncate');
    });

    $('#report-view').on('hide.bs.collapse', '.status-olditems', ev => {
        const p = $(ev.target).closest('.card');
        p.find('.more-less').removeClass('fa-rotate-180');
        p.find('.truncate-on-close').addClass('text-truncate');
    });

    // Target status is changed
    $('#report-view').on('click', '.target-status-items', ev => {
        const tgr = $(ev.target);
        const sel = tgr.text();
        const p = tgr.closest('.dropdown');
        const text = p.find('.target-text');
        const status = p.find('.target-status');
        tgr.addClass('active');
        tgr.siblings().removeClass('active');
        status.text(sel);
        status.removeClass("btn-success btn-secondary btn-warning");
        text.removeClass('target-text-todo target-text-done target-text-removed');
        const selLow = sel.toLowerCase();
        status.addClass(`target-status-${selLow}`);
        text.addClass(`target-text-${selLow}`);

        updateTargetStatus(p.data('report-user'), p.data('report-task'), p.data('report-target'), sel);
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
    activePane(VIEW_LOGIN);
}

function onAuthError(error) {
    console.log("erro callback", error);
    //onSignedOut(); // return to signIn???
}

/* generate Report View based user data */
function setActiveAsUserReport(user) {
    let userID = user.uid;
    // if there's already, dont regerate
    if (userID in reportViews) {
        activeReportView(userID);
        return;
    }

    // else, create it
    user.getActive(
        /*done*/ function(tasks) {
            // render HTML
            reportViews[userID] = appTemps['t-report-user-view'].render(Object.assign({user:userID, tasks}), onError, appPanes[VIEW_REPORT]);
            // create editor if this is current user
            console.log("create report", reportViews[userID]);
            if (userID == userdir.user().uid) {
                for (let div of reportViews[userID].querySelectorAll('.editor-area')) {
                    CKEditor.create(div)
                        .then( editor => {
                            
                            editor.editing.view.document.on( 'change:isFocused', ( evt, name, value ) => {
                                // update value when editable is remomved from focus
                                if (!value) {
                                    let view = editor.ui.view.editable.element;
                                    console.log("eee", view, div);
                                    updateStatusText(div.dataset['reportUser'], div.dataset['reportTask'], editor.getData());
                                }
                            } );
                        })
                        .catch ( error => onError(error) );
                }
            }
            activeReportView(userID);
        }, onError
    );
}

function activeReportView(userID) {
    for (let id in reportViews) {
        if (id == userID) reportViews[id].classList.remove('d-none');
        else reportViews[id].classList.add('d-none');
    };
    activePane(VIEW_REPORT);
}

// communicate with report database
function updateTargetStatus(userID, taskID, targetID, status) {
    console.log("update target", userID, taskID, targetID, status);
    userdir.user(userID).activeRpt(taskID).liveUpdate('targets', targetID, status);
}

function updateStatusText(userID, taskID, text) {
    console.log("update status", userID, taskID, text);
    // redundance text from CKEditor
    text = text.replace(/<p>&nbsp;<\/p>/g, "");
    userdir.user(userID).activeRpt(taskID).liveUpdate('addedStatus', null, text);
}

function setWaitingMsg(msg) {
    let p = appPanes[VIEW_LOADING].querySelector(".loading-message");
    p.innerText = msg + " ...";
}

/* Show/Hide view from 'app-main-view' */
function activePane(id) {
    console.log("active", id);
    for(let p in appPanes) {
        let pane = appPanes[p];
        console.log("   >", p);
        if (p==id) pane.classList.remove('d-none'); // show
        else pane.classList.add('d-none'); // hide
    }
}

/**
 * ERRPR Handler
 */
function onError(error) {
    console.error("error callback", error);
}