
# VOM (Virtual Object Model)

VOM is a tiny model controller (1.29KB). It can be used to either abstract items on a DOM page such as containers, widgets, form items, element groups, etc. or to just simply create a flat model and keep track of changes in this model and reflect them for example in a view.
The strong point of VOM is that it automatically registers changes in its model and can react on that. It is aware of depth of the model, just like in a DOM structure (so it has children with an index and parents) and therefore can be used for complex structures such as menu trees, categorical structures or for example CMS items on a page. VOM provides an API similar to the DOM-API (appendChild, replaceChild, insertBefore, ...) so it is quite easy to understand and to learn.
VOM can be used as a starting point for a MVC, MVVM or MV* library. It makes it easy to separate view from model from UI. VOM is also super fast as it is very simple and small.
VOM doesn't provide a rendering engine but makes it easy to delegate to such. See the demo to understand how VOM can help you to coordinate a model with a view and a UI and how persisting values can be realized.


## Usage

```javascript
<script type="text/javascript" src="VOM.js"></script>
<script type="text/javascript">
    var vom = new VOM([model], [options]);
</script>
```
A model may be passed (Array) but can also be left out (or null) as elements can be added after initialisation.
The options are also optional as all possible options have a default value.

##Model

```javascript
[{
    foo: 'bar',
    id: 'id-01'
}, ...]
```
The model is an Array of Objects (can be seen as the children of a DOM's document.body) where each element could have ```childNodes``` defined. The childNodes would also be an array of further Objects (so called elements or items);
After initialisation of the model, it is then enriched with ```parentNode``` which points to its parent, ```id``` (or whatever ```options.idProperty``` is defining) that gives the element a unique id and ```index``` which is readable only and points to the index of the parent's childNodes (its own position compared to its siblings). In a real DOM there would not be an ```index```, only previousSibling, nextSibling... but I think it is clear what it does.

```javascript
[{
    foo: 'bar',
    id: 'id-01', // read only
    index: (...), // dynamic, read only
    parentNode: (...) // dynamic
}, ...]
```
```parentNode``` automatically has a property ```childNodes``` as it could otherwhise not hold this element.

A more complex model could look like this:
```javascript
[{
    foo: 'bar',
    childNodes: [{
        foo: 'no bar'
    }]
}, ...]
```

##Options
On initialisation you can add some options. All predefinitions are shown as followed.

```javascript
parentCheck: false,
// parentCheck adds a check if methods like appendChild actually make sense as there could be a parent
// be appended to its own child... and throws then an error.

idProperty: 'id',
// the key of how the id should be stored in the model ('uuid', ...)

setterCallback: function(property, object, value, oldValue) {},
// This is actually the key callback that makes VOM so valuable and convenient to be used.
// All properties in the model that have been enhanced by being defined in options.enhanceMap,
// through options.enhanceAll or defined by its reserved key word 'parentNode', if changed, will
// trigger this callback to be called. removeChild() also triggers the setterCallback.
// property could be parentNode (on all manipulation methods like appendChild, ...) or removeChild
// or the key from options.enhanceMap. In case options.enhanceAll is set to true, all properties in
// the model being changed in the model would trigger this function and deliver its name in property.
// object is the object being modified, so value could also be taken from object[property].
// oldValue is the value of object[property] before it was manipulated.

enhanceMap: [],
// as described above, this is an Array of Strings that hold the keys of the model that should trigger
// setterCallback() when its value was changed

enhanceAll: false,
// as described above (in enhanceMap), but this time for all properties in the model

enrichModelCallback: function(object) {},
// right after an element was enhanced this callback is called and provides its data (object)
// for inspection or manipulation, etc. It might be a good idea to set a reference to a real
// DOM element for future convenience like with getElementsByProperty('element', element); if
// any rendering is involved...
// NOTE: items don't get enriched if there is a propery parentNode present

throwErrors: false
// there are some checks in VOM that might call console.warn if something went wrong.
// If throwErrors is set to true, there would be an error thrown instead of just a console.warn
```

##API

```javascript
getElementById(id); // id: String
// returns an element defined by its id if found in model

getElementsByProperty(property, value); // property: String, value: Any
// returns an Array of elements that match with the value of its property.
// value could be a string but also a DOM Element or anything else.

insetBefore(item, sibling); // item, sibling: model element (Object)
// inserts an existing or new item to the model just before the defined sibling.
// New items will be enhanced automatically
// returns the (new) item

insetAfter(item, sibling); // item, sibling: model element (Object)
// inserts an existing or new item to the model just after the defined sibling.
// New items will be enhanced automatically
// returns the (new) item

appendChild(item, parent); // item, parent: model element (Object)
// inserts an existing or new item to the model at the end of parent's children Array.
// New items will be enhanced automatically
// returns the (new) item

prependChild(item, parent); // item, parent: model element (Object)
// inserts an existing or new item to the model at the beginning of parent's children Array.
// New items will be enhanced automatically
// returns the (new) item

replaceChild(newItem, item); // newItem, item: model element (Object)
// replaces and existing item in the model with another existing or new item.
// New items will be enhanced automatically
// returns the (new) item

removeChild(item); // item: model element (Object)
// Removes an existing item from the model.
// returns the item

destroy()
// Removes all items from the model and cleans up internal models for garbage collection.
```

All methods are scoped with the instance: this === instance_of_VOM

##Little example
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

##Missing properties

There are some properties like ```previousSibling```, etc... missing that exist in a real DOM environment. Those are actually not necessary as it is quite easy to find elements in the model:

###previousSibling
```javascript
var previousSibling = item.parentNode.childNodes[item.index - 1];
```

###nextSibling
```javascript
var nextSibling = item.parentNode.childNodes[item.index + 1];
```

###firstChild
```javascript
var firstChild = item.childNodes[0];
```

###lastChild
```javascript
var lastChild = item.childNodes[item.childNodes.length - 1];
```
