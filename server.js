const dotenv = require("dotenv");
const mongoose = require("mongoose");
const express = require("express");
const cors = require("cors");
const passport = require("passport");
const passportLocal = require("passport-local").Strategy;
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const bodyParser = require("body-parser");
const uuid = require("uuid");
const path = require("path");

const { connectDB } = require("./config/database");
const User = require("./models/user");
const Post = require("./models/post");

// ========================================================= END OF IMPORT =========================================================

// port
var port = process.env.PORT || 4000;

dotenv.config();
const { MONGO_CONNECT_STRING } = process.env;

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "http://localhost:4000", // location of the react app we are connecting to
    credentials: true,
  })
);
app.use(
  session({
    secret: "secretcode",
    resave: true,
    saveUninitialized: true,
  })
);
app.use(cookieParser("secretcode"));
app.use(passport.initialize());
app.use(passport.session());
require("./config/passportConfig")(passport);
app.use(express.static(path.join(__dirname, "./build")));
// ========================================================= END OF MIDDLEWARE =========================================================

// Routes

// default route
app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(__dirname, "./build/index.html"));
});

// route to get all posts
app.get("/api/posts", (req, res) => {
  Post.find(function (err, posts) {
    // if there is an error retrieving, send the error otherwise send data
    if (err) res.send(err);
    res.json(posts);
  });
});

// route to get a single post
app.get("/api/posts/:id", (req, res) => {
  Post.findOne({ _id: req.params.id }, (err, post) => {
    if (err) res.status(404).send("Sorry, cant find that");
    res.json(post);
  });
});

// route to add posts
app.post("api/add-post", (req, res) => {
  Post.findOne({ title: req.body.title }, async (err, post) => {
    if (err) res.send(err);

    const newPost = new Post({
      user_id: req.body.user_id,
      title: req.body.title,
      content: req.body.content,
      upvote: req.body.upvote,
      downvote: req.body.downvote,
      comments: req.body.comments,
    });
    await newPost.save();
    res.send("Post has been added successfully");
  });
});

// route to add comments
app.post("/api/posts/add-comment/:post_id", (req, res) => {
  const { username } = req.body;
  const { comment } = req.body;

  Post.updateOne(
    { _id: req.params.post_id },
    { $push: { comments: { username: username, comment: comment } } },
    (err, data) => {
      if (err) throw err;
      Post.findOne({ _id: req.params.post_id }, (err, post) => {
        if (err) res.status(404).send("Sorry, can't find that");
        if (post) {
          res.json(post);
        } else {
          res.send("Post does not exist");
        }
      });
    }
  );
});

// route to add upvote to posts list
// returns a list of posts
app.put("/api/posts/:post_id/upvote", (req, res) => {
  const { post_id } = req.params;
  const { username } = req.user;

  Post.findOne({ _id: post_id }, (err, post) => {
    if (err) res.status(404).send("Sorry, can't find that");
    if (post) {
      const upvoteIds = post.upvoteIds || [];
      const downvoteIds = post.downvoteIds || [];
      const canUpVote = username && !upvoteIds.includes(username);

      if (canUpVote) {
        if (downvoteIds.includes(username)) {
          // remove downvote and add upvote
          Post.updateOne(
            { _id: post_id },
            { $inc: { upvote: 1 }, $push: { upvoteIds: username } },
            (err, post) => {
              if (err) res.send(err);
              Post.updateOne(
                { _id: post_id },
                { $inc: { downvote: -1 }, $pull: { downvoteIds: username } },
                (err, post) => {
                  if (err) res.send(err);
                  Post.find(function (err, posts) {
                    if (err) res.send(err);
                    res.json(posts);
                  });
                }
              );
            }
          );
        } else {
          // add upvote only
          Post.updateOne(
            { _id: post_id },
            { $inc: { upvote: 1 }, $push: { upvoteIds: username } },
            (err, post) => {
              if (err) throw err;
              Post.find(function (err, posts) {
                if (err) res.send(err);
                res.json(posts);
              });
            }
          );
        }
      }
    }
  });
});

// route to add upvote to single post
// returns a single post
app.put("/api/post/:post_id/upvote", (req, res) => {
  const { post_id } = req.params;
  const { username } = req.user;

  Post.findOne({ _id: post_id }, (err, post) => {
    if (err) res.status(404).send("Sorry, can't find that");
    if (post) {
      const upvoteIds = post.upvoteIds || [];
      const downvoteIds = post.downvoteIds || [];
      const canUpVote = username && !upvoteIds.includes(username);

      if (canUpVote) {
        if (downvoteIds.includes(username)) {
          // remove downvote and add upvote

          // Post.updateOne(
          //   { _id: post_id },
          //   { $inc: { upvote: 1 }, $push: { upvoteIds: username } },
          //   { $inc: { downvote: -1 }, $pull: { downvoteIds: username } },
          //   (err, post) => {
          //     if (err) throw err;
          //     Post.findOne({ _id: post_id }, (err, post) => {
          //       if (err) res.status(404).send("Sorry, can't find that");
          //       res.json(post);
          //     });
          //   }
          // );

          Post.updateOne(
            { _id: post_id },
            { $inc: { upvote: 1 }, $push: { upvoteIds: username } },
            (err, post) => {
              if (err) res.send(err);
              Post.updateOne(
                { _id: post_id },
                { $inc: { downvote: -1 }, $pull: { downvoteIds: username } },
                (err, post) => {
                  if (err) res.send(err);
                  Post.findOne({ _id: post_id }, (err, post) => {
                    if (err) res.status(404).send("Sorry, can't find that");
                    res.json(post);
                  });
                }
              );
            }
          );
        } else {
          // add upvote only
          Post.updateOne(
            { _id: post_id },
            { $inc: { upvote: 1 }, $push: { upvoteIds: username } },
            (err, post) => {
              if (err) throw err;
              Post.findOne({ _id: post_id }, (err, post) => {
                if (err) res.status(404).send("Sorry, can't find that");
                res.json(post);
              });
            }
          );
        }
      }
    }
  });
});

