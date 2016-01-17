define(function (require, exports, module) {
  'use strict';

  function CodeWriter(indentString) {
    this.lines = [];
    this.indentString = (indentString ? indentString : '  ');
    this.indentations = [];
  }

  CodeWriter.prototype.indent = function () {
    this.indentations.push(this.indentString);
  };

  CodeWriter.prototype.outdent = function () {
    this.indentations.splice(this.indentations.length - 1, 1);
  };

  CodeWriter.prototype.writeLine = function (line) {
    if (line) {
      this.lines.push(this.indentations.join('') + line);
    } else {
      this.lines.push('');
    }
  };

  CodeWriter.prototype.getData = function () {
    return this.lines.join('\n');
  };

  exports.CodeWriter = CodeWriter;
});
