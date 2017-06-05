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
        var moduleName = this.getPackageName(codeWriter, element);
        if (moduleName) {
          this.writeDocumentation(codeWriter, element._parent.documentation, options);
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
    } else if (element instanceof type.UMLInterface) {
      codeWriter = new CodeGenUtils.CodeWriter(this.getIndentString(options));
      this.writeInterface(codeWriter, element, options)

      fullPath = path + '/' + codeWriter.fileName(element.name) + '.rb';
      file = FileSystem.getFileForPath(fullPath);
      FileUtils.writeText(file, codeWriter.getData(), true).then(result.resolve, result.reject);
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

  RubyCodeGenerator.prototype.getPackageName = function (codeWriter, element) {
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

  RubyCodeGenerator.prototype.getInterface = function (element) {
    var interfaces = Repository.getRelationshipsOf(element, function (relationship) {
      return (relationship instanceof type.UMLInterfaceRealization && relationship.source === element);
    });

    return _.map(interfaces, function (implement) {
      return implement.target;
    });
  };

  RubyCodeGenerator.prototype.writeAssociation = function (codeWriter, element) {
    var associations = Repository.getRelationshipsOf(element, function (relationship) {
      return (relationship instanceof type.UMLAssociation);
    });

    for (var i = 0; i < associations.length; i++) {
      var association = associations[i];

      if (association.end1.reference === element && association.end2.navigable === true) {
        var fileName = codeWriter.fileName(association.end2.reference.name);

        codeWriter.writeLine('require_relative \'' + fileName + '.rb\'');
      }

      if (association.end2.reference === element && association.end1.navigable === true) {
        var fileName = codeWriter.fileName(association.end1.reference.name);

        codeWriter.writeLine('require_relative \'' + fileName + '.rb\'');
      }
    }

    if (associations.length) {
      codeWriter.writeLine();
    }
  };

  RubyCodeGenerator.prototype.writeDocumentation = function (codeWriter, text, options) {
    var lines;

    if (options.documentation && text.trim().length) {
      lines = text.trim().split('\n');
      if (lines > 1) {
        codeWriter.writeLine('#');
        for (var i = 0; i < lines.length; i++) {
          codeWriter.writeLine(' ' + lines[i]);
        }
      } else {
        codeWriter.writeLine('# ' + lines[0]);
      }
    }
  };

  RubyCodeGenerator.prototype.writeConstructor = function (codeWriter, element) {
    if (element.name.length) {
      var terms = [];
      var len = element.attributes.length;

      terms.push('def initialize(');
      for (var i = 0; i < len; i++) {
        if (!element.attributes[i].isStatic) {
          terms.push(element.attributes[i].name);
          terms.push(', ');
        }
      }

      if (terms.length > 1) {
        terms.pop();
      }

      codeWriter.writeLine(terms.join('') + ')');
      codeWriter.indent();
      for (var i = 0; i < len; i++) {
        if (!element.attributes[i].isStatic) {
          codeWriter.writeLine('@' + element.attributes[i].name + ' = ' +
              element.attributes[i].name);
        }
      }

      var associations = this.getClassAssociation(codeWriter, element);
      if (associations.length) {
        for (var i = 0; i < associations.length; i++) {
          codeWriter.writeLine('@' + associations[i] + ' = ' +
              codeWriter.toCamelCase(associations[i]) + '.new');
        }
      }

      codeWriter.outdent();
      codeWriter.writeLine('end');
    }
  };

  RubyCodeGenerator.prototype.writeAttributeAccessor = function (visibility, codeWriter, element, options) {
    var readerAttributeTerms = [];
    var accessorAttributeTerms = [];
    var len = element.attributes.length;
    var attributeVisibility;

    for (var i = 0; i < len; i++) {
      attributeVisibility = this.getVisibility(element.attributes[i]);

      if (attributeVisibility === visibility && !element.attributes[i].isStatic) {
        this.writeDocumentation(codeWriter, element.attributes[i].documentation, options);

        if (element.attributes[i].isReadOnly) {
          readerAttributeTerms.push(':' + element.attributes[i].name);
          readerAttributeTerms.push(', ');
        } else {
          accessorAttributeTerms.push(':' + element.attributes[i].name);
          accessorAttributeTerms.push(', ');
        }
      }
    }

    if (accessorAttributeTerms.length > 1) {
      accessorAttributeTerms.pop();
      codeWriter.writeLine('attr_accessor ' + accessorAttributeTerms.join(''));
    }

    if (readerAttributeTerms.length > 1) {
      readerAttributeTerms.pop();
      codeWriter.writeLine('attr_reader ' + readerAttributeTerms.join(''));
    }
  };

  RubyCodeGenerator.prototype.writeConstant = function (codeWriter, element) {
    var len = element.attributes.length;

    for (var i = 0; i < len; i++) {
      if (element.attributes[i].isReadOnly && element.attributes[i].isStatic) {
        codeWriter.writeLine(element.attributes[i].name + ' = ' +
          element.attributes[i].defaultValue);
        if (this.getVisibility(element.attributes[i]) === 'private') {
          codeWriter.writeLine('private_constant :' + element.attributes[i].name);
        }
      }
    }
  };

  RubyCodeGenerator.prototype.writeClassVariable = function (codeWriter, element) {
    var len = element.attributes.length;

    for (var i = 0; i < len; i++) {
      if (!element.attributes[i].isReadOnly && element.attributes[i].isStatic) {
        codeWriter.writeLine('@@' + element.attributes[i].name + ' = ' +
          element.attributes[i].defaultValue);
      }
    }
  };

  RubyCodeGenerator.prototype.writeMethod = function (visibility, codeWriter, element, options) {
    var len = element.operations.length;
    var terms = [];

    for (var i = 0; i < len; i++) {
      var methodVisibility = this.getVisibility(element.operations[i]);
      var parameters = element.operations[i].getNonReturnParameters();
      var parametersLength = parameters.length;

      if (methodVisibility === visibility) {
        this.writeDocumentation(codeWriter, element.operations[i].documentation, options);
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
    var attributeCount = this.countAttributeByVisibility(element);
    var methodCount = this.countMethodByVisibility(element);
    var protectedAttributeLength = attributeCount[1];
    var privateAttributeLength = attributeCount[2];
    var publicMethodLength = methodCount[0];
    var protectedMethodLength = methodCount[1];
    var privateMethodLength = methodCount[2];

    if (publicMethodLength) {
      codeWriter.indent();
      this.writeMethod('public', codeWriter, element, options);
      codeWriter.outdent();
    }

    if (protectedAttributeLength || protectedMethodLength) {
      codeWriter.indent();
      codeWriter.writeLine('protected');
      codeWriter.indent();
      if (protectedAttributeLength) {
        this.writeAttributeAccessor('protected', codeWriter, element, options);
        codeWriter.writeLine();
      }

      codeWriter.outdent();
      if (protectedMethodLength) {
        codeWriter.indent();
        this.writeMethod('protected', codeWriter, element, options);
        codeWriter.outdent();
      }

      codeWriter.outdent();
    }

    if (privateAttributeLength || privateMethodLength) {
      codeWriter.indent();
      codeWriter.writeLine('private');
      codeWriter.indent();
      if (privateAttributeLength) {
        this.writeAttributeAccessor('private', codeWriter, element, options);
        codeWriter.writeLine();
      }

      codeWriter.outdent();
      if (privateMethodLength) {
        codeWriter.indent();
        this.writeMethod('private', codeWriter, element, options);
        codeWriter.outdent();
      }

      codeWriter.outdent();
    }
  };

  RubyCodeGenerator.prototype.countAttributeByVisibility = function (element) {
    var publicElementCount = 0;
    var protectedElementCount = 0;
    var privateElementCount = 0;
    var len = element.attributes.length;
    var elementVisibility;
    var attributeCount = [];

    for (var i = 0; i < len; i++) {
      elementVisibility = this.getVisibility(element.attributes[i]);

      if (elementVisibility === 'public' && !element.attributes[i].isStatic) {
        publicElementCount++;
      } else if (elementVisibility === 'protected') {
        protectedElementCount++;
      } else if (elementVisibility === 'private' && !element.attributes[i].isStatic) {
        privateElementCount++;
      }
    }

    attributeCount[0] = publicElementCount;
    attributeCount[1] = protectedElementCount;
    attributeCount[2] = privateElementCount;

    return attributeCount;
  };

  RubyCodeGenerator.prototype.countStaticAttribute = function (element) {
    var staticAttributeCount = 0;
    var len = element.attributes.length;

    for (var i = 0; i < len; i++) {
      if (element.attributes[i].isStatic) {
        staticAttributeCount++;
      }
    }

    return staticAttributeCount;
  };

  RubyCodeGenerator.prototype.countMethodByVisibility = function (element) {
    var publicMethodCount = 0;
    var protectedMethodCount = 0;
    var privateMethodCount = 0;
    var len = element.operations.length;
    var methodVisibility;
    var methodCount = [];

    for (var i = 0; i < len; i++) {
      methodVisibility = this.getVisibility(element.operations[i]);

      if (methodVisibility === 'public') {
        publicMethodCount++;
      } else if (methodVisibility === 'protected') {
        protectedMethodCount++;
      } else if (methodVisibility === 'private') {
        privateMethodCount++;
      }
    }

    methodCount[0] = publicMethodCount;
    methodCount[1] = protectedMethodCount;
    methodCount[2] = privateMethodCount;

    return methodCount;
  };

  RubyCodeGenerator.prototype.getClassAssociation = function (codeWriter, element) {
    var classAssociations = [];

    var associations = Repository.getRelationshipsOf(element, function (relationship) {
      return (relationship instanceof type.UMLAssociation);
    });

    for (var i = 0; i < associations.length; i++) {
      var association = associations[i];

      if (association.end1.reference === element && association.end2.navigable === true) {
        classAssociations.push(codeWriter.fileName(association.end2.reference.name));
      }

      if (association.end2.reference === element && association.end1.navigable === true) {
        classAssociations.push(codeWriter.fileName(association.end1.reference.name));
      }
    }

    return classAssociations;
  };

  RubyCodeGenerator.prototype.writeToStringMethod = function (codeWriter) {
    codeWriter.indent();
    codeWriter.writeLine('def to_s');
    codeWriter.indent();
    codeWriter.writeLine('\"Your string representation of the object will be written here.\"');
    codeWriter.outdent();
    codeWriter.writeLine('end');
  };

  RubyCodeGenerator.prototype.writeInterface = function (codeWriter, element, options) {
    var terms = [];

    terms.push('module');
    terms.push(element.name);

    codeWriter.writeLine(terms.join(' '));
    this.writeMethodByVisibility(codeWriter, element, options);
    codeWriter.writeLine('end');
  };

  RubyCodeGenerator.prototype.writeClass = function (codeWriter, element, options) {
    var terms = [];
    var staticAttributeCount = this.countStaticAttribute(element);

    this.writeAssociation(codeWriter, element);

    var _interface = this.getInterface(element);
    if (_interface.length) {
      codeWriter.writeLine('require_relative \'./' + codeWriter.fileName(_interface[0].name) + '.rb\'');
      codeWriter.writeLine();
    }

    this.writeDocumentation(codeWriter, element.documentation, options);
    terms.push('class');
    terms.push(element.name);

    var _inheritance = this.getSuperClasses(element);
    if (_inheritance.length) {
      terms.push('< ' + _inheritance[0].name);
    }

    codeWriter.writeLine(terms.join(' '));
    codeWriter.indent();

    if (_interface.length) {
      codeWriter.writeLine('include ' + _interface[0].name);
      codeWriter.writeLine();
    }

    var associations = this.getClassAssociation(codeWriter, element);
    var associationTerms = [];
    if (associations.length) {
      for (var i = 0; i < associations.length; i++) {
        associationTerms.push(':' + associations[i]);
        associationTerms.push(', ');
      }

      if (associationTerms.length > 1) {
        associationTerms.pop();
        codeWriter.writeLine('attr_accessor ' + associationTerms.join(''));
      }

      codeWriter.writeLine();
    }

    var attributeCount = this.countAttributeByVisibility(element);
    var publicAttributeLength = attributeCount[0];
    if (publicAttributeLength) {
      this.writeAttributeAccessor('public', codeWriter, element, options);
      if (!staticAttributeCount) {
        codeWriter.writeLine();
      }
    }

    if (staticAttributeCount) {
      this.writeConstant(codeWriter, element);
      this.writeClassVariable(codeWriter, element);
      codeWriter.writeLine();
    }

    if (options.initializeMethod) {
      this.writeConstructor(codeWriter, element);
      codeWriter.writeLine();
    }

    codeWriter.outdent();
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
