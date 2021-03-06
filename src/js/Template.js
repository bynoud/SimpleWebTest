
function _log(cmd, args) {
    for (var i=0; i<args.length; i++) cmd(args[i]);
}
function logd() {  _log(console.log, arguments); }
function loge() {  _log(console.error, arguments); }

function _super(obj) {
    return Object.getPrototypeOf(Object.getPrototypeOf(obj));
}

var temporaryDiv = document.createElement('div');   // just a temporary to not create it every time

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

function tempCalculate(text, varspace, onErrorCB) {
    var result, varDesc='';
    // variable emulate
    for (var key in varspace) {
        varDesc += `var ${key} = ${obj2str(varspace[key])};`;
        // varDesc += "var " + key + " = " + JSON.stringify(varspace[key], function(key,val) {
        //     return (typeof val === 'function') ? val.toString() : val;
        // }) + ";"
    }
    varDesc += "result = `" + text + "`";
    //console.log(`Eval '${varDesc}'`)
    try { eval(varDesc); }
    catch(error) { throw(`eval '${varDesc}', ${error}`); }
    
    // for (var key in varspace) {
    //     varDesc += "var " + key + " = " + JSON.stringify(varspace[key]) + ";"
    // }
    // eval(varDesc + "result = `" + text + "`");
    return result;
}

// in && not empty
function keyInObject(key, obj) {
    console.log("check key in obj", key, obj);
    if (!(key in obj)) return false;
    var v = obj[key];
    if (v instanceof Array) return (v.length > 0);
    if (v instanceof Object) return (Object.keys(v).length > 0);
    // else, assum it's primitive
    if (v) return true;
    return false;
}

export function createTemplate(ele) {
    if (!ele.nodeType) throw "Must by a Node";
    if (ele.dataset) {
        if (ele.dataset['tloop']) {
            return new TemplateLoop(ele, ele.dataset['tloop']);
        } else if (ele.dataset['tonly']) {
            return new TemplateCondition(ele, function(vs) {
                return keyInObject(ele.dataset['tonly'], vs);
            })
        } else if (ele.dataset['tunless']) {
            return new TemplateCondition(ele, function(vs) {
                return !keyInObject(ele.dataset['tunless'], vs);
            })
        } else if (ele.dataset['tcond']) {
            return new TemplateCondition(ele, vs => {
                let resolveCond = tempCalculate(ele.dataset['tcond'], vs);
                return eval(resolveCond);
            });
        }
    }
    // no template function
    return new Template(ele);
    
}

// return outer as <div>, keep all attribute same
function template2div(ele, varspace) {
    const div = document.createElement('div');
    for (let attr of ele.attributes) {
        div.setAttribute(attr.name, tempCalculate(attr.value, varspace));
    }
    return div;
}

/**
 * 
 * @param ele : Single Template Element, no condition or anything
 */
function Template(ele) {
    if (!ele) return null;

    this.temp = ele;
    this.childs = [];

    if (ele.nodeType == Node.TEXT_NODE) {
        this.text = ele.textContent;
    } else if (ele.nodeType == Node.ELEMENT_NODE) {
        this.me = ele.cloneNode(false); // NO childs
        if (ele.tagName.toLowerCase() == "template") {
            this.isTemplate = true;
            var c = ele.content.childNodes; // need TEXT_NODE also
        } else {
            this.isTemplate = false;
            var c = ele.childNodes;
        }
        // data-thtml : must containt single TEXT_NODE
        if ('thtml' in ele.dataset) {
            this.html = c[0].textContent;
        } else {
            for (var i=0; i<c.length; i++) {
                if (c[i].nodeType == Node.TEXT_NODE || c[i].nodeType == Node.ELEMENT_NODE)
                    this.childs.push(createTemplate(c[i]));
            }
        }
    } else {
        throw "Dont throw other Node type at me";
    }
}

/**
 * Inherit from Template
 * @param ele for template tloop
 * @param loopvar 
 */
