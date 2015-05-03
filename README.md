# browser.js

## example

index.html:
``` html
<!doctype html>
<html>
<head>
	<script src="/js/libs/browser.js" id="browserjs" data-base-url="/js/" data-main="app"></script>
</head>
<body></body>
</html>
```

js/app.js:
```js
var a = require('./a');

console.log(a.func());
```

js/a.js:
```js
var b = require('./b');

exports.func = function () {
	return b.func();
};
```

js/b.js:
```js
exports.func = function () {
	return 'b.func';
};
```
