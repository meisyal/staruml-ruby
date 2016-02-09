define(function (require, exports, module) {
  'use strict';

  var Commands = app.getModule('command/Commands');
  var CommandManager = app.getModule('command/CommandManager');
  var MenuManager = app.getModule('menu/MenuManager');
  var Dialogs = app.getModule('dialogs/Dialogs');
  var ElementPickerDialog = app.getModule('dialogs/ElementPickerDialog');
  var FileSystem = app.getModule('filesystem/FileSystem');

  var CodeGenUtils = require('code-generator-utils');
  var RubyCodeGenerator = require('ruby-code-generator');

  var CMD_RUBY = 'ruby';
  var CMD_RUBY_GENERATE = 'ruby.generate';

  function _handleGenerate(base, path, options) {
    var result = new $.Deferred();

    if (!base) {
      ElementPickerDialog.showDialog('Select a base model to generate codes', null, type.UMLPackage)
        .done(function (buttonId, selected) {
          if (buttonId === Dialogs.DIALOG_BTN_OK && selected) {
            base = selected;
            if (!path) {
              FileSystem.showOpenDialog(false, true, 'Select a folder where generated codes to be located', null, null, function (error, files) {
                if (!error) {
                  if (files) {
                    path = files[0];
                    RubyCodeGenerator.generate(base, path, options).then(result.resolve, result.reject);
                  } else {
                    result.reject(FileSystem.USER_CANCELED);
                  }
                } else {
                  result.reject(error);
                }
              });
            } else {
              RubyCodeGenerator.generate(base, path, options).then(result.resolve, result.reject);
            }
          } else {
            result.reject();
          }
      });
    } else {
      window.alert('NotImplementedError');
    }

    return result.promise();
  }

  CommandManager.register('Ruby', CMD_RUBY, CommandManager.doNothing);
  CommandManager.register('Generate Code...', CMD_RUBY_GENERATE, _handleGenerate);

  var menu = MenuManager.getMenu(Commands.TOOLS);
  var menuItem = menu.addMenuItem(CMD_RUBY);
  menuItem.addMenuItem(CMD_RUBY_GENERATE);
});
