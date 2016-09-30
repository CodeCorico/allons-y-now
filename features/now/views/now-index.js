(function() {
  'use strict';

  window.bootstrap([
    '$ShortcutsService', '$i18nService', '$Page', '$done',
  function($ShortcutsService, $i18nService, $Page, $done) {

    var _nowButton = null;

    $Page.leftButtonAdd('now', {
      icon: 'fa fa-bookmark',
      group: 'group-now',
      autoOpen: true,
      ready: function(button) {
        _nowButton = button;
      },
      beforeGroup: function(context, $group, userBehavior, callback) {
        context.require('now').then(callback);
      }
    });

    $ShortcutsService.register(
      null,
      'now-f4',
      'F4',
      $i18nService._('Open the Now context'),
      function(e) {
        // F4
        var isShortcut = e.keyCode == 115 && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.metaKey;

        if (isShortcut) {
          e.preventDefault();
          e.stopPropagation();
        }

        return isShortcut;
      },
      function() {
        _nowButton.action(true);
      }
    );

    $done();
  }]);

})();
