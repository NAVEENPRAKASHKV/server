const { Schema, model } = require("mongoose");

const blogSchema = new Schema(
  {
    heading: { type: String, required: true, unique: true },
    bloggerName: { type: String, required: true },
    content: { type: String, required: true },
    imageUrl: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = model("blog", blogSchema);
