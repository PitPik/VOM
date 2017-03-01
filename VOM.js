(function (root, factory) {
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
				preChildrenCallback: function() {},
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

			NODES.push({}); // new access map for current instance
			reinforceProperty(_this, 'id', NODES.length - 1);

			for (var option in options) { // extend options
				_this.options[option] = options[option];
			}
			map = _this.options.enhanceMap;
			while (item = map.shift()) {
				map[item] = true; // for faster lookup table than array
			}
			reinforceProperty(_this.model, 'root', {childNodes: _this.model});
			enrichModel(_this.model, _this);
		},
		NODES = [], // node maps for fast access
		idCounter = 0, // item id counter (if items have no own id)
		strIndex = 'index',
		crawlObject = function(data, keys) {
			var n = 0;

			while (n < keys.length && (data = data[keys[n++]]));
			return data;
		};

	VOM.prototype = {
		getElementById: function(id) {
			return NODES[this.id][id];
		},
		getElementsByProperty: function(property, value) {
			var result = [],
				hasValue = undefined !== value,
				hasProperty = undefined !== property,
				keys = property.split('.'),
				propValue = null;

			for (var id in NODES[this.id]) {
				propValue = crawlObject(NODES[this.id][id], keys);
				if ((hasValue && propValue === value) ||
					(!hasValue && undefined !== propValue) ||
					(!hasValue && !hasProperty)) {
						result.push(NODES[this.id][id]);
				}
			}
			return result;
		},
		insertBefore: function(item, sibling) {
			return moveItem(this, item, sibling.parentNode, sibling.index);
		},
		insertAfter: function(item, sibling) {
			return moveItem(this, item, sibling.parentNode, sibling.index + 1);
		},
		appendChild: function(item, parent) {
			parent = parent || this.model.root;
			return moveItem(this, item, parent, getChildNodes(parent).length);
		},
		prependChild: function(item, parent) {
			return moveItem(this, item, parent || this.model.root, 0);
		},
		replaceChild: function(newItem, item) {
			var index = item.index,
				parentNode = item.parentNode;

			removeChild(this, item);
			moveItem(this, newItem, parentNode, index);
			return item;
		},
		removeChild: function(item) {
			removeChild(this, item);
			this.options.setterCallback.call(this, 'removeChild', item);
			return item;
		},
		reinforceProperty: reinforceProperty,
		destroy: function() {
			return destroy(this, this.model);
		}
	};

	/* ------------- module functions  -------------- */

	function destroy(_this, items) { // only cleans up NODES
		for (var n = items.length; n--; ) {
			if (items[n].childNodes) {
				destroy(_this.options, items[n].childNodes);
			}
			delete NODES[_this.id][items[n][_this.options.idProperty]];
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

	function removeChild(_this, item, preserve) {
		!preserve && destroy(_this, [item]);
		return getChildNodes(item.parentNode).splice(item.index, 1)[0] || item; // if new
	}

	function parentCheck(_this, item, parent) {
		var check = parent;

		if (item === parent) {
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
			hasOwnId = true,
			idProperty = _this.options.idProperty;

		for (var item = {}, n = 0, l = model.length; n < l; n++) {
			item = model[n];
			isNew = !item.parentNode;

			if (!item[idProperty]) {
				item[idProperty] = idCounter++;
				hasOwnId = false;
			}

			NODES[_this.id][item[idProperty]] = item; // push to flat index model
			item.parentNode = parent || _this.model.root;
			item.index = 0; // will be reset on get()
			if (isNew) {
				item = enhanceModel(_this, item, hasOwnId);
			}

			_this.options.preChildrenCallback.call(_this, item);
			// recursion
			item.childNodes && enrichModel(item.childNodes, _this, item);
			_this.options.enrichModelCallback.call(_this, item);
		}

		return model;
	}

	function enhanceModel(_this, model, ownProperty) {
		var cache = {}, // getter / setter value cache
			internalProperty = false;

		for (var item in model) {
			internalProperty = item === 'parentNode' || item === strIndex;

			if (item === _this.options.idProperty) {
				reinforceProperty(model, item, model[item], ownProperty);
			} else if (_this.options.enhanceAll || _this.options.enhanceMap[item] ||
					internalProperty) { // 'childNodes'
				cache[item] = model[item];

				defineProperty(item, model, cache, _this, strIndex, !internalProperty);
			}
		}

		return model;
	}

	function reinforceProperty(model, item, value, enumarable) {
		delete model[item]; // in case it is set already...
		return Object.defineProperty(model, item, {
			enumerable: !!enumarable,
			configurable: false,
			writable: false,
			value: value
		});
	}

	function defineProperty(property, object, cache, _this, strIndex, enumerable) {
		return Object.defineProperty(object, property, {
			get: function() {
				return property === strIndex ? indexOf(_this, object) : cache[property];
			},
			set: function(value) {
				var  oldValue = cache[property];

				cache[property] = value;
				validate(property, object, value, oldValue, cache, _this, strIndex);
			},
			enumerable: enumerable
		});
	}

	function validate(property, object, value, oldValue, cache, _this, strIndex) {
		if (property === _this.options.idProperty || property === strIndex ||
			_this.options.setterCallback.call(_this, property, object, value, oldValue)) {
				cache[property] = oldValue; // return value if not allowed
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