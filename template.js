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

	var funcs = {
			each: function each(data, vars, html) {
				var out = []; console.log(data, vars, html)

				for (var n = 0, l = (data[vars] || []).length; n < l; n++) {
					out.push(replace(data[vars][n], html));
				}
				return out.join('');
			}
		};

	function render(template, data, appendFn) {
		template = template.templateData || (template.templateData = {
			docFragment: document.createDocumentFragment(),
			fragment: document.createElement('div'),
			innerHTML: template.innerHTML,
			appendFn: appendFn,
			timer: 0,
			sizzles: sizzleTemplate(data, template.innerHTML)
		});
		if (!data) { // only template preperation with sizzleTemplate();
			return template;
		}
		template.fragment.innerHTML = renderTemplate(template.sizzles, data) ;

		clearTimeout(template.timer);
		template.timer = setTimeout(function() {
			template.appendFn(template.docFragment);
		}, 0);
		return template.docFragment.appendChild(template.fragment.children[0]);
	}

	function replace(data, html) {
		return html.replace(/\{\{(\w+)\}\}/g,
			function(all, $1) {
				return data[$1] !== undefined ? data[$1] : '';
			});
	}

	function func(what, data, vars, html) {
		return funcs[what](data, vars, html);
	}

	function sizzleTemplate(data, html) { // recursion??
		var funcs = [];
		var parts = html.replace(/\{\{\#(\w*)\s*(.*?)\}\}(.*?)\{\{\/\1\}\}/g,
				function(all, $1, $2, $3) {
					funcs.push($2 ? function(data) {
							return func($1, data, $2, $3);
						} : function(data) {
							return data[$1] ? replace(data, $3) : '';
						});
					return '|**|';
				}).split('|**|');

		return {
			html: parts,
			funcs: funcs
		};
	}

	function renderTemplate(template, data) {
		var out = [];
		for (var n = 0, l = template.html.length; n < l; n ++) {
			out.push(template.html[n].replace(/\{\{(\w+)\}\}/g,
					function(all, $1) {
						return data[$1] !== undefined ? data[$1] : '';
				}));
			out.push(template.funcs[n] ? template.funcs[n](data) : '');
		}
		return out.join('');
	}

	return {
		render: render,
		registerHelper: function(name, fn) {
			funcs[name] = fn;
		}
	}
}));