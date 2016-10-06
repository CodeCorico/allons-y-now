(function() {
  'use strict';

  window.Ractive.controllerInjection('now', [
    '$Page', '$Layout', '$socket', '$component', '$data', '$done',
  function nowController($Page, $Layout, $socket, $component, $data, $done) {

    var _scrolls = null,
        _isSearch = null,
        _applySearchTimeout = null,
        Now = $component({
          data: $.extend(true, {
            inSearch: false,
            search: null
          }, $data)
        }),
        _$el = {
          layout: $(Now.el),
          scrolls: $(Now.el).find('.pl-scrolls')
        };

    function _updateScrolls() {
      _scrolls.update();
    }

    function _search(search, callback) {
      search = search ? search.trim() : search;
      var isSearch = !!search;

      if (_isSearch !== isSearch) {
        _isSearch = isSearch;

        Now.set('inSearch', _isSearch);

        for (var i = Now.childrenRequire.length - 1; i >= 0; i--) {
          var name = $(Now.childrenRequire[i].el).attr('name');

          if (
            (_isSearch && name == 'now-list') ||
            (!_isSearch && name == 'now-search-list')
          ) {
            Now.childrenRequire[i].teardown();

            break;
          }
        }

        _$el.scrolls.scrollTop(0);

        Now.require(_isSearch ? 'now-search-list' : 'now-list').then(function() {
          _updateScrolls();

          if (callback) {
            callback();
          }
        });

        return;
      }

      if (callback) {
        callback();
      }
    }

    Now.observe('search', function(value) {
      if (!_scrolls) {
        return;
      }

      clearTimeout(_applySearchTimeout);
      _applySearchTimeout = setTimeout(function() {
        _search(value);
      }, 500);
    });

    Now.on('updateSearch', function(event) {
      var charCode = event.original.charCode ? event.original.charCode : event.original.keyCode;

      // Enter
      if (charCode == 13) {
        var search = (Now.get('search') || '').trim();
        if (!search) {
          return;
        }

        var NowSearchList = Now.findChild('name', 'now-search-list');
        if (NowSearchList) {
          NowSearchList.updateSearch();
        }
      }
    });

    Now.on('clearSearch', function() {
      Now.set('search', null);

      setTimeout(function() {
        $(Now.el).find('.now-search-input').focus();
      });
    });

    Now.on('contentLoaded', function() {
      _updateScrolls();
    });

    Now.on('itemClick', function() {
      $Layout.closeOnNotDesktop('group-now');
    });

    Now.require().then(function() {
      _scrolls = Now.findChild('name', 'pl-scrolls');

      _search(false);

      $done();
    });

  }]);

})();
