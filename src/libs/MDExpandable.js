
function getParentWithClass(ele, clss) {
  var p = ele;
  while (p!=document.body) {
    p = p.parentElement;
    if (p.classList.contains(clss)) return p;
  }
  return null;
}

function getChildrenWithClass(ele, clss) {
  var r = [];
  for (var i=0; i<ele.children.length; i++) {
    if (ele.children[i].classList.contains(clss)) {
      r.push(ele.children[i]);
    }
  }
  return r;
}

function getChildWithClass(ele, clss) {
  for (var i=0; i<ele.children.length; i++) {
    if (ele.children[i].classList.contains(clss)) {
      return ele.children[i];
    }
  }
  return null;
}

function getSiblingWithClass(ele, clss) {
  return getChildWithClass(ele.parentNode, clss);
}

const classOpened = 'md-expandable--opened';

function testf() {
  console.log("DDDDD");
}

//document.getElementById('testID').addEventListener('click', expandContainer);
function MDExpandable(targetEle) {
  this.item = targetEle;
  this.header = getChildWithClass(targetEle, 'md-expandable--header');
  this.content = getChildWithClass(targetEle, 'md-expandable-content');
  if (this.header==null || this.content==null) {
    console.error("MDExpandable failed");
    return;
  }
  this.control = getChildWithClass(this.header, 'md-expandable--control');
  this.autohides = getChildrenWithClass(this.header, 'md-expandable--autohide');
  console.log("C", this.content.children[0]);
  this.morebtn = getChildWithClass(this.content.children[0], 'md-expandable-content--more');
  this.lessbtn = getChildWithClass(this.content.children[0], 'md-expandable-content--less');

  this.hidables = getChildrenWithClass(this.content,
      'md-expandable-content--hidable').reverse();  // latest first

  this.moreContent = (function() {
    if (this.contNum >= this.hidables.length) return;
    for (var i=this.contNum; i<this.contNum+2; i++) {
      if (i<0 || i>=this.hidables.length) continue;
      this.hidables[i].classList.add(classOpened);
    }
    this.contNum+=2;
    console.log("more", this.contNum);
  }).bind(this);
  //this.moreContent()();

  this.lessContent = (function() {
    if (this.contNum < 0) return;
    for (var i=this.contNum-1; i>=this.contNum-2; i--) {
      if (i<0 || i>=this.hidables.length) continue;
      this.hidables[i].classList.remove(classOpened);
    }
    this.contNum-=2;
    console.log("less", this.contNum);
  }).bind(this);

  this.toggleAutoHide = (function() {
    for (var i=0; i<this.autohides.length; i++) {
      this.autohides[i].classList.toggle(classOpened);
    }
  }).bind(this);

  this._toggleExpandable = (function() {
    this.item.classList.toggle(classOpened);
    if (this.content!=null) this.content.classList.toggle(classOpened);
    if (this.control!=null) this.control.classList.toggle(classOpened);
  }).bind(this);

  this.toggleExpandable = function () {
    var isOpened = this.item.classList.contains(classOpened);
    console.log("is", isOpened);
    if (!isOpened) {
      this.toggleAutoHide(); // if not open, need close autohide first
      setTimeout(this._toggleExpandable, 800);
    } else {
      this._toggleExpandable();
      setTimeout(this.toggleAutoHide, 1200);
    }
  };
  
  this.expandContainer = (function () {
    console.log("expaned click", this, this.header);
    this.header.removeEventListener('click', this.expandContainer);
    this.header.addEventListener('click', this.collapseContent);
    this.toggleExpandable();
  }).bind(this);
  
  this.collapseContent = (function () {
    this.header.removeEventListener('click', this.collapseContent);
    this.header.addEventListener('click', this.expandContainer);
    this.toggleExpandable();
  }).bind(this);
  
  this.header.addEventListener('click', this.expandContainer);
  //this.header.addEventListener('click', testf);
  console.log("added", this.header);

  if (this.lessbtn!=null) this.lessbtn.addEventListener('click', this.lessContent);
  if (this.morebtn!=null) {
    this.contNum = -1; // only show latest as default
    this.morebtn.addEventListener('click', this.moreContent);
  } else {
    this.contNum = 100000; // add all if no show-more option
  }

}

var exEles = document.getElementsByClassName('md-card-item');
for (var i=0; i<exEles.length; i++) {
  var x = new MDExpandable(exEles[i]);
}


