#!/usr/bin/env node

// A WebSocket to TCP socket proxy
// Copyright 2012 Joel Martin
// Licensed under LGPL version 3 (see docs/LICENSE.LGPL-3)

// Known to work with node 0.8.9
// Requires node modules: ws and optimist
//     npm install ws optimist

var argv = require('optimist').argv,
    net = require('net'),
    http = require('http'),
    https = require('https'),
    url = require('url'),
    path = require('path'),
    fs = require('fs'),
    tunnel = require('tunnel-ssh'),
<<<<<<< HEAD
=======

    Buffer = require('buffer').Buffer,
>>>>>>> 8cb4c4cae3dfad15931e5e7df846005d0051954b
    WebSocketServer = require('ws').Server,
    sshtunnel,
    sshkey;

<<<<<<< HEAD
const source_port = 5995;
const log = function (client, msg) {
    console.log(client + ': ' + msg);
};
=======
    webServer, wsServer, sshkey, sshkeypass, sshuser, sshlocalport,
    source_host, source_port, target_host, target_port,
    web_path = null;
>>>>>>> 8cb4c4cae3dfad15931e5e7df846005d0051954b

const connect_tunnel = function (client, req) {
    var clientAddr = client._socket.remoteAddress;
    var requested_url = req ? req.url : client.upgradeReq.url;
    var url_parts = url.parse(requested_url, true);
    var target_host = url_parts.query.targethost;
    const target_port = 5900;
    const sshuser = 'user';
    const sshkeypass = 'passphrase';
    const sshlocalport = 0;

    log(clientAddr, 'Tunnel connection...');
    log(clientAddr, 'Request: ' + requested_url);

    const config = {
        username: sshuser,
        privateKey: sshkey,
        passphrase: sshkeypass,
        host: target_host,
        dstPort: target_port,
        localPort: sshlocalport
    };
    sshtunnel = tunnel(config, function (error, server) {
        if (error) {
            log(clientAddr, 'Error found when configuring ssh tunnel');
        }
        else {
            log(clientAddr, 'Tunneling target connection: ' + target_host + ':' + target_port);
        }
    });
    sshtunnel.on('listening', function () {
        var target_port_redirected = sshtunnel.address().port;
        var target_host_redirected = sshtunnel.address().address;
        log(clientAddr, 'Listening on ssh tunnel: ' + target_host_redirected + ':' + target_port_redirected);
        new_client(client, req, clientAddr, target_host_redirected, target_port_redirected);
    });
    sshtunnel.on('error', function (err) {
        console.error('Error found on ssh tunnel:', err);
        sshtunnel.close();
    });
}

