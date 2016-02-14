define(function (require, exports, module) {
  'use strict';

  var AppInit = app.getModule('utils/AppInit');
  var Core = app.getModule('core/Core');
  var PreferenceManager = app.getModule('core/PreferenceManager');

  var preferenceId = 'ruby';

  var rubyPreferences = {
  };

  function getId() {
    return preferenceId;
  }

  AppInit.htmlReady(function () {
    PreferenceManager.register(preferenceId, 'Ruby', rubyPreferences);
  });

  exports.getId = getId;
});
