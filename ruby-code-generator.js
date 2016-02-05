define(function (require, exports, module) {
  'use strict';

  var Repository = app.getModule('core/Repository');
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
        fullPath = path + '/' + codeWriter.fileName(element.name) + '.rb';
        file = FileSystem.getFileForPath(fullPath);
        FileUtils.writeText(file, codeWriter.getData(), true).then(result.resolve, result.reject);
      }
    } else {
      result.resolve();
    }

    return result.promise();
  };

  RubyCodeGenerator.prototype.getVisibility = function (element) {
    switch (element.visibility) {
      case UML.VK_PUBLIC:
        return 'public';
      case UML.VK_PROTECTED:
        return 'protected';
      case UML.VK_PRIVATE:
        return 'private';
    }

    return null;
  };

  RubyCodeGenerator.prototype.getSuperClasses = function (element) {
    var inheritances = Repository.getRelationshipsOf(element, function (relationship) {
      return (relationship instanceof type.UMLGeneralization && relationship.source === element);
    });
    return _.map(inheritances, function (inherit) {
      return inherit.target;
    });
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

  RubyCodeGenerator.prototype.writeAttributeAccessor = function (codeWriter, element, options) {
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
        if (i !== len - 1) {
          codeWriter.writeLine();
        }
      }
    }
  };

  RubyCodeGenerator.prototype.constructMethod = function (codeWriter, element, options) {
    if (element.name.length) {
      var parameters = element.getNonReturnParameters();
      var len = parameters.length;
      var methodVisibility = this.getVisibility(element);
      var terms = '';

      terms += '  def ' + element.name;
      if (len !== 0) {
        terms += '(';
        for (var i = 0; i < len; i++) {
          terms += parameters[i].name;
          if (i !== len - 1) {
            terms += ', ';
          } else {
            terms += ')';
          }
        }
      }

      terms += '\n';
      if (methodVisibility === 'public') {
        terms += '  end';
      } else {
        terms += '    end';
      }
    }

    return terms;
  }

  RubyCodeGenerator.prototype.writeMethod = function (codeWriter, publicTerms, protectedTerms, privateTerms) {
    if (publicTerms.length) {
      codeWriter.writeLine(publicTerms);
    }

    if (protectedTerms.length) {
      codeWriter.indent();
      codeWriter.writeLine('protected');
      codeWriter.writeLine();
      codeWriter.writeLine(protectedTerms);
      codeWriter.outdent();
    }

    if (privateTerms.length) {
      codeWriter.indent();
      codeWriter.writeLine('private');
      codeWriter.writeLine();
      codeWriter.writeLine(privateTerms);
      codeWriter.outdent();
    }
  };

  RubyCodeGenerator.prototype.writeClass = function (codeWriter, element, options) {
    var terms = [];

    terms.push('class');
    terms.push(element.name);

    var _inheritance = this.getSuperClasses(element);
    if (_inheritance.length) {
      terms.push('< ' + _inheritance[0].name);
    }

    codeWriter.writeLine(terms.join(' '));
    codeWriter.indent();
    this.writeConstructor(codeWriter, element, options);
    codeWriter.writeLine();
    this.writeAttributeAccessor(codeWriter, element, options);
    codeWriter.outdent();
    codeWriter.writeLine();

    var len = element.operations.length;
    var publicTerms = '';
    var protectedTerms = '';
    var privateTerms = '';

    for (var i = 0; i < len; i++) {
      var methodVisibility = this.getVisibility(element.operations[i]);
      var methodString = this.constructMethod(codeWriter, element.operations[i], options);

      if (i !== len - 1) {
        if (methodVisibility === 'public') {
          publicTerms += methodString;
          publicTerms += '\n\n';
        } else if (methodVisibility === 'protected') {
          protectedTerms += methodString;
          protectedTerms += '\n\n';
        } else if (methodVisibility === 'private') {
          privateTerms += methodString;
          privateTerms += '\n\n';
        }
      } else {
        if (methodVisibility === 'public') {
          publicTerms += methodString;
        } else if (methodVisibility === 'protected') {
          protectedTerms += methodString;
        } else if (methodVisibility === 'private') {
          privateTerms += methodString;
        }
      }
    }

    this.writeMethod(codeWriter, publicTerms, protectedTerms, privateTerms);
    codeWriter.writeLine('end');
  };

  function generate(baseModel, basePath, options) {
    var result = new $.Deferred();
    var rubyCodeGenerator = new RubyCodeGenerator(baseModel, basePath);
    return rubyCodeGenerator.generate(baseModel, basePath, options);
  }

  exports.generate = generate;
});
