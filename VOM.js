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
				preRecursionCallback: function() {},
				enhanceMap: [],
				childNodes: 'childNodes',
				throwErrors: false
			};
			this.model = model || [];

			init(this, options || {});
		},
		init = function(_this, options) {
			var item = '',
				rootItem = {};

			NODES.push({}); // new access map for current instance
			reinforceProperty(_this, 'id', NODES.length - 1);

			for (var option in options) { // extend options
				_this.options[option] = options[option];
			}
			while (item = _this.options.enhanceMap.shift()) {
				item = item.split('.');
				_this.options.enhanceMap[item[0]] = item;
			}
			rootItem[_this.options.childNodes] = _this.model;
			reinforceProperty(_this.model, 'root', rootItem);
			enrichModel(_this.model, _this);
		},
		NODES = [], // node maps for fast access
		idCounter = 0, // item id counter (if items have no own id)
		strIndex = 'index',
		crawlObject = function(data, keys, min) {
			var n = 0,
				length = keys.length - (min || 0);

			while (n < length && (data = data[keys[n++]]) !== undefined);
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
				keys = [],
				propValue = null;

			for (var id in NODES[this.id]) {
				propValue = undefined !== NODES[this.id][id][property] ?
					NODES[this.id][id][property] :
					crawlObject(NODES[this.id][id], (keys[0] ?
						keys : (keys = hasProperty && property.split('.'))));
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
			return moveItem(this, item, parent,
				getChildNodes(parent, this.options.childNodes).length);
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
		addProperty: function(property, item, path, readonly) {
			var cache = {};
			cache[path || property] = item[property];
			defineProperty(property, item, cache, this, strIndex, !readonly, path);
		},
		// getCleanModel: function() {
		// 	return JSON.parse(JSON.stringify(this.model));
		// },
		destroy: function() {
			return destroy(this, this.model);
		}
	};

	/* ------------- module functions  -------------- */

	function destroy(_this, items) { // only cleans up NODES
		for (var n = items.length; n--; ) {
			if (items[n][_this.options.childNodes]) {
				destroy(_this, items[n][_this.options.childNodes]);
			}
			delete NODES[_this.id][items[n][_this.options.idProperty]];
		}
		return items;
	};

	function indexOf(_this, item) {
		return (item.parentNode ? getChildNodes(item.parentNode,
			_this.options.childNodes) : _this.model).indexOf(item);
	};

	function getChildNodes(item, childNodes) { // adds array if necessary (appendChild)
		item[childNodes] = item[childNodes] || [];
		return item[childNodes];
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
		getChildNodes(parent, _this.options.childNodes).splice(index || 0, 0, item);
		item.parentNode = parent;
		return item;
	};

	function removeChild(_this, item, preserve) {
		!preserve && destroy(_this, [item]);
		return getChildNodes(item.parentNode, _this.options.childNodes)
			.splice(item.index, 1)[0] || item; // if new
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

			_this.options.preRecursionCallback.call(_this, item);
			// recursion
			item[_this.options.childNodes] &&
				enrichModel(item[_this.options.childNodes], _this, item);
			_this.options.enrichModelCallback.call(_this, item);
		}

		return model;
	}

	function enhanceModel(_this, model, ownProperty) {
		var internalProperty = false,
			enhanceMap = _this.options.enhanceMap,

			lastMapIdx = 0,
			wildcardPos = 0,
			path = '',
			_path = '',
			__item = '',
			longItem = '',
			_model = {},
			__model = {},
			pathArray = [];

		for (var item in model) {
			lastMapIdx = enhanceMap[item] && enhanceMap[item].length - 1;
			if (lastMapIdx) { // loop inside deep
				wildcardPos = enhanceMap[item].indexOf('*');
				_model = crawlObject(model, enhanceMap[item],
					wildcardPos > -1 ? lastMapIdx - wildcardPos + 1 : 1);
				longItem = enhanceMap[item].join('.');
				path = longItem.split('*')[1] || '';
				pathArray = path.split('.').splice(1);

				for (var _item in _model) {
					__model = !path ? _model : crawlObject(_model[_item], pathArray, 1);
					_path = longItem.replace('*', _item);
					__item = pathArray[pathArray.length - 1] || _item;
					_this.addProperty(__item, __model, _path);
				}
				continue;
			}
			internalProperty = item === 'parentNode' || item === strIndex;
			if (item === _this.options.idProperty) {
				reinforceProperty(model, item, model[item], ownProperty);
			} else if (enhanceMap[item] || enhanceMap['*'] &&
					enhanceMap.length === 1 || internalProperty) {
				_this.addProperty(item, model, null, internalProperty);
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

	function defineProperty(property, object, cache, _this, strIndex, enumerable, longItem) {
		return Object.defineProperty(object, property, {
			get: function() {
				return property === strIndex ?
					indexOf(_this, object) : cache[longItem || property];
			},
			set: function(value) {
				var  oldValue = cache[longItem || property];

				cache[longItem || property] = value;
				validate(longItem || property, object, value, oldValue, cache, _this, strIndex);
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
