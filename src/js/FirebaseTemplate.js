
// evaluate
function _eval(text, varspace) {
    let result, varDesc='';
    for (let key in varspace) varDesc += `let ${key} = ${obj2str(varspace[key])};`;
    varDesc += "result = `" + text + "`";
    try { eval(varDesc); }
    catch(error) { throw(`eval '${varDesc}', ${error}`); }  // add addtional to error message
    return result;
}

// return outer as <div>, keep all attribute same
function template2div(ele, varspace) {
    const div = document.createElement('div');
    for (let attr of ele.attributes) {
        div.setAttribute(attr.name, _eval(attr.value, varspace));
    }
    return div;
}

// doing real parsing
function _parse(ele, parent) {
    if (!ele.nodeType) throw "Must by a Node";
    if (ele.dataset) {
        if (ele.dataset['tloop']) {
            return new TemplateLoop(parent, ele, ele.dataset['tloop']);
        } else if (ele.dataset['tonly']) {
            return new TemplateCondition(parent, ele, function(vs) {
                return keyInObject(ele.dataset['tonly'], vs);
            })
        } else if (ele.dataset['tunless']) {
            return new TemplateCondition(parent, ele, function(vs) {
                return !keyInObject(ele.dataset['tunless'], vs);
            })
        } else if (ele.dataset['tcond']) {
            return new TemplateCondition(parent, ele, vs => {
                let resolveCond = _eval(ele.dataset['tcond'], vs);
                return eval(resolveCond);
            });
        }
    }
    // no template function
    return new FirebaseTemplate(parent, ele);
};

let indent = 0;



class FirebaseTemplate {
    constructor(parent, ele) {
        this.parent = parent;
        this.templateEle = ele;
        this.childs = [];

        let val;

        this.fbPath = parent ? parent.fbPath : '';
        if (val = ele.dataset['fbPath']) {
            if (val[0] === '/') this.fbPath = val;  // absolute path
            else this.fbPath += '/' + val;
        }

    
        if (ele.nodeType == Node.TEXT_NODE) {
            this.text = ele.textContent;
        } else if (ele.nodeType == Node.ELEMENT_NODE) {
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
                        this.childs.push(FirebaseTemplate.parse(c[i], this));
                }
            }
        } else {
            throw "Dont throw other Node type at me";
        }
    };

    // return a Promise
    static parse(ele, parent) {
        // try {
            const parsed = _parse(parent, ele);
            return Promise.resolve(parsed);
        // } catch(error) {
        //     return Promise.reject("Template Parsing failed: " + error);
        // }
    }

    get len() { return this.childs.length; }
    get firstChild() { return this.childs[0]; }
    get nextSibling() { 
        let c = this.parent.childs;
        return c[c.indexOf(this)+1];
    }
    
    render(varspace, parentDiv) {
        // this.varspace = varspace;
        // return new Promise((resolve, reject) => {
        //     // try {
        //         const renderedEle = _render(this, parentDiv);
        //         resolve(renderedEle);
        //     // } catch(error) {
        //     //     return Promise.reject("Template Render failed: " + error);
        //     // }
        // })
        this.varspace = varspace;
        let myPromise, renderedEle;
        // try {
            if (this.loopvar) {
                myPromise = this._renderLoop(parentDiv);
            }
            else if (!this.fnCond || this.fnCond(varspace)) {
                myPromise = Promise.resolve(_render(this, parentDiv));
            }
            else {
                myPromise = _render(this, parentDiv);
            }
            const renderedEle = _render(this, parentDiv);
            return Promise.resolve(renderedEle);
        // } catch(error) {
        //     return Promise.reject("Template Render failed: " + error);
        // }
    }

    // doing real render
    _renderSingle(parentDiv) {
        const self = this;
        return new Promise( (resolve, reject) => {
            let outerDiv;
            // simple text
            if (self.text) {
                outerDiv = document.createTextNode( _eval(self.text, self.varspace) );
                resolve(outerDiv);
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
                        outerDiv.setAttribute(attr.name, _eval(attr.value, self.varspace));
                    }
                }

                if (self.html) {
                    outerDiv.innerHTML = _eval(self.html, self.varspace);
                    resolve(outerDiv);
                } else if (this.firstChild) {
                    return this.firstChild.render(self.varspace, outerDiv).then(() => {
                        if a
                    })
                    self.childs.forEach( each => {
                        sequence = sequence.then(() => {
                            return each.render(self.varspace, outerDiv);
                        });
                    })
                    return sequence.then(() => {
                        console.log(">".repeat(indent--), outerDiv);
                        return outerDiv
                    });
                }
            }
        })
        // try {
            // simple text
            if (self.text) {
                sequence = sequence.then(() => {
                    return document.createTextNode( _eval(self.text, self.varspace) );
                })
            } else {
                indent++;
                let outerDiv;
                // <template> should be a transparent element in rendered result
                if (self.isTemplate) {
                    if (parentDiv) outerDiv = parentDiv;
                    else outerDiv = document.createElement('div'); // only when this template is the top tag
                }
                // Keep normal Element as it is, resolve variable inside tag anchor
                else {
                    outerDiv = self.templateEle.cloneNode(false); // NO childs
                    for (let attr of outerDiv.attributes) {
                        outerDiv.setAttribute(attr.name, _eval(attr.value, self.varspace));
                    }
                }

                if (self.html) {
                    outerDiv.innerHTML = _eval(self.html, self.varspace);
                } else {
                    // for (let i=0; i<self.len; i++) {
                    //     // for child <template>, the child is append directly
                    //     self.childs[i].render(self.varspace, outerDiv);
                    // }
                    self.childs.forEach( each => {
                        sequence = sequence.then(() => {
                            return each.render(self.varspace, outerDiv);
                        });
                    })
                }
                return sequence.
                console.log(">".repeat(indent--), outerDiv);
            }
        // } catch(error) {
        //     return Promise.reject("Template Render failed: " + error);
        // }
        if (parentDiv && (parentDiv !== outerDiv)) parentDiv.appendChild(outerDiv);
        return Promise.resolve(outerDiv);
    }


    _renderCond(parentDiv) {
        if (this.fnCond(varspace)) return _renderSingle(parentDiv);
        else return parentDiv || document.createElement('div');
    }
    
    _renderLoop(parentDiv) {
        this.renderedEle = [];
        // there always a parent Element wrapping the loop
        const outerDiv = parentDiv || document.createElement('div');
    
        if (!(this.loopvar in varspace)) {
            // throw "Loop render failed: loopvar '" + this.loopvar + "' not in varspace" ;
            // just return empty div 
            console.log("loop not found", this.loopvar, varspace);
            return Promise.resolve(outerDiv);
        }
    
        // if this is top element, need create a container <div> surrounding the loop items
    
        let arr = varspace[this.loopvar];
        // global variable will be passed down. later override if any
        // loop over in SEQUENCE
        let sequence = Promise.resolve(); // first time is always success
        if (arr instanceof Array) {
            arr.forEach( (each, i) => {
                sequence = sequence.then(() => {
                    let localVars = Object.assign({}, varspace);
                    if (each instanceof Object) localVars = Object.assign({}, localVars, each);
                    else localVars._loopval_ = each;
                    localVars._loopi_ = i;
                    // next sequence call will wait for this to done
                    // all child is appended to outerDiv under this call
                    return _render(this, outerDiv).then(renderChild => {
                        this.renderedEle.push(renderChild);
                    })
                })
            });
        } else if (arr instanceof Object) {
            Object.entries(arr).forEach(([key, each]) => {
                let localVars = Object.assign({}, varspace);
                if (each instanceof Object) localVars = Object.assign({}, localVars, each);
                else localVars._loopval_ = each;
                localVars._loopkey_ = key;
                return _render(this, outerDiv).then(renderChild => {
                    this.renderedEle.push(renderChild);
                })
            })
        } else {
            throw("Loop template without array or object" + arr);
        }
        // finally, return the outerDiv as Promise
        sequence.then(() => {
            console.log(">".repeat(indent), "end of loop", outerDiv);
            return Promise.resolve(outerDiv)
        });
        return sequence;
    }
}


