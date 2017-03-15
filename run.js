const express = require('express');
const path = require('path');
const argv = require('yargs').argv;

const app = new express();
const port = argv.port || 3333;


app.use('/', express.static(__dirname));

app.get("*", function(req, res) {
  res.sendFile(path.join(__dirname, 'index.html'))
});

app.listen(port, function(error) {
  if (error) {
    console.error(error)
  } else {
    console.info("==> 🌎  Listening on port %s. Open up http://localhost:%s/ in your browser.", port, port)
  }
});
