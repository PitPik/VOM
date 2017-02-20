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
				splitter: '|##|'
			};
			init(this, options || {}, template);
		},
		init = function(_this, options, template) {
			for (var option in options) { // extend options
				_this.options[option] = options[option];
			}

			_this.helpers = {};
			_this.partials = _this.options.partials || {};
			_this.template = {
				docFragment: document.createDocumentFragment(),
				fragment: document.createElement('div'),
				appendCallback: _this.options.appendCallback,
				timer: 0,
				render: sizzleTemplate(_this, template) // pre-rendering
			};
		},
		sizzler = /{{#(\w*)\s*(.*?)}}([\S\s]*?){{\/\1}}/g;

	Template.prototype = {
		render: function(data, appendCallback) {
			var template = this.template,
				fragment = template.fragment;

			appendCallback = appendCallback || template.appendCallback;
			fragment.innerHTML = template.render(data);
			appendCallback && Template.lazy(template, function append() {
				appendCallback(template.docFragment);
			});

			return template.docFragment.appendChild(fragment.children[0]);
		},
		compile: function(template) {
			this.template.render = sizzleTemplate(this, template); // return??
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

	/* ------------- module functions  -------------- */

	function isArray(obj) {
		return Array.isArray && Array.isArray(obj) ||
			Object.prototype.toString.call(obj) === "[object Array]";
	}

	function variable(html, splitter) {
		var keys = [];

		html = html.replace(/\{\{(\w+)\}\}/g,
			function(all, $1) {
				keys.push($1);
				return splitter;
			}).split(splitter);

		return function fastReplace(data) {
			for (var n = 0, l = html.length, out = []; n < l; n++) {
				out.push(html[n]);
				data[keys[n]] !== false && out.push(data[keys[n]]);
			}
			return out.join('');
		};
	}

	function section(func, key) { // key
		return function fastLoop(data) {
			if (isArray(data)) {
				for (var n = 0, l = data.length, outHTML = []; n < l; n++) {
					outHTML.push(func(data[n]));
				}
				return outHTML.join('');
			} else if (data[key] !== false) {
				return func(data);
			}
		}
	}

	function sizzleTemplate(_this, html) {
		var partCollector = [];
		var splitter = _this.options.splitter;
		var output = [];
		var parts = html.replace(sizzler, function(all, $1, $2, $3) {
				var func = $3.match(/{{(#|^|!|>)\s*(.*?)}}/) || [];
				var part = // func[1] && func[1] === '>' && _this.partials[func[2]] ?
						// section(sizzleTemplate(_this, _this.partials[func[2]]), $1) :
						func[1] ?
						section(sizzleTemplate(_this, $3), $1) :
						section(variable($3, splitter), $1); // pre-render

				partCollector.push(function collector(data) {
					return part(typeof data[$1] === 'object' ? data[$1] : data);
				});
				return splitter;
			}).split(splitter);

		for (var n = 0, l = parts.length; n < l; n++) { // rearrange
			output.push(variable(parts[n], splitter));
			partCollector[n] && output.push(partCollector[n]);
		}

		return function executor(data) {
			for (var n = 0, l = output.length, outHTML = []; n < l; n++) {
				outHTML.push(output[n](data));
			}
			return outHTML.join('');
		}
	}
}));