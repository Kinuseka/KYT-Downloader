const express = require('express');
const path = require("path");
const app = express();

var Responses = {
    //4xx error
    SendNotFound: function(res,msg = "404 Error Not found!") {
        res.status(404);
        res.send(msg);
    },
    AccessDenied: function(res,msg = "Denied Access to this page") {
        res.status(401);
        res.send(msg);
    },
    MethodNotAllowed: function(res, msg = "This method is not allowed.") {
        res.status(405);
        res.send(msg);
    },
    TooManyRequests: function(res, msg = "You are making too many requests") {
        res.status(429);
        res.send(msg);
    },
    //5xx error
    InternalError: function(res, msg = "There has been an error in the server") {
        res.status(500);
        res.send(msg);
    }
}
module.exports =  {Responses};