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
    'ruby.gen.toStringMethod': {
      text: 'to_s method',
      description: 'Generate to_s method.',
      type: 'Check',
      default: true,
    },
    'ruby.gen.useAttributeAccessor': {
      text: 'Use attribute accessor',
      description: 'Use attribute accessor rather than set and get attribute methods.',
      type: 'Check',
      default: false,
    },
  };

  function getId() {
    return preferenceId;
  }

  function getGenerateOptions() {
    return {
      rubyToStringMethod: PreferenceManager.get('ruby.gen.toStringMethod'),
      useAttributeAccessor: PreferenceManager.get('ruby.gen.useAttributeAccessor'),
    };
  }

  AppInit.htmlReady(function () {
    PreferenceManager.register(preferenceId, 'Ruby', rubyPreferences);
  });

  exports.getId = getId;
  exports.getGenerateOptions = getGenerateOptions;
});