class TemplateLoop extends FirebaseTemplate {
    constructor(parent, ele, loopvar) {
        super(parent, ele);
        this.loopvar = loopvar;
    }

    render(varspace, parentDiv) {
        this.varspace = varspace;
        this.renderedEle = [];
        // there always a parent Element wrapping the loop
        const outerDiv = parentDiv || document.createElement('div');
    
        if (!(this.loopvar in varspace)) {
            // throw "Loop render failed: loopvar '" + this.loopvar + "' not in varspace" ;
            // just return empty div 
            console.log("loop not found", this.loopvar, varspace);
            return Promise.resolve(outerDiv);
        }
    
        // if this is top element, need create a container <div> surrounding the loop items
    
        let arr = varspace[this.loopvar];
        // global variable will be passed down. later override if any
        // loop over in SEQUENCE
        let sequence = Promise.resolve(); // first time is always success
        if (arr instanceof Array) {
            arr.forEach( (each, i) => {
                sequence = sequence.then(() => {
                    let localVars = Object.assign({}, varspace);
                    if (each instanceof Object) localVars = Object.assign({}, localVars, each);
                    else localVars._loopval_ = each;
                    localVars._loopi_ = i;
                    // next sequence call will wait for this to done
                    // all child is appended to outerDiv under this call
                    return _render(this, outerDiv).then(renderChild => {
                        this.renderedEle.push(renderChild);
                    })
                })
            });
        } else if (arr instanceof Object) {
            Object.entries(arr).forEach(([key, each]) => {
                let localVars = Object.assign({}, varspace);
                if (each instanceof Object) localVars = Object.assign({}, localVars, each);
                else localVars._loopval_ = each;
                localVars._loopkey_ = key;
                return _render(this, outerDiv).then(renderChild => {
                    this.renderedEle.push(renderChild);
                })
            })
        } else {
            throw("Loop template without array or object" + arr);
        }
        // finally, return the outerDiv as Promise
        sequence.then(() => {
            console.log(">".repeat(indent), "end of loop", outerDiv);
            return Promise.resolve(outerDiv)
        });
        return sequence;
    }
}

class TemplateCondition extends FirebaseTemplate {
    constructor(parent, ele, fnCond) {
        super(parent, ele);
        this.fnCond = fnCond;
    }

    render(varspace, parentDiv) {
        if (this.fnCond(varspace)) return super.render(varspace, parentDiv);
        else return parentDiv || document.createElement('div');
    }
}

// module.exports = FirebaseTemplate;