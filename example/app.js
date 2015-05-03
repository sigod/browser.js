
var port = 3000;

var express = require('express');
var path = require('path');

var app = express();

app.use(express.logger('dev'));
app.use(app.router);
app.use(express.static(path.join(__dirname, 'resources')));

app.listen(port, function () {
	console.log('Express server listening on port ' + port);
});
