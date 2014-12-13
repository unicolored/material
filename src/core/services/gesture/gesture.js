(function() {
'use strict';

var START_EVENTS = 'mousedown touchstart pointerdown';
var MOVE_EVENTS = 'mousemove touchmove pointermove';
var END_EVENTS = 'mouseup mouseleave touchend touchcancel pointerup pointercancel';

angular.element(document)
  .on(START_EVENTS, gestureStart)
  .on(MOVE_EVENTS, gestureMove)
  .on(END_EVENTS, gestureEnd)
  .on('$$mdGestureReset', function() {
    lastPointer = pointer = null;
  });

// The state of the current and previous 'pointer' (mouse/touch)
var pointer, lastPointer;

function runCallbacks(callbackType, ev) {
  var pointerCopy = angular.extend({
    preventDefault: function() { this.defaultPrevented = true; },
    isDefaultPrevented: function() { return this.defaultPrevented === true; },
    stopImmediatePropagation: function() { this.immediatePropagationStopped = true; },
    isImmediatePropagationStopped: function() { return this.immediatePropagationStopped === true; },
    stopPropagation: function() { this.propagationStopped = true; }
  }, pointer);
  var targets = pointer._targets;

  for (var i = 0, target; target = targets[i]; i++) {
    pointerCopy.target = target.node;
    for (var j = 0, gesture; gesture = target.gestures[j]; j++) {
      gesture[callbackType] && gesture[callbackType](target.element, ev, pointerCopy);
      if (pointerCopy.immediatePropagationStopped) return;
    }
    console.log(pointerCopy.propagationStopped);
    if (pointerCopy.propagationStopped) return;
  }
}

function gestureStart(ev) {
  // If we're already touched down, abort
  if (pointer) return;

  var now = +Date.now();
  // iOS & old android bug: after a touch event, a click event is sent 350 ms later.
  // If <400ms have passed, don't allow an event of a different type than the previous event
  if (lastPointer && !typesMatch(ev, lastPointer) && (now - lastPointer.endTime < 400)) {
    return;
  }

  pointer = makeStartPointer(ev);
  pointer._targets = [];

  var currentNode = ev.target;
  while (currentNode && currentNode !== document) {
    var gestureData = currentNode.$mdGesture;
    if (gestureData) {
      pointer._targets.push({
        node: currentNode,
        element: angular.element(currentNode),
        gestures: gestureData.gestures
      });
    }
    currentNode = currentNode.parentNode;
  }

  runCallbacks('onStart', ev);
}

function gestureMove(ev) {
  if (!pointer || !typesMatch(ev, pointer)) return;

  updatePointerState(ev, pointer);

  runCallbacks('onMove', ev);
}

function gestureEnd(ev) {
  if (!pointer || !typesMatch(ev, pointer)) return;

  updatePointerState(ev, pointer);
  pointer.endTime = +Date.now();

  runCallbacks('onEnd', ev);

  lastPointer = pointer;
  pointer = null;
}

/******** Helpers *********/
function typesMatch(ev, pointer) {
  return ev && pointer && ev.type.charAt(0) === pointer.type;
}

function getEventPoint(ev) {
  ev = ev.originalEvent || ev; // support jQuery events
  return (ev.touches && ev.touches[0]) ||
    (ev.changedTouches && ev.changedTouches[0]) ||
    ev;
}

function updatePointerState(ev, pointer) {
  var point = getEventPoint(ev);
  var x = pointer.x = point.pageX;
  var y = pointer.y = point.pageY;
  pointer.distanceX = pointer.startX - x;
  pointer.distanceY = pointer.startY - y;
  pointer.direction = pointer.distance > 0 ? 'left' : (pointer.distance < 0 ? 'right' : '');
  pointer.duration = pointer.startTime - +Date.now();
  pointer.velocityX = pointer.distanceX / pointer.time;
  pointer.velocityY = pointer.distanceY / pointer.time;
}


function makeStartPointer(ev, data) {
  var point = getEventPoint(ev);
  var startPointer = angular.extend({
    // Restrict this tap to whatever started it: if a mousedown started the tap,
    // don't let anything but mouse events continue it.
    type: ev.type.charAt(0),
    startX: point.pageX,
    startY: point.pageY,
    startTime: +Date.now()
  }, data);
  startPointer.x = startPointer.startX;
  startPointer.y = startPointer.startY;
  return startPointer;
}

angular.module('material.core')
.provider('$mdGesture', function() {
  var GESTURES = {};
  var provider;

  addGesture('click', {
    options: {
      maxDistance: 6,
    },
    onEnd: function(element, ev, pointer) {
      if (Math.abs(pointer.distanceX) < this.options.maxDistance &&
          Math.abs(pointer.distanceY) < this.options.maxDistance) {
        element.triggerHandler('$md.click', pointer);
      }
    }
  });

  addGesture('press', {
    onStart: function(element, ev, pointer) {
      element.triggerHandler('$md.pressdown', pointer);
    },
    onEnd: function(element, ev, pointer) {
      element.triggerHandler('$md.pressup', pointer);
    }
  });

  addGesture('hold', {
    options: {
      minTime: 500,
      maxDistance: 6,
    },
    resetTimeout: function(element, ev, pointer) {
      cancelTimeout(this._holdTimeout);

      this._holdPos = {x: pointer.x, y: pointer.y};
      if (!this._holdTriggered) {
        var self = this;
        this._holdTimeout = setTimeout(function() {
          element.triggerHandler('$md.hold', pointer);
          self.holdTriggered = true;
        }, this.options.minTime);
      }
    },
    onStart: function(element, ev, pointer) {
      this.resetTimeout(element, ev, pointer);
    },
    onMove: function(element, ev, pointer) {
      if (Math.abs(this._holdPos.x - pointer.x) > this.options.maxDistance ||
          Math.abs(this._holdPos.y - pointer.y) > this.options.maxDistance) {
        this.resetTimeout(element, ev, pointer);
      }
    },
    onEnd: function(element, ev, pointer) {
      cancelTimeout(this._holdTimeout);
    }
  });

  addGesture('drag', {
    options: {
      minDistance: 6,
    },
    onMove: function(element, ev, pointer) {
      ev.preventDefault();
      if (!this._drag) {
        if (Math.abs(pointer.distanceX) > this.options.minDistance) {
          // Create a new pointer, starting at this point where the drag started.
          this._drag = makeStartPointer(ev);
          updatePointerState(ev, this._drag);
          element.triggerHandler('$md.dragstart', this._drag);
        }
      } else {
        updatePointerState(ev, this._drag);
        element.triggerHandler('$md.drag', this._drag);
      }
    },
    onEnd: function(element, ev, pointer) {
      if (this._drag) {
        updatePointerState(ev, this._drag);
        element.triggerHandler('$md.dragend', this._drag);
        this._drag = null;
      }
    }
  });

  addGesture('swipe', {
    options: {
      minVelocity: 0.65,
      minDistance: 10,
    },
    onEnd: function(element, ev, pointer) {
      if (Math.abs(pointer.velocityX) > this.options.minVelocity &&
          Math.abs(pointer.distanceX) > this.options.minDistance) {
        element.triggerHandler(
          pointer.direction == 'left' ? '$md.swipeleft' : '$md.swiperight', pointer
        );
      }
    }
  });

  return provider = {
    addGesture: addGesture,
    $get: GestureFactory
  };

  function addGesture(name, data) {
    GESTURES[name] = angular.extend({
      options: {},
      name: name,
      onStart: angular.noop,
      onMove: angular.noop,
      onEnd: angular.noop
    }, data);
    return provider;
  }

  function GestureFactory($mdUtil, $rootScope, $document, $rootElement) {

    return {
      attach: function(element, names, options) {
        (names || '').split(' ').forEach(function(name) {
          attach(element, name, options);
        });
      },
      detach: function(element, names) {
        (names || '').split(' ').forEach(function(name) {
          detach(element, name);
        });
      }
    };

    function attach(element, gestureName, options) {
      var node = element[0];
      var gesture = GESTURES[ (gestureName || '').toLowerCase() ];
      if (!gesture) {
        throw new Error(
          "Attempted to attach invalid gesture '%1'. Available gestures: %2"
            .replace('%1', gestureName)
            .replace('%2', Object.keys(GESTURES).join(', '))
        );
      }

      var gestureData = node.$mdGesture;
      if (!gestureData) {
        node.$mdGesture = gestureData = {
          gestures: [],
          onDestroy: onDestroy,
        };
        element.on('$destroy', onDestroy);
      }
      
      // Don't attach a gesture twice
      for (var i = 0, ii = gestureData.gestures.length; i < ii; i++) {
        if (gestureData.gestures[i].name === gesture.name) return;
      }

      var newGesture = angular.extend({}, gesture);
      angular.extend(newGesture.options, options || {});
      gestureData.gestures.push(newGesture);

      function onDestroy() {
        destroyGestureData(element);
      }
    }

    function detach(element, gestureName) {
      var node = element[0];
      var gestureData = node.$mdGesture;
      if (gestureData) {
        if (!gestureName) {
          destroyGestureData(element);
        } else {
          delete gestureData.gestures[gestureName];
          if (Object.keys(gestureData.gestures).length === 0) {
            destroyGestureData(element);
          }
        }
      }
    }

    function destroyGestureData(element) {
      var node = element[0];
      var gestureData = node.$mdGesture;
      if (gestureData) {
        element.off('$destroy', gestureData.onDestroy);
        delete element[0].$mdGesture;
      }
    }

  }

});

})();
