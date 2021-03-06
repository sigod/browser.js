/*!
 * browser.js
 * https://github.com/sigod/browser.js
 */

;(function () {
	'use strict';

	// ---------------------------------------------------------------------------------------------------------------------

	window.require = require;

	var __path = '/';
	var cache = {};

	var tag = document.getElementById('browserjs');
	if (!tag) throw new Error('Cannot find browserjs tag');

	var base = tag.getAttribute('data-base-url');
	if (base) {
		if (base[base.length - 1] !== '/') base += '/';
		__path = base;
	}

	var main = tag.getAttribute('data-main');
	if (!main) throw new Error('data-main attribute is required');

	main = getId(__path, main);

	loadModule(main, true, function () {
		getModule(cache[main]);
	});

	// ---------------------------------------------------------------------------------------------------------------------

	function require(module_path) {
		var id = getId(__path, module_path);
		var cached = cache[id];

		if (!cached) {
			loadModule(id, false, function () {});
			cached = cache[id];
		}

		return getModule(cached);
	}

	function getModule(module) {
		if (module.error) throw new Error("Cannot find module '" + module.id + "'");

		if (module.func) {
			module.exports = module.func();
			delete module.func;
		}

		return module.exports;
	}

	require._define = function (id, func) {
		cache[id].func = deferred(invokeModule, id, func);
	};

	// ---------------------------------------------------------------------------------------------------------------------

	function invokeModule(path, module) {
		var pmodule = { exports: {} };

		var old_path = __path;
		__path = path;
		module.call(pmodule.exports, pmodule.exports, pmodule);
		__path = old_path;

		return pmodule.exports;
	}

	function processModule(path, func, callback) {
		var modules = [];

		parseRequires(func.toString())
			.forEach(function (module) {
				var resolved = getId(path, module);

				if (!cache[resolved]) modules.push(resolved);
			});

		if (!modules.length) return callback();

		var ncall = new NCall(modules.length, callback);

		modules.forEach(function (module) {
			loadModule(module, true, ncall.callback);
		});
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

			var script = document.createElement('script');
			script.text = ''
				+ 'require._define("' + id + '", function (exports, module) {'
				+ response.content
				+ '});';
			document.head.appendChild(script);

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
		var id = join(removeFilename(parent), module);
		var ext = getExtension(id);

		if (!ext) id += '.js';

		return id;
	}

	function removeFilename(path) {
		return path.substr(0, path.lastIndexOf('/') + 1);
	}

	function getExtension(path) {
		var index = path.lastIndexOf('.');
		if (index === -1) return null;

		return path.substring(index);
	}

	function join() {
		return normalize(Array.prototype.join.call(arguments, '/'));
	}

	function normalize(path) {
		var path = path.split('/');

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

	function deferred(func) {
		var args = Array.prototype.slice.call(arguments, 1);

		return function () {
			return func.apply(func, args);
		};
	}

	function NCall(number, callback) {
		this._number = number;
		this._number_called = 0;
		this._callback = callback;
		this.callback = this.callback.bind(this);
	}

	NCall.prototype.callback = function () {
		++this._number_called;

		if (this._number === this._number_called) {
			this._callback();
		}
	};

	// ---------------------------------------------------------------------------------------------------------------------
})();
