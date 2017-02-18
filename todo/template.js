(function (root, factory) {
	if (typeof exports === 'object') {
		module.exports = factory(root);
	} else if (typeof define === 'function' && define.amd) {
		define('Template', [], function () {
			return factory(root);
		});
	} else {
		root.Template = factory(root);
	}
}(this, function(window) {
	'use strict';

	var Template = function(template, options) {
			this.options = {
				// appendCallback: undefined
				splitter: '|##|',
			};
			init(this, options || {}, template);
		},
		init = function(_this, options, template) {
			for (var option in options) { // extend options
				_this.options[option] = options[option];
			}

			_this.template = {
				docFragment: document.createDocumentFragment(),
				fragment: document.createElement('div'),
				appendCallback: _this.options.appendCallback,
				timer: 0,
				render: sizzleTemplate(_this, template)
			};
			_this.helpers = {};
		},
		sizzler = /{{(?:#|>)(\w*)\s*(.*?)}}([\S\s]*?){{\/\1}}/g;

	Template.prototype = {
		render: function(data, appendCallback) {
			var template = this.template,
				fragment = template.fragment;

			appendCallback = appendCallback || template.appendCallback;
			fragment.innerHTML = template.render(data);
			appendCallback && this.lazy(template, function() {
				appendCallback(template.docFragment);
			});

			return template.docFragment.appendChild(fragment.children[0]);
		},
		registerHelper: function(name, fn) {
			this.helpers[name] = fn;
		},
		lazy: function(id, fn) {
			clearTimeout(id.timer);
			id.timer = setTimeout(fn, 0);
		}
	};

	return Template;

	function isArray(obj) {
		return Array.isArray && Array.isArray(obj) ||
			Object.prototype.toString.call(obj) === "[object Array]";
	}

	function replace(html, splitter) {
		var keys = [];

		html = html.replace(/\{\{(\w+)\}\}/g,
			function(all, $1) {
				keys.push($1);
				return splitter;
			}).split(splitter);

		return function fastReplace(data) {
			for (var n = 0, l = html.length, out = []; n < l; n++) {
				out.push(html[n]);
				data[keys[n]] && out.push(data[keys[n]]);
			}
			return out.join('');
		};
	}

	function loop(func, key) { // key???
		return function fastLoop(data) {
			if (isArray(data)) {
				for (var n = 0, l = data.length, outHTML = []; n < l; n++) {
					outHTML.push(func(data[n]));
				}
				return outHTML.join('');
			} else if (data[key]) {
				return func(data);
			}
		}
	}

	function sizzleTemplate(_this, html, recursion) {
		var out = [];
		var splitter = _this.options.splitter;
		var foo = [];
		var parts = html.replace(sizzler, function(all, $1, $2, $3) {
				var coll = $3.indexOf('{{#') !== -1 ?
						loop(sizzleTemplate(_this, $3, true), $1) :
						loop(replace($3, splitter), $1);

				out.push(function collector(data) {
					return coll(typeof data[$1] === 'object' ? data[$1] : data);
				});
				return splitter;
			}).split(splitter);

		for (var n = 0, l = parts.length; n < l; n++) {
			foo.push(replace(parts[n], splitter));
			out[n] && foo.push(out[n]);
		}

		return function executor(data) {
			for (var n = 0, l = foo.length, outHTML = []; n < l; n++) {
				outHTML.push(foo[n](data));
			}
			return outHTML.join('');
		}
	}
}));