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
    var _this = this;
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
            return _this.generate(child, fullPath, options);
          }, false).then(result.resolve, result.reject);
        } else {
          result.reject(error);
        }
      });
    } else if (element instanceof type.UMLClass) {
      if (element.stereotype !== 'annotationType') {
        codeWriter = new CodeGenUtils.CodeWriter(this.getIndentString(options));
        var moduleName = this.writePackage(codeWriter, element);
        if (moduleName) {
          codeWriter.writeLine('module ' + moduleName);
          codeWriter.indent();
        }

        this.writeClass(codeWriter, element, options);
        if (moduleName) {
          codeWriter.outdent();
          codeWriter.writeLine('end');
        }

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

  RubyCodeGenerator.prototype.writePackage = function (codeWriter, element) {
    var path = null;

    if (element._parent) {
      path = _.map(element._parent.getPath(this.baseModel), function (e) {
        return e.name
      }).join('.');
    }

    return path;
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

  RubyCodeGenerator.prototype.writeAttributeAccessor = function (type, visibility, codeWriter, element) {
    var terms = [];
    var len = element.attributes.length;
    var attributeVisibility;
    var publicAttributeLastIndex;
    var protectedAttributeLastIndex;
    var privateAttributeLastIndex;

    for (var i = 0; i < len; i++) {
      attributeVisibility = this.getVisibility(element.attributes[i]);

      if (attributeVisibility === 'public') {
        publicAttributeLastIndex = i;
      } else if (attributeVisibility === 'protected') {
        protectedAttributeLastIndex = i;
      } else if (attributeVisibility === 'private') {
        privateAttributeLastIndex = i;
      }
    }

    if (type === 'short' && visibility === 'public') {
      terms.push('attr_accessor ');
      for (var i = 0; i < len; i++) {
        attributeVisibility = this.getVisibility(element.attributes[i]);

        if (attributeVisibility === 'public') {
          terms.push(':' + element.attributes[i].name);
          if (i !== publicAttributeLastIndex) {
            terms.push(', ');
          }
        }
      }

      codeWriter.writeLine(terms.join(''));
    } else if (type === 'short' && visibility === 'protected') {
      terms.push('attr_accessor ');
      for (var i = 0; i < len; i++) {
        attributeVisibility = this.getVisibility(element.attributes[i]);

        if (attributeVisibility === 'protected') {
          terms.push(':' + element.attributes[i].name);
          if (i !== protectedAttributeLastIndex) {
            terms.push(', ');
          }
        }
      }

      codeWriter.writeLine(terms.join(''));
    } else if (type === 'short' && visibility === 'private') {
      terms.push('attr_accessor ');
      for (var i = 0; i < len; i++) {
        attributeVisibility = this.getVisibility(element.attributes[i]);

        if (attributeVisibility === 'private') {
          terms.push(':' + element.attributes[i].name);
          if (i !== privateAttributeLastIndex) {
            terms.push(', ');
          }
        }
      }

      codeWriter.writeLine(terms.join(''));
    } else if (type === 'long' && visibility === 'public') {
      for (var i = 0; i < len; i++) {
        attributeVisibility = this.getVisibility(element.attributes[i]);

        if (attributeVisibility === 'public') {
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
          if (i !== publicAttributeLastIndex) {
            codeWriter.writeLine();
          }
        }
      }
    } else if (type === 'long' && visibility === 'protected') {
      codeWriter.writeLine();
      for (var i = 0; i < len; i++) {
        attributeVisibility = this.getVisibility(element.attributes[i]);

        if (attributeVisibility === 'protected') {
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
          if (i !== protectedAttributeLastIndex) {
            codeWriter.writeLine();
          }
        }
      }
    } else if (type === 'long' && visibility === 'private') {
      codeWriter.writeLine();
      for (var i = 0; i < len; i++) {
        attributeVisibility = this.getVisibility(element.attributes[i]);

        if (attributeVisibility === 'private') {
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
          if (i !== privateAttributeLastIndex) {
            codeWriter.writeLine();
          }
        }
      }
    }
  };

  RubyCodeGenerator.prototype.writeMethod = function (visibility, codeWriter, element) {
    var len = element.operations.length;
    var terms = [];

    for (var i = 0; i < len; i++) {
      var methodVisibility = this.getVisibility(element.operations[i]);
      var parameters = element.operations[i].getNonReturnParameters();
      var parametersLength = parameters.length;

      if (methodVisibility === visibility) {
        terms.push('def ' + element.operations[i].name);
        if (parametersLength !== 0) {
          terms.push('(');
          for (var j = 0; j < parametersLength; j++) {
            terms.push(parameters[j].name);
            if (j !== parametersLength - 1) {
              terms.push(', ');
            } else {
              terms.push(')');
            }
          }
        }

        codeWriter.writeLine(terms.join(''));
        terms.length = 0;
        codeWriter.indent();
        codeWriter.writeLine('# TODO(person name): Implement this method here.');
        codeWriter.outdent();
        codeWriter.writeLine('end');
        codeWriter.writeLine();
      }
    }
  };

  RubyCodeGenerator.prototype.writeMethodByVisibility = function (codeWriter, element, options) {
    codeWriter.indent();
    this.writeMethod('public', codeWriter, element);
    codeWriter.outdent();

    if (this.countAttributeByVisibility('protected', element)) {
      codeWriter.indent();
      codeWriter.writeLine('protected');
      codeWriter.indent();
      if (this.countAttributeByVisibility('protected', element)) {
        if (options.useAttributeAccessor) {
          this.writeAttributeAccessor('short', 'protected', codeWriter, element);
          codeWriter.writeLine();
        } else if (!options.useAttributeAccessor) {
          this.writeAttributeAccessor('long', 'protected', codeWriter, element);
          codeWriter.writeLine();
        }
      }

      codeWriter.outdent();
      this.writeMethod('protected', codeWriter, element);
      codeWriter.outdent();
      codeWriter.outdent();
    }

    if (this.countAttributeByVisibility('private', element)) {
      codeWriter.indent();
      codeWriter.writeLine('private');
      codeWriter.indent();
      if (this.countAttributeByVisibility('private', element)) {
        if (options.useAttributeAccessor) {
          this.writeAttributeAccessor('short', 'private', codeWriter, element);
          codeWriter.writeLine();
        } else if (!options.useAttributeAccessor) {
          this.writeAttributeAccessor('long', 'private', codeWriter, element);
          codeWriter.writeLine();
        }
      }

      codeWriter.outdent();
      this.writeMethod('private', codeWriter, element);
      codeWriter.outdent();
      codeWriter.outdent();
    }
  };

  RubyCodeGenerator.prototype.countAttributeByVisibility = function (visibility, element) {
    var publicElementCount = 0;
    var protectedElementCount = 0;
    var privateElementCount = 0;
    var len = element.attributes.length;
    var elementVisibility;

    for (var i = 0; i < len; i++) {
      elementVisibility = this.getVisibility(element.attributes[i]);

      if (elementVisibility === 'public') {
        publicElementCount++;
      } else if (elementVisibility === 'protected') {
        protectedElementCount++;
      } else if (elementVisibility === 'private') {
        privateElementCount++;
      }
    }

    if (visibility === 'public') {
      return publicElementCount;
    } else if (visibility === 'protected') {
      return protectedElementCount;
    } else if (visibility === 'private') {
      return privateElementCount;
    }
  };

  RubyCodeGenerator.prototype.writeToStringMethod = function (codeWriter) {
    codeWriter.indent();
    codeWriter.writeLine('def to_s');
    codeWriter.indent();
    codeWriter.writeLine('\"Your string representation of the object will be written here.\"');
    codeWriter.outdent();
    codeWriter.writeLine('end');
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

    if (options.useAttributeAccessor && this.countAttributeByVisibility('public', element)) {
      this.writeAttributeAccessor('short', 'public', codeWriter, element);
      codeWriter.writeLine();
    }

    if (options.initializeMethod) {
      this.writeConstructor(codeWriter, element, options);
      codeWriter.writeLine();
    }

    if (!options.useAttributeAccessor && this.countAttributeByVisibility('public', element)) {
      this.writeAttributeAccessor('long', 'public', codeWriter, element);
      codeWriter.writeLine();
    }

    codeWriter.outdent();

    var len = element.operations.length;
    var protectedMethodLastIndex;
    var privateMethodLastIndex;

    for (var i = 0; i < len; i++) {
      var methodVisibility = this.getVisibility(element.operations[i]);

      if (methodVisibility === 'protected') {
        protectedMethodLastIndex = i;
      } else if (methodVisibility === 'private') {
        privateMethodLastIndex = i;
      }
    }

    this.writeMethodByVisibility(codeWriter, element, options);

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
