(function(window, undefined) {
	'use strict';

	// TODO: storage, selectAll, app storage, debounce(toggleAll, render..); toggleAll

	var // --- some helpers
		setDeltaUI = function(name, value) {
			return  ui.model[0][name] += value;
		},
		getListItem = function(elm) {
			var item = closest(elm, '[id]');

			return item ? list.getElementById(item.id) : null;
		},
		closest = function(element, selector, root) {
			return element && element.closest(selector);
		},
		getFilter = function(text) {
			return (text.split('#/')[1] || '').split('/')[0] || 'all';
		},
		
		// --- app view elements
		appElm = document.querySelector('section.todoapp'),
		todoCountElm = appElm.querySelector('.todo-count'),
		todoListElm = appElm.querySelector('ul.todo-list'),
		filterElms = appElm.querySelectorAll('.filters a'),
		toggleAllElm = appElm.querySelector('.toggle-all'),
		clearElm = appElm.querySelector('button.clear-completed'),
		mainElm = appElm.querySelector('.main'),
		footerElm = appElm.querySelector('.footer'),
		input = appElm.querySelector('.new-todo'),

		// --- model for list of todos
		list = new VOM(getTodoList(), {
			enhanceMap: ['text', 'done'],
			setterCallback: function(property, object, value, oldValue) {
				listCallbacks[property](property, object, value, oldValue);
				setTodoList(object, property === 'removeChild');
			},
			enrichModelCallback(object) { // as soon as new model comes in
				var addProp = this.reinforceProperty; // make invisible (JSON)
				// cacheing elements helps finding things faster later on
				addProp(object, 'element', addViewItem(object));
				addProp(object, 'label', object.element.querySelector('label'));
				addProp(object, 'input', object.element.querySelector('.edit'));
				addProp(object, 'toggle', object.element.querySelector('.toggle'));
			}
		}),
		listCallbacks = {}, // defined later on

		// --- model for ui / app view
		todoLength = list.getElementsByProperty('done', false).length,
		countAllLength = list.getElementsByProperty('done').length,
		uiModel = [{
			countAll: countAllLength,
			todo: todoLength,
			toggleAll: !todoLength && countAllLength,
			filter: getFilter(location.href),
			// cache elements
			toggleAllElm: toggleAllElm,
			clearElm: clearElm,
			todoCountElm: todoCountElm,
			filterElms: filterElms,
			filterallElm: filterElms[0],
			filteractiveElm: filterElms[1],
			filtercompletedElm: filterElms[2]
		}],
		ui = new VOM(uiModel, {
			enhanceMap: ['countAll', 'todo', 'filter', 'toggleAll'],
			setterCallback: function(property, object, value, oldValue) {
				uiCallbacks[property](property, object, value, oldValue);
			}
		}),
		uiCallbacks = {}; // defined later on
		// ---


	// --- this is, so to say, the controller part
	// --- knows about model(s) and view
	listCallbacks = {
		text: function (property, object, value, oldValue) {
			editViewItem(object.input, object.label, value);
		},
		done: function (property, object, value, oldValue) {
			setDeltaUI('todo', (value ? -1 : 1));
			setDeltaUI('countAll', 0); // triggers rendering...
			ui.model[0].toggleAll = !ui.model[0].todo;
			markViewItem(object.element, object.toggle, value);
		},
		parentNode: function (property, object, value, oldValue) { // add new
			setDeltaUI('todo', 1);
			setDeltaUI('countAll', 1);
			ui.model[0].toggleAll = false;
		},
		removeChild: function (property, object, value, oldValue) {
			removeViewItem(object.element);
			if (!object.done) {
				setDeltaUI('todo', -1);
			}
			setDeltaUI('countAll', -1);
			ui.model[0].toggleAll = !ui.model[0].todo && ui.model[0].countAll;
		}
	},
	uiCallbacks = {
		filter: function (property, object, value, oldValue) {
			filterCallback(object[property + value + 'Elm'],
				object.filterElms, value);
		},
		countAll: function (property, object, value, oldValue) {
			countAllCallback(value !== ui.model[0].todo, value);
		},
		todo: function (property, object, value, oldValue) {
			todoCallback(object.todoCountElm, value);
		},
		toggleAll: function (property, object, value, oldValue) {
			toggleAllCallback(object.toggleAllElm, value);
		}
	};


	// --- INIT UI: by setting the value to what is was, triggers callbacks...
	for (var key in ui.options.enhanceMap) {
		ui.model[0][key] = ui.model[0][key];
	}



	// --- UI: doesn't know about view, only about models
	appElm.addEventListener('click', function(e) {
		var target = e.target,
			show = '',
			items = [],
			checked = false,
			uiItem = ui.model[0];

		if (target.href) { // filters
			show = getFilter(target.href);
			if (ui.model[0].filter !== show) {
				uiItem.filter = show;
			}
		} else if (target.classList.contains('destroy')) { // delete item
			items = getListItem(target);
			list.model._romovedIndex = items.index;
			list.removeChild(items);
		} else if (target === clearElm) { // delete all done
			items = list.getElementsByProperty('done', true);

			for (var n = items.length; n--; ) {
				list.model._romovedIndex = items[n].index;
				list.removeChild(items[n]);
			}
		} else if (target.classList.contains('toggle')) { // toggle item
			getListItem(target).done = target.checked;
		} else if (target.classList.contains('toggle-all')) { // toggle all
			items = list.getElementsByProperty('done');
			checked = target.checked;

			for (var n = items.length; n--; ) {
				if (items[n].done !== checked) {
					items[n].done = checked;
				}
			}
			uiItem.todo = target.checked ? 0 : items.length;
		}
	});

	appElm.addEventListener('dblclick', function(e) {
		var item = getListItem(e.target);

		if (item && e.target === item.label) { // prepare edit mode
			editViewItem(item.input);
		}
	});

	appElm.addEventListener('blur', function(e) { // remove edit mode
		var item = getListItem(e.target);

		if (item && item.input === e.target) {
			item.text = e.target.value;
		}
	}, true);

	appElm.addEventListener('keypress', function(e) {
		var text = e.target.value.replace(/(?:^\s+|\s+$)/, ''),
			editItem;

		if(text && e.which === 13) {
			if(e.target === input) {
				list.appendChild({
					text: text,
					done: false
				});
				e.target.value = '';
			} else if (editItem = getListItem(e.target)) {
				editItem.text = text;
			}
		}
	});



	// --- list view: all functions referenced inside list model
	// no external references (all variables inside scope)
	function getTemplate() {
		return document.querySelector('#item-template').innerHTML;
	}

	function addViewItem(item) {
		var docFragment = addViewItem.docFragment = // cache for next time
				addViewItem.docFragment || document.createDocumentFragment(),
			fragment = addViewItem.fragment = // cache for next time
				addViewItem.fragment || document.createElement('div'),
			template = addViewItem.template = // cache for next time;
				addViewItem.template || getTemplate();

		fragment.innerHTML = template
			.replace('{{id}}', item.id)
			.replace(/{{text}}/g, item.text)
			.replace(/{{completed}}/, item.done ? ' completed' : '')
			.replace('{{toggled}}', item.done ? ' checked=""' : '');
		
		lazy(function() {
			todoListElm.appendChild(docFragment); // TODO: todoListElm
		}, 'addViewItem');

		return docFragment.appendChild(fragment.children[0]);
	}

	function removeViewItem(elm) {
		elm.parentNode.removeChild(elm);
	}

	function editViewItem(input, label, text) { // TODO: follow guids: .editing; ESC; empty -> destroy
		var style = '';

		if (label) {
			label.innerHTML = text;
		} else {
			style = 'block';
		}

		input.style.display = style;
		input.focus();
		input.selectionStart = input.selectionEnd = input.value.length;
	}

	function markViewItem(element, toggle, onOff) {
		element.classList.toggle('completed', onOff); // IE doesn't toggle
		toggle.checked = onOff; // double on single click...
	}



	// --- app view: all functions referenced inside list model
	// TODO: clean up element finding...
	function todoCallback(elm, count) {
		lazy(function() {
			elm.innerHTML = '<strong>' + count + '</strong> item' +
				(count === 1 ? '' : 's') + ' left';
		}, 'todoCallback');
	}

	function filterCallback(link, elms, value) {
		for (var n = elms.length; n--; ) { // TODO: cache
			elms[n].classList.remove('selected'); // TODO: class name optional
		}
		link.classList.add('selected');
		filterView(value);
	}

	function filterView(value) { // TODO: appElm; make changes on model level (is a rule)
		appElm.classList.remove('all', 'completed', 'active');
		appElm.classList.add(value);
	}

	function countAllCallback(toggle, countAll) { // TODO: clearElm, footerElm; optimize
		lazy(function() {
			clearElm.style.display = toggle ? '' : 'none';
			footerElm.style.display = countAll ? '' : 'none';
			mainElm.style.display = countAll ? '' : 'none';
		}, 'countAllCallback');
	}

	function toggleAllCallback(elm, value) {
		elm.checked = value;
	}



	// --- local storage helper functions
	function getTodoList() {
		return storage('todo-vom', 'list', 'model') || [];
	}

	function setTodoList(data, deleteItem) {
		lazy(function() {
			storage('todo-vom', 'list', 'model', list.model);
		}, 'setTodoList');
	}

	function storage(scope, component, type, value) {
		if (undefined === value) {
			return JSON.parse(localStorage.getItem(scope + '.' + component) || '[]');
		} else {
			localStorage.setItem(scope + '.' + component, JSON.stringify(value));
		}
	}

	function lazy(fn, name) {
		clearTimeout(lazy[name]); // lazy data save as we save the whole..
		lazy[name] = setTimeout(fn, 0);
	}

})(window);