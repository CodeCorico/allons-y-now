module.exports = function() {
  'use strict';

  DependencyInjection.service('$NowService', function($RealTimeService, UserModel) {

    return new (function $NowService() {

      var REALTIME_EVENTS = {
            now: {
              call: 'callNow'
            }
          },
          PAGE_LENGTH = 15,
          MAX_ITEMS = 100,

          uuid = require('node-uuid'),
          async = require('async'),
          _this = this,
          _searchQuery = [];

      this.init = function() {
        var EntityModel = DependencyInjection.injector.model.get('EntityModel');

        Object.keys(REALTIME_EVENTS).forEach(function(eventName) {
          if (REALTIME_EVENTS[eventName].call) {
            var call = REALTIME_EVENTS[eventName].call;

            REALTIME_EVENTS[eventName].call = function() {
              _this[call].apply(_this, arguments);
            };
          }
        });

        $RealTimeService.registerEvents(REALTIME_EVENTS);

        EntityModel
          .findOrCreate({
            entityType: 'userUnknownNow'
          })
          .exec(function(err, userUnknownNow) {
            if (!userUnknownNow.createdAt) {
              userUnknownNow.isSearchable = false;
              userUnknownNow.isSearchableAdvanced = false;
              userUnknownNow.createdAt = new Date();
              userUnknownNow.updatedAt = new Date();
              userUnknownNow.isUnknown = true;

              EntityModel
                .update({
                  entityType: 'userUnknownNow'
                }, userUnknownNow)
                .exec(function() { });
            }
          });
      };

      this.searchQuery = function(func) {
        if (func) {
          _searchQuery.push(func);

          return _this;
        }

        return _searchQuery;
      };

      this.applySearchQuery = function(query, $socket, $message, callback) {
        async.eachSeries(_searchQuery, function(func, nextFunc) {
          func(query, $socket, $message, function() {
            nextFunc();
          });
        }, function() {
          callback(query);
        });
      };

      this.more = function($socket, id) {
        _this.callNow($socket, null, [id]);
      };

      this.callNow = function($socket, eventName, args, callback) {
        eventName = eventName || 'now';

        if (!$socket || !$socket.user) {
          if (callback) {
            callback();
          }

          return;
        }

        var EntityModel = DependencyInjection.injector.model.get('EntityModel'),
            user = null;

        async.waterfall([function(next) {

          if (!$socket.user.id) {
            EntityModel
              .findOne({
                entityType: 'userUnknownNow'
              })
              .exec(function(err, userUnknownNow) {
                if (err || !userUnknownNow) {
                  return;
                }

                user = userUnknownNow;

                next();
              });
          }
          else {
            UserModel
              .findOne({
                id: $socket.user.id
              })
              .exec(function(err, returnedUser) {
                if (err || !returnedUser) {
                  return;
                }

                user = returnedUser;

                next();
              });
          }

        }], function() {
          user.nowActivities = user.nowActivities || [];

          var index = args && args.length ? args[0] : 0;

          if (index !== 0) {
            for (var i = 0; i < user.nowActivities.length; i++) {
              if (user.nowActivities[i].id == index) {
                index = i + 1;

                break;
              }
            }

            if (isNaN(index)) {
              return;
            }
          }

          $RealTimeService.fire(eventName, {
            activities: (user.nowActivities || []).slice(index, index + PAGE_LENGTH),
            allActivities: index + PAGE_LENGTH >= user.nowActivities.length
          }, $socket);

          if (callback) {
            callback();
          }
        });
      };

      this.get = function(user, referenceId) {
        user.nowActivities = user.nowActivities || [];

        for (var i = 0; i < user.nowActivities.length; i++) {
          if (user.nowActivities[i].referenceId && user.nowActivities[i].referenceId == referenceId) {
            return user.nowActivities[i];
          }
        }

        return null;
      };

      this.add = function(users, activity, getFunc, callback) {
        if (typeof activity != 'object' || !activity.activityType) {
          if (callback) {
            callback('Bad "activity" object');
          }

          return;
        }

        activity.activityDate = activity.activityDate || new Date();

        var $SocketsService = DependencyInjection.injector.service.get('$SocketsService'),
            oldActivity = null;

        async.eachSeries(users, function(user, nextUser) {
          user.nowActivities = user.nowActivities || [];

          if (activity.referenceId) {
            for (var i = 0; i < user.nowActivities.length; i++) {
              if (user.nowActivities[i].referenceId && user.nowActivities[i].referenceId == activity.referenceId) {
                oldActivity = user.nowActivities[i];

                user.nowActivities.splice(i, 1);
              }
            }
          }

          if (oldActivity && getFunc) {
            getFunc(oldActivity, activity);
          }

          if (activity) {
            activity.id = activity.id || uuid.v1();

            user.nowActivities.unshift(activity);

            var max = user.nowActivities.length - MAX_ITEMS;
            if (max > 0) {
              user.nowActivities.splice(user.nowActivities.length - max, max);
            }

            UserModel
              .update({
                id: user.id
              }, {
                nowActivities: user.nowActivities
              })
              .exec(function() {
                $SocketsService.each(function(socket) {
                  if (
                    (!socket || !socket.user) ||
                    (user.isUnknown && socket.user.id) ||
                    (!user.isUnknown && (!socket.user.id || socket.user.id != user.id))
                  ) {
                    return;
                  }

                  $RealTimeService.fire('now', {
                    activities: [activity],
                    oldActivity: oldActivity && oldActivity.id || null,
                    pushed: true
                  }, socket);
                });

                nextUser();
              });

            return;
          }

          nextUser();
        }, function() {
          if (callback) {
            callback();
          }
        });
      };

    })();
  });

};
