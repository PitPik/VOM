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
}(this, function TemplateFactory(window) {
	'use strict';

	var Template = function(template, options) {
			this.options = {
				appendCallback: undefined,
				partials: {},
				helpers: {},
				splitter: '|##|',
				doEscape: true,
				tags: ['{{', '}}']
			};
			init(this, options || {}, template);
		},
		init = function(_this, options, template) {
			for (var option in options) { // extend options
				_this.options[option] = options[option];
			}
			switchTags(_this, _this.options.tags);
			_this.helpers =  _this.options.helpers;
			_this.partials = _this.options.partials;
			_this.template = {
				docFragment: document.createDocumentFragment(),
				fragment: document.createElement('div'),
				appendCallback: _this.options.appendCallback,
				timer: 0,
				render: template && sizzleTemplate(_this, template)
			};
		},
		entityMap = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#39;',
			'/': '&#x2F;',
			'`': '&#x60;',
			'=': '&#x3D;'
		};

	Template.prototype = {
		render: function(data, appendCallback) {
			var tmpl = this.template;

			appendCallback = appendCallback || tmpl.appendCallback;
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
		unregisterHelper: function(name) {
			delete this.helpers[name];
		},
		registerPartial: function(name, html) {
			this.partials[name] = html;
		},
		unregisterPartial: function(name) {
			delete this.partials[name];
		},
		setTags: function(tags) {
			switchTags(this, tags);
		}
	};

	Template.lazy = function(obj, fn) {
		clearTimeout(obj.timer);
		obj.timer = setTimeout(fn, 0);
	}

	return Template;

	function escapeHtml(string) {
		return String(string).replace(/[&<>"'`=\/]/g, function escape(char) {
			return entityMap[char];
		});
	}

	function isArray(obj) {
		return Array.isArray && Array.isArray(obj) ||
			Object.prototype.toString.call(obj) === "[object Array]";
	}

	function switchTags(_this, tags) {
		var isDefault = tags[0] === '{{',
			_tags = isDefault ? ['{{2,3}', '}{2,3}'] : tags;

		_this.options.tags = tags; // or _tags??
		_this.variableRegExp = new RegExp(
			'(' + _tags[0] + ')([>!&=]\\s*)*([\\w<>%=\\s*]+)*' + _tags[1], 'g');
		_this.sectionRegExp = new RegExp(
			_tags[0] + '(#|\\^)(\\w*)\\s*(.*?)' + _tags[1] + '([\\S\\s]*?)' +
			_tags[0] + '\\/\\2' + _tags[1], 'g');
	}

	function findData(data, dataTree, key) {
		for (var n = dataTree.length; n--; ) {
			if (dataTree[n][key] !== undefined) {
				return dataTree[n][key];
			}
		}
	}

	function variable(_this, html) {
		var keys = [];

		html = html.replace(_this.variableRegExp,
			function(all, $1, $2, $3) {
				var isIgnore = $2 && ($2[0] === '!' || $2[0] === '='),
					isUnescape = !_this.options.doEscape ||
						$1 === '{{{' || $2 && $2[0] === '&',
					isPartial = $2 && $2[0] === '>';

				if (isIgnore) {
					return '';
				}
				keys.push(isPartial ?
					[sizzleTemplate(_this, _this.partials[$3])] :
					[$3, isUnescape]);
				return _this.options.splitter;
			}).split(_this.options.splitter);

		return function fastReplace(data, dataTree) {
			for (var n = 0, l = html.length, out = [], text = ''; n < l; n++) {
				out.push(html[n]);
				if (keys[n] !== undefined) {
					text = data[keys[n][0]] !== undefined ? data[keys[n][0]] :
						findData(data, dataTree, keys[n][0]); // walk up tree
					if (text === false) {
						continue;
					}
					text = typeof text === 'function' ? text(data, dataTree) :
						keys[n][0].name === 'executor' ?
						keys[n][0](data, dataTree) :
						text && (keys[n][1] ? text : escapeHtml(text));
					text && out.push(text); //  !== undefined
				}
			}
			return out.join('');
		};
	}

	function section(_this, func, key, negative) {
		return function fastLoop(data, dataTree) {
			var hasData = data[key] !== undefined;

			if (hasData && typeof data[key] === 'function') { // functions
				return data[key](data, func(data, dataTree), dataTree);
			} else if (_this.helpers[key]) { // helpers
				return _this.helpers[key](data, func(data, dataTree), dataTree);
			} else if (isArray(data) && data.length) { // array
				for (var n = 0, l = data.length, out = []; n < l; n++) {
					out.push(func(data[n], dataTree));
				}
				return out.join('');
			} else if (negative && !hasData) { // not (^)
				return func(data, dataTree);
			} else if (!negative && hasData && data[key] !== false) { // data
				return func(data, dataTree);
			}
		}
	}

	function sizzleTemplate(_this, html) {
		var partCollector = [],
			output = [],
			sizzler = _this.sectionRegExp,
			parts = html.replace(sizzler, function(all, $1, $2, $3, $4) {
				var part = new RegExp(_this.options.tags[0] + '#').test($4) ?
						section(_this, sizzleTemplate(_this, $4), $2) :
						section(_this, variable(_this, $4), $2, $1 === '^');

				partCollector.push(function collector(data, dataTree) {
					return part(typeof data[$2] === 'object' ? data[$2] : data,
						dataTree);
				});
				return _this.options.splitter;
			}).split(_this.options.splitter);

		for (var n = 0, l = parts.length; n < l; n++) { // rearrange
			output.push(variable(_this, parts[n]));
			partCollector[n] && output.push(partCollector[n]);
		}

		return function executor(data, dataTree) {
			for (var n = 0, l = output.length, out = []; n < l; n++) {
				out.push(output[n](data, dataTree || [data]));
			}
			return out.join('');
		}
	}
}));
