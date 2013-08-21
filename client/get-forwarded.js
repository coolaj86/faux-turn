(function () {
  'use strict';

  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

  var ahr = require('ahr')
    , net = require('net')
    , tls = require('tls')
    , fs = require('fs')
    , config = require('./config')
    , remotePort
    , remoteUrl = 'http://' + config.remoteAddr + ':' + config.remoteWebPort
    , tlsOptions
    ;
    
  tlsOptions = {
    key: fs.readFileSync('new.pem')
  , rejectUnauthorized: false
  , ca: [ fs.readFileSync('server-cert.pem') ]
  };

  ahr.http(remoteUrl, { username: config.username, password: config.password }).when(function (err, ahr, data) {
    var socket
      , token = data.token
      ;

    remotePort = data.port;

    socket = tls.connect(remotePort, config.remoteAddr);
    socket.on('secureConnect', function () {
    //socket.on('connect', function () {
      console.log('remote secureConnect');
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

      customer = tls.connect(remotePort, config.remoteAddr);
      customer.on('secureConnect', function () {
        console.log('customer secureConnect');
      //customer.on('connect', function () {
        customer.write('{ "token": "' + token + '" }');
        server = net.connect(config.localPort, 'localhost');
        customer.pipe(server);
        server.pipe(customer);
      });
    });
  });
}());
