define(function (require, exports, module) {
  'use strict';

  var ProjectManager = app.getModule('engine/ProjectManager');
  var Engine = app.getModule('engine/Engine');
  var FileSystem = app.getModule('filesystem/FileSystem');
  var FileUtils = app.getModule('file/FileUtils');
  var Async = app.getModule('utils/Async');
  var UML = app.getModule('uml/UML');

  var CodeGenUtils = require('code-generator-utils');

  function RubyCodeGenerator(baseModel, basePath) {
    this.baseModel = baseModel;
    this.basePath = basePath;
  }

  RubyCodeGenerator.prototype.getIndentString = function (options) {
    var indent = [];
    for (var i = 0; i < 2; i++) {
      indent.push(' ');
    }

    return indent.join('');
  };

  RubyCodeGenerator.prototype.generate = function (element, path, options) {
    var result = new $.Deferred();
    var fullPath;
    var directory;
    var codeWriter;
    var file;

    if (element instanceof type.UMLPackage) {
      fullPath = path + '/' + element.name;
      directory = FileSystem.getDirectoryForPath(fullPath);
      directory.create(function (error, stat) {
        if (!error) {
          Async.doSequentially(element.ownedElements, function (child) {
            return generate(child, fullPath, options);
          }, false).then(result.resolve, result.reject);
        } else {
          result.reject(error);
        }
      });
    } else if (element instanceof type.UMLClass) {
      if (element.stereotype === 'annotationType') {
        codeWriter = new CodeGenUtils.CodeWriter(this.getIndentString(options));
        codeWriter.writeLine();
        codeWriter.writeLine('this is annotation');
        codeWriter.writeLine();
        fullPath = path + '/' + element.name + '.rb';
        file = FileSystem.getFileForPath(fullPath);
        FileUtils.writeText(file, codeWriter.getData(), true).then(result.resolve, result.reject);
      } else {
        codeWriter = new CodeGenUtils.CodeWriter(this.getIndentString(options));
        codeWriter.writeLine();
        this.writeClass(codeWriter, element, options);
        fullPath = path + '/' + element.name + '.rb';
        file = FileSystem.getFileForPath(fullPath);
        FileUtils.writeText(file, codeWriter.getData(), true).then(result.resolve, result.reject);
      }
    } else {
      result.resolve();
    }

    return result.promise();
  };

  RubyCodeGenerator.prototype.writeConstructor = function (codeWriter, element, options) {
    if (element.name.length) {
      var terms = [];
      var len = element.attributes.length;

      terms.push('def initialize(');
      for (var i = 0; i < len; i++) {
        terms.push(element.attributes[i].name);
        if (i !== len - 1) {
          terms.push(', ');
        }
      }

      codeWriter.writeLine(terms.join('') + ')');
      codeWriter.indent();
      for (var j = 0; j < len; j++) {
        codeWriter.writeLine('@' + element.attributes[j].name + ' = ' + element.attributes[j].name);
      }

      codeWriter.outdent();
      codeWriter.writeLine('end');
    }
  };

  RubyCodeGenerator.prototype.writeSetGetMethod = function (codeWriter, element, options) {
    if (element.name.length) {
      var len = element.attributes.length;

      for (var i = 0; i < len; i++) {
        codeWriter.writeLine('def ' + element.attributes[i].name);
        codeWriter.indent();
        codeWriter.writeLine('@' + element.attributes[i].name);
        codeWriter.outdent();
        codeWriter.writeLine('end');
        codeWriter.writeLine();
        codeWriter.writeLine('def ' + element.attributes[i].name + '=(value)');
        codeWriter.indent();
        codeWriter.writeLine('@' + element.attributes[i].name + ' = value');
        codeWriter.outdent();
        codeWriter.writeLine('end');
        codeWriter.writeLine();
      }
    }
  };

  RubyCodeGenerator.prototype.writeClass = function (codeWriter, element, options) {
    var terms = [];

    terms.push('class');
    terms.push(element.name);
    codeWriter.writeLine(terms.join(' '));
    codeWriter.indent();
    this.writeConstructor(codeWriter, element, options);
    codeWriter.writeLine();
    this.writeSetGetMethod(codeWriter, element, options);
    codeWriter.outdent();
    codeWriter.writeLine('end');
  };

  function generate(baseModel, basePath, options) {
    var result = new $.Deferred();
    var rubyCodeGenerator = new RubyCodeGenerator(baseModel, basePath);
    return rubyCodeGenerator.generate(baseModel, basePath, options);
  }

  exports.generate = generate;
});
