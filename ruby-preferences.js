define(function (require, exports, module) {
  'use strict';

  var AppInit = app.getModule('utils/AppInit');
  var Core = app.getModule('core/Core');
  var PreferenceManager = app.getModule('core/PreferenceManager');

  var preferenceId = 'ruby';

  var rubyPreferences = {
    'ruby.gen': {
      text: 'Ruby Code Generation',
      type: 'Section',
    },
    'ruby.gen.useTab': {
      text: 'Use Tab',
      description: 'Use tab for indentation instead of spaces.',
      type: 'Check',
      default: false,
    },
    'ruby.gen.indentSpaces': {
      text: 'Indent Spaces',
      description: 'Number of spaces for indentation.',
      type: 'Number',
      default: 2,
    },
    'ruby.gen.initializeMethod': {
      text: 'The initialize method',
      description: 'Generate initialize method that works almost same way as constructor.',
      type: 'Check',
      default: true,
    },
    'ruby.gen.toStringMethod': {
      text: 'The to_s method',
      description: 'Generate to_s method that returns a string representation of the object.',
      type: 'Check',
      default: true,
    },
    'ruby.gen.documentation': {
      text: 'Documentation',
      description: 'Generate documentation of class elements.',
      type: 'Check',
      default: true,
    },
  };

  function getId() {
    return preferenceId;
  }

  function getGenerateOptions() {
    return {
      useTab: PreferenceManager.get('ruby.gen.useTab'),
      indentSpaces: PreferenceManager.get('ruby.gen.indentSpaces'),
      initializeMethod: PreferenceManager.get('ruby.gen.initializeMethod'),
      rubyToStringMethod: PreferenceManager.get('ruby.gen.toStringMethod'),
      documentation: PreferenceManager.get('ruby.gen.documentation'),
    };
  }

  AppInit.htmlReady(function () {
    PreferenceManager.register(preferenceId, 'Ruby', rubyPreferences);
  });

  exports.getId = getId;
  exports.getGenerateOptions = getGenerateOptions;
});
