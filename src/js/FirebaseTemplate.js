
// evaluate
function obj2str(obj) {
    let str = "";
    if (typeof obj == 'string') {
        // negative look-behind is not wisely supported by browser, assume we dont work with string has escape quote
        return '"'+obj.replace(/"/g, '\\"')+'"';
    } else if (obj instanceof Array) {
        obj.forEach(item => str += obj2str(item) + ",");
        return "["+str+"]";
    } else if (obj instanceof Function) {   // must before Object, Function is also Object
        return obj.toString();
    } else if (obj instanceof Object) {
        Object.entries(obj).forEach(([key,val]) => str += key+":"+obj2str(val)+",");
        return "{"+str+"}";
    } else {  // assum to be Number, just try to convert it to String
        return '' + obj;
    }
}

function _eval(text, varspace) {
    let result, varDesc='';
    for (let key in varspace) varDesc += `let ${key} = ${obj2str(varspace[key])};`;
    varDesc += "result = `" + text + "`";
    try { eval(varDesc); }
    catch(error) { throw(`eval '${varDesc}', ${error}`); }  // add addtional to error message
    return result;
}


// 'key' must be simple name with out '.'
function _keyInObjectX(key, obj) {
    console.log(`check key in obj ${key}, ${obj}`);
    if (!(obj instanceof Object)) return false;
    if (!(key in obj)) return false;
    var v = obj[key];
    if (v instanceof Array) return (v.length > 0);
    if (v instanceof Object) return (Object.keys(v).length > 0);
    // else, assum it's primitive
    if (v) return true;
    return false;
}
function _keyInObject(key, obj) {
    let x = _keyInObjectX(key, obj);
    console.log("    > ", x);
    return x;
}

// in && not empty, 'key' is a string with '.'
function keyInObject(key, obj) {
    let curObj = obj;
    let keys = key.split('.');
    for (let i=0; i<keys.length; i++) {
        if (!_keyInObject(keys[i], curObj)) return false;
        curObj = curObj[keys[i]];
    }
    return true;
}

// return outer as <div>, keep all attribute same
function template2div(ele, varspace) {
    const div = document.createElement('div');
    for (let attr of ele.attributes) {
        div.setAttribute(attr.name, _eval(attr.value, varspace));
    }
    return div;
}


let indent = 0;



class FirebaseTemplate {
    constructor(parent, ele) {
        this.parent = parent;
        this.templateEle = ele;
        this.childs = [];
        this.outerEle = null;
        this.childEles = [];

        let val;

    
        if (ele.nodeType == Node.TEXT_NODE) {
            this.text = ele.textContent;
        } else if (ele.nodeType == Node.ELEMENT_NODE) {

            
            // Firebase setting
            this.fbPath = parent ? parent.fbPath : '';
            let _path2abs = (function (path) {
                if (path[0] === '/') return path;
                else return this.fbPath + '/' + path;
            }).bind(this);

            if (val = ele.dataset['fbpath']) this.fbPath = _path2abs(val);
            if (val = ele.dataset['fbstring']) this.fbListenString = _path2abs(val);
            if (val = ele.dataset['fbarray']) this.fbListenArray = _path2abs(val);

            // Template type
            if (val = ele.dataset['tloop']) {
                this.loopvar = val;
            } else if (ele.dataset['tonly']) {
                this.fnCond = (vs) => {
                    return keyInObject(ele.dataset['tonly'], vs);
                };
            } else if (val = ele.dataset['tunless']) {
                this.fnCond = (vs) => {
                    return !keyInObject(val, vs);
                };
            } else if (val = ele.dataset['tcond']) {
                this.fnCond = (vs) => {
                    return eval(_eval(val, vs));
                };
            }

            // checking the child
            let c;
            if (ele.tagName.toLowerCase() == "template") {
                this.isTemplate = true;
                c = ele.content.childNodes; // need TEXT_NODE also
            } else {
                c = ele.childNodes;
            }
            // data-thtml : must containt single TEXT_NODE
            if ('thtml' in ele.dataset) {
                if (c.length!==1 || c[0].nodeType!==Node.TEXT_NODE)
                    throw("HTML Template must have only 1 TEXT_NODE child" + ele);
                this.html = c[0].textContent;
            } else {
                for (let i=0; i<c.length; i++) {
                    if (c[i].nodeType == Node.TEXT_NODE || c[i].nodeType == Node.ELEMENT_NODE)
                        this.childs.push(new FirebaseTemplate(this, c[i]));
                }
            }
        } else {
            throw "Dont throw other Node type at me";
        }
    };

    // return a Promise
    static parse(ele) {
        return new FirebaseTemplate(null, ele);
    }

    get len() { return this.childs.length; }
    get firstChild() { this._seln = 0; return this.childs[0]; }
    get nextChild() { return this.childs[this._seln++]; }
    get nextSibling() { 
        let c = this.parent.childs;
        return c[c.indexOf(this)+1];
    }
    
    populate(varspace, parentDiv) {
        const self = this;
        varspace = varspace || {};
        self.childEles = {};
        const _doRender = function (localVars) {
            self.outerEle = (self.loopvar) ? self._renderLoop(localVars, parentDiv) :
                            (self.fnCond)  ? self._renderCond(localVars, parentDiv) :
                                             self._renderSingle(localVars, parentDiv);
        };

        // first check Firebase?
        let val;
        if (val = self.fbListenString) {
            firebase.database().ref(val).on('value', snapshot => {
                let localVars = Object.assign({}, varspace,
                    {_fb: snapshot.val(), _key: snapshot.key});
                _doRender(localVars);
            })
        } else if (val = self.fbListenArray) {
            // automatically a Loop!!!
            firebase.database().ref(val).on('child_added', snapshot => {
                let localVars = Object.assign({}, varspace,
                    {_fb: snapshot.val(), _key: snapshot.key});
                _doRender(localVars);
            });
            firebase.database().ref(val).on('child_removed', snapshot => {
                self.outerEle.removeChild(self.childEles[snapshot.key]);
                delete self.childEles[snapshot.key];
            });
        } else {
            let localVars = Object.assign({}, varspace);
            _doRender(localVars);
        }

        self.varspace = varspace;
    }

    // register Firebase data callback
    _fetchDB(callback, cancelCallback, context) {
        const self = this;
        let val;
        if (val = self.fbListenString) firebase.database().ref(val).on('value', 
            callback, cancelCallback || null, context || this);
        else if (val = self.fbListenArray) firebase.database().ref(val).on('');
    }

    // doing real render
    _renderSingle(varspace, parentDiv) {
        const self = this;
        let outerDiv;
        indent++;

        // simple text
        if (self.text) {
            outerDiv = document.createTextNode( _eval(self.text, varspace) );
        } else {
            // <template> should be a transparent element in rendered result
            if (self.isTemplate) {
                if (parentDiv) outerDiv = parentDiv;
                else outerDiv = document.createElement('div'); // only when this template is the top tag
            }
            // Keep normal Element as it is, resolve variable inside tag anchor
            else {
                outerDiv = self.templateEle.cloneNode(false); // NO childs
                for (let attr of outerDiv.attributes) {
                    outerDiv.setAttribute(attr.name, _eval(attr.value, varspace));
                }
            }

            if (self.html) {
                outerDiv.innerHTML = _eval(self.html, varspace);
            } else {
                // render in sequence
                self.childs.reduce( (sequence, each) => {
                    return sequence.then(() => each.populate(varspace, outerDiv))
                }, Promise.resolve() );
            }
        }

        if (outerDiv !== parentDiv && parentDiv != null) parentDiv.appendChild(outerDiv);
        console.log(">".repeat(indent--), self, varspace, outerDiv);
        self.childEles[varspace._key || '__only__'] = outerDiv;
        return outerDiv;
    }

    _renderCond(varspace, parentDiv) {
        console.log("cond", this.fnCond, this.fnCond(varspace));
        if (this.fnCond(varspace)) return this._renderSingle(varspace, parentDiv);
        else return (parentDiv || document.createElement('div'));
    }
    
    _renderLoop(varspace, parentDiv) {
        const self = this;
        // there always a parent Element wrapping the loop
        const outerDiv = parentDiv || document.createElement('div');

        let sequence = Promise.resolve(); // for render sequence
    
        if (self.loopvar in varspace) {        
            let arr = varspace[self.loopvar];
            // global variable will be passed down. later override if any
            // loop over in SEQUENCE
            if (arr instanceof Array) {
                arr.forEach( (each, i) => {
                    sequence = sequence.then(() => {
                        let localVars = Object.assign({}, varspace);
                        if (each instanceof Object) localVars = Object.assign({}, localVars, each);
                        else localVars._loopval_ = each;
                        localVars._loopi_ = i;
                        // next sequence call will wait for this to done
                        // all child is appended to outerDiv under this call
                        self._renderSingle(localVars, outerDiv);
                    })
                });
            } else if (arr instanceof Object) {
                Object.entries(arr).forEach(([key, each]) => {
                    sequence = sequence.then(() => {
                        let localVars = Object.assign({}, varspace);
                        if (each instanceof Object) localVars = Object.assign({}, localVars, each);
                        else localVars._loopval_ = each;
                        localVars._loopkey_ = key;
                        self._renderSingle(localVars, outerDiv);
                    });
                });
            } else {
                throw("Loop template without array or object" + arr);
            }

        }

        console.log(">".repeat(indent), "end of loop", outerDiv);
        return outerDiv;
    }

    // --------------------------------
    _renderSinglePromise(varspace, parentDiv) {
        const self = this;
        return new Promise( (resolve, reject) => {
            let outerDiv;
            var sequence = Promise.resolve();

            // simple text
            if (self.text) {
                outerDiv = document.createTextNode( _eval(self.text, varspace) );
            } else {
                indent++;
                // <template> should be a transparent element in rendered result
                if (self.isTemplate) {
                    if (parentDiv) outerDiv = parentDiv;
                    else outerDiv = document.createElement('div'); // only when this template is the top tag
                }
                // Keep normal Element as it is, resolve variable inside tag anchor
                else {
                    outerDiv = self.templateEle.cloneNode(false); // NO childs
                    for (let attr of outerDiv.attributes) {
                        outerDiv.setAttribute(attr.name, _eval(attr.value, varspace));
                    }
                }

                if (self.html) {
                    outerDiv.innerHTML = _eval(self.html, varspace);
                } else {
                    self.childs.forEach( each => {
                        sequence = sequence.then(() => {
                            return each.populate(varspace, outerDiv);
                        });
                    })

                }
            }

            sequence.then(() => {
                console.log(">".repeat(indent--), outerDiv);
                if (outerDiv !== parentDiv) parentDiv.appendChild(outerDiv);
                resolve(outerDiv);
            });
        })
    }

    _renderCondPromise(varspace, parentDiv) {
        if (this.fnCond(varspace)) return this._renderSingle(varspace, parentDiv);
        else return Promise.resolve(parentDiv || document.createElement('div'));
    }
    
    _renderLoopPromise(varspace, parentDiv) {
        const self = this;
        // there always a parent Element wrapping the loop
        const outerDiv = parentDiv || document.createElement('div');

        return new Promise( (resolve, reject) => {
            let sequence = Promise.resolve(); // first time is always success
        
            if (self.loopvar in varspace) {        
                let arr = varspace[self.loopvar];
                // global variable will be passed down. later override if any
                // loop over in SEQUENCE
                if (arr instanceof Array) {
                    arr.forEach( (each, i) => {
                        sequence = sequence.then(() => {
                            let localVars = Object.assign({}, varspace);
                            if (each instanceof Object) localVars = Object.assign({}, localVars, each);
                            else localVars._loopval_ = each;
                            localVars._loopi_ = i;
                            // next sequence call will wait for this to done
                            // all child is appended to outerDiv under this call
                            self._renderSingle(localVars, outerDiv);
                        })
                    });
                } else if (arr instanceof Object) {
                    Object.entries(arr).forEach(([key, each]) => {
                        sequence = sequence.then(() => {
                            let localVars = Object.assign({}, varspace);
                            if (each instanceof Object) localVars = Object.assign({}, localVars, each);
                            else localVars._loopval_ = each;
                            localVars._loopkey_ = key;
                            self._renderSingle(localVars, outerDiv);
                        });
                    });
                } else {
                    throw("Loop template without array or object" + arr);
                }

            }

            // finally, return the outerDiv as Promise
            sequence.then(() => {
                console.log(">".repeat(indent), "end of loop", outerDiv);
                resolve(outerDiv)
            });
        });
    }
}


// module.exports = FirebaseTemplate;