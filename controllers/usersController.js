const User = require("../models/User");
const Note = require("../models/Note");

const bcrypt = require("bcrypt");
const { json } = require("express");

//@desc Get all users
//@route GET/users
//@access Private

const getAllUsers = async (req, res) => {
  const users = await User.find().select("-password").lean();

  if (!users?.length) {
    return res.status(400).json({ message: "No users found" });
  }
  res.json(users);
};

//@desc create new users
//@route POST /users
//@access Private
const createNewUser = async (req, res) => {
  const { username, password, roles } = req.body;

  //confirming data
  if (!username || !password || !Array.isArray(roles) || !roles.length) {
    return res.status(400).json({ message: "All fields are required" });
  }

  //check for duplicates
  const duplicate = await User.findOne({ username })
    .collation({ locale: "en", strength: 2 })
    .lean()
    .exec();

  if (duplicate) {
    return res.status(409).json({ message: "Duplicate Username" });
  }

  //hash the password
  const hashPassword = await bcrypt.hash(password, 10); //salt rounds

  // const userObject = { username, password: hashPassword, roles };

  const userObject =
    !Array.isArray(roles) || !roles.length
      ? { username, password: hashPassword }
      : { username, password: hashPassword, roles };

  //Create and store new user
  const user = await User.create(userObject);

  if (user) {
    res.status(201).json({ message: `New user ${username} created` });
  } else {
    res.status(400).json({ message: "Invalid user data recieved" });
  }
};

//@desc update a users
//@route PATCH /users
//@access Private
const updateUser = async (req, res) => {
  const { id, username, roles, active, password } = req.body;

  //confirm data
  if (
    !id ||
    !username ||
    !Array.isArray(roles) ||
    !roles.length ||
    typeof active !== "boolean"
  ) {
    return res.status(400).json({ message: "All feilds are required" });
  }

  const user = await User.findById(id).exec();

  if (!user) {
    return res.status(400).json({ message: "user not found" });
  }

  //check for duplicate
  const duplicate = await User.findOne({ username })
    .collation({ locale: "en", strength: 2 })
    .lean()
    .exec();

  //Allow updated to the original user

  if (duplicate && duplicate?._id.toString() !== id) {
    return res.status(409).json({ message: "Duplicate Username" });
  }

  user.username = username;
  user.roles = roles;
  user.active = active;

  if (password) {
    //hash password
    user.password = await bcrypt.hash(password, 10); //salt round
  }

  const updateUser = await user.save();

  res.json({ mesaage: `${updateUser.username} updated` });
};

//@desc delete a users
//@route DELETE /users
//@access Private
const deleteUser = async (req, res) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ mesaage: "User ID required" });
  }

  const note = await Note.findOne({ user: id }).lean().exec();

  if (note) {
    return res.status(400).json({ mesaage: "User has assigned notes" });
  }

  const user = await User.findById(id).exec();

  if (!user) {
    return res.status(200).json({ message: "User not found" });
  }
  const result = await user.deleteOne();

  const reply = `Username ${result.username} with ID ${result._id} deleted`;

  res.json(reply);
};

module.exports = {
  getAllUsers,
  createNewUser,
  updateUser,
  deleteUser,
};
