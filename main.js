define(function (require, exports, module) {
  'use strict';

  var Commands = app.getModule('command/Commands');
  var CommandManager = app.getModule('command/CommandManager');
  var MenuManager = app.getModule('menu/MenuManager');

  function handleHelloWorld() {
    window.alert('Hello, world!');
  }

  var CMD_HELLOWORLD = 'tools.helloworld';
  CommandManager.register('Hello World', CMD_HELLOWORLD, handleHelloWorld);

  var menu = MenuManager.getMenu(Commands.TOOLS);
  menu.addMenuItem(CMD_HELLOWORLD);
});
