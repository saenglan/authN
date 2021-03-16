//jshint esversion:6
//use environment (dotenv) variables to protect secret:
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
//Level 5:
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
//level 6
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

// //Level 2:
// const encrypt = require('mongoose-encryption');

//Level 3:
// const md5 = require("md5");

// //Level 4:
// const bcrypt = require('bcrypt');
// const saltRounds = 10;

const app = express();

//log dotenv secrets
//console.log(process.env.SECRET);

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));

//Level 5:
app.use(session({
  //keep in .env file
  secret: "Our Little secret.",
  resave: false,
  saveUninitialized: false
}));

//Level 5: initialize Passport
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
mongoose.set("useCreateIndex", true);

//Level 2:
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  //Level 6
  googleId: String,
  secret: String
});
//Level 2:
//MOVE secret to .env
//const secret = "Thisisourlittlesecret.";
//Add before you develop the model
//Encrypt only selected fields
//Connects to the .env file
//userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });

// //Level 1:
// const userSchema = {
//   email: String,
//   password: String
// };

//Level 5: Passport mongoose
userSchema.plugin(passportLocalMongoose);
//Level 6
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

//Level 5: Passport-Local-Configuration
passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

//Level 6:
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

//Level 6:
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({
      googleId: profile.id
    }, function(err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res) {
  res.render("home");
});

app.get("/login", function(req, res) {
  res.render("login");
});

//Level 6:
app.get("/auth/google",
  passport.authenticate("google", {
    scope: ["profile"]
  })
);
//Level 6:
app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
  });

app.get("/register", function(req, res) {
  res.render("register");
});

//Level 5: Create Secrets Route for Authenticated users
app.get("/secrets", function(req, res) {
  // if (req.isAuthenticated()) {
  //   res.render("secrets");
  // } else {
  //   res.redirect("/login");
  // }
  User.find({"secret": {$ne: null}}, function(err, foundUsers){
    if (err) {
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    }
  });
});

app.get("/submit", function(req, res){
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;
    console.log(req.user.id);

    User.findById(req.user.id, function(err, foundUser){
      if (err) {
        console.log(err);
      } else {
        if(foundUser){
          foundUser.secret = submittedSecret;
          foundUser.save(function(){
            res.redirect("/secrets");
          });
        }
      }
    });
});

//Level 5: Add logout, end user session
app.get("/logout", function(req, res) {
  req.logout();
  res.redirect("/");
});

app.post("/register", function(req, res) {
  //Level 5:

  User.register({
    username: req.body.username
  }, req.body.password, function(err, user) {
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });

  // //Level 4:
  // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
  //   // Store hash in your password DB.
  //   const newUser = new User({
  //     email: req.body.username,
  //     //password: req.body.password
  //     //Level 3: turn password into Hash
  //     //password: md5(req.body.password)
  //     //Level 4:
  //     password: hash
  //   });
  //   //Level 2: Mongoose encrypts on Save
  //   newUser.save(function(err) {
  //     if (err) {
  //       console.log(err);
  //     } else {
  //       res.render("secrets");
  //     }
  //   });
  // });
});

app.post("/login", function(req, res) {
  //Level 5:

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  //Level 5: User Passport to login and authenticate users
  req.login(user, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, function() {
        res.redirect("/secrets");
      });
    }
  });

  // const username = req.body.username;
  // const password = req.body.password;
  // //Level 3: Hash password then compare with stored hashed password
  // // const password = md5(req.body.password);
  // //Level 2: Decrypts on find/findOne
  // User.findOne({
  //   email: username
  // }, function(err, foundUser) {
  //   if (err) {
  //     console.log(err);
  //   } else {
  //     if (foundUser) {
  //       //Level 4:
  //       bcrypt.compare(password, foundUser.password, function(err, result) {
  //         if (result === true) {
  //           res.render("secrets");
  //         }
  //       });
  //       //Level 1-3:
  //       // if (foundUser.password === password) {
  //       //   res.render("secrets");
  //       // }
  //     }
  //   }
  // });
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