// route to add downvote to posts list
// returns a list of posts
app.put("/api/posts/:post_id/downvote", (req, res) => {
  const { post_id } = req.params;
  const { username } = req.user;

  Post.findOne({ _id: post_id }, (err, post) => {
    if (err) res.status(404).send("Sorry, can't find that");
    if (post) {
      const upvoteIds = post.upvoteIds || [];
      const downvoteIds = post.downvoteIds || [];
      const canDownVote = username && !downvoteIds.includes(username);

      if (canDownVote) {
        if (upvoteIds.includes(username)) {
          // remove upvote and add downvote

          // Post.updateOne(
          //   { _id: post_id },
          //   { $inc: { downvote: 1 }, $push: { downvoteIds: username } },
          //   { $inc: { upvote: -1 }, $pull: { upvoteIds: username } },
          //   (err, post) => {
          //     if (err) throw err;
          //     Post.find(function (err, posts) {
          //       if (err) res.send(err);
          //       res.json(posts);
          //     });
          //   }
          // );

          Post.updateOne(
            { _id: post_id },
            { $inc: { downvote: 1 }, $push: { downvoteIds: username } },
            (err, post) => {
              if (err) res.send(err);
              Post.updateOne(
                { _id: post_id },
                { $inc: { upvote: -1 }, $pull: { upvoteIds: username } },
                (err, post) => {
                  if (err) throw err;
                  Post.find(function (err, posts) {
                    if (err) res.send(err);
                    res.json(posts);
                  });
                }
              );
            }
          );
        } else {
          // add downvote only
          Post.updateOne(
            { _id: post_id },
            { $inc: { downvote: 1 }, $push: { downvoteIds: username } },
            (err, post) => {
              if (err) throw err;
              Post.find(function (err, posts) {
                if (err) res.send(err);
                res.json(posts);
              });
            }
          );
        }
      }
    }
  });
});

// route to add downvote to single post
// returns a single post
app.put("/api/post/:post_id/downvote", (req, res) => {
  const { post_id } = req.params;
  const { username } = req.user;

  Post.findOne({ _id: post_id }, (err, post) => {
    if (err) res.status(404).send("Sorry, can't find that");
    if (post) {
      const upvoteIds = post.upvoteIds || [];
      const downvoteIds = post.downvoteIds || [];
      const canDownVote = username && !downvoteIds.includes(username);

      if (canDownVote) {
        if (upvoteIds.includes(username)) {
          // remove upvote and add downvote

          // Post.updateOne(
          //   { _id: post._id },
          //   { $inc: { downvote: 1 }, $push: { downvoteIds: username } },
          //   { $inc: { upvote: -1 }, $pull: { upvoteIds: username } },
          //   (err, post) => {
          //     if (err) throw err;
          //     Post.findOne({ _id: post_id }, (err, post) => {
          //       if (err) res.status(404).send("Sorry, can't find that");
          //       res.json(post);
          //     });
          //   }
          // );

          Post.updateOne(
            { _id: post_id },
            { $inc: { downvote: 1 }, $push: { downvoteIds: username } },
            (err, post) => {
              if (err) res.send(err);
              Post.updateOne(
                { _id: post_id },
                { $inc: { upvote: -1 }, $pull: { upvoteIds: username } },
                (err, post) => {
                  if (err) throw err;
                  Post.findOne({ _id: post_id }, (err, post) => {
                    if (err) res.status(404).send("Sorry, can't find that");
                    res.json(post);
                  });
                }
              );
            }
          );
        } else {
          // add downvote only
          Post.updateOne(
            { _id: post_id },
            { $inc: { downvote: 1 }, $push: { downvoteIds: username } },
            (err, post) => {
              if (err) throw err;
              Post.findOne({ _id: post_id }, (err, post) => {
                if (err) res.status(404).send("Sorry, can't find that");
                res.json(post);
              });
            }
          );
        }
      }
    }
  });
});

// route to login a user
app.post("/api/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) throw err;
    if (!user) res.send("No user exists");
    else {
      req.logIn(user, (err) => {
        if (err) res.send("Wrong details! Please try again");
        res.send(req.user);
      });
    }
  })(req, res, next);
});

// route to register a user
app.post("/api/register", (req, res) => {
  User.findOne({ username: req.body.username }, async (err, user) => {
    if (err) throw err;
    if (user) res.send("User already exists");
    if (!user) {
      const hasshedPassword = await bcrypt.hash(req.body.password, 10);
      const newUser = new User({
        user_id: `${req.body.username}-${uuid.v4()}`,
        username: req.body.username,
        email: req.body.email,
        password: hasshedPassword,
      });
      await newUser.save();
      res.send("User created successfully");
    }
  });
});

// route to return user information
app.get("/api/user", (req, res) => {
  res.send(req.user); // this stores the entire user that has been authenticated inside of it.
});

// route to logout
app.post("/api/logout", (req, res) => {
  req.logout((err) => {
    if (err) throw err;
    res.send("User successfully logged out");
  });
});

// ========================================================= END OF ROUTES =========================================================

// connect to database and start server
if (connectDB()) {
  app.listen(port, () => {
    console.log("====================================");
    console.log("Server has started on port " + port);
    console.log("====================================");
  });
}
