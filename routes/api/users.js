const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs")
const User = require("../../models/User");
const jwt = require("jsonwebtoken");
const keys = require("../../config/keys")
const passport = require("passport")
const validateRegisterInput = require('../../validation/register');
const validateLoginInput = require('../../validation/login');


router.get("/test", (req, res) => {
    res.json({ msg: "This is the users route" })
});

router.post('/register', (req, res) => {
    // Check to make sure nobody has already registered with a duplicate email
    const { errors, isValid } = validateRegisterInput(req.body)

    if (!isValid) return res.status(400).json({errors})

    User.findOne({ email: req.body.email })
        .then(user => {
            if (user) {
                // Throw a 400 error if the handle already exists
                errors.email = "Email already in use";
                return res.status(400).json(errors)
            } else {
                const newUser = new User({
                    handle: req.body.handle,
                    email: req.body.email,
                    password: req.body.password
                })

                bcrypt.genSalt(10, (err, salt) => {
                    bcrypt.hash(newUser.password, salt, (err, hash) => {
                        if (err) throw err;
                        newUser.password = hash;
                        newUser.save()
                            .then(user => {
                                const payload = {id: user.id, handle: user.handle};
                                jwt.sign(
                                    payload,
                                    keys.secretOrKey,
                                    // tell the key to expire in one hour
                                    {expiresIn: 3600},
                                    (err, token) => {
                                        res.json({
                                            success: true,
                                            token: 'Bearer ' + token
                                        });
                                    }
                                )
                            })
                            .catch(err => console.log(err));
                    })
                })
            }
        })
})

router.post("/login", (req, res) => {
    const { errors, isValid} = validateLoginInput(req.body);

    if (!isValid) return res.status(400).json(errors);

    const email = req.body.email;
    const password = req.body.password;

    User.findOne({ email })
        .then(user => {
            if (!user) {
                errors.email = "This user does not exist"
                return res.status(404).json(errors)
            }

            bcrypt.compare(password, user.password)
                .then(isMatch => {
                    if (isMatch) {
                        const payload = { 
                            id: user.id, 
                            handle: user.handle
                        }

                        jwt.sign(
                            payload,
                            keys.secretOrKey,
                            // tell the key to expire in one hour
                            {expiresIn: 3600},
                            (err, token) => {
                                res.json({
                                    success: true,
                                    token: 'Bearer ' + token
                                });
                            }
                        )
                    } else {
                        errors.password = "Incorrect password"
                        return res.status(400).json(errors)
                    }
                })
        
        })
})




module.exports = router;