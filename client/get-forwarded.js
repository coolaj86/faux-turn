(function () {
  'use strict';

  var ahr = require('ahr')
    , net = require('net')
    , config = require('./config')
    , remotePort
    , remoteUrl = 'http://' + config.remoteAddr + ':' + config.remoteWebPort
    ;

  ahr.http(remoteUrl, { username: config.username, password: config.password }).when(function (err, ahr, data) {
    var master
      , token = data.token
      ;

    remotePort = data.port;

    master = net.connect(remotePort, config.remoteAddr);
    master.on('connect', function () {
      master.write('{ "master": true, "token": "' + data.token + '"}');
    });
    master.on('data', function (chunk) {
      var customer
        , json
        ;

      try {
        json = JSON.parse(chunk.toString('utf8'));
      } catch(e) {
        json = {};
      }

      if (!json.cmd) {
        console.log('http://' + config.remoteAddr + ':' + json.port);
        if (!json.port) {
          console.log('badness', json, chunk.toString('utf8'));
        }
        return;
      }

      customer = net.connect(remotePort, config.remoteAddr);
      customer.on('connect', function () {
        var localServer
          ;

        customer.write('{ "token": "' + token + '" }');
        localServer = net.connect(config.localPort, 'localhost');
        customer.pipe(localServer);
        localServer.pipe(customer);
        customer.on('end', function () {
          console.log('customer disconnected');
        });
        localServer.on('end', function () {
          console.log('slave disconnected');
        });
      });
    });
    master.on('end', function () {
      console.log("[END] and that's that");
    });
  });
}());
