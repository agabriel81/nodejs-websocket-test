#!/bin/env node
//  OpenShift sample Node application
var express = require('express');
var fs = require('fs');
var WebSocketServer = require('ws').Server;
var SampleApp = function () {

    //  Scope.
    var self = this;

    var url = '0.0.0.0:27017/' + process.env.OPENSHIFT_APP_NAME;

    self.setupVariables = function () {
        //  Set the environment variables we need.
        self.ipaddress = process.env.OPENSHIFT_NODEJS_IP;
        self.port = process.env.OPENSHIFT_NODEJS_PORT || 8080;

        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_NODEJS_IP var, using 0.0.0.0');
            self.ipaddress = "0.0.0.0";
        }
        ;
    };

    self.populateCache = function () {
        if (typeof self.zcache === "undefined") {
            self.zcache = {'index.html': ''};
        }

        //  Local cache for static content.
        self.zcache['index.html'] = fs.readFileSync('./index.html');
    };



    self.cache_get = function (key) {
        return self.zcache[key];
    };


    self.terminator = function (sig) {
        if (typeof sig === "string") {
            console.log('%s: Received %s - terminating sample app ...',
                Date(Date.now()), sig);
            process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()));
    };


    self.setupTerminationHandlers = function () {
        //  Process on exit and signals.
        process.on('exit', function () {
            self.terminator();
        });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
            'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function (element, index, array) {
                process.on(element, function () {
                    self.terminator(element);
                });
            });
    };


    self.createGetRoutes = function () {
        self.getRoutes = {};

        self.getRoutes['/'] = function (req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('index.html'));
        };
    };


    self.initializeServer = function () {
        self.createGetRoutes();

        self.app = express();
        //  Add handlers for the app (from the routes).
        for (var r in self.getRoutes) {
            self.app.get(r, self.getRoutes[r]);
        }

    }

    self.initialize = function () {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();
    };



    self.start = function () {

        var wss = new WebSocketServer({ server: self.app
        })

        wss.on('connection', function connection(ws) {
            console.log(".....Connected");
            var location = url.parse(ws.upgradeReq.url, true);

            ws.on('message', function incoming(message) {
                console.log('received: %s', message);
            });

            ws.send('something');
        });

        self.app.listen(self.port, self.ipaddress, function () {
            console.log('%s: Node server started on %s:%d ...',
                Date(Date.now()), self.ipaddress, self.port);
        });
    };

};
var zapp = new SampleApp();
zapp.initialize();
zapp.start();
