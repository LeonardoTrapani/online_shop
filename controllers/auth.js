const bcrypt = require('bcryptjs');

const User = require('../models/user');

const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { errorStrictEqual } = require('mongodb/lib/core/utils');

const transport = nodemailer.createTransport({
  //mailtrap
  host: 'smtp.mailtrap.io',
  port: 2525,
  auth: {
    user: 'b24ba6b8a4d513',
    pass: '71e321b1393c91',
  },
});

// const transport = nodemailer.createTransport({
//   //gmail
//   host: 'smtp.gmail.com',
//   port: 587,
//   auth: {
//     user: 'leonard.trapani@gmail.com',
//     pass: 'miPiaceGoogle2.0',
//   },
// });

transport.verify(function (error, success) {
  if (error) {
    console.log(error);
  } else {
    console.log('Server is ready to take our messages');
  }
});

exports.getLogin = (req, res, next) => {
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage: req.flash('error'),
  });
};

exports.getSignup = (req, res, next) => {
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    errorMessage: req.flash('error'),
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        req.flash('error', 'Invalid email or password.');
        res.redirect('/login');
      }
      bcrypt
        .compare(password, user.password)
        .then((doMatch) => {
          if (doMatch) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save((err) => {
              res.redirect('/');
            });
          }
          res.redirect('/login');
        })
        .catch((err) => {
          console.log(err);
          res.redirect('/login');
        });
    })
    .catch((err) => console.log(err));
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  User.findOne({ email: email })
    .then((userDoc) => {
      if (userDoc) {
        req.flash(
          'error',
          'Email-exists aldready, please pick a different one.'
        );
        return res.redirect('/signup');
      }
      return bcrypt
        .hash(password, 12)
        .then((hashedPassword) => {
          const user = new User({
            email: email,
            password: hashedPassword,
            cart: { items: [] },
          });
          return user.save();
        })
        .then((result) => {
          res.redirect('/login');
          const mailOptions = {
            from: '"LT Shop" <shop@ltshop.com>',
            to: email,
            subject: 'Signup succeded!',
            html: '<h1>Signup succeded!</h1>',
          };

          return transport.sendMail(mailOptions, (error, info) => {
            if (error) {
              return console.log(error);
            }
            console.log('Message sent: %s', info.messageId);
          });
        });
    })
    .catch((err) => {
      console.log(err);
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect('/');
  });
};

exports.getReset = (req, res, next) => {
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password',
    errorMessage: req.flash('error'),
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      console.log(err);
      return res.redirect('/reset');
    }
    const token = buffer.toString('hex');
    User.findOne({
      email: req.body.email,
    })
      .then((user) => {
        if (!user) {
          req.flash('error', 'No account with that email found.');
          return res.redirect('/reset');
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then((result) => {
        res.redirect('/');
        const mailOptions = {
          from: '"LT Shop" <shop@ltshop.com>',
          to: req.body.email,
          subject: 'Password Reset',
          html: `
          <p>You requested password reset</p>
          <p>Click this <a href="http://localhost:6969/reset/${token}">link</a> to set a new password.</p>
          `,
        };
        return transport.sendMail(mailOptions, (error, info) => {
          if (error) {
            return console.log(error);
          }
          console.log('Message sent: %s', info.messageId);
        });
      })
      .catch((err) => console.log(err));
  });
};

exports.getNewPassowrd = (req, res, next) => {
  const token = req.params.token;
  User.findOne({
    resetToken: token,
    resetTokenExpiration: { $gt: Date.now() },
  })
    .then((user) => {
      res.render('auth/new-password', {
        path: '/new-password',
        pageTitle: 'New Password',
        errorMessage: req.flash('error'),
        userId: user._id.toString(),
      });
    })
    .catch((err) => console.log(err));
};