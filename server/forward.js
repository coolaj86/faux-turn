(function () {
  'use strict';

  var http = require('http')
    , net = require('net')
    , express = require('express')
    , fs = require('fs')
    , exec = require('child_process').exec
    , app = express()
    , config = require('./config')
    , superPort
    , superServer
    , connectionPool = {}
    ;

  app.use(express.basicAuth(config.username, config.password));
  app.use(express.json());
  // TODO transmit over https
  app.use('/new.pem', function (req, res) {
    var filename = Math.random() + '.pem'
      ;

    res.setHeader('Content-Type', 'application/x-pem-file');
    exec('openssl genrsa -out ' + filename + ' 1024', function () {
      fs.createReadStream(filename).on('end', function () {
        fs.unlink(filename);
      }).pipe(res);
    });
  });
  app.use(function (req, res) {
    var token = Math.random().toString()
      ;

    connectionPool[token] = [];
    res.send({ port: superPort, token: token });
  });

  superServer = net.createServer(function (socket) {
    console.log('[*] new socket from behind the NAT');
    socket.once('data', function (chunk) {
      console.log('[D] got data from socket');
      var data
        ;

      try {
        data = JSON.parse(chunk.toString('utf8'));
      } catch (e) {
        data = {};
      }

      if (!connectionPool[data.token] /*|| master.connection.remoteAddr !== connectionPool[token].remoteAddr*/) {
        socket.end('500 expected master connection');
        return;
      }

      function expandPool() {
        if (connectionPool[data.token].length < 3) {
          connectionPool[data.token].master.write('{ "cmd": "uno mas ' + connectionPool[data.token].length + '" }');
        }
      }

      if (!data.master) {
        console.log('[S] socket is a slave');
        expandPool();
        connectionPool[data.token].push(socket);
        return;
      }
      console.log('[MASTER] socket is a master');

      connectionPool[data.token].master = socket;
      expandPool();
      connectionPool[data.token].server = net.createServer(function (customer) {
        var client = connectionPool[data.token].shift()
          ;

        expandPool();

        if (!client) {
          customer.end('500 server temporarily unavailable');
          return;
        }

        customer.pipe(client);
        client.pipe(customer);
      }).listen(function () {
        var port = this.address().port.toString()
          ;

        console.log('port', port);
        socket.write('{ "port": "' + port + '" }');
      });

      socket.on('close', function () {
        // TODO force release the pool and close the server error
        connectionPool[data.token].server.close();
        connectionPool[data.token].forEach(function (client) {
          client.end();
        });
        delete connectionPool[data.token];
      });
    });
  });

  superServer.listen(function () {
    superPort = superServer.address().port;
    http.createServer(app).listen(config.localWebPort, function () {
      console.log(this.address().port, superPort);
    });
  });

}());
