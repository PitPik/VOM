
# VOM (Virtual Object Model)

VOM is a tiny model controller (1.53KB). It can be used to either abstract element structure on a DOM page such as containers, widgets, form items, element groups, etc. to build complex apps or to just simply create a flat model and keep track of changes in this model and reflect them for example in a view.

The strong point of VOM is that it automatically registers changes in its model and can react on that. It is aware of depth of the model, just like in a DOM structure (so it has children with an index and parents) and therefore can be used for complex structures such as menu trees, categorical structures or for example CMS items on a page. VOM provides an API similar to the DOM-API (appendChild, replaceChild, insertBefore, ...) so it is quite easy to understand and to learn.

VOM can be used as a starting point for a MVC, MVVM or MV* library. It makes it easy to separate view from model from UI. VOM is also super fast as it is very simple and small.

VOM doesn't provide a rendering engine but makes it easy to delegate to such. See the [demo](http://dematte.at/VOM) to understand how VOM can help you to coordinate a model with a view and a UI and how persisting values can be realized.


## Usage

```javascript
<script type="text/javascript" src="VOM.js"></script>
<script type="text/javascript">
    var vom = new VOM([model], [options]);
</script>
```
A model may be passed (Array) but can also be left out (or null) as elements can be added after initialisation.
The options are also optional as all possible options have a default value.

## Model

```javascript
[{
    foo: 'bar',
    id: 'id-01'
}, ...]
```
The model is an Array of Objects (can be seen as the children of a DOM's document.body) where each element could have ```childNodes``` (optional name) defined. The childNodes would also be an array of further Objects;
After initialisation of the model, it is then enriched with ```parentNode``` which points to its parent, ```id``` (or whatever ```options.idProperty``` is defining) that gives the element a unique id and ```index``` which is readable only and points to the index of the parent's childNodes (its own position compared to its siblings). In a real DOM there would not be an ```index```, only previousSibling, nextSibling... but I think it is clear what it does.

```javascript
[{
    foo: 'bar',
    id: 'id-01', // read only if not yet in model
    index: (...), // dynamic, read only
    parentNode: (...) // dynamic
}, ...]
```
```parentNode``` automatically has a property ```childNodes``` (defined by ```options.childNodes```) as it could otherwhise not hold this element.

A more complex model could look like this:
```javascript
[{
    foo: 'bar',
    childNodes: [{
        foo: 'no bar'
    }]
}, ...]
```
...and this is actually the main reason for this component. You can control complex and deep JSON structures and use them just like a DOM tree but then in a more abstract and simpler way. The following model might be for a menu tree:
```javascript
[{
    text: 'Root item 0',
    someAttribute: 'foo',
    isOpen: true,
    childNodes: [{
        text: 'Item 0-0',
    }, {
        text: 'Item 0-1',
        isOpen: false,
        childNodes: [{
            text: 'Item 0-1-0',
        }, {
            text: 'Item 0-1-1',
            isOpen: false,
            childNodes: [{
                text: 'Item 0-1-1-0',
            }, {
                text: 'Item 0-1-1-1',
            }]
        }, {
            text: 'Item 0-1-2',
        }]
    }, {
        text: 'Item 0-2',
        isOpen: false,
        childNodes: [{
            text: 'Item 0-2-0',
        }]
    }, {
        text: 'Item 0-3',
    }]
}, {
    text: 'Root item 1',
    isOpen: false,
    childNodes: [{
        id: '1-0',
        text: 'Item 1-0',
    }, ...]
}, ...];
```
Combined with ```options.enhanceMap['text', 'isOpen']``` This will end up in a model like:
```javascript
[{
    text: (...), // 'Root item 0',
    id: 0,
    index: (...), // 0
    parentNode: (...), // Object
    someAttribute: 'foo',
    isOpen: (...), // true,
    childNodes: [{
        text: (...), // 'Item 0-0',
        id: 1,
        index: (...), // 0
        parentNode: (...) // Object
    }, {...
```

## Options
On initialisation you can add some options. All predefinitions are shown as followed.

```javascript
parentCheck: false,
// parentCheck adds a check if methods like appendChild actually make sense as there could be a parent
// be appended to its own child... and throws then an error.

idProperty: 'id',
// the key of how the id should be stored in the model ('uuid', ...)

setterCallback: function(property, item, value, oldValue) {},
// This is actually the key callback that makes VOM so valuable and convenient to be used.
// All properties in the model that have been enhanced by being defined in options.enhanceMap,
// through options.enhanceAll or defined by its reserved key word 'parentNode', if changed, will
// trigger this callback to be called. removeChild() also triggers the setterCallback.
// property could be parentNode (on all manipulation methods like appendChild, ...) or removeChild
// or the key from options.enhanceMap. In case options.enhanceAll is set to true, all properties in
// the model being changed in the model would trigger this function and deliver its name in property.
// item is the model part being modified, so value could also be taken from item[property].
// oldValue is the value of item[property] before it was manipulated. So, in case there was an invalide
// value set, you can react on it with either setting it back to old value or returning true, which also
// sets the value back and console.logs a message.

enhanceMap: [],
// as described above, this is an Array of Strings that hold the keys of the model that should trigger
// setterCallback() when its value was changed
// Wildcards '*' can be used in root or in more complex structures like foo.bar.* or foo.*.value

childNodes: 'childNodes',
// Defines the key name given for child elements

enrichModelCallback: function(item) {},
// right after an element was enhanced this callback is called and provides its data (item / model)
// for inspection or manipulation, etc. It might be a good idea to set a reference to a real
// DOM element for future convenience like with getElementsByProperty('element', element); if
// any rendering is involved...
// NOTE: items don't get enriched if there is a propery parentNode present

preRecursionCallback: function(item) {},
// same as above but it will be called before the childNodes are processed.

throwErrors: false
// there are some checks in VOM that might call console.warn if something went wrong.
// If throwErrors is set to true, there would be an error thrown instead of just a console.warn
```

## API

```javascript
getElementById(id); // id: String
// returns an element defined by its id if found in model

getElementsByProperty([property], [value]); // property: String, value: Any
// returns an Array of elements that match with the value of its property.
// value could be a string but also a DOM Element or anything else.
// property string can also point to a deeper element: foo.bar.value
// if value and property is undefined, the method will return all items
// if value === undefined, the method returns all items that have a property defined by property

insertBefore(item, sibling); // item, sibling: model element (Object)
// inserts an existing or new item to the model just before the defined sibling.
// New items will be enhanced automatically
// returns the (new) item

insertAfter(item, sibling); // item, sibling: model element (Object)
// inserts an existing or new item to the model just after the defined sibling.
// New items will be enhanced automatically
// returns the (new) item

appendChild(item, [parent]); // item, parent: model element (Object)
// inserts an existing or new item to the model at the end of parent's children Array.
// childNodes property will be created automatically to parent if it doesn't exist.
// New items will be enhanced automatically
// If there is no parent specified, element will be appended to root
// returns the (new) item

prependChild(item, [parent]); // item, parent: model element (Object)
// inserts an existing or new item to the model at the beginning of parent's children Array.
// childNodes property will be created automatically to parent if it doesn't exist.
// New items will be enhanced automatically
// If there is no parent specified, element will be prepended to root
// returns the (new) item

replaceChild(newItem, item); // newItem, item: model element (Object)
// replaces and existing item in the model with another existing or new item.
// New items will be enhanced automatically
// returns the (new) item

removeChild(item); // item: model element (Object)
// Removes an existing item from the model.
// Does NOT automatically remove the childNodes preoperty from its parent element
// returns the item

reinforceProperty(model, item, value, [enumarable]) //
// sets a property as enumerable: false or as set, configurable: false, writable: false.
// convenient for storing items that don't belong to the model. JSON.strigify 
// can then better deal with the model...

destroy()
// Removes all items from the model and cleans up internal models for garbage collection.
```

'Enhancement' means that all properties that are defined in ```options.enhanceMap``` will be handled in setterCallback. It also means that the ```id``` will be given automatically if not defined in the model and also be set to readonly, ```parentElement``` will be set automatically and be handled in ```setterCallback``` and finally ```index``` will be added to the model to determine the position of the element compared to its siblings.

```childNodes``` doesn't have to be set initially if there are no child nodes, but it will be set automatically if methods like ```appendChild()``` or ```prependChild()``` were called and there were no previous child nodes present in its parent.

All methods are scoped with the instance: ```this``` === instance_of_VOM

## Little example
```javascript
var model = [{
    foo: 'bar'
}];

var vom = new VOM(model, {
    enhanceMap: ['foo'],
    setterCallback: function(property, object, value, oldValue) {
        if (property === 'foo') {
            console.log("'foo' was changed from '" + oldValue + "' to '" + value + "'");
        }
    }
});

vom.model[0].foo = 'new bar' // console: 'foo' was changed from 'bar' to 'new bar'
```

## Missing properties

There are some properties like ```previousSibling```, etc... missing that exist in a real DOM environment. Those are actually not necessary as it is quite easy to find elements in the model:

### previousSibling
```javascript
var previousSibling = item.parentNode.childNodes[item.index - 1];
```

### nextSibling
```javascript
var nextSibling = item.parentNode.childNodes[item.index + 1];
```

### firstChild
```javascript
var firstChild = item.childNodes[0];
```

### lastChild
```javascript
var lastChild = item.childNodes[item.childNodes.length - 1];
```
