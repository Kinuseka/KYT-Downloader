const jwt = require('jsonwebtoken');
const response = require("./responses").Responses
const config_file = require('../config.json')

function verifyToken(req,res,next){
    try {
        var jwtToken = req.query.sid;
        const verified = jwt.verify(jwtToken, config_file.SECRET_TOKEN);
        req.payload = verified;
        next();
    } catch (error) {
        console.log(error);
        if (error instanceof jwt.TokenExpiredError) {
            // Handle token expiration error
            response.AccessDenied(res, msg={code: 'Expired'});
        } else if (error instanceof jwt.JsonWebTokenError) {
            // Handle general JWT error
            response.AccessDenied(res, msg={code: 'Unknown Token'});
        } else {
            // Handle other errors
            response.InternalError(res, msg={code:"Error identifying token (vt_a)"})
        }
        return;
    }
        
}

function createToken(payload, expiresIn = '8h'){
    let jwtSecretKey = config_file.SECRET_TOKEN;
    let data = payload;
    return jwt.sign(data, jwtSecretKey, {expiresIn: expiresIn})
}

module.exports = {verifyToken, createToken}