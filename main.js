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

const RubyCodeGenerator = require('./ruby-code-generator')

function getGeneratorOptions () {
  return {
    useTab: app.preferences.get('ruby.generator.useTab'),
    indentSpaces: app.preferences.get('ruby.generator.indentSpaces'),
    initializeMethod: app.preferences.get('ruby.generator.initializeMethod'),
    toStringMethod: app.preferences.get('ruby.generator.toStringMethod'),
    documentation: app.preferences.get('ruby.generator.documentation')
  }
}

function showOpenDialog(base, path, options) {
  if (!path) {
    var files = app.dialogs.showOpenDialog('Select a folder where generated codes to be located', null, null, { properties: ['openDirectory']})
    if (files && files.length > 0) {
      path = files[0]
      RubyCodeGenerator.generate(base, path, options)
    }
  } else {
    RubyCodeGenerator.generate(base, path, options)
  }
}

/*
 * Command Handler for Ruby Generate
 *
 * @param {Element} base
 * @param {string} path
 * @param {Object} options
 * @return {$.Promise}
 */
function _handleGenerate (base, path, options) {
  // If options is not passed, get from preference
  options = options || getGeneratorOptions()
  // If base is not assigned, popup ElementPicker
  if (!base) {
    app.elementPickerDialog.showDialog('Select a base model to generate codes', null, type.UMLPackage).then(function ({buttonId, returnValue}) {
      if (buttonId === 'ok') {
        base = returnValue
        showOpenDialog(base, path, options)
      }
    })
  } else {
    // If path is not assigned, popup Open Dialog to select a folder
    if (!path) {
      showOpenDialog(base, path, options)
    }
  }
}

/*
 * Popup PreferenceDialog with Ruby Preference Schema
 */
function _handleConfigure () {
  app.commands.execute('application:preferences', 'ruby')
}

function init () {
  app.commands.register('ruby:generate', _handleGenerate)
  app.commands.register('ruby:configure', _handleConfigure)
}

exports.init = init
