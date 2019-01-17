
import {ReportGroup} from "./js/ReportView.js";

const reportView = document.getElementById('report-view');
const taskTemplate = document.getElementById('t-task-view');
const reportGroup = new ReportGroup(function(){console.log("really in")});

reportGroup.init(reportView, taskTemplate);

document.getElementById('login-btn').addEventListener('click', reportGroup.signIn);
document.getElementById('logout-btn').addEventListener('click', reportGroup.signOut);
document.getElementById('show-report-btn').addEventListener('click', () => {
    reportGroup.showReport();
});
document.getElementById('hide-report-btn').addEventListener('click', () => {
    reportGroup.hideReport();
});
document.getElementById('reshow-report-btn').addEventListener('click', () => {
    reportGroup.hideReport();
    reportGroup.showReport();
});

const newStatusText = document.getElementById('new-status-text');
document.getElementById('new-status-btn').addEventListener('click', () => {
    const text = newStatusText.value;
    reportGroup.getReportView().getTaskView(0).addStatus(text)
        .then(() => console.log("new status success"))
        .catch(error => console.log("new status failed", error));
});


document.getElementById('change-due-btn').addEventListener('click', ev => {
    ev.preventDefault();
    console.log("clicked", ev.target);

});

// document.getElementById('add-report-form').addEventListener('submit', addNewReport);

// function addNewReport(ev) {
//     event.preventDefault();
//     const formData = new FormData(ev.target);
//     formData.forEach((val,key) => {
//         console.log(`'${key}' -> '${val}'`);
//     })
// }

$( "form#add-report-form" ).submit(function( event ) {
    event.preventDefault();
    let rpt = $( this ).serializeObject();
    rpt.targets = rpt.targets.filter(item => (item.targetText !== "") && (item.targetStatus !== ""));
    rpt.status = rpt.status.filter(item => (item.text !== "") && (item.date !== ""));
    rpt.newStatus = rpt.newStatus.filter(item => (item.text !== "") && (item.date !== ""));
    if (rpt.newStatus.length==0) delete rpt['newStatus'];
    console.log(rpt);
    reportGroup.getReportView().addTask(rpt)
        .then( () => console.log("add success"))
        .catch(error => console.log("add failed", error));
});

////
for (let ele of document.getElementById('report-view').querySelectorAll('.editor-area')) {
    InlineEditor.create(ele)
        .then( editor => {
            console.log("created", editor);
            // when lost focus
            // editor.ui.focusTracker.on( 'change:isFocused', ( evt, name, value ) => {
            //     console.log( 'UI focus isFocused = ', value );
            // } );
            editor.editing.view.document.on( 'change:isFocused', ( evt, name, value ) => {
                // update value when editable is remomved from focus
                if (!value) {
                    
                }
            } );
            
        })
        .catch( error => console.log("failed", error));
};



function getParentWithClass(ele, clss) {
    let p = ele.parentElement;
    while(p && !p.classList.contains(clss)) p = p.parentElement;
    return p;
}

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
    text.removeClass('target-text-todo target-text-done target-text-remove');
    if (sel == 'TODO') {
        status.addClass('btn-secondary');
        text.addClass('target-text-todo');
    } else if (sel == 'DONE') {
        status.addClass('btn-success');
        text.addClass('target-text-done');
    } else {
        status.addClass('btn-warning');
        text.addClass('target-text-remove');
    }
});

// // observe on any change in status
// let targetNodes = document.querySelectorAll(".target-text, .editor-area");
// let editObs = new MutationObserver(onContentChanged);
// for (let me of targetNodes) editObs.observe(me, { attributes: true }); // only attribute (mainly class)

// function onContentChanged(mutationsList, observer) {
//     for(var mutation of mutationsList) {
//         console.log("MM", mutation);
//     }
// }
