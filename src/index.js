
import {ReportGroup} from "./js/ReportView.js";


const CKEditor = require( '@ckeditor/ckeditor5-build-inline' );

import './app.css';
import './imgs/img_avatar.png';
import './imgs/btn_google_dark_normal_ios.svg';

const VIEW_REPORT = 'report-view',
      VIEW_LOGIN = 'login-view',
      VIEW_LOADING = 'loading-view',
      VIEW_MAIN = 'app-main-view';

let reportGroup,
    logoutBtn, loginBtn, mainView, appStack,
    appTemps = {},
    reportViews = {},
    appPanes = {}
;


initApp();

function initApp() {
    mainView = document.getElementById(VIEW_MAIN);
    activePane(VIEW_LOADING);

    // get all element
    logoutBtn = document.getElementById('app--logout');
    loginBtn = document.getElementById('app--login');
    appStack = document.getElementById('app-stack');

    [VIEW_REPORT, VIEW_LOGIN, VIEW_LOADING].forEach( n => {
        appPanes[n] = document.getElementById(n);
        console.log(n, appPanes[n]);
    });

    reportGroup = new ReportGroup(onSignedIn, onSignedOut);
    reportGroup.init(appPanes[VIEW_REPORT], document.getElementById('t-task-view'));

    // callback for login/logout
    loginBtn.addEventListener('click', function() {
        reportGroup.signIn();
    });
    logoutBtn.addEventListener('click', function() {
        activePane(VIEW_LOADING);
        reportGroup.signOut();
    });

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

    // // Target status is changed
    // $('#report-view').on('click', '.target-status-items', ev => {
    //     const tgr = $(ev.target);
    //     const sel = tgr.text();
    //     const p = tgr.closest('.dropdown');
    //     const text = p.find('.target-text');
    //     const status = p.find('.target-status');
    //     tgr.addClass('active');
    //     tgr.siblings().removeClass('active');
    //     status.text(sel);
    //     status.removeClass("btn-success btn-secondary btn-warning");
    //     text.removeClass('target-text-todo target-text-done target-text-removed');
    //     const selLow = sel.toLowerCase();
    //     status.addClass(`target-status-${selLow}`);
    //     text.addClass(`target-text-${selLow}`);

    //     updateTargetStatus(p.data('report-user'), p.data('report-task'), p.data('report-target'), sel);
    // });

}

function onSignedIn() {
    console.log("in callback");
    // loginBtn.classList.add("d-none");
    logoutBtn.classList.remove("d-none");
    setWaitingMsg("Loading Report");
    setActiveAsUserReport();
}

function onSignedOut() {
    console.log("out callback");
    // loginBtn.classList.remove("d-none");
    logoutBtn.classList.add("d-none");
    activePane(VIEW_LOGIN);
}

/* generate Report View based user data */
function setActiveAsUserReport(userID) {
    reportGroup.showReport(userID)
        .then(() => activePane(VIEW_REPORT));
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