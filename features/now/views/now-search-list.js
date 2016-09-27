(function() {
  'use strict';

  window.Ractive.controllerInjection('now-search-list', [
    '$socket', '$component', '$data', '$done',
  function nowSearchListController($socket, $component, $data, $done) {

    var _applySearchTimeout = null,
        NowSearchList = $component({
          data: $.extend(true, {
            noResult: false
          }, $data),
          updateSearch: _updateSearch
        });

    function _updateSearch() {
      if (!NowSearchList) {
        return;
      }

      if (!NowSearchList.get('search') || !NowSearchList.get('count')) {
        return;
      }

      $socket.emit('call(now/search)', {
        search: NowSearchList.get('search'),
        count: parseInt(NowSearchList.get('count'), 10)
      });
    }

    function _readSearch(args) {
      if (!NowSearchList || !args || !args.search) {
        return;
      }

      NowSearchList.set('noResult', !args.entities || !args.entities.length);

      NowSearchList.set('entities', args.entities);

      NowSearchList.require().then(function() {
        NowSearchList.fire('searchloaded');
      });
    }

    NowSearchList.observe('count', _updateSearch, {
      init: false
    });

    NowSearchList.observe('search', function() {
      clearTimeout(_applySearchTimeout);
      _applySearchTimeout = setTimeout(_updateSearch, 500);
    }, {
      init: false
    });

    NowSearchList.on('teardown', function() {
      NowSearchList = null;
      $socket.removeListener('read(now/search)', _readSearch);
    });

    $socket.on('read(now/search)', _readSearch);

    _updateSearch();

    $done();
  }]);

})();
