'use strict';

module.exports = [{

  event: 'call(now/search)',
  controller: function($allonsy, EntityModel, $socket, $message) {
    if (!this.validMessage($message, {
      search: ['string', 'filled'],
      count: ['number', 'filled']
    })) {
      return;
    }

    $message.count = Math.max(1, Math.min(100, parseInt($message.count, 10) || 30));

    EntityModel.native(function(err, collection) {
      collection
        .find({
          isSearchable: true,
          $text: {
            $search: $message.search
          }
        }, {
          score: {
            $meta: 'textScore'
          }
        })
        .sort({
          score: {
            $meta: 'textScore'
          }
        })
        .limit($message.count)
        .toArray(function(err, entities) {
          if (err) {
            $allonsy.logWarning('allons-y-now', 'now:search-find:toArray:error', {
              error: err,
              socket: $socket,
              search: $message.search,
              count: $message.count
            });

            return;
          }

          entities = entities || [];

          var regex = null;

          if (entities.length) {
            regex = new RegExp('(' +
              $message.search
                .replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
                .replace(/ +/g, '|') +
            ')', 'ig');
          }

          entities = entities
            .map(function(entity) {
              if (EntityModel[entity.entityType + 'SearchPublicData']) {
                return EntityModel[entity.entityType + 'SearchPublicData'](entity, $socket, regex);
              }

              return entity;
            })
            .filter(function(entity) {
              return !!entity;
            });

          $socket.emit('read(now/search)', {
            search: $message.search,
            entities: entities
          });

          $allonsy.log('allons-y-now', 'now:search-find:' + $message.search, {
            socket: $socket,
            search: $message.search,
            count: $message.count,
            metric: {
              key: 'commonNowSearch',
              name: 'Now search',
              description: '3s pause after typing letters in the search field: the search has been used one time.'
            }
          });
        });
    });
  }
}];
