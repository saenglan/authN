//jshint esversion:6
//use environment (dotenv) variables to protect secret:
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
//Level 2:
const encrypt = require('mongoose-encryption');

const app = express();

//log dotenv secrets
console.log(process.env.SECRET);

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true});

//Level 2:
const userSchema = new mongoose.Schema({
  email: String,
  password: String
});
//MOVE secret to .env
//const secret = "Thisisourlittlesecret.";
//Add before you develop the model
//Encrypt only selected fields
//Connects to the .env file
userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });

// //Level 1:
// const userSchema = {
//   email: String,
//   password: String
// };

const User = new mongoose.model("User", userSchema);

app.get("/", function(req, res){
  res.render("home");
});

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

app.post("/register", function(req, res){
  const newUser = new User({
    email: req.body.username,
    password: req.body.password
  });
//Level 2: Mongoose encrypts on Save
  newUser.save(function(err){
    if (err) {
      console.log(err);
    } else{
      res.render("secrets");
    }
  });
});

app.post("/login", function(req, res){
  const username = req.body.username;
  const password = req.body.password;
//Level 2: Decrypts on find/findOne
  User.findOne({email: username}, function(err, foundUser){
    if (err) {
      console.log(err);
    } else {
      if(foundUser){
        if (foundUser.password === password) {
          res.render("secrets");
        }
      }
    }
  });

});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
