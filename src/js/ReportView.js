import {createTemplate} from './Template.js';
import {UserReport} from './UserReport.js';
const CKEditor = require( '@ckeditor/ckeditor5-build-inline' );

function dateString2locate(strDate, forInput) {
    const date = new Date(strDate);
    if (forInput) return `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
    else return date.toLocaleDateString('en-US', {day:'numeric', month:'short', year:'numeric'});
}

function currentDateString() {
    const today = new Date();
    return `${today.getFullYear()}-${today.getMonth()+1}-${today.getDate()}`;
}

class TaskView {
    constructor(parent, taskID, tasks) {
        this.parent = parent;
        this.taskID = taskID;
        this.taskDetail = tasks;
        this.taskTemplate = parent.taskTemplate;
        this.taskDB = parent.reportDB.getTask(taskID);
        
        // findNewStatusTemplate
        let temp = this.taskTemplate.temp.content.querySelector('.status-new');
        temp.removeAttribute('data-tloop');
        console.log("find template", this.taskTemplate.temp, temp);
        this.newStatusTemplate = createTemplate(temp);

        // transform information
        this.sanitize();

        this.viewElement = this.taskTemplate.render(Object.assign({},
            {userID: this.parent.userID, taskID: this.taskID, taskStatus: this.taskStatus},
            {fnDateFormat: dateString2locate},    // support function
            this.taskDetail));

        // View setup
        this.newStatusElement = this.viewElement.querySelector('.status-newitems');
        // add in editor if this is active user
        const self = this;
        const viewjq = $(this.viewElement);
        const dueDateNew = viewjq.find('.due-date-new-value');
        const dueDateSubmit = viewjq.find('.due-date-new-submit');
        const editDiv = viewjq.find('.editor-area');
        const editSubmit = viewjq.find('.new-status-submit');
        if (this.parent.isActive) {            
            CKEditor.create(editDiv[0]).then(editor => {
                self.editor = editor;
                // correct some text in CKeditor
                self.editor.editing.view.document.on( 'change:isFocused', ( evt, name, value ) => {
                    // If there's only space & newline, remove them all
                    if (!value) {
                        let text = editor.getData();
                        const div = document.createElement('div');
                        div.innerHTML = text;
                        let plainText = (div.textContent || div.innerText);
                        plainText = plainText.replace(/\s/g, '');
                        if (plainText.length>0) {
                            editSubmit.removeAttr('disabled');
                        } else {
                            editSubmit.attr('disabled');
                            self.editor.setData("");
                        }
                    }
                } );
                editSubmit.click(() => {
                    self.addStatus(self.editor.getData());
                });
            });

            // due-date re-target
            dueDateNew[0].valueAsDate = new Date(self.taskDetail.dueDate);
            dueDateSubmit.click((event) => {
                event.preventDefault();
                self.changeDueDate(dueDateNew.val());
            });
        }
        // NOT active user
        else {
            const dropmenu = dueDateNew.closest('.dropdown-menu')
            dropmenu.siblings('.dropdown-toogle').removeClass('dropdown-toggle');
            dropmenu.remove();
            editDiv.remove();
            editSubmit.remove();
        }

    }


    sanitize() {
        const tasks = this.taskDetail;
        // format date
        // tasks.dueDate = dateString2locate(tasks.dueDate);
        // tasks.dueDateForInput = dateString2locate(tasks.dueDate, true);
        // tasks.addedDate = dateString2locate(tasks.addedDate);
        console.log('status', tasks.status);
        console.log('newstatus', tasks.newStatus);
        // to array for easy handle order
        function obj2array(field) {
            if (tasks[field]) {
                let arr = [];
                Object.entries(tasks[field]).forEach(([key,val]) => {
                    // arr.push({uid: key, date: dateString2locate(val.date), text: val.text});
                    arr.push({uid: key, date: val.date, text: val.text});
                })
                tasks[field] = arr.reverse();
            }
        }
        obj2array('status');
        obj2array('newStatus');
        if (!tasks.retargetDates) {
            tasks.retargetDates = [];
        } else {
            const arr = [];
            for (let key in tasks.retargetDates) arr.push(tasks.retargetDates[key]);
            tasks.retargetDates = arr;
        }
        this.checkStatus();
    }

    checkStatus() {
        const tasks = this.taskDetail;
        const dueDate = new Date(tasks.dueDate);
        if (dueDate < Date.now()) tasks.taskStatus = 'danger';
        else if (!tasks.newStatus || tasks.newStatus.length==0) tasks.taskStatus = 'warning';
        else tasks.taskStatus = 'success';
        if (this.viewElement) {
            this.viewElement.classList.remove('task-status-success task-status-warning task-status-danger');
            this.viewElement.classList.add('task-status-' + tasks.taskStatus);
        }
    }

    addStatus(text) {
        if (text === "") return Promise.resolve();
        const self = this;
        const status = {date: currentDateString(), text: text};
        return self.taskDB.commitNewStatus(status)
            .then(key => {
                self.newStatus = self.newStatus || [];
                status.uid = key;
                status.date = dateString2locate(status.date);
                self.newStatus.unshift(status); // on front
                var statusElement = self.newStatusTemplate.render(status);
                console.log("XX", statusElement);
                statusElement.style.opacity = 0;
                statusElement.style.transition = 'opacity 0.5s linear';
                self.newStatusElement.insertBefore(statusElement, self.newStatusElement.firstChild);
                // need window to re-calculate style before this to work. I'm lazy so just time-it-out
                // statusElement.style.opacity = 1;
                setTimeout(() => statusElement.style.opacity = 1, 0);
                // self.newStatusTemplate.render(status, null, self.newStatusElement);
                // self.newStatusElement.insertBefore(self.newStatusElement.lastChild, self.newStatusElement.firstChild);
                self.checkStatus();
                return statusElement;
            })
    }

    changeDueDate(strDate) {
        const self = this;
        const tasks = this.taskDetail;
        tasks.retargetDates.push(tasks.dueDate);
        return this.taskDB.updateDueDate(strDate, tasks.retargetDates)
            .then(() => {
                console.log('change dueDate success', $(self.viewElement), $(self.viewElement).find('.dueDate-text'));
                tasks.dueDate = strDate;
                self.ele('.dueDate-text').textContent = dateString2locate(tasks.dueDate);
                self.ele('.status-retarget-count').classList.remove('d-none');
                self.ele('.status-retarget-count').innerText = tasks.retargetDates.length;
                self.checkStatus();
            })
    }

    ele(selector) {
        return this.viewElement.querySelector(selector);
    }
}

class ReportView {
    constructor(parent, userID, userInfo, parentElement, taskTemplate) {
        this.parent = parent;
        this.userID = userID;
        this.info = userInfo;
        this.taskTemplate = taskTemplate;
        this.reportDB = new UserReport(userID);
        this.taskViewsPromise = null;
        this.taskViews = null;
        this.isActive = (parent.userID == userID);
        console.log("ReportView", this);

        this._uniqueNum = 0;

        this.parentElement = parentElement;
    }

    get uniqueNum() { return this._uniqueNum++; }

    showView() {
        const self = this;
        console.log("showview", self);
        this.taskViewsPromise = this.taskViewsPromise || this._getTasks();
        return self.taskViewsPromise.then(taskViews => {
            console.log("then taskviews", taskViews);
            self.outerElement = document.createElement('div');
            self.parentElement.appendChild(self.outerElement);
            let delay = 0;
            taskViews.forEach(task=> {
                // setTimeout(self._addView.bind(self), delay, task.viewElement);
                self._addView(task.viewElement, false, delay);
                delay+=500;
            });
            return self.outerElement;
        });
    }

    getTaskView(index) {
        const self = this;
        return this.taskViews[index];
    }

    _addView(view, first, delay) {
        view.style.opacity = 0;
        view.style.transition = 'opacity 0.5s linear';
        if (first) this.outerElement.insertBefore(view, this.outerElement.firstChild);
        else this.outerElement.appendChild(view);
        setTimeout(()=>view.style.opacity = 1, delay);
    }

    hideView() {
        if (this.outerElement) {
            this.parentElement.removeChild(this.outerElement);
            this.outerElement = null;
        }
    }

    _getTasks() {
        const self = this;
        console.log("_doRender", this.reportDB);
        return self.reportDB.getTasks().then( tasks => {
            console.log("getTasks", tasks);
            self.taskViews = [];
            for (let taskID in tasks) {
                self.taskViews.push( new TaskView(self, taskID, tasks[taskID]) );
            }
            self.taskViews.reverse();
            return self.taskViews;
        });
    }

    addTask(taskDetail) {
        const self = this;
        taskDetail.addedDate = Date.now();
        return self.reportDB.commitNewTask(taskDetail)
            .then(key => {
                // at front
                const taskView = new TaskView(self, key, taskDetail);
                self.taskViews.unshift( taskView );
                self._addView(taskView, true);
            })
    }
}


export class ReportGroup {
    constructor(onSignedInCB/*()*/, onSignedOutCB/*()*/) {
        this.userID = '';
        this.activeUser = null;
        this.userInfo = null;
        this.reportViews = null;
        this.onSignedIn = onSignedInCB;
        this.onSignedOut = onSignedOutCB;
    }

    init(parentElement, taskTemplateElement) {
        // init firebase
        const self = this;
        const taskTemplate =  createTemplate(taskTemplateElement);
        UserReport.onAuthCallback(
            user => {
                self.activeUser = user;
                self.userID = user.uid;
                return UserReport.getUserInfo()
                    .then(info => {
                        self.userInfo = info;
                        self.reportViews = {};
                        for (let userID in info) {
                            self.reportViews[userID] = new ReportView(self, userID, info[userID], parentElement, taskTemplate);
                        }
                        console.log("already done init", self.reportViews);
                        if (self.onSignedIn) self.onSignedIn(info[self.userID]);
                    });
            },
            () => {
                if (self.onSignedOut) self.onSignedOut();
            }
        );
    }
    
    getReportView(userID) {
        return this.reportViews[userID || this.userID];
    }

    showReport(userID) {
        let id = userID || this.userID;
        console.log('showreport', this, id);
        return this.reportViews[id].showView(id==this.userID);
    }

    hideReport(userID) {
        return this.reportViews[userID || this.userID].hideView();
    }
    
    // getter
    get isIn() { return this.activeUser != null }
    
    signIn() {
        return UserReport.doLogin();
    }

    signOut() {
        return UserReport.doLogout();
    }
    
}