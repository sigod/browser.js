/*!
 * browser.js
 * https://github.com/sigod/browser.js
 */

;(function () {
	'use strict';

	// ---------------------------------------------------------------------------------------------------------------------

	window.browserjs = browserjs;

	var __path = '';
	var __global = '/';
	var __cache = {};

	// ---------------------------------------------------------------------------------------------------------------------

	var tag = document.getElementById('browserjs');
	if (tag) {
		var base = tag.getAttribute('data-base-url');
		if (base) {
			if (base[base.length - 1] !== '/') base += '/';
			__global = base;
		}

		var main = tag.getAttribute('data-main');
		if (main) {
			main = getId(__path, main);

			loadModule(main, true, function () {
				getExports(main);
			});
		}
	}

	// ---------------------------------------------------------------------------------------------------------------------

	function browserjs(func) {
		processModule(__path, func.toString(), function () {
			invokeModule(__path, func, {});
		});
	}

	// ---------------------------------------------------------------------------------------------------------------------

	function require(module_path) {
		var id = getId(__path, module_path);

		if (!__cache[id]) loadModule(id, false, function () {});

		return getExports(id);
	}

	function getExports(id) {
		var module = __cache[id];

		if (module.error) throw new Error("Cannot find module '" + module.id + "'");

		if (module.func) {
			var func = module.func;
			delete module.func;

			__cache[id] = {
				id: id,
				exports: func(module)
			};
		}

		return module.exports;
	}

	browserjs._define = function (id, func) {
		__cache[id].func = function (module) {
			return invokeModule(id, func, module);
		};
	};

	// ---------------------------------------------------------------------------------------------------------------------

	function invokeModule(path, func, module) {
		module.exports = {};

		var old_path = __path;
		__path = path;

		var old_main = require.main;
		require.main = module;

		try {
			func.call(module.exports, require, module.exports, module);
		}
		finally {
			__path = old_path;
			require.main = old_main;
		}

		return module.exports;
	}

	function processModule(path, content, callback) {
		var modules = [];

		parseRequires(content)
			.forEach(function (module) {
				var resolved = getId(path, module);

				if (!__cache[resolved]) modules.push(resolved);
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

			var key = content.substring(index + require_begin_str.length, index2).trim();

			if (key.length && key[0] === key[key.length - 1] && isStringMark(key[0])) {
				result.push(key.substring(1, key.length - 1));
			}

			index = content.indexOf(require_begin_str, index2);
		}

		return result;


		function isStringMark(char) {
			return char === "'" || char === '"';
		}
	}

	// 3
	function loadModule(id, async, callback) {
		var module = __cache[id] = { id: id };

		load(__global + id, async, function (response) {
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

	// 1
	function folder(path) {
		return path.substr(0, path.lastIndexOf('/') + 1);
	}

	// 1
	function extension(path) {
		var index = path.lastIndexOf('.');
		if (index !== -1) return path.substring(index);
	}

	// 1
	function buildPath() {
		return normalize(Array.prototype.join.call(arguments, '/'));
	}

	// 1
	function normalize(path) {
		path = path.split('/');

		for (var i = 0; i < path.length; ++i) {
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
