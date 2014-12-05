(function() {
'use strict';


angular.module('material.core')
  .directive('mdTheme', ThemingDirective)
  .directive('mdThemable', ThemableDirective)
  .provider('$mdTheming', ThemingProvider)
  .run(generateThemes);

/**
 * @ngdoc provider
 * @name $mdThemingProvider
 * @module material.core
 *
 * @description Provider to configure the `$mdTheming` service.
 */

/**
 * @ngdoc method
 * @name $mdThemingProvider#setDefaultTheme
 * @param {string} themeName Default theme name to be applied to elements. Default value is `default`.
 */

/**
 * @ngdoc method
 * @name $mdThemingProvider#alwaysWatchTheme
 * @param {boolean} watch Whether or not to always watch themes for changes and re-apply
 * classes when they change. Default is `false`. Enabling can reduce performance.
 */

var PALETTES = {};
var THEMES = {};

var DEFAULT_HUES = {
  'default': '500',
  'hue-1': '100',
  'hue-2': '300',
  'hue-3': 'A100',
};
var VALID_HUE_VALUES = [
  '50', '100', '200', '300', '400', '500', '600', 
  '700', '800', '900', 'A100', 'A200', 'A400', 'A700'
];

// TODO read palettes from source
// TODO inherit from default by default
function ThemingProvider() {
  var defaultTheme = 'default';
  var alwaysWatchTheme = false;

  readPaletteCss();

  registerTheme('default')
    .primaryColor('pink')
    .accentColor('green')
    .warnColor('red');

  return {
    definePalette: definePalette,
    extendPalette: extendPalette,
    theme: registerTheme,

    setDefaultTheme: function(theme) {
      defaultTheme = theme;
    },
    alwaysWatchTheme: function(alwaysWatch) {
      alwaysWatchTheme = alwaysWatch;
    },
    $get: ThemingService
  };

  function readPaletteCss() {
    var element = document.createElement('div');
    element.classList.add('md-color-palette-definition');
    document.body.appendChild(element);

    var content = getComputedStyle(element).content; 
    // Get rid of leading and trailing comma
    content = content.substring(1,content.length-1);

    var parsed = JSON.parse(content);
    angular.extend(PALETTES, parsed);
  }

  function definePalette(name, map) {
    map = map || {};
    PALETTES[name] = checkPaletteValid(name, map);
  }
  function extendPalette(name, map) {
    return checkPaletteValid(name,  angular.extend({}, PALETTES[name] || {}, map) );
  }
  function checkPaletteValid(name, map) {
    var missingColors = VALID_HUE_VALUES.filter(function(field) {
      return !map[field];
    });
    if (missingColors.length) {
      throw new Error("Missing colors %1 in palette %2!"
                      .replace('%1', missingColors.join(', '))
                      .replace('%2', name));
    }
    return map;
  }

  function registerTheme(name, inheritFrom) {
    inheritFrom = inheritFrom || 'default';
    var parentTheme = typeof inheritFrom === 'string' ? THEMES[inheritFrom] : inheritFrom;

    var theme = new Theme(name);
    angular.extend(theme, parentTheme || {});
    THEMES[name] = theme;

    return theme;
  }

  function Theme(name) {
    var self = this;
    self.name = name;
    self.primaryColor = colorMaker('primary');
    self.accentColor = colorMaker('accent');
    self.warnColor = colorMaker('warn');

    function colorMaker(field) {
      return function(paletteName, hues) {
        self[field] = {
          name: paletteName,
          hues: angular.extend({}, hues, DEFAULT_HUES)
        };

        Object.keys(self[field].hues).forEach(function(name) {
          if (!DEFAULT_HUES[name]) {
            throw new Error("Invalid hue name '%1' in theme %2's %3 color %4."
              .replace('%1', name)
              .replace('%2', self.name)
              .replace('%3', field)
              .replace('%4', paletteName)
            );
          }
        });

        Object.keys(self[field].hues).map(function(key) {
          return self[field].hues[key];
        }).forEach(function(hueValue) {
          if (VALID_HUE_VALUES.indexOf(hueValue) == -1) {
            throw new Error("Invalid hue value '%1' in theme %2's %3 color %4."
              .replace('%1', hueValue)
              .replace('%2', self.name)
              .replace('%3', field)
              .replace('%4', paletteName)
            );
          }
        });

        return self;
      };
    }
  }

  /**
   * @ngdoc service
   * @name $mdTheming
   *
   * @description
   *
   * Service that makes an element apply theming related classes to itself.
   *
   * ```js
   * app.directive('myFancyDirective', function($mdTheming) {
   *   return {
   *     restrict: 'e',
   *     link: function(scope, el, attrs) {
   *       $mdTheming(el);
   *     }
   *   };
   * });
   * ```
   * @param {el=} element to apply theming to
   */
  /* @ngInject */
  function ThemingService($rootScope) {
    applyTheme.inherit = function(el, parent) {
      var ctrl = parent.controller('mdTheme');

      var attrThemeValue = el.attr('md-theme-watch');
      if ( (alwaysWatchTheme || angular.isDefined(attrThemeValue)) && attrThemeValue != 'false') {
        var deregisterWatch = $rootScope.$watch(function() {
          return ctrl && ctrl.$mdTheme || defaultTheme;
        }, changeTheme);
        el.on('$destroy', deregisterWatch);
      } else {
        var theme = ctrl && ctrl.$mdTheme || defaultTheme;
        changeTheme(theme);
      }

      function changeTheme(theme) {
        var oldTheme = el.data('$mdThemeName');
        if (oldTheme) el.removeClass('md-' + oldTheme +'-theme');
        el.addClass('md-' + theme + '-theme');
        el.data('$mdThemeName', theme);
      }
    };

    return applyTheme;

    function applyTheme(scope, el) {
      // Allow us to be invoked via a linking function signature.
      if (el === undefined) {
        el = scope;
        scope = undefined;
      }
      if (scope === undefined) {
        scope = $rootScope;
      }
      applyTheme.inherit(el, el);
    }
  }
}

function ThemingDirective($interpolate) {
  return {
    priority: 100,
    link: {
      pre: function(scope, el, attrs) {
        var ctrl = {
          $setTheme: function(theme) {
            ctrl.$mdTheme = theme;
          }
        };
        el.data('$mdThemeController', ctrl);
        ctrl.$setTheme($interpolate(attrs.mdTheme)(scope));
        attrs.$observe('mdTheme', ctrl.$setTheme);
      }
    }
  };
}

function ThemableDirective($mdTheming) {
  return $mdTheming;
}

function generateThemes($MD_THEME_CSS, $window) {

  angular.forEach(PALETTES, sanitizePalette);

  var rules = $MD_THEME_CSS.split(/\}(?!(\}|'|"|;))/)
    .filter(function(rule) { return rule && rule.length; })
    .map(function(rule) { return rule.trim() + '}'; });

  var warnRules = [];
  var accentRules = [];
  var primaryRules = [];
  rules.forEach(function(rule) {
    if (rule.indexOf('md-warn') > -1) {
      warnRules.push(rule);
    } else if (rule.indexOf('md-accent') > -1) {
      accentRules.push(rule);
    } else {
      primaryRules.push(rule);
    }
  });
  
  primaryRules = primaryRules.join('\n');
  warnRules = warnRules.join('\n');
  accentRules = accentRules.join('\n');

  var generatedRules = [];
  angular.forEach(THEMES, function(theme) {

    ['primary', 'accent', 'warn'].forEach(function(colorType) {
      checkValidPalette(theme, colorType);
    });

    generateSelectorsFor('primary', primaryRules.replace(/THEME_NAME/g, theme.name));
    generateSelectorsFor('warn', warnRules.replace(/THEME_NAME/g, theme.name));
    generateSelectorsFor('accent', accentRules.replace(/THEME_NAME/g, theme.name));

    function generateSelectorsFor(colorType, rules) {
      var color = theme[colorType];
      var hueColorRegex = new RegExp('(\'|\")?{{\\s*' + colorType + '-color\\s*}}(\"|\')?','g');
      var hueContrastRegex = new RegExp('(\"|\')?{{\\s*' + colorType + '-contrast\\s*}}(\"|\')?','g');
      var themeNameRegex = new RegExp('.md-' + theme.name + '-theme', 'g');
      var palette = PALETTES[color.name];

      angular.forEach(color.hues, function(hueValue, hueName) {
        var newRule = rules
          .replace(hueColorRegex, palette[hueValue].value)
          .replace(hueContrastRegex, palette[hueValue].contrast);
        if (hueName !== 'default') {
          newRule = newRule.replace(themeNameRegex, '.md-' + theme.name + '-theme.md-' + hueName);
        }
        generatedRules.push(newRule);
      });
    }
  });

  var style = document.createElement('style');
  style.innerHTML = generatedRules.join('\n');
  var head = document.getElementsByTagName('head')[0];
  head.insertBefore(style, head.firstElementChild);

  // contrastDefaultColor: true,
  // contrastLightColors: ['50', '100', '200', 'A100'],
  // contrastDarkColors: ['50', '100', '200', 'A100'],

  // for each theme name registered,
  //   for each color-set registered in theme,
  //     write styleseheet string
  //
  // write stylesheet to dom

  function sanitizePalette(palette) {
    var defaultContrast = palette.contrastDefaultColor;
    var lightColors = palette.contrastLightColors || [];
    var darkColors = palette.contrastDarkColors || [];
    var darkColor = 'rgba(0,0,0,0.87)';
    var lightColor = 'white';

    delete palette.contrastDefaultColor;
    delete palette.contrastLightColors;
    delete palette.contrastDarkColors;

    angular.forEach(palette, function(hueValue, hueName) {
      palette[hueName] = {
        value: hueValue,
        contrast: getContrastColor()
      };
      function getContrastColor() {
        if (defaultContrast === 'light') {
          return darkColors.indexOf(hueName) > -1 ? darkColor : lightColor;
        } else {
          return lightColors.indexOf(hueName) > -1 ? lightColor : darkColor;
        }
      }
    });
  }

  function checkValidPalette(theme, colorType) {
    if (!PALETTES[ (theme[colorType] || {}).name ]) {
      //TODO error
      throw new Error("You supplied an invalid color palette for theme %1's %2 " +
                      "palette. Available palettes: %3"
        .replace('%1', theme)
        .replace('%2', colorType)
        .replace('%3', Object.keys(PALETTES))
      );
    }
  }
}

function dashToCamelCase(s) {
  return (s || '').replace(/-(.)/g, function(match, $1) {
    return $1.toUpperCase();
  });
}

})();
