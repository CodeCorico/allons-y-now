(function() {
  'use strict';

  window.Ractive.controllerInjection('now-list', [
    '$RealTimeService', '$socket', '$component', '$data', '$done',
  function nowListController($RealTimeService, $socket, $component, $data, $done) {

    var NowList = $component({
          data: $.extend(true, {
            activities: [],
            loaded: false
          }, $data)
        }),
        _networkDown = false,
        _moreCalled = false,
        _$el = {
          layout: $(NowList.el),
          scrolls: $($(NowList.el).parents('.pl-scrolls')[0])
        };

    $RealTimeService.realtimeComponent('now', {
      name: 'now',
      update: function(event, args) {
        if (!NowList || !args || args.error) {
          return;
        }

        args.activities = args.activities || [];

        var activities = _networkDown ? [] : $.extend([], NowList.get('activities'));

        if (_networkDown) {
          _$el.scrolls.animate({
            scrollTop: 0
          }, 250);

          _networkDown = false;
        }

        if (args.pushed) {
          var forceShow = true;

          if (args.oldActivity) {
            for (var i = 0; i < activities.length; i++) {
              if (activities[i].id == args.oldActivity) {
                activities.splice(i, 1);

                if (i === 0) {
                  forceShow = false;
                }

                break;
              }
            }
          }

          args.activities[0].forceShow = forceShow;

          activities.unshift(args.activities[0]);
        }
        else {
          activities = activities.concat(args.activities);
          NowList.set('allActivities', args.allActivities);
        }

        NowList.set('activities', activities);
        NowList.set('loaded', true);

        NowList.require().then(function() {
          NowList.fire('activitiesloaded');

          _moreCalled = false;
        });
      },
      network: function(on) {
        if (!NowList) {
          return;
        }

        if (!on) {
          _networkDown = true;
        }
      }
    }, 'now');

    function _scroll() {
      if (NowList.get('allActivities') || _moreCalled) {
        return;
      }

      var activities = NowList.get('activities') || [];

      if (!activities || !activities.length) {
        return;
      }

      var height = _$el.layout.outerHeight(),
          scrollsHeight = _$el.scrolls.outerHeight(),
          top = _$el.scrolls.offset().top - _$el.layout.offset().top;

      if (height - scrollsHeight - top < 300) {
        _moreCalled = true;

        $socket.emit('call(now/activities.more)', {
          id: activities[activities.length - 1].id
        });
      }
    }

    _$el.scrolls.scroll(_scroll);

    NowList.on('teardown', function() {
      NowList = null;

      _$el.scrolls.off('scroll', _scroll);
      _$el = null;

      $RealTimeService.unregisterComponent('now');
    });

    NowList.require().then($done);
  }]);

})();
