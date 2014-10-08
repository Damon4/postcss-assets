var postcss = require('postcss');

var fs = require('fs');
var path = require('path');
var url = require('url');

var sizeOf = require('image-size');

var R_ESCAPE = /\\(?:([0-9a-f]{1,6} ?)|(.))/gi;
var R_FUNC = /^(asset(?:-width|-height)?)\((\s*['"]?)(.*?)(['"]?\s*)\)$/
var R_SLASH = /%5C/gi;
var R_SPACE = /([0-9a-f]{1,6})%20/gi;
var R_URL = /^([^\?#]+)(.*)/;

module.exports = function (options) {
  options = options || {};
  options.basePath = options.basePath || process.cwd();
  options.baseUrl = options.baseUrl || '/';
  options.loadPaths = options.loadPaths || [];
  options.loadPaths.unshift('.');

  function findMatchingLoadPath(assetPath) {
    var matchingPath;
    var some = options.loadPaths.some(function (loadPath) {
      matchingPath = path.join(loadPath, '/');
      return fs.existsSync(path.join(options.basePath, matchingPath, assetPath));
    });
    if (!some) throw new Error("Asset not found or unreadable: " + assetPath);
    return matchingPath;
  }

  function resolvePath(asset) {
    var chunks = splitAsset(asset);
    var assetPath = unescape(chunks[0]);
    return path.join(options.basePath, findMatchingLoadPath(assetPath), assetPath);
  }

  function resolveUrl(asset) {
    var chunks = splitAsset(asset);
    var assetPath = unescape(chunks[0]);
    var baseUrl = url.resolve(options.baseUrl, findMatchingLoadPath(assetPath));
    chunks[0] = encodeURI(baseUrl + chunks[0]).replace(R_SLASH, '\\').replace(R_SPACE, '$1 ');
    return chunks.join('');
  }

  function splitAsset(asset) {
    return Array.prototype.slice.call(asset.match(R_URL), 1, 3);
  }

  function unescape(string) {
    return string.replace(R_ESCAPE, function (match, p1, p2) {
      if (p1) return String.fromCharCode(parseInt(p1, 16));
      return p2;
    });
  }

  return function (css) {
    css.eachDecl(function (decl) {

      var matches = decl.value.match(R_FUNC);
      if (!matches) return;

      switch (matches[1]) {
      case 'asset':
        decl.value = 'url(' + matches[2] + resolveUrl(matches[3]) + matches[4] + ')';
        break;
      case 'asset-width':
        decl.value = sizeOf(resolvePath(matches[3])).width + 'px';
        break;
      case 'asset-height':
        decl.value = sizeOf(resolvePath(matches[3])).height + 'px';
        break;
      }
    });
  };
};