function TemplateLoop(ele, loopvar) {
    Template.call(this, ele);
    this.loopvar = loopvar;
    if (ele.dataset['tasvar']) {
        this.asVar = ele.dataset['tasvar']; // this will take value of loop-index or loop-key
    }
}
TemplateLoop.prototype = Object.create(Template.prototype);
TemplateLoop.prototype.constructor = TemplateLoop;

/**
 * 
 * @param ele tonly tunless (TBD : tcase)
 * @param cond function, return true to render, else to ignore
 */
function TemplateCondition(ele, cond) {
    Template.call(this, ele);
    this.cond = cond;
}
TemplateCondition.prototype = Object.create(Template.prototype);
TemplateCondition.prototype.constructor = TemplateLoop;

/**
 * Template : Detail implementation
 */
Template.prototype.len = function() {
    return this.childs.length;
};

var indent = 0;
// return a Node

Template.prototype.render = function(varspace, onErrorCB, parentDiv) {
    var outerDiv;
    // simple text
    if (this.text) {
        outerDiv = document.createTextNode( tempCalculate(this.text, varspace, onErrorCB) );
    } else {
        indent++;
        try {
            if (this.isTemplate==true) {
                if (parentDiv) outerDiv = parentDiv;
                else outerDiv = template2div(this.me, varspace);//document.createElement('div');
            }
            // Keep normal Element as it is, resolve variable inside tag anchor
            else {
                temporaryDiv.innerHTML = tempCalculate(this.me.outerHTML, varspace, onErrorCB);
                outerDiv = temporaryDiv.children[0];
                temporaryDiv.removeChild(outerDiv);
            }

            if (this.html) {
                outerDiv.innerHTML = tempCalculate(this.html, varspace, onErrorCB);
            } else {
                for (var i=0; i<this.len(); i++) {
                    // for child <template>, the child is append directly
                    this.childs[i].render(varspace || {}, onErrorCB, outerDiv);
                    //if (childDiv!==outerDiv) outerDiv.appendChild(childDiv);
                }
            }
            console.log(">".repeat(indent--), outerDiv);
        } catch(error) {
            console.error("render failed", this, varspace, error);
        }
    }
    if (parentDiv && (parentDiv !== outerDiv)) parentDiv.appendChild(outerDiv);
    return outerDiv;
}

TemplateLoop.prototype.render = function(varspace, onErrorCB, parentDiv) {
    console.log("looop", this, this.temp, this.me, varspace);

    if (!(this.loopvar in varspace)) {
        // throw "Loop render failed: loopvar '" + this.loopvar + "' not in varspace" ;
        // just return empty div 
        console.log("loop not found", this.loopvar, varspace);
        return parentDiv;
    }

    // if this is top element, need create a container <div> surrounding the loop items
    var outerDiv = parentDiv || template2div(this.me, varspace);//document.createElement('div');

    var arr = varspace[this.loopvar];
    // global variable will be passed down. later override if any
    var localVars = Object.assign({}, varspace);
    // loop over
    if (arr instanceof Array) {
        arr.forEach( (each, i) => {
            if (each instanceof Object) localVars = Object.assign({}, localVars, each);
            else localVars._loopval_ = each;
            localVars._loopi_ = i;
            if (this.asVar) localVars[this.asVar] = i;
            _super(this).render.call(this, localVars, onErrorCB, outerDiv);    // all child is appended to outerDiv under this call
        });
    } else if (arr instanceof Object) {
        for (let key in arr) {
            localVars = Object.assign({}, localVars, arr[key]);
            localVars._loopkey_ = key;
            if (this.asVar) localVars[this.asVar] = key;
            _super(this).render.call(this, localVars, onErrorCB, outerDiv);
        }
    } else {
        console.error("Loop template without array or object");
    }
    console.log(">".repeat(indent), "end of loop", outerDiv);
    return outerDiv;
}

TemplateCondition.prototype.render = function(varspace, onErrorCB, parentDiv) {
    if (this.cond(varspace)) return _super(this).render.call(this, varspace, onErrorCB, parentDiv);
    else return parentDiv || document.createElement('div');
}