// Handle new WebSocket client
const new_client = function (client, req, clientAddr, target_host, target_port) {
    log(clientAddr, 'WebSocket connection...');
    log(clientAddr, 'Version ' + client.protocolVersion + ', subprotocol: ' + client.protocol);

<<<<<<< HEAD
    var target = net.createConnection(target_port, target_host, function () {
        log(clientAddr, 'Connected to target: ' + target_host + ":" + target_port);
    });

    target.on('data', function (data) {
=======
    if (sshkey) {
        var config = {
            username: sshuser,
            privateKey: sshkey,
            passphrase: sshkeypass,
            host: target_host,
            port:22,
            dstPort: target_port,
            localPort: sshlocalport
          };  
        var sshtunnel = tunnel(config, function(error, server){
            if(error){
                log('error found when configuring ssh tunnel');
            }
            else {
                log('tunneling target connection');
            }
        });
        sshtunnel.on('error', function(err){
            console.error('Error found on ssh tunnel:', err);
            sshtunnel.close();
        });    
        var target = net.createConnection(sshlocalport, 'localhost', function() {
            log('connected to target');
        });        
    }
    else {
        var target = net.createConnection(target_port, target_host, function() {
            log('connected to target');
        });        
    }

    target.on('data', function(data) {
        //log("sending message: " + data);
>>>>>>> 8cb4c4cae3dfad15931e5e7df846005d0051954b
        try {
            client.send(data);
        }
        catch (e) {
            log(clientAddr, 'Client closed, cleaning up target');
            target.end();
        }
    });
    target.on('end', function () {
        log(clientAddr, 'target disconnected');
        client.close();
        sshtunnel.close();
    });
    target.on('error', function () {
        log(clientAddr, 'target connection error');
        target.end();
        client.close();
        sshtunnel.close();
    });

    client.on('message', function (msg) {
        target.write(msg);
    });
    client.on('close', function (code, reason) {
        log(clientAddr, 'WebSocket client disconnected: ' + code + ' [' + reason + ']');
        target.end();
        sshtunnel.close();
    });
    client.on('error', function (a) {
        log(clientAddr, 'WebSocket client error: ' + a);
        target.end();
        sshtunnel.close();
    });
};

// Send an HTTP error response
const http_error = function (response, code, msg) {
    response.writeHead(code, { "Content-Type": "text/plain" });
    response.write(msg + "\n");
    response.end();
    return;
}

// Process an HTTP static file request
const http_request = function (request, response) {
    console.log("An http request has arrived: " + request.url);

    if (!argv.web) {
        return http_error(response, 403, "403 Permission Denied");
    }

    var uri = url.parse(request.url).pathname, filename = path.join(argv.web, uri);

    fs.exists(filename, function (exists) {
        if (!exists) {
            return http_error(response, 404, "404 Not Found");
        }

        if (fs.statSync(filename).isDirectory()) {
            filename += '/index.html';
        }

        fs.readFile(filename, "binary", function (err, file) {
            if (err) {
                return http_error(response, 500, err);
            }

            response.writeHead(200);
            response.write(file, "binary");
            response.end();
        });
    });
};

console.log("- Running in unencrypted HTTP (ws://) mode");
var webServer = http.createServer(http_request);

console.log("- Target TCP connection will be redirected through a secure ssh channel");
sshkey = fs.readFileSync('key.ppk');

<<<<<<< HEAD
webServer.listen(source_port, function () {
    console.log("- Listening on port " + source_port + " for HTTP request ...")
    var wsServer = new WebSocketServer({ server: webServer });
    wsServer.on('connection', connect_tunnel);
=======
    if (isNaN(source_port) || isNaN(target_port)) {
        throw("illegal port");
    }
} catch(e) {
    console.error("websockify.js [--web web_dir] [[--cert cert.pem [--key key.pem]] [[--sshkey key.ppk] [--sshkeypass secret] [--sshuser user] [--sshlocalport 1234]] [source_addr:]source_port target_addr:target_port");
    process.exit(2);
}

console.log("WebSocket settings: ");
console.log("    - proxying from " + source_host + ":" + source_port +
            " to " + target_host + ":" + target_port);
if (argv.web) {
    console.log("    - Web server active. Serving: " + argv.web);
}

if (argv.cert) {
    argv.key = argv.key || argv.cert;
    var cert = fs.readFileSync(argv.cert),
        key = fs.readFileSync(argv.key);
    console.log("    - Running in encrypted HTTPS (wss://) mode using: " + argv.cert + ", " + argv.key);
    webServer = https.createServer({cert: cert, key: key}, http_request);
} else {
    console.log("    - Running in unencrypted HTTP (ws://) mode");
    webServer = http.createServer(http_request);
}

if (argv.sshkey) {
    sshkey = fs.readFileSync(argv.sshkey);    
    console.log("    - Target TCP connection will be redirected through a secure ssh channel");
    if (argv.sshkeypass) {
        sshkeypass = argv.sshkeypass;
    }
    if (argv.sshuser) {
        sshuser = argv.sshuser;
    }
    if (argv.sshlocalport) {
        sshlocalport = argv.sshlocalport;
    }
}

webServer.listen(source_port, function() {
    wsServer = new WebSocketServer({server: webServer});
    wsServer.on('connection', new_client);
>>>>>>> 8cb4c4cae3dfad15931e5e7df846005d0051954b
});
