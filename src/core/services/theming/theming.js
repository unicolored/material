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


// In memory storage of defined themes and color palettes (both loaded by CSS, and user specified)
var PALETTES = {};
var THEMES = {};

// A color in a theme will use these hues by default, if not specified by user.
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

function ThemingProvider() {
  var defaultTheme = 'default';
  var alwaysWatchTheme = false;

  // Load CSS defined palettes (generated from scss)
  readPaletteCss();

  // Define a default theme with our newly loaded colors
  registerTheme('default')
    .primaryColor('blue')
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

  // Use a temporary element to read the palettes from the content of a decided selector as JSON
  function readPaletteCss() {
    var element = document.createElement('div');
    element.classList.add('md-color-palette-definition');
    document.body.appendChild(element);

    var content = getComputedStyle(element).content; 
    // Get rid of leading and trailing quote
    content = content.substring(1,content.length-1);

    var parsed = JSON.parse(content);
    angular.extend(PALETTES, parsed);
    document.body.removeChild(element);
  }

  // Example: $mdThemingProvider.definePalette('neonRed', { 50: '#f5fafa', ... });
  function definePalette(name, map) {
    map = map || {};
    PALETTES[name] = checkPaletteValid(name, map);
  }

  // Returns an new object which is a copy of a given palette `name` with variables from
  // `map` overwritten
  // Example: var neonRedMap = $mdThemingProvider.extendPalette('red', { 50: '#f5fafafa' });
  function extendPalette(name, map) {
    return checkPaletteValid(name,  angular.extend({}, PALETTES[name] || {}, map) );
  }

  // Make sure that palette has all required hues
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

  // Register a theme (which is a collection of color palettes to use with various states
  // ie. warn, accent, primary )
  // Optionally inherit from an existing theme
  // $mdThemingProvider.theme('custom-theme').primaryColor('red');
  function registerTheme(name, inheritFrom) {
    if (THEMES[name]) return THEMES[name];
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

// Generate our themes at run time given the state of THEMES and PALETTES
function generateThemes($MD_THEME_CSS) {
  // MD_THEME_CSS is a string generated by the build process that includes all the themable
  // components as templates

  // Expose contrast colors for palettes to ensure that text is always readable
  angular.forEach(PALETTES, sanitizePalette);

  // Break the CSS into individual rules
  var rules = $MD_THEME_CSS.split(/\}(?!(\}|'|"|;))/)
    .filter(function(rule) { return rule && rule.length; })
    .map(function(rule) { return rule.trim() + '}'; });

  var warnRules = [];
  var accentRules = [];
  var primaryRules = [];

  // Sort the rules based on type, allowing us to do color substitution on a per-type basis
  rules.forEach(function(rule) {
    if (rule.indexOf('md-warn') > -1) {
      warnRules.push(rule);
    } else if (rule.indexOf('md-accent') > -1) {
      accentRules.push(rule);
    } else {
      primaryRules.push(rule);
    }
  });
  
  // Convert all rules into strings instead of arrays, for easy replacement later
  primaryRules = primaryRules.join('');
  warnRules = warnRules.join('');
  accentRules = accentRules.join('');

  var generatedRules = [];
  
  // For each theme, use the color palettes specified for `primary`, `warn` and `accent`
  // to generate CSS rules.
  angular.forEach(THEMES, function(theme) {

    generateSelectorsFor('primary', primaryRules);
    generateSelectorsFor('warn', warnRules);
    generateSelectorsFor('accent', accentRules);

    function generateSelectorsFor(colorType, rules) {
      checkValidPalette(theme, colorType);
      rules = rules.replace(/THEME_NAME/g, theme.name);
      var color = theme[colorType];

      // Matches '{{ primary-color }}', etc
      var hueColorRegex = new RegExp('(\'|\")?{{\\s*' + colorType + '-color\\s*}}(\"|\')?','g');
      // Matches '{{ primary-contrast }}', etc
      var hueContrastRegex = new RegExp('(\"|\')?{{\\s*' + colorType + '-contrast\\s*}}(\"|\')?','g');
      var themeNameRegex = new RegExp('.md-' + theme.name + '-theme', 'g');
      var palette = PALETTES[color.name];

      // find and replace simple variables where we use a specific hue, not an entire palette
      // eg. "{{primary-100}}"
      var simpleVariable = /'?"?\{\{\s*(accent|warn|primary)-(A?\d{2,3})\s*\}\}'?"?/g;
      rules = rules.replace(simpleVariable, function(match, colorType, hue) {
        return (PALETTES[theme[colorType].name][hue] || '').value;
      });

      // For each type, generate rules for each hue (ie. default, md-hue-1, md-hue-2, md-hue-3)
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

  // Insert our newly minted styles into the DOM
  var style = document.createElement('style');
  style.innerHTML = generatedRules.join('');
  var head = document.getElementsByTagName('head')[0];
  head.insertBefore(style, head.firstElementChild);
  
  // The user specifies a 'default' contrast color as either light or dark,
  // then explicitly lists which hues are the opposite contrast (eg. A100 has dark, A200 has light)
  function sanitizePalette(palette) {
    var defaultContrast = palette.contrastDefaultColor;
    var lightColors = palette.contrastLightColors || [];
    var darkColors = palette.contrastDarkColors || [];
    var darkColor = 'rgba(0,0,0,0.87)';
    var lightColor = 'white';

    // Cleanup after ourselves
    delete palette.contrastDefaultColor;
    delete palette.contrastLightColors;
    delete palette.contrastDarkColors;

    // Change { 'A100': '#fffeee' } to { 'A100': { value: '#fffeee', contrast:darkColor }
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
    // If theme attempts to use a palette that doesnt exist, throw error
    if (!PALETTES[ (theme[colorType] || {}).name ]) {
      throw new Error("You supplied an invalid color palette for theme %1's %2 " +
                      "palette. Available palettes: %3"
        .replace('%1', theme)
        .replace('%2', colorType)
        .replace('%3', Object.keys(PALETTES).join(','))
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
