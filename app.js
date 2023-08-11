const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use((req,res,next)=>{
    // Switch off the default 'X-Powered-By: Express' header
  app.disable( 'x-powered-by' );
  res.setHeader( 'X-Powered-By', 'Kinu Engine' );
  // .. other headers here
  next();
});
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set("view engine","ejs");

var index = require("./youtube_down")
app.use("/",index);

module.exports = app