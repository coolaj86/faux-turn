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
    , customerPools = {}
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

    res.send({ port: superPort, token: token });
  });

  superServer = net.createServer(function (socket) {
    var master
      ;

    console.log('[*] new socket from behind the NAT');
    socket.once('data', function (chunk) {
      console.log('[D] got data from socket');
      var data
        , customer
        ;

      try {
        data = JSON.parse(chunk.toString('utf8'));
      } catch (e) {
        data = {};
        socket.end("422 didn't pick up what you were putting down");
      }

      // If this is a slave
      if (!data.master) {

        // shouldn't be getting NAT device slaves before getting the master
        if (!customerPools[data.token]) {
          console.log('no customer pool');
          socket.end('500 expecting master');
        }

        console.log('[S] socket is a slave');
        customer = customerPools[data.token].shift();
        if (!customer) {
          socket.end();
        }
        socket.setKeepAlive(true);
        socket.pipe(customer);
        customer.setKeepAlive(true);
        customer.pipe(socket);
        // TODO activeSessions.push({ slave: socket, customer: customer });
        return;
      }

      // Duplicate master?
      if (customerPools[data.token]) {
        console.log("Odd... there was already a master for this pool; it shouldn't exist");
        socket.end('400 a master already exists');
        return;
      }

      // This is a master
      console.log('[MASTER] socket is a master');
      master = socket;
      master.setKeepAlive(true);
      customerPools[data.token] = [];

      net.createServer(function (customer) {
        customerPools[data.token].push(customer);
        master.write('{ "cmd": "uno mas" }');
      }).listen(function () {
        var port = this.address().port.toString()
          ;

        console.log('port', port);
        master.write('{ "port": "' + port + '" }');
      });

      master.on('close', function () {
        console.log('master closed, slaves should die too');
        customerPools[data.token].forEach(function (customer) {
          customer.end();
        });
        delete customerPools[data.token];
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
