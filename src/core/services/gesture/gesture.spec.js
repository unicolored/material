ddescribe('$mdGesture', function() {
  beforeEach(module('material.core', function() {
    angular.element(document).triggerHandler('$$mdGestureReset');
  }));

  function setupGesture(name, values) {
    module('material.core', function($mdGestureProvider) {
      $mdGestureProvider.addGesture(name, values);
    });
  }

  it('#attach should error for invalid gesture name', function() {
    setupGesture('gesture1');
    inject(function($mdGesture) {
      var el = angular.element('<div>');
      expect(function() {
        $mdGesture.attach(el, 'gesture12');
      }).toThrow();
      expect(function() {
        $mdGesture.attach(el, 'gesture1');
      }).not.toThrow();
    });
  });

  describe('custom gesture', function() {

    var startSpy1, moveSpy1, endSpy1;
    var startSpy2, moveSpy2, endSpy2;
    var childEl, middleEl, parentEl;
    beforeEach(function() {
      setupGesture('gesture1', {
        color: 'red',
        onStart: startSpy1 = jasmine.createSpy('gesture1OnStart'),
        onMove: moveSpy1 = jasmine.createSpy('gesture1OnMove'),
        onEnd: endSpy1 = jasmine.createSpy('gesture1OnEnd')
      });
      setupGesture('gesture2', {
        shape: 'square',
        onStart: startSpy2 = jasmine.createSpy('gesture2OnStart'),
        onMove: moveSpy2 = jasmine.createSpy('gesture2OnMove'),
        onEnd: endSpy2 = jasmine.createSpy('gesture2OnEnd')
      });
      inject(function($mdGesture, $document) {
        childEl = angular.element('<child>');
        middleEl = angular.element('<middle>').append(childEl);
        parentEl = angular.element('<parent>').append(middleEl);
        $document.append(childEl);
      });
    });

    it('touch{start,move,end,cancel}', inject(function($document, $mdGesture) {
      $mdGesture.attach(childEl, 'gesture1');
      
      $document.triggerHandler({
        type: 'touchstart',
        target: childEl[0]
      });
      expect(startSpy1).toHaveBeenCalled();
      $document.triggerHandler('touchmove');
      expect(moveSpy1).toHaveBeenCalled();
      $document.triggerHandler('touchend');
      expect(endSpy1).toHaveBeenCalled();

      startSpy1.reset(); 
      moveSpy1.reset();
      endSpy1.reset();

      $document.triggerHandler({
        type: 'touchstart',
        target: childEl[0]
      });
      expect(startSpy1).toHaveBeenCalled();
      $document.triggerHandler('touchmove');
      expect(moveSpy1).toHaveBeenCalled();
      $document.triggerHandler('touchcancel');
      expect(endSpy1).toHaveBeenCalled();
    }));

    it('gesture{down,move,up,cancel}', inject(function($document, $mdGesture) {
      $mdGesture.attach(childEl, 'gesture1');

      $document.triggerHandler({
        type: 'pointerdown',
        target: childEl[0]
      });
      expect(startSpy1).toHaveBeenCalled();
      $document.triggerHandler('pointermove');
      expect(moveSpy1).toHaveBeenCalled();
      $document.triggerHandler('pointerup');
      expect(endSpy1).toHaveBeenCalled();

      startSpy1.reset(); 
      moveSpy1.reset();
      endSpy1.reset();

      $document.triggerHandler({
        type: 'pointerdown',
        target: childEl[0]
      });
      expect(startSpy1).toHaveBeenCalled();
      $document.triggerHandler('pointermove');
      expect(moveSpy1).toHaveBeenCalled();
      $document.triggerHandler('pointercancel');
      expect(endSpy1).toHaveBeenCalled();
    }));

    it('mouse{down,move,up,leave}', inject(function($document, $mdGesture) {
      $mdGesture.attach(childEl, 'gesture1');

      $document.triggerHandler({
        type: 'mousedown',
        target: childEl[0]
      });
      expect(startSpy1).toHaveBeenCalled();
      $document.triggerHandler('mousemove');
      expect(moveSpy1).toHaveBeenCalled();
      $document.triggerHandler('mouseup');
      expect(endSpy1).toHaveBeenCalled();

      startSpy1.reset(); 
      moveSpy1.reset();
      endSpy1.reset();

      $document.triggerHandler({
        type: 'mousedown',
        target: childEl[0]
      });
      expect(startSpy1).toHaveBeenCalled();
      $document.triggerHandler('mousemove');
      expect(moveSpy1).toHaveBeenCalled();
      $document.triggerHandler('mouseleave');
      expect(endSpy1).toHaveBeenCalled();
    }));

    it('should not call start on an event with different type if <400ms have passed', inject(function($document, $mdGesture) {
      $mdGesture.attach(childEl, 'gesture1');

      var now = 0;
      spyOn(Date, 'now').andCallFake(function() { return now; });

      $document.triggerHandler({
        type: 'touchstart',
        target: childEl[0]
      });
      $document.triggerHandler('touchmove');
      $document.triggerHandler('touchend');

      startSpy1.reset();
      $document.triggerHandler({
        type: 'mousedown',
        target: childEl[0]
      });
      expect(startSpy1).not.toHaveBeenCalled();

      now = 500;
      $document.triggerHandler({
        type: 'mousedown',
        target: childEl[0]
      });
      expect(startSpy1).toHaveBeenCalled();
    }));

    it('should call on multiple elements, bubbling up', inject(function($document, $mdGesture) {
      $mdGesture.attach(parentEl, 'gesture1');
      $mdGesture.attach(childEl, 'gesture1');

      $document.triggerHandler({
        type: 'touchstart',
        target: childEl[0]
      });
      expect(startSpy1.calls[0].args[0][0]).toBe(childEl[0]);
      expect(startSpy1.calls[1].args[0][0]).toBe(parentEl[0]);

      $document.triggerHandler('$$mdGestureReset');
      startSpy1.reset();

      //middleEl shouldn't be called
      var middleEl = angular.element('<middle>');
      $mdGesture.attach(middleEl, 'gesture2');
      
      parentEl.append(middleEl);
      middleEl.append(childEl);

      $document.triggerHandler({
        type: 'touchstart',
        target: childEl[0]
      });
      expect(startSpy1.callCount).toBe(2);
      expect(startSpy1.calls[0].args[0][0]).toBe(childEl[0]);
      expect(startSpy1.calls[1].args[0][0]).toBe(parentEl[0]);
      expect(startSpy2.callCount).toBe(1);
      expect(startSpy2.calls[0].args[0][0]).toBe(middleEl[0]);
    }));

    iit('should stopPropagation', inject(function($document, $mdGesture) {
      $mdGesture.attach(parentEl, 'gesture1');
      $mdGesture.attach(middleEl, 'gesture1');
      $mdGesture.attach(childEl, 'gesture1');
      $mdGesture.attach(childEl, 'gesture2');

      startSpy1.andCallFake(function(el, ev, gesture) {
        console.log(el[0]);
        if (el[0] === childEl[0]) {
          ev.stopPropagation();
        }
      });

      $document.triggerHandler({
        type: 'touchstart',
        target: childEl[0]
      });

      expect(startSpy1.callCount).toBe(1);
      expect(startSpy1.mostRecentCall.args[0][0]).toBe(childEl[0]);

//       childEl.off('gesture1start');
//       $document.triggerHandler('$$mdGestureReset');
//       startSpy1.reset();

//       middleEl.on('gesture1start', function(ev, gesture) {
//         gesture.stopPropagation();
//       });

//       $document.triggerHandler({
//         type: 'touchstart',
//         target: childEl[0]
//       });

//       expect(startSpy1.callCount).toBe(2);
//       expect(startSpy1.calls[0].args[0][0]).toBe(childEl[0]);
//       expect(startSpy1.calls[1].args[0][0]).toBe(middleEl[0]);
    }));

    it('should stopImmediatePropagation', inject(function($document, $mdGesture) {
      $mdGesture.attach(childEl, 'gesture1');
      $mdGesture.attach(childEl, 'gesture2');

      startSpy1.andCallFake(function(element, ev, gesture) {
        gesture.stopImmediatePropagation();
      });

      $document.triggerHandler({
        type: 'touchstart',
        target: childEl[0]
      });

      expect(startSpy1.callCount).toBe(1);
      expect(startSpy1.mostRecentCall.args[0][0]).toBe(childEl[0]);

      expect(startSpy2).not.toHaveBeenCalled();
    }));

  });

    

});
