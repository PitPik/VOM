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
				appendCallback: undefined,
				partials: {},
				helpers: {},
				splitter: '|##|'
			};
			init(this, options || {}, template);
		},
		init = function(_this, options, template) {
			for (var option in options) { // extend options
				_this.options[option] = options[option];
			}
			_this.helpers =  _this.options.helpers;
			_this.partials = _this.options.partials;
			_this.template = {
				docFragment: document.createDocumentFragment(),
				fragment: document.createElement('div'),
				appendCallback: _this.options.appendCallback,
				timer: 0,
				render: sizzleTemplate(_this, template) // pre-rendering
			};
		},
		sizzler = /{{(#|\^)(\w*)\s*(.*?)}}([\S\s]*?){{\/\2}}/g;

	Template.prototype = {
		render: function(data, appendCallback) {
			var tmpl = this.template;

			appendCallback = appendCallback || tmpl.appendCallback;
			tmpl.fragment.innerHTML = tmpl.render(data);
			appendCallback && Template.lazy(tmpl, function append() {
				appendCallback(tmpl.docFragment);
			});

			return tmpl.docFragment.appendChild(tmpl.fragment.children[0]);
		},
		compile: function(template) {
			this.template.render = sizzleTemplate(this, template);
		},
		template: function(data) {
			return this.template.render(data);
		},
		registerHelper: function(name, fn) {
			this.helpers[name] = fn;
		},
		unregisterHelper: function(argument) {
			delete this.helpers[name];
		},
		registerPartial: function(name, html) {
			this.partials[name] = html;
		},
		unregisterPartial: function(name) {
			delete this.partials[name];
		}
	};

	Template.lazy = function(obj, fn) {
		clearTimeout(obj.timer);
		obj.timer = setTimeout(fn, 0);
	}

	return Template;

	function isArray(obj) {
		return Array.isArray && Array.isArray(obj) ||
			Object.prototype.toString.call(obj) === "[object Array]";
	}

	function variable(_this, html) {
		var keys = [];

		html = html.replace(/{{([>!]\s*)*(\w+\s*)*}}/g,
			function(all, $1, $2) {
				if ($1 && $1[0] === '!') {
					return '';
				}
				keys.push($1 ? sizzleTemplate(_this, _this.partials[$2]) : $2);
				return _this.options.splitter;
			}).split(_this.options.splitter);

		return function fastReplace(data) {
			for (var n = 0, l = html.length, out = [], text = ''; n < l; n++) {
				out.push(html[n]);
				if (keys[n] !== undefined) {
					text = keys[n].name === 'executor' ?
						keys[n](data) : data[keys[n]];
					text !== false && out.push(text);
				}
			}
			return out.join('');
		};
	}

	function section(_this, func, key, negative) {
		return function fastLoop(data) {
			var hasData = data[key] !== undefined;

			if (_this.helpers[key]) { // helpers
				return _this.helpers[key](data, func(data));
			} else if (isArray(data)) { // array
				for (var n = 0, l = data.length, out = []; n < l; n++) {
					out.push(func(data[n]));
				}
				return out.join('');
			} else if (negative && !hasData) { // not (^)
				return func(data);
			} else if (!negative && hasData && data[key] !== false) { // data
				return func(data);
			}
		}
	}

	function sizzleTemplate(_this, html) {
		var partCollector = [];
		var output = [];
		var parts = html.replace(sizzler, function(all, $1, $2, $3, $4) {
				var part = $4.match('{{#') ?
						section(_this, sizzleTemplate(_this, $4), $2) :
						section(_this, variable(_this, $4), $2, $1 === '^');

				partCollector.push(function collector(data) {
					return part(typeof data[$2] === 'object' ? data[$2] : data);
				});
				return _this.options.splitter;
			}).split(_this.options.splitter);

		for (var n = 0, l = parts.length; n < l; n++) { // rearrange
			output.push(variable(_this, parts[n]));
			partCollector[n] && output.push(partCollector[n]);
		}

		return function executor(data) {
			for (var n = 0, l = output.length, out = []; n < l; n++) {
				out.push(output[n](data));
			}
			return out.join('');
		}
	}
}));