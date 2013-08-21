(function () {
  'use strict';

  var ahr = require('ahr')
    , net = require('net')
    , config = require('./config')
    , remotePort
    , remoteUrl = 'http://' + config.remoteAddr + ':' + config.remoteWebPort
    ;

  ahr.http(remoteUrl, { username: config.username, password: config.password }).when(function (err, ahr, data) {
    var socket
      , token = data.token
      ;

    remotePort = data.port;

    socket = net.connect(remotePort, config.remoteAddr);
    socket.on('connect', function () {
      socket.write('{ "master": true, "token": "' + data.token + '"}');
    });
    socket.on('data', function (chunk) {
      var customer
        , server
        , data
        ;

      try {
        data = JSON.parse(chunk.toString('utf8'));
      } catch(e) {
        data = {};
      }

      if (!data.cmd) {
        console.log('http://' + config.remoteAddr + ':' + data.port);
        return;
      }

      customer = net.connect(remotePort, config.remoteAddr);
      customer.on('connect', function () {
        customer.write('{ "token": "' + token + '" }');
        server = net.connect(config.localPort, 'localhost');
        customer.pipe(server);
        server.pipe(customer);
      });
    });
  });
}());
