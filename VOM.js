(function (root, factory) { // 5.97KB, 2.74KB, 1.21KB
	if (typeof exports === 'object') {
		module.exports = factory(root);
	} else if (typeof define === 'function' && define.amd) {
		define('VOM', [], function () {
			return factory(root);
		});
	} else {
		root.VOM = factory(root);
	}
}(this, function(window) {
	'use strict';

	var VOM = function(model, options) {
			this.options = {
				parentCheck: false,
				idProperty: 'id',
				setterCallback: function() {},
				enrichModelCallback: function() {},
				enhanceMap: [],
				enhanceAll: false,
				throwErrors: false
			};
			this.model = model || [];

			init(this, options || {});
		},
		init = function(_this, options) {
			var item = '',
				map = [];

			for (var option in options) { // extend options
				_this.options[option] = options[option];
			}
			map = _this.options.enhanceMap;
			while (item = map.shift()) {
				map[item] = true; // for faster lookup table than array
			}
			_this.model.root = {childNodes: _this.model};
			enrichModel(_this.model, _this);
		},
		NODES = {}, // node map for fast access
		id = 0,
		index = 'index';

	VOM.prototype = {
		getElementById: function(id) {
			return NODES[id];
		},
		getElementsByProperty: function(property, value, countOnly) {
			var result = [],
				count = 0;

			for (var id in NODES) {
				if (NODES[id][property] === value || null === value) {
					if (countOnly) {
						count++;
					} else {
						result.push(NODES[id]);
					}
				}
			}
			return countOnly ? count : result;
		},
		insetBefore: function(item, sibling) {
			return moveItem(this, item, sibling.parentNode, sibling.index);
		},
		insetAfter: function(item, sibling) {
			return moveItem(this, item, sibling.parentNode, sibling.index + 1);
		},
		appendChild: function(item, parent) {
			parent = parent || this.model.root;
			return moveItem(this, item, parent, getChildNodes(parent).length);
		},
		prependChild: function(item, parent) {
			return moveItem(this, item, parent || this.model.root, 0);
		},
		replaceChild: function(item, newItem) {
			var index = item.index,
				parentNode = item.parentNode;

			removeChild(this, item);
			return moveItem(this, newItem, parentNode, index);
		},
		removeChild: function(item) {
			removeChild(this, item);
			this.options.setterCallback.call(this, 'removeChild', item);
			return item;
		},
		destroy: function() {
			return destroy(this.options, this.model);
		}
	};

	/* ------------- module functions  -------------- */

	function destroy(options, items) { // only cleans up NODES
		for (var n = items.length; n--; ) {
			if (items[n].childNodes) {
				destroy(options, items[n].childNodes);
			}
			delete NODES[items[n][options.idProperty]];
			// delete items[n].parentNode; // for reuse...
			// delete items[n].index; // for reuse...
		}
		return items;
	};

	function indexOf(_this, item) {
		return (item.parentNode ? getChildNodes(item.parentNode) : _this.model)
			.indexOf(item);
	};

	function getChildNodes(item) { // adds array if necessary (appendChild)
		item.childNodes = item.childNodes || [];
		return item.childNodes;
	};

	function moveItem(_this, item, parent, index) {
		if (!item.parentNode) { // for convenience: append un-enhenced new items
			enrichModel([item], _this, parent);
		} else if (_this.options.parentCheck) {
			parentCheck(_this, item, parent);
		} // TODO: add more checks if allowed...

		if(item.parentNode === parent && index > item.index && item.index !== -1) {
			index--;
		}
		item = item.index !== -1 && item.parentNode &&
			removeChild(_this, item, true) || item;
		getChildNodes(parent).splice(index || 0, 0, item);
		item.parentNode = parent;
		return item;
	};

	function removeChild(_this, item, preserve) { // TODO: recursion
		!preserve && destroy(_this.options, [item]); // from lookup
		return getChildNodes(item.parentNode).splice(item.index, 1)[0] || item; // if new
	}

	function parentCheck(_this, item, parent) {
		var check = parent;

		if (item === parent) { // ???
			error('ERROR: can\'t move element inside itself', _this.options);
		}
		while (check = check.parentNode) {
			if (check === item) {
				error('ERROR: can\'t move parent inside it\'s own child', _this.options);
			}
		}
	};

	function enrichModel(model, _this, parent) {
		var options = _this.options,
			isNew = false,
			idProperty = _this.options.idProperty;

		for (var item = {}, n = 0, l = model.length; n < l; n++) {
			item = model[n];
			isNew = !item.parentNode;

			if (!item[idProperty]) {
				item[idProperty] = id++;
			}

			NODES[item[idProperty]] = item; // push to flat index model
			item.parentNode = parent || _this.model.root;
			// recursion
			item.childNodes && enrichModel(item.childNodes, _this, item);
			item.index = 0; // indexOf(_this, item);

			if (isNew) {
				item = enhanceModel(_this, item);
			}

			_this.options.enrichModelCallback.call(_this, item);
		}

		return model;
	}

	function enhanceModel(_this, model) {
		var cache = {}; // getter / setter value cache

		for (var item in model) {
			if (_this.options.enhanceAll || _this.options.enhanceMap[item] ||
					item === _this.options.idProperty ||
					item === 'parentNode' || item === index) { // 'childNodes'
				cache[item] = model[item]; // 'index' will never change
				defineProperty(item, model, cache, _this, index);
			}
		}

		return model;
	}

	function defineProperty(property, object, cache, _this, index) {
		return Object.defineProperty(object, property, {
			get: function() {
				return property === index ? indexOf(_this, object) : cache[property];
			},
			set: function(value, oldValue) {
				oldValue = cache[property]; // TODO: deep copy for real oldValue
				cache[property] = value;
				validate(property, object, value, oldValue, cache, _this, index);
				// return cache[property]; // might be old value
			}
		});
	}

	function validate(property, object, value, oldValue, cache, _this, index) {
		if (property === _this.options.idProperty || property === index ||
			_this.options.setterCallback.call(_this, property, object, value, oldValue)) {
				cache[property] = oldValue; // return if not allowed
				error('ERROR: Cannot set property \'' + property + '\' to \'' +
					value + '\'', _this.options);
		}
	}

	function error(txt, options) {
		if (!options.throwErrors && typeof window !== 'undefined' && window.console) {
			return console.warn ? console.warn(txt) : console.log(txt);
		}

		throw txt;
	}

	return VOM;
}));