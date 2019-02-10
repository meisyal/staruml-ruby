/*
 * Copyright (c) 2016-2019 Andrias Meisyal. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

const filesystem = require('fs')
const path = require('path')
const codegenutils = require('./code-generator-utils')

/*
 * Ruby Code Generator
 */
class RubyCodeGenerator {
  /*
   * @constructor
   *
   * @param {type.UMLPackage} baseModel
   * @param {string} basePath generated files and directories to be placed
   */
  constructor (baseModel, basePath) {
    // @member {type.Model}
    this.baseModel = baseModel
    // @member {string}
    this.basePath = basePath
  }

  /*
   * Return indent string based on options
   * @param {Object} options
   * @return {string}
   */
  getIndentString (options) {
    if (options.useTab) {
      return '\t'
    } else {
      var indent = []
      var length = options.indentSpaces
      for (var i = 0; i < length; i++) {
        indent.push(' ')
      }

      return indent.join('')
    }
  }

  /*
   * Generate codes from a given element
   * @param {type.Model} element
   * @param {string} basePath
   * @param {Object} options
   */
  generate (element, basePath, options) {
    var fullPath
    var codeWriter = new codegenutils.CodeWriter(this.getIndentString(options))
    var deleteFolderRecursive = function (path) {
      if (filesystem.existsSync(path)) {
        filesystem.readdirSync(path).forEach(function (file, index) {
          var currentPath = path + '/' + file

          if (filesystem.lstatSync(currentPath).isDirectory()) {
            deleteFolderRecursive(currentPath)
          } else {
            filesystem.unlinkSync(currentPath)
          }
        })

        filesystem.rmdirSync(path)
      }
    }

    // UML Package
    if (element instanceof type.UMLPackage) {
      fullPath = path.join(basePath, element.name)

      if (!filesystem.existsSync(fullPath)) {
        filesystem.mkdirSync(fullPath)
      } else {
        var buttonId = app.dialogs.showConfirmDialog('A folder with same name already exists, do you want to overwrite?')
        if (buttonId === 'ok') {
          deleteFolderRecursive(fullPath)
          filesystem.mkdirSync(fullPath)
          app.dialogs.showInfoDialog('A folder overwritten.')
        } else {
          app.dialogs.showErrorDialog('Operation is cancelled by user.')
        }
      }

      if (Array.isArray(element.ownedElements)) {
        element.ownedElements.forEach(child => {
          return this.generate(child, fullPath, options)
        })
      }
    // UML Class
    } else if (element instanceof type.UMLClass) {
      // Class element
      if (element.stereotype !== 'annotationType') {
        var moduleName = this.getPackageName(element)

        if (moduleName) {
          this.writeAssociation(codeWriter, element, true)
          this.writeDocumentation(codeWriter, element._parent.documentation, options)
          codeWriter.writeLine('module ' + moduleName)
          codeWriter.indent()
        } else {
          this.writeAssociation(codeWriter, element, false)
        }

        this.writeClass(codeWriter, element, options)

        if (moduleName) {
          codeWriter.outdent()
          codeWriter.writeLine('end')
        }

        fullPath = basePath + '/' + codeWriter.getFileName(element.name) + '.rb'
        filesystem.writeFileSync(fullPath, codeWriter.getData())
      }
    // Interface element
    } else if (element instanceof type.UMLInterface) {
      this.writeInterface(codeWriter, element, options)

      fullPath = basePath + '/' + codeWriter.getFileName(element.name) + '.rb'
      filesystem.writeFileSync(fullPath, codeWriter.getData())
    }
  }

  /*
   * Return visibility
   * @param {type.Model} element
   * @return {string}
   */
  getVisibility (element) {
    switch (element.visibility) {
      case type.UMLModelElement.VK_PUBLIC:
        return 'public'
      case type.UMLModelElement.VK_PROTECTED:
        return 'protected'
      case type.UMLModelElement.VK_PRIVATE:
        return 'private'
    }

    return null
  }

  /*
   * Return package name
   * @param {type.Model} element
   * @return {string}
   */
  getPackageName (element) {
    var packagePath = null

    if (element._parent) {
      packagePath = element._parent.getPath(this.baseModel).map(function (e) {
        return e.name
      }).join('.')
    }

    return packagePath
  }

  /*
   * Collect super classes of a given element
   * @param {type.Model} element
   * @retun {Array.<type.Model>}
   */
  getSuperClasses (element) {
    var inheritances = app.repository.getRelationshipsOf(element, function (relationship) {
      return (relationship instanceof type.UMLGeneralization && relationship.source === element)
    })

    return inheritances.map(function (inherit) {
      return inherit.target
    })
  }

  /*
   * Collect associated classes of a given element
   * @param {type.Model} element
   * @return {Array.<type.Model>}
   */
  getAssociation (element) {
    var associations = app.repository.getRelationshipsOf(element, function (relationship) {
      return (relationship instanceof type.UMLAssociation)
    })

    return associations
  }

  /*
   * Collect interface classes of a given element
   * @param {type.Model} element
   * @return {Array.<type.Model>}
   */
  getInterface (element) {
    var interfaces = app.repository.getRelationshipsOf(element, function (relationship) {
      return (relationship instanceof type.UMLInterfaceRealization && relationship.source === element)
    })

    return interfaces.map(function (implement) {
      return implement.target
    })
  }

  /*
   * Write association classes
   * @param {StringWriter} codeWriter
   * @param {type.Model} element
   * @param {boolean} isInModule
   */
  writeAssociation (codeWriter, element, isInModule) {
    var associations = this.getAssociation(element)

    for (var i = 0; i < associations.length; i++) {
      var association = associations[i]

      if (association.end1.reference === element && association.end2.navigable === true) {
        var packageName = codeWriter.getFileName(this.getPackageName(association.end2.reference))
        var fileName = codeWriter.getFileName(association.end2.reference.name)

        if (packageName) {
          codeWriter.writeLine('require_relative \'' + packageName + '/' + fileName + '.rb\'')
        } else if (isInModule) {
          codeWriter.writeLine('require_relative \'../' + fileName + '.rb\'')
        } else {
          codeWriter.writeLine('require_relative \'' + fileName + '.rb\'')
        }
      }

      if (association.end2.reference === element && association.end1.navigable === true) {
        var packageName = codeWriter.getFileName(this.getPackageName(association.end1.reference))
        var fileName = codeWriter.getFileName(association.end1.reference.name)

        if (packageName) {
          codeWriter.writeLine('require_relative \'' + packageName + '/' + fileName + '.rb\'')
        } else if (isInModule) {
          codeWriter.writeLine('require_relative \'../' + fileName + '.rb\'')
        } else {
          codeWriter.writeLine('require_relative \'' + fileName + '.rb\'')
        }
      }
    }

    if (associations.length) {
      codeWriter.writeLine()
    }
  }

  /*
   * Write documentation
   * @param {StringWriter} codeWriter
   * @param {string} text that contains documentation
   * @param {Object} options
   */
  writeDocumentation (codeWriter, text, options) {
    var lines

    if (options.documentation && text.trim().length) {
      lines = text.trim().split('\n')
      if (lines > 1) {
        codeWriter.writeLine('#')
        for (var i = 0; i < lines.length; i++) {
          codeWriter.writeLine(' ' + lines[i])
        }
      } else {
        codeWriter.writeLine('# ' + lines[0])
      }
    }
  }

  /*
   * Write constructor
   * @param {StringWriter} codeWriter
   * @param {type.Model} element
   */
  writeConstructor (codeWriter, element) {
    if (element.name.length) {
      var terms = []
      var len = element.attributes.length

      terms.push('def initialize(')
      for (var i = 0; i < len; i++) {
        if (!element.attributes[i].isStatic) {
          terms.push(element.attributes[i].name)
          terms.push(', ')
        }
      }

      if (terms.length > 1) {
        terms.pop()
      }

      codeWriter.writeLine(terms.join('') + ')')
      codeWriter.indent()
      for (var i = 0; i < len; i++) {
        if (!element.attributes[i].isStatic) {
          codeWriter.writeLine('@' + element.attributes[i].name + ' = ' +
              element.attributes[i].name)
        }
      }

      var associations = this.getClassAssociation(codeWriter, element)
      if (associations.length) {
        for (var i = 0; i < associations.length; i++) {
          codeWriter.writeLine('@' + associations[i] + ' = ' +
              codeWriter.toCamelCase(associations[i]) + '.new')
        }
      }

      codeWriter.outdent()
      codeWriter.writeLine('end')
    }
  }

  /*
   * Write attribute accessor
   * @param {string} visibility
   * @param {StringWriter} codeWriter
   * @param {type.Model} element
   * @param {Object} options
   */
  writeAttributeAccessor (visibility, codeWriter, element, options) {
    var readerAttributeTerms = []
    var accessorAttributeTerms = []
    var len = element.attributes.length
    var attributeVisibility

    for (var i = 0; i < len; i++) {
      attributeVisibility = this.getVisibility(element.attributes[i])

      if (attributeVisibility === visibility && !element.attributes[i].isStatic) {
        this.writeDocumentation(codeWriter, element.attributes[i].documentation, options)

        if (element.attributes[i].isReadOnly) {
          readerAttributeTerms.push(':' + element.attributes[i].name)
          readerAttributeTerms.push(', ')
        } else {
          accessorAttributeTerms.push(':' + element.attributes[i].name)
          accessorAttributeTerms.push(', ')
        }
      }
    }

    if (accessorAttributeTerms.length > 1) {
      accessorAttributeTerms.pop()
      codeWriter.writeLine('attr_accessor ' + accessorAttributeTerms.join(''))
    }

    if (readerAttributeTerms.length > 1) {
      readerAttributeTerms.pop()
      codeWriter.writeLine('attr_reader ' + readerAttributeTerms.join(''))
    }
  }

  /*
   * Write constant
   * @param {StringWriter} codeWriter
   * @param {type.Model} element
   */
  writeConstant (codeWriter, element) {
    var len = element.attributes.length

    for (var i = 0; i < len; i++) {
      if (element.attributes[i].isReadOnly && element.attributes[i].isStatic) {
        codeWriter.writeLine(element.attributes[i].name + ' = ' +
          element.attributes[i].defaultValue)
        if (this.getVisibility(element.attributes[i]) === 'private') {
          codeWriter.writeLine('private_constant :' + element.attributes[i].name)
        }
      }
    }
  }

  /*
   * Write class variables
   * @param {StringWriter} codeWriter
   * @param {type.Model} element
   */
  writeClassVariable (codeWriter, element) {
    var len = element.attributes.length

    for (var i = 0; i < len; i++) {
      if (!element.attributes[i].isReadOnly && element.attributes[i].isStatic) {
        codeWriter.writeLine('@@' + element.attributes[i].name + ' = ' +
          element.attributes[i].defaultValue)
      }
    }
  }

  /*
   * Write methods
   * @param {string} visibility
   * @param {StringWriter} codeWriter
   * @param {type.Model} element
   * @param {Object} options
   */
  writeMethod (visibility, codeWriter, element, options) {
    var len = element.operations.length
    var terms = []

    for (var i = 0; i < len; i++) {
      var methodVisibility = this.getVisibility(element.operations[i])
      var parameters = element.operations[i].getNonReturnParameters()
      var parametersLength = parameters.length

      if (methodVisibility === visibility) {
        this.writeDocumentation(codeWriter, element.operations[i].documentation, options)
        terms.push('def ' + element.operations[i].name)
        if (parametersLength !== 0) {
          terms.push('(')
          for (var j = 0; j < parametersLength; j++) {
            terms.push(parameters[j].name)
            if (j !== parametersLength - 1) {
              terms.push(', ')
            } else {
              terms.push(')')
            }
          }
        }

        codeWriter.writeLine(terms.join(''))
        terms.length = 0

        codeWriter.indent()
        codeWriter.writeLine('# TODO(person name): Implement this method here.')
        codeWriter.outdent()
        codeWriter.writeLine('end')

        if (i !== len - 1) {
          codeWriter.writeLine()
        }
      }
    }
  }

  /*
   * Write method by its visibility
   * @param {StringWriter} codeWriter
   * @param {type.Model} element
   * @param {Object} options
   */
  writeMethodByVisibility (codeWriter, element, options) {
    var attributeCount = this.countAttributeByVisibility(element)
    var methodCount = this.countMethodByVisibility(element)
    var protectedAttributeLength = attributeCount[1]
    var privateAttributeLength = attributeCount[2]
    var publicMethodLength = methodCount[0]
    var protectedMethodLength = methodCount[1]
    var privateMethodLength = methodCount[2]

    if (publicMethodLength) {
      codeWriter.indent()
      this.writeMethod('public', codeWriter, element, options)
      codeWriter.outdent()
    }

    if (protectedAttributeLength || protectedMethodLength) {
      codeWriter.indent()
      codeWriter.writeLine('protected')
      codeWriter.indent()
      if (protectedAttributeLength) {
        this.writeAttributeAccessor('protected', codeWriter, element, options)
        codeWriter.writeLine()
      }

      codeWriter.outdent()
      if (protectedMethodLength) {
        codeWriter.indent()
        this.writeMethod('protected', codeWriter, element, options)
        codeWriter.outdent()
      }

      codeWriter.outdent()
    }

    if (privateAttributeLength || privateMethodLength) {
      codeWriter.indent()
      codeWriter.writeLine('private')
      codeWriter.indent()
      if (privateAttributeLength) {
        this.writeAttributeAccessor('private', codeWriter, element, options)
        codeWriter.writeLine()
      }

      codeWriter.outdent()
      if (privateMethodLength) {
        codeWriter.indent()
        this.writeMethod('private', codeWriter, element, options)
        codeWriter.outdent()
      }

      codeWriter.outdent()
    }
  }

  /*
   * Count attribute by its visibility
   * @param {type.Model} element
   */
  countAttributeByVisibility (element) {
    var publicElementCount = 0
    var protectedElementCount= 0
    var privateElementCount = 0
    var len = element.attributes.length
    var elementVisibility
    var attributeCount = []

    for (var i = 0; i < len; i++) {
      elementVisibility = this.getVisibility(element.attributes[i])

      if (elementVisibility === 'public' && !element.attributes[i].isStatic) {
        publicElementCount++
      } else if (elementVisibility === 'protected') {
        protectedElementCount++
      } else if (elementVisibility === 'private' && !element.attributes[i].isStatic) {
        privateElementCount++
      }
    }

    attributeCount[0] = publicElementCount
    attributeCount[1] = protectedElementCount
    attributeCount[2] = privateElementCount

    return attributeCount
  }

  /*
   * Count static attributes
   * @param {type.Model} element
   */
  countStaticAttribute (element) {
    var staticAttributeCount = 0
    var len = element.attributes.length

    for (var i = 0; i < len; i++) {
      if (element.attributes[i].isStatic) {
        staticAttributeCount++
      }
    }

    return staticAttributeCount
  }

  /*
   * Count method by its visibility
   * @param {type.Model} element
   */
  countMethodByVisibility (element) {
    var publicMethodCount = 0
    var protectedMethodCount = 0
    var privateMethodCount = 0
    var len = element.operations.length
    var methodVisibility
    var methodCount = []

    for (var i = 0; i < len; i++) {
      methodVisibility = this.getVisibility(element.operations[i])

      if (methodVisibility === 'public') {
        publicMethodCount++
      } else if (methodVisibility === 'protected') {
        protectedMethodCount++
      } else if (methodVisibility === 'private') {
        privateMethodCount++
      }
    }

    methodCount[0] = publicMethodCount
    methodCount[1] = protectedMethodCount
    methodCount[2] = privateMethodCount

    return methodCount
  }

  /*
   * Get class associations
   * @param {StringWriter} codeWriter
   * @param {type.Model} element
   * @return {Array.<string>}
   */
  getClassAssociation (codeWriter, element) {
    var classAssociations = []
    var associations = this.getAssociation(element)

    for (var i = 0; i < associations.length; i++) {
      var association = associations[i]

      if (association.end1.reference === element && association.end2.navigable === true) {
        classAssociations.push(codeWriter.getFileName(association.end2.reference.name))
      }

      if (association.end2.reference === element && association.end1.navigable === true) {
        classAssociations.push(codeWriter.getFileName(association.end1.reference.name))
      }
    }

    return classAssociations
  }

  /*
   * Write to_s method
   * @param {StringWriter}
   */
  writeToStringMethod (codeWriter) {
    codeWriter.indent()
    codeWriter.writeLine('def to_s')
    codeWriter.indent()
    codeWriter.writeLine('\"Your string representation of the object will be written here.\"')
    codeWriter.outdent()
    codeWriter.writeLine('end')
  }

  /*
   * Write interfaces
   * @param {StringWriter} codeWriter
   * @param {type.Model} element
   * @param {Object} options
   */
  writeInterface (codeWriter, element, options) {
    var terms = []

    terms.push('module')
    terms.push(element.name)

    codeWriter.writeLine(terms.join(' '))
    this.writeMethodByVisibility(codeWriter, element, options)
    codeWriter.writeLine('end')
  }

  /*
   * Write classes
   * @param {StringWriter} codeWriter
   * @param {type.Model} element
   * @param {Object} options
   */
  writeClass (codeWriter, element, options) {
    var terms = []
    var staticAttributeCount = this.countStaticAttribute(element)

    var _inheritance = this.getSuperClasses(element)
    if (_inheritance.length) {
      var fileName = codeWriter.getFileName(_inheritance[0].name)

      codeWriter.writeLine('require_relative \'' + fileName + '.rb\'')
      codeWriter.writeLine()
    }

    var _interface = this.getInterface(element)
    if (_interface.length) {
      var packageName = codeWriter.getFileName(this.getPackageName(_interface[0]))
      var fileName = codeWriter.getFileName(_interface[0].name)

      if (packageName) {
        codeWriter.writeLine('require_relative \'' + packageName + '/' + fileName + '.rb\'')
      } else {
        codeWriter.writeLine('require_relative \'' + fileName + '.rb\'')
      }

      codeWriter.writeLine()
    }

    this.writeDocumentation(codeWriter, element.documentation, options)
    terms.push('class')
    terms.push(element.name)

    if (_inheritance.length) {
      terms.push('< ' + _inheritance[0].name)
    }

    codeWriter.writeLine(terms.join(' '))
    codeWriter.indent()

    if (_interface.length) {
      codeWriter.writeLine('include ' + _interface[0].name)
      codeWriter.writeLine()
    }

    var associations = this.getClassAssociation(codeWriter, element)
    var associationTerms = []
    if (associations.length) {
      for (var i = 0; i < associations.length; i++) {
        associationTerms.push(':' + associations[i])
        associationTerms.push(', ')
      }

      if (associationTerms.length > 1) {
        associationTerms.pop()
        codeWriter.writeLine('attr_accessor ' + associationTerms.join(''))
      }

      codeWriter.writeLine()
    }

    var attributeCount = this.countAttributeByVisibility(element)
    var publicAttributeLength = attributeCount[0]
    if (publicAttributeLength) {
      this.writeAttributeAccessor('public', codeWriter, element, options)
      if (!staticAttributeCount) {
        codeWriter.writeLine()
      }
    }

    if (staticAttributeCount) {
      this.writeConstant(codeWriter, element)
      this.writeClassVariable(codeWriter, element)
      codeWriter.writeLine()
    }

    if (options.initializeMethod) {
      this.writeConstructor(codeWriter, element)
      codeWriter.writeLine()
    }

    codeWriter.outdent()
    this.writeMethodByVisibility(codeWriter, element, options)

    if (options.toStringMethod) {
      this.writeToStringMethod(codeWriter)
    }

    codeWriter.outdent()
    codeWriter.writeLine('end')
  }
}

/*
 * Generate Ruby code
 * @param {type.Model} baseModel
 * @param {string} basePath
 * @param {Object} options
 */
function generate (baseModel, basePath, options) {
  var rubyCodeGenerator = new RubyCodeGenerator(baseModel, basePath)
  rubyCodeGenerator.generate(baseModel, basePath, options)
}

exports.generate = generate
