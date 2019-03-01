"use strict";

var _dec, _class;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function superhero(isSupehero) {
  return function (target) {
    target.isSupehero = isSupehero;
  };
}

var MySuperhorClass = (_dec = superhero(true), _dec(_class = function MySuperhorClass() {
  _classCallCheck(this, MySuperhorClass);
}) || _class);
console.log(MySuperhorClass.isSupehero);