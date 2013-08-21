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
    console.log(remoteUrl, data);

    socket = net.connect(remotePort, config.remoteAddr);
    socket.on('connect', function () {
      console.log('connected');
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

      console.log(data);

      if (!data.cmd) {
        return;
      }
      console.log(chunk.toString('utf8'));
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
