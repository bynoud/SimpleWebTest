import {createTemplate} from './Template.js';
import {UserReport} from './UserReport.js';


function dateString2locate(strDate) {
    return (new Date(strDate)).toLocaleDateString('en-US', {'day':'numeric', month:'short', year:'numeric'});
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
            this.taskDetail));
        this.newStatusElement = this.viewElement.querySelector('.status-newitems');
    }


    sanitize() {
        const tasks = this.taskDetail;
        const dueDate = new Date(tasks.dueDate);
        if (dueDate < Date.now()) this.taskStatus = 'DANGER';
        else if (!tasks.newStatus || tasks.newStatus.length==0) this.taskStatus = 'WARN';
        else this.taskStatus = 'OK';
        // format date
        tasks.dueDate = dateString2locate(tasks.dueDate);
        tasks.addedDate = dateString2locate(tasks.addedDate);
        console.log('status', tasks.status);
        console.log('newstatus', tasks.newStatus);
        // to array for easy handle order
        function obj2array(field) {
            if (tasks[field]) {
                let arr = [];
                Object.entries(tasks[field]).forEach(([key,val]) => {
                    arr.push({uid: key, date: dateString2locate(val.date), text: val.text});
                })
                tasks[field] = arr.reverse();
            }
        }
        obj2array('status');
        obj2array('newStatus');
    }

    addStatus(text) {
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
                return statusElement;
            })
    }

}

class ReportView {
    constructor(userID, userInfo, parentElement, taskTemplate) {
        this.userID = userID;
        this.info = userInfo;
        this.taskTemplate = taskTemplate;
        this.reportDB = new UserReport(userID);
        this.taskViewsPromise = null;
        this.taskViews = null;

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
                            self.reportViews[userID] = new ReportView(userID, info[userID], parentElement, taskTemplate);
                        }
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
        console.log('showreport', this);
        return this.reportViews[userID || this.userID].showView();
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