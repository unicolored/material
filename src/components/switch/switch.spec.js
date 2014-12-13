describe('<md-switch>', function() {
  var CHECKED_CSS = 'md-checked';

  beforeEach(TestUtil.mockRaf);
  beforeEach(module('ngAria', 'material.components.switch'));

  it('should set checked css class and aria-checked attributes', inject(function($compile, $rootScope) {
    var element = $compile('<div>' +
                             '<md-switch ng-model="blue">' +
                             '</md-switch>' +
                             '<md-switch ng-model="green">' +
                             '</md-switch>' +
                           '</div>')($rootScope);

    $rootScope.$apply(function(){
      $rootScope.blue = false;
      $rootScope.green = true;
    });

    var switches = angular.element(element[0].querySelectorAll('md-switch'));

    expect(switches.eq(0).hasClass(CHECKED_CSS)).toEqual(false);
    expect(switches.eq(1).hasClass(CHECKED_CSS)).toEqual(true);
    expect(switches.eq(0).attr('aria-checked')).toEqual('false');
    expect(switches.eq(1).attr('aria-checked')).toEqual('true');
    expect(switches.eq(0).attr('role')).toEqual('checkbox');

    $rootScope.$apply(function(){
      $rootScope.blue = true;
      $rootScope.green = false;
    });

    expect(switches.eq(1).hasClass(CHECKED_CSS)).toEqual(false);
    expect(switches.eq(0).hasClass(CHECKED_CSS)).toEqual(true);
    expect(switches.eq(1).attr('aria-checked')).toEqual('false');
    expect(switches.eq(0).attr('aria-checked')).toEqual('true');
    expect(switches.eq(1).attr('role')).toEqual('checkbox');
  }));

  it('should change on dragend if translate > 50%', inject(function($compile, $rootScope) {
    var element = $compile('<md-switch ng-model="banana"></md-switch>')($rootScope);
    var switchContainer = angular.element(element[0].querySelector('.md-container'));
    var drag;

    // 0 -> 0.6 success (change of 60%)
    switchContainer.triggerHandler('$md.dragend', { translate: 0.6 });
    expect($rootScope.banana).toBe(true);
    expect(element.hasClass(CHECKED_CSS)).toBe(true);

    // 1 -> 0.7 failure (change of 30%)
    switchContainer.triggerHandler('$md.dragend', { translate: 0.7 });
    expect($rootScope.banana).toBe(true);
    expect(element.hasClass(CHECKED_CSS)).toBe(true);

    // 1 -> 0.45 success (change of 55%)
    switchContainer.triggerHandler('$md.dragend', { translate: 0.45 });
    expect($rootScope.banana).toBe(false);
    expect(element.hasClass(CHECKED_CSS)).toBe(false);

    // 0 -> 0.2 failure (change of 20%)
    switchContainer.triggerHandler('$md.dragend', { translate: 0.2 });
    expect($rootScope.banana).toBe(false);
    expect(element.hasClass(CHECKED_CSS)).toBe(false);

  }));

});
