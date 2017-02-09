(function(window, undefined) {
	'use strict';

	// TODO: debounce(toggleAll, render..);

	var	// --- app view elements
		appElm = document.querySelector('section.todoapp'),
		todoCountElm = appElm.querySelector('.todo-count'),
		todoListElm = appElm.querySelector('ul.todo-list'),
		filterElms = appElm.querySelectorAll('.filters a'),
		toggleAllElm = appElm.querySelector('.toggle-all'),
		clearElm = appElm.querySelector('.clear-completed'),
		mainElm = appElm.querySelector('.main'),
		footerElm = appElm.querySelector('.footer'),
		input = appElm.querySelector('.new-todo'),
		template = document.querySelector('#item-template'),
		
		// --- some helpers
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

		// --- model for list of todos
		list = new VOM(getTodoList(), {
			enhanceMap: ['text', 'done'],
			setterCallback: function(property, object, value, oldValue) {
				listCallbacks[property](property, object, value, oldValue);
				setTodoList(object);
			},
			enrichModelCallback(object) { // as soon as new model comes in
				var element = addViewItem(object, todoListElm, template);
				// cacheing elements helps finding things faster later on
				this.reinforceProperty(object, 'viewElms', {
					element: element,
					label: element.querySelector('label'),
					input: element.querySelector('.edit'),
					toggle: element.querySelector('.toggle')
				});
			}
		}),
		listCallbacks = {}, // defined later on

		// --- model for ui / app view
		todoLength = list.getElementsByProperty('done', false).length,
		countAllLength = list.getElementsByProperty('done').length,
		uiModel = [{
			countAll: countAllLength,
			todo: todoLength,
			toggleAll: !todoLength && !!countAllLength,
			filter: getFilter(location.href),
			viewElms: { // cache elements
				toggleAllElm: toggleAllElm,
				clearElm: clearElm,
				todoCountElm: todoCountElm,
				filterElms: filterElms,
				filterallElm: filterElms[0],
				filteractiveElm: filterElms[1],
				filtercompletedElm: filterElms[2],
				footerElm: footerElm,
				mainElm: mainElm,
				appElm: appElm
			}
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
			editViewItem(object.viewElms.input, object.viewElms.label, value);
		},
		done: function (property, object, value, oldValue) {
			setDeltaUI('todo', (value ? -1 : 1));
			setDeltaUI('countAll', 0); // triggers rendering...
			if (ui.model[0].toggleAll !== !ui.model[0].todo) { // avoid flood
				ui.model[0].toggleAll = !ui.model[0].todo;
			}
			markViewItem(object.viewElms.element, object.viewElms.toggle, value);
		},
		parentNode: function (property, object, value, oldValue) { // add new
			setDeltaUI('todo', 1);
			setDeltaUI('countAll', 1);
			ui.model[0].toggleAll = false;
		},
		removeChild: function (property, object, value, oldValue) {
			removeViewItem(object.viewElms.element);
			if (!object.done) {
				setDeltaUI('todo', -1);
			}
			setDeltaUI('countAll', -1);
			ui.model[0].toggleAll = !ui.model[0].todo && !!ui.model[0].countAll;
		}
	},
	uiCallbacks = {
		filter: function (property, object, value, oldValue) {
			filterCallback(object.viewElms, object.viewElms[property + value + 'Elm'], value);
		},
		countAll: function (property, object, value, oldValue) {
			countAllCallback(object.viewElms, value !== ui.model[0].todo, value);
		},
		todo: function (property, object, value, oldValue) {
			todoCallback(object.viewElms.todoCountElm, value);
		},
		toggleAll: function (property, object, value, oldValue) {
			toggleAllCallback(object.viewElms.toggleAllElm, value);
		}
	};


	// --- INIT UI: setting the value to what is was, triggers callbacks...
	for (var key in ui.options.enhanceMap) {
		ui.model[0][key] = ui.model[0][key];
	}


	// --- UI: doesn't know about view, only about models
	appElm.addEventListener('click', function(e) {
		var target = e.target,
			items = [],
			uiItem = ui.model[0];

		if (target.href) { // filters
			uiItem.filter = getFilter(target.href);
		} else if (target.classList.contains('destroy')) { // delete item
			list.removeChild(getListItem(target));
		} else if (target === uiItem.viewElms.clearElm) { // delete all done
			items = list.getElementsByProperty('done', true);
			for (var n = items.length; n--; ) {
				list.removeChild(items[n]);
			}
		} else if (target.classList.contains('toggle')) { // toggle item
			getListItem(target).done = target.checked;
		} else if (target.classList.contains('toggle-all')) { // toggle all
			items = list.getElementsByProperty('done', !target.checked);
			for (var n = items.length; n--; ) {
				items[n].done = target.checked;
			}
		}
	});

	appElm.addEventListener('dblclick', function(e) {
		var item = getListItem(e.target);

		if (item && e.target === item.viewElms.label) { // prepare edit mode
			editViewItem(item.viewElms.input);
		}
	});

	appElm.addEventListener('blur', function(e) { // remove edit mode
		var item = getListItem(e.target);

		if (item && item.viewElms.input === e.target) {
			item.text = e.target.value;
		}
	}, true);

	appElm.addEventListener('keypress', function(e) {
		var text = e.target.value.replace(/(?:^\s+|\s+$)/, ''),
			editItem;

		if(text && (e.which === 13 || e.keyCode === 13)) {
			if(e.target === input) { // new item
				list.appendChild({
					text: text,
					done: false
				});
				e.target.value = '';
			} else if (editItem = getListItem(e.target)) { // edit existing
				editItem.text = text;
			}
		}
	});


	// --- list view: all functions referenced inside list model
	// no external element references (all variables inside scope)
	function addViewItem(item, todoListElm, template) {
		addViewItem.docFragment = addViewItem.docFragment || document.createDocumentFragment(),
		addViewItem.fragment = addViewItem.fragment || document.createElement('div'),
		addViewItem.template =  addViewItem.template || template.innerHTML;

		addViewItem.fragment.innerHTML = addViewItem.template
			.replace('{{id}}', item.id)
			.replace(/{{text}}/g, item.text)
			.replace('{{completed}}', item.done ? ' completed' : '')
			.replace('{{toggled}}', item.done ? ' checked=""' : '');
		
		lazy(function() {
			todoListElm.appendChild(addViewItem.docFragment);
		}, 'addViewItem');

		return addViewItem.docFragment.appendChild(addViewItem.fragment.children[0]);
	}

	function removeViewItem(elm) {
		elm.parentNode.removeChild(elm);
	}

	function editViewItem(input, label, text) { // TODO: follow guides: .editing; ESC; empty -> destroy
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
	// no external element references (all variables inside scope)
	function todoCallback(elm, count) {
		lazy(function() {
			elm.innerHTML = '<strong>' + count + '</strong> item' +
				(count === 1 ? '' : 's') + ' left';
		}, 'todoCallback');
	}

	function filterCallback(viewElms, link, value) {
		var elms = viewElms.filterElms;

		for (var n = elms.length; n--; ) {
			elms[n].classList.remove('selected'); // TODO: class name optional
		}
		link.classList.add('selected');
		viewElms.appElm.classList.remove('all', 'completed', 'active');
		viewElms.appElm.classList.add(value);
	}

	function countAllCallback(viewElms, toggle, countAll) {
		lazy(function() {
			viewElms.clearElm.style.display = toggle ? '' : 'none';
			viewElms.footerElm.style.display = countAll ? '' : 'none';
			viewElms.mainElm.style.display = countAll ? '' : 'none';
		}, 'countAllCallback');
	}

	function toggleAllCallback(elm, value) {
		elm.checked = value;
	}


	// --- local storage helper functions
	function getTodoList() {
		return storage('todo-vom', 'list', 'model') || [];
	}

	function setTodoList(data) {
		lazy(function() { // lazy data save as we save the whole..
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
		clearTimeout(lazy[name]);
		lazy[name] = setTimeout(fn, 0);
	}

})(window);
