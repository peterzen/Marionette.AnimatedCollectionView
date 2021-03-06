/*!
 * Marionette.AnimatedCollectionView v0.1.5
 * @web: https://github.com/medialize/Marionette.AnimatedCollectionView/
 * @author: Rodney Rehm - http://rodneyrehm.de/en/
 */
(function (root, factory) {
  'use strict';
  // https://github.com/umdjs/umd/blob/master/returnExports.js
  if (typeof exports === 'object') {
    // Node
    module.exports = factory(require('jquery'), require('jquery-transitioendpromise'));
  } else if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['jquery', 'jQuery-transitionEndPromise'], factory);
  } else {
    // Browser globals (root is window)
    factory(root.jQuery);
  }
}(this, function ($) {
  'use strict';

  var Sequence = function(options) {
    this._buffer = [];
    this._timeout = null;
    this._running = false;
    this.options = options;
    this._run = this._run.bind(this);
  };

  Sequence.prototype.push = function(callback) {
    if (!this.options.stagger) {
      callback();
      return;
    }

    this._buffer.push(callback);
    this.run();
  };

  Sequence.prototype.run = function() {
    if (this._running) {
      return;
    }

    this._run();
  };

  Sequence.prototype._run = function() {
    if (!this._buffer.length) {
      this._running = false;
      return;
    }

    this._running = true;
    var current = this._buffer.shift();
    current();
    setTimeout(this._run, this.options.stagger);
  };


  function decorateAnimatedCollectionView(View, options) {
    var o = $.extend(true, {}, decorateAnimatedCollectionView.defaults, options || {});
    var _removeChildView = View.prototype.removeChildView;
    var _initialize = View.prototype.initialize;

    return View.extend({
      initialize: function() {
        this.listenTo(this, 'render:collection', function() {
          // bind before:item:added after the collection has been fully rendered,
          // otherwise the add animation would be triggered for everything
          this.listenTo(this, 'before:add:child', function(_view){
            var view = _view;
            this._animateAdd(_view)
                .then(function(){
                  // after the animation ended, remove the CSS class
                  // from the element to avoid various artifacts occuring
                  view.$el.removeClass(o.add);
                })
          }, this);
        }, this);

        this._animateSequence = new Sequence(o);
        return _initialize.apply(this, arguments);
      },

      removeChildView: function(view) {
        this._animateRemove(view)
            .then(_removeChildView.bind(this, view));
      },

      _animateAdd: function(view) {
        var promise = view.$el.animationEndPromise(o.promise);
        view.$el.addClass(o.add);
        view.$el.css('animation-play-state', 'paused');

        this._animateSequence.push(function() {
          view.$el.css('animation-play-state', '');
        });

        return promise;
      },

      _animateRemove: function(view) {
        var promise = view.$el.animationEndPromise(o.promise);

        view.$el.addClass(o.remove);
        view.$el.css('animation-play-state', 'paused');

        this._animateSequence.push(function() {
          view.$el.css('animation-play-state', '');
        });

        return promise;
      }
    });
  }

  decorateAnimatedCollectionView.version = '0.1.6';
  decorateAnimatedCollectionView.defaults = {
    add: 'item-adding',
    remove: 'item-removing',
    // options from jQuery-transitionEndEvent
    stagger: 100,
    promise: {
      resolveTimeout: 1000
    }
  };

  return decorateAnimatedCollectionView;
}));
