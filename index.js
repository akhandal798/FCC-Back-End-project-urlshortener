require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const dns = require('dns')

app.use(cors());

// Basic Configuration
const port = process.env.PORT || 3000;

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

//db connect
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

//define schema
const urlSchema = mongoose.Schema({
  original_url: String,
  short_url: Number
})

//compile schema into model
const URLmodel = mongoose.model("URL", urlSchema)

//bodyParser options
//all routes can use bodyParser now
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

// post endpoint to add urls and their shorts to database
app.post('/api/shorturl', async function(req, res) {
  
  console.log(`req.body: ${JSON.stringify(req.body)}`);
  console.log(`req.params: ${JSON.stringify(req.params)}`);
  console.log(`req.query: ${JSON.stringify(req.query)}`);

  //get URL
  const formURL = req.body.url
  console.log(formURL)

  //regex check
  const regex =
    /^(https?:\/\/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,})(\/[^\s]*)?(\?v=\d+)?$/;

  if (!regex.test(formURL)) {
    console.log("regex failure")
    return res.json({ error: 'invalid url' })
  }

  //DNS check hostname
  const parsedURL = new URL(formURL)
  const hostname = parsedURL.hostname;
  console.log(hostname)

  try {
    await dns.promises.lookup(hostname);  // Using promises-based DNS lookup
  } catch (err) {
    console.log("DNS lookup failure");
    return res.json({ error: 'invalid url' });  // Early return to stop further execution
  }

  //now that the URL is valid, define a function that will
  //check to see if the URL is in the database already
  //if not put it in the DB
  const finder = async function() {

    const checkedURL = await URLmodel.findOne({original_url: formURL})
    const lastURL = await URLmodel.findOne().sort({short_url: -1}).exec();
    const nextShortURL = lastURL ? lastURL.short_url + 1 : 1
    
    if (!checkedURL) {
      console.log("URL not found, adding to DB")
      URLmodel.create({original_url: formURL, short_url: nextShortURL})
      return res.json({original_url: formURL, short_url: nextShortURL})
    } else {
      console.log("URL found, retrieving")
      console.log(checkedURL)
      return res.json(checkedURL)
    }
  }

  finder()

});

//get endpoint to get shortened URL and redirect

app.get('/api/shorturl/:shortlink?', async function(req, res) {
  console.log(`req.body: ${JSON.stringify(req.body)}`);
  console.log(`req.params: ${JSON.stringify(req.params)}`);
  console.log(`req.query: ${JSON.stringify(req.query)}`);

  const urlDocument = await URLmodel.findOne({short_url: req.params.shortlink})
  console.log(typeof req.params.shortlink)
  res.redirect(urlDocument.original_url)

})


app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
