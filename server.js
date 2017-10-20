var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var yahooFinance = require('yahoo-finance');

var SYMBOLS = [
    'AMZN',
    'GOOGL'
];

var finalData = [];

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket) {
    console.log('a user connected');

    socket.on('search', function(msg) {
        finalData = [];
        //console.log('search: ' + msg);
        var symbol = msg.toUpperCase();

        var today = new Date().toISOString().slice(0, 10);
        var splited = today.split('-');
        splited[0] = splited[0] - 1;
        var yearAgo = splited.join('-');

        if (symbol && SYMBOLS.indexOf(symbol) === -1) SYMBOLS.push(symbol);

        if (SYMBOLS[0]) {
            yahooFinance.historical({
                symbols: SYMBOLS,
                from: yearAgo,
                to: today,
                period: 'd'
            }).then(function(result) {
                //console.log('result: ' + JSON.stringify(result));

                var i = 0;

                for (var prop in result) {
                    var data = [];

                    if (result[prop][0]) {
                        for (var row of result[prop]) {
                            data.push([new Date(row.date).getTime(), row.close]);
                        }
                        finalData.push({ name: prop, compare: "percent", data: data.reverse() });
                        i++;
                    }
                }

                if (finalData.length === SYMBOLS.length) {
                    io.emit('data', JSON.stringify(finalData));
                }
                else {
                    SYMBOLS.pop();
                    io.emit('search_err');
                }

            });
        }

    });

    socket.on('remove', function(name) {
        SYMBOLS.splice(SYMBOLS.indexOf(name), 1);
        //console.log("SYMBOLS => ", SYMBOLS);

        var j = 0;
        for (var stock of finalData) {
            if (stock.name === name) {
                finalData.splice(j, 1);
                io.emit('data', JSON.stringify(finalData));
            }
            j++;
        }
    });

    socket.on('disconnect', function() {
        console.log('user disconnected');
    });
});

//var port = 8080;
var port = 3000;
http.listen(port, function() {
    console.log('app listening on port: ' + port);
});
