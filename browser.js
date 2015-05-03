/*!
 * browser.js
 * https://github.com/sigod/browser.js
 */

;(function () {
	'use strict';

	// ---------------------------------------------------------------------------------------------------------------------

	window.browserjs = browserjs;

	var __path = '/';
	var cache = {};

	// ---------------------------------------------------------------------------------------------------------------------

	var tag = document.getElementById('browserjs');
	if (tag) {
		var base = tag.getAttribute('data-base-url');
		if (base) {
			if (base[base.length - 1] !== '/') base += '/';
			__path = base;
		}

		var main = tag.getAttribute('data-main');
		if (main) {
			main = getId(__path, main);

			loadModule(main, true, function () {
				getExports(cache[main]);
			});
		}
	}

	// ---------------------------------------------------------------------------------------------------------------------

	function browserjs(func) {
		processModule(__path, func.toString(), function () {
			invokeModule(__path, func);
		});
	}

	// ---------------------------------------------------------------------------------------------------------------------

	function require(module_path) {
		var id = getId(__path, module_path);
		var cached = cache[id];

		if (!cached) {
			loadModule(id, false, function () {});
			cached = cache[id];
		}

		return getExports(cached);
	}

	function getExports(module) {
		if (module.error) throw new Error("Cannot find module '" + module.id + "'");

		if (module.func) {
			module.exports = module.func();
			delete module.func;
		}

		return module.exports;
	}

	browserjs._define = function (id, func) {
		cache[id].func = function () {
			return invokeModule(id, func);
		};
	};

	// ---------------------------------------------------------------------------------------------------------------------

	function invokeModule(path, module) {
		var pmodule = { exports: {} };

		var old_path = __path;
		__path = path;
		module.call(pmodule.exports, require, pmodule.exports, pmodule);
		__path = old_path;

		return pmodule.exports;
	}

	function processModule(path, content, callback) {
		var modules = [];

		parseRequires(content)
			.forEach(function (module) {
				var resolved = getId(path, module);

				if (!cache[resolved]) modules.push(resolved);
			});

		if (modules.length) {
			var count = modules.length;
			function fn() {
				if (--count === 0) callback();
			}

			modules.forEach(function (module) {
				loadModule(module, true, fn);
			});
		}
		else callback();
	}

	var require_begin_str = 'require(';
	function parseRequires(content) {
		var result = [];

		var index = content.indexOf(require_begin_str);
		while (index >= 0) {
			var index2 = content.indexOf(')', index);

			result.push(content.substring(index + require_begin_str.length + 1, index2 - 1));

			index = content.indexOf(require_begin_str, index2);
		}

		return result;
	}

	function loadModule(id, async, callback) {
		var module = cache[id] = { id: id };

		load(id, async, function (response) {
			if (response.error) {
				module.error = response.error;
				return callback();
			}

			var body = 'browserjs._define("' + id + '",function(require,exports,module){' + response.content + '});';

			/* jshint evil: true */
			new Function('', body)();
			/* jshint evil: false */

			processModule(id, response.content, callback);
		});
	}

	function load(id, async, callback) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', id, async);
		xhr.onreadystatechange = function () {
			if (this.readyState === 4) {
				if (this.status !== 200 && this.status !== 304) {
					return callback({ error: { code: this.status } });
				}

				callback({ content: this.responseText });
			}
		};
		xhr.send();
	}

	// ---------------------------------------------------------------------------------------------------------------------

	function getId(parent, module) {
		var id = buildPath(folder(parent), module);

		if (!extension(id)) id += '.js';

		return id;
	}

	function folder(path) {
		return path.substr(0, path.lastIndexOf('/') + 1);
	}

	function extension(path) {
		var index = path.lastIndexOf('.');
		if (index !== -1) return path.substring(index);
	}

	function buildPath() {
		return normalize(Array.prototype.join.call(arguments, '/'));
	}

	function normalize(path) {
		path = path.split('/');

		for (var i = 1; i < path.length; ++i) {
			if (path[i] === '' || path[i] === '.') {
				path.splice(i, 1);
				--i;
			}
			else if (path[i] === '..') {
				path.splice(i - 1, 2);
				i -= 2;
			}
		}

		return path.join('/');
	}

	// ---------------------------------------------------------------------------------------------------------------------
})();
