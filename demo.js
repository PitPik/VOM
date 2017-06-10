(function(window) {
	'use strict';

	// ---------- INIT (get data from storage or create new model)
	let STORAGE_KEY = 'vom-demo',
		myStorage = {
			fetch: function () {
				return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
			},
			save: function (todos) {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
			}
		},
		data = []; //myStorage.fetch();

	if (!data.length) {
		data = [{ // create new item if none in storage
			clicks: 0,
			maxClicks: 10,
			foo: {
				foo: true,
				bar: false,
				bars: false,
				value: 'some value'
			},
			preferences: {
				foo: {
					value: 'foo'
				},
				bar: {
					value: 'bar'
				}
			},
			uaua: {
				foo: {
					value: {
						val: 'foo'
					}
				},
				bar: {
					value: {
						val: 'bar'
					}
				}
			}
		}];
	}

	// ---------- CREATE MODEL (instance)
	const demo = window.demo = new VOM(data, { // options
		enhanceMap: ['clicks', 'foo.*', 'preferences.*.value', 'uaua.*.value.val'], // what should we listen to in setterCallback...
		// Model callbacks should only call VIEW functions (passing data)
		// and data storage (sync to server... might also reflect in view).
		// return true means that new value is not excepted and therefore reset.
		setterCallback: (property, object, value, oldValue) => {console.log(property)
			switch (property) {
				case 'parentNode': // standard callback
					break;
				case 'removeChild': // standard callback
					removeButton(object.element);
					break;
				case 'clicks': // custom callback defined by enhanceMap
					// you might want to check value > item.maxClicks here...
					if (oldValue >= value) { // value may only increase...
						return true; // reset to old value
					} else { // call view function
						updateButton(object.element, value);
					}
					break;
			}
			myStorage.save(demo.model, property, object, value, oldValue); // save state of model
		},
		enrichModelCallback: function(object) {
			// store newly created element as reference in model for easy access later on
			this.reinforceProperty(object, 'element',
				createButton(document.body, object.clicks));
		}
	});

	// --------- UI (event handlers, interaction, etc.)
	document.body.addEventListener('click', e => {
		const item = demo.getElementsByProperty('element', e.target)[0];

		// UI only manipulates the model (no view known or involved here)
		if (item && item.clicks < item.maxClicks) {
			item.clicks += 1;
		} else if (item) { // only when clicked... manual manipulation not recognised
			demo.removeChild(item);
		}
	});

	// --------- VIEW (only)
	// View knows nothing abut UI or model. It only manipulates elements that
	// it is told to manipulate with data it is passed to.
	function createButton(parentElement, data) {
		const button = document.createElement('button');

		updateButton(button, data);
		return parentElement.appendChild(button);
	}

	function updateButton(element, data) {
		element.textContent = 'clicks: ' + data;
	}

	function removeButton(element) {
		element.parentNode.removeChild(element);
	}
})(this);