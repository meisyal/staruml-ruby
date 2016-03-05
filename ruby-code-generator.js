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
    var length = options.indentSpaces;

    if (options.useTab) {
      return '\t';
    } else {
      var indent = [];
      var length = options.indentSpaces;
      for (var i = 0; i < length; i++) {
        indent.push(' ');
      }

      return indent.join('');
    }
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

  RubyCodeGenerator.prototype.writeAttributeAccessor = function (type, codeWriter, element, options) {
    var terms = [];

    if (element.name.length) {
      var i;
      var len = element.attributes.length;

      if (type === 'short') {
        terms.push('attr_accessor ');
        for (i = 0; i < len; i++) {
          terms.push(':' + element.attributes[i].name);
          if (i !== len - 1) {
            terms.push(', ');
          }
        }

        codeWriter.writeLine(terms.join(''));
      } else if (type === 'long') {
        for (i = 0; i < len; i++) {
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
    }
  };

  RubyCodeGenerator.prototype.constructMethod = function (codeWriter, element, options) {
    if (element.name.length) {
      var parameters = element.getNonReturnParameters();
      var len = parameters.length;
      var methodVisibility = this.getVisibility(element);
      var indentationSpaces = this.getIndentString(options);
      var terms = '';

      terms += indentationSpaces;
      terms += 'def ' + element.name;
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
        terms += indentationSpaces + 'end';
      } else {
        terms += indentationSpaces;
        terms += indentationSpaces + 'end';
      }
    }

    return terms;
  }

  RubyCodeGenerator.prototype.writeMethod = function (codeWriter, publicTerms, protectedTerms, privateTerms) {
    if (publicTerms.length) {
      codeWriter.writeLine();
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

  RubyCodeGenerator.prototype.writeToStringMethod = function (codeWriter) {
    codeWriter.indent();
    codeWriter.writeLine('def to_s');
    codeWriter.indent();
    codeWriter.writeLine('\"Your string representation of the object will be written here.\"');
    codeWriter.outdent();
    codeWriter.writeLine('end');
  }

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

    if (options.useAttributeAccessor) {
      this.writeAttributeAccessor('short', codeWriter, element, options);
      codeWriter.writeLine();
    }

    if (options.initializeMethod) {
      this.writeConstructor(codeWriter, element, options);
    }

    if (!options.useAttributeAccessor) {
      codeWriter.writeLine();
      this.writeAttributeAccessor('long', codeWriter, element, options);
    }

    codeWriter.outdent();

    var len = element.operations.length;
    var publicMethodLastIndex;
    var protectedMethodLastIndex;
    var privateMethodLastIndex;

    for (var i = 0; i < len; i++) {
      var methodVisibility = this.getVisibility(element.operations[i]);

      if (methodVisibility === 'public') {
        publicMethodLastIndex = i;
      } else if (methodVisibility === 'protected') {
        protectedMethodLastIndex = i;
      } else if (methodVisibility === 'private') {
        privateMethodLastIndex = i;
      }
    }

    var publicTerms = '';
    var protectedTerms = '';
    var privateTerms = '';

    for (var i = 0; i < len; i++) {
      var methodVisibility = this.getVisibility(element.operations[i]);
      var methodString = this.constructMethod(codeWriter, element.operations[i], options);

      if (methodVisibility === 'public') {
        publicTerms += methodString;
        if (i === publicMethodLastIndex) {
          publicTerms += '\n';
        } else {
          publicTerms += '\n\n';
        }
      } else if (methodVisibility === 'protected') {
        protectedTerms += methodString;
        if (i === protectedMethodLastIndex) {
          protectedTerms += '\n';
        } else {
          protectedTerms += '\n\n';
        }
      } else if (methodVisibility === 'private') {
        privateTerms += methodString;
        if (i === privateMethodLastIndex) {
          privateTerms += '\n';
        } else {
          privateTerms += '\n\n';
        }
      }
    }

    this.writeMethod(codeWriter, publicTerms, protectedTerms, privateTerms);

    if (options.rubyToStringMethod) {
      this.writeToStringMethod(codeWriter);
    }

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
