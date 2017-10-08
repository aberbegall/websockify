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
    WebSocketServer = require('ws').Server,
    sshtunnel,
    sshkey;

const source_port = 5995;
const log = function (client, msg) {
    console.log(client + ': ' + msg);
};

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

    var target = net.createConnection(target_port, target_host, function () {
        log(clientAddr, 'Connected to target: ' + target_host + ":" + target_port);
    });

    target.on('data', function (data) {
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

webServer.listen(source_port, function () {
    console.log("- Listening on port " + source_port + " for HTTP request ...")
    var wsServer = new WebSocketServer({ server: webServer });
    wsServer.on('connection', connect_tunnel);
});
