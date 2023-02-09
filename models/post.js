const mongoose = require("mongoose");

const post = new mongoose.Schema({
  user_id: String,
  title: String,
  content: String,
  upvote: Number,
  downvote: Number,
  comments: [{ username: String, comment: String }],
  upvoteIds: [String],
  downvoteIds: [String],
});

module.exports = mongoose.model("Post", post);
