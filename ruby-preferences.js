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
    'ruby.gen.initializeMethod': {
      text: 'The initialize method',
      description: 'Generate initialize method that works almost same way as constructor.',
      type: 'Check',
      default: true,
    },
    'ruby.gen.useAttributeAccessor': {
      text: 'Attribute accessor',
      description: 'Use attribute accessor rather than set and get attribute methods.',
      type: 'Check',
      default: false,
    },
    'ruby.gen.toStringMethod': {
      text: 'The to_s method',
      description: 'Generate to_s method that returns a string representation of the object.',
      type: 'Check',
      default: true,
    },
  };

  function getId() {
    return preferenceId;
  }

  function getGenerateOptions() {
    return {
      initializeMethod: PreferenceManager.get('ruby.gen.initializeMethod'),
      useAttributeAccessor: PreferenceManager.get('ruby.gen.useAttributeAccessor'),
      rubyToStringMethod: PreferenceManager.get('ruby.gen.toStringMethod'),
    };
  }

  AppInit.htmlReady(function () {
    PreferenceManager.register(preferenceId, 'Ruby', rubyPreferences);
  });

  exports.getId = getId;
  exports.getGenerateOptions = getGenerateOptions;
});
