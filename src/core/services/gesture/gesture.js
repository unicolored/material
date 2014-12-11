(function() {

angular.module('material.core')

.factory('$mdGesture', function($document, $mdUtil) {
  var START_EVENTS = 'mousedown touchstart pointerdown';
  var MOVE_EVENTS = 'mousemove touchmove pointermove';
  var END_EVENTS = 'mouseup mouseleave touchend touchcancel pointerup pointercancel';

  // The state of the current and previous 'pointer' (mouse/touch)
  var pointer, lastPointer;

  $document.on(MOVE_EVENTS, gestureMove)
    .on(END_EVENTS, gestureEnd);

  return {
    makeTappable: function(element) { return listen(element, 'tap'); },
    makeDraggable: function(element) { return listen(element, 'drag'); },
    makeSwipeable: function(element) { return listen(element, 'swipe'); }
  };


  /****************
   * Private Methods
   ****************/

  function listen(element, behavior) {
    var gestureData = element.data('$mdGestureData');
    if (gestureData) {
      gestureData.behaviors[behavior] = true;
    } else {
      element.data('$mdGestureData', gestureData = {
        behaviors: {},
        onStart: onStart,
        onDestroy: onDestroy
      });
      gestureData.behaviors[behavior] = true;

      element
        .on(START_EVENTS, onStart)
        .on('$destroy', onDestroy);
    }

    return function stopListening() {
      delete gestureData.behaviors[behavior];
      if (Object.keys(gestureData.behaviors).length === 0) {
        cleanupGestureData(element);
      }
    };

    function onDestroy() {
      cleanupGestureData(element);
    }
    function onStart(ev) {
      gestureStart(ev, element);
    }

  }

  function gestureStart(ev, element) {
    // If we're already touching, abort
    if (pointer) return;

    var now = $mdUtil.now();

    // iOS & old android bug: after a touch event, iOS sends a click event 350 ms later.
    // Don't allow a different type than the previous if <400ms have passed.
    if (typesMatch(ev, lastPointer) && (now - lastPointer.endTime < 400)) {
      return;
    }

    pointer = {
      // Restrict this tap to whatever started it: if a mousedown started the tap,
      // don't let anything but mouse events continue it.
      type: ev.type.charAt(0),
      startX: getEventPos(ev, 'pageX'),
      startY: getEventPos(ev, 'pageY'),
      startTime: $mdUtil.now(),
      element: element,
      behaviors: element.data('$mdGestureData').behaviors
    };
    pointer.x = pointer.startX;
    pointer.y = pointer.startY;
    
    updatePointerState(ev, pointer);

    if (pointer.behaviors.drag) {
      pointer.element.triggerHandler('$mdGesture.dragstart', pointer);
    }
  }

  function gestureMove(ev) {
    if (!typesMatch(ev, pointer)) return;

    updatePointerState(ev, pointer);

    if (pointer.behaviors.drag) {
      // If we're listening to drag events, don't allow touchmove to scroll
      if (pointer.type === 't' || pointer.type === 'p') {
        ev.preventDefault();
      }
      pointer.element.triggerHandler('$mdGesture.drag', pointer);
    }
  }

  function gestureEnd(ev) {
    if (!typesMatch(ev, pointer)) return;

    updatePointerState(ev, pointer);
    pointer.endTime = $mdUtil.now();

    if (pointer.behaviors.tap && Math.abs(pointer.distanceX) < 5 &&
        Math.abs(pointer.distanceY) < 5) {
      pointer.element.triggerHandler('$mdGesture.tap', pointer);
    }
    if (pointer.behaviors.drag) {
      pointer.element.triggerHandler('$mdGesture.dragend', pointer);
    }
    if (pointer.behaviors.swipe && Math.abs(pointer.velocityX) > 0.65 &&
        Math.abs(pointer.distance) > 10) {
      var type = pointer.direction == 'left' ? '$mdGesture.swipeleft' : '$mdGesture.swiperight';
      pointer.element.triggerHandler(type, pointer);
    }

    lastPointer = pointer;
    pointer = null;
  }


  /******** Helpers *********/
  function typesMatch(ev, pointer) {
    return ev && pointer && ev.type.charAt(0) === (pointer && pointer.type);
  }

  function getEventPos(ev, property) {
    ev = ev.originalEvent || ev; // support jQuery events
    var pos = (ev.touches && ev.touches[0]) ||
      (ev.changedTouches && ev.changedTouches[0]) ||
      ev;
    return pos[property];
  }

  function updatePointerState(ev, pointer) {
    var x = pointer.x = getEventPos(ev, 'pageX');
    var y = pointer.y = getEventPos(ev, 'pageY');
    pointer.distanceX = pointer.startX - x;
    pointer.distanceY = pointer.startY - y;
    pointer.direction = pointer.distance > 0 ? 'left' : (pointer.distance < 0 ? 'right' : '');
    pointer.duration = pointer.startTime - Util.now();
    pointer.velocityX = pointer.distanceX / pointer.time;
    pointer.velocityY = pointer.distanceY / pointer.time;
  }

  function cleanupGestureData(element) {
    var gestureData = element.data('$mdGestureData');
    if (gestureData) {
      element
        .off(START_EVENTS, gestureData.onStart)
        .off('$destroy', gestureData.onDestroy)
        .removeData('$mdGestureData');

      if (pointer.element[0] === element[0]) {
        pointer = null;
      }
    }
  }

});

})();
