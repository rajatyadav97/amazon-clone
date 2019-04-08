var router = require('express').Router();
var passport = require('passport');
var async = require('async');
var passportConfig = require('../config/passport');
var User = require('../models/user');
var Cart = require('../models/cart');

router.get('/edit-profile',function(req,res,next){
    if(!req.user) return res.redirect('/login')
    res.render('accounts/editprofile',{
       editMessage: req.flash('editMessage'),
    });
});

router.post('/edit-profile',function(req,res,next){
    if(!req.user) return res.redirect('/login')
    User.findById(req.user._id,function(err,user){
       if(err) return next(err);
       if(req.body.address) user.address = req.body.address;
       if(req.body.name) user.profile.name = req.body.name;
       user.save(function(err){
          if(err) return next(err);
          req.flash('editMessage',"successfully updated your profile.");
          return res.redirect('/edit-profile');
       });
    });
});

router.get('/logout',function(req,res,next){
   req.logout();
   return res.redirect('/');
});

router.get('/login',function(req,res){
    if(!req.user){
        res.render('accounts/login',{ loginMessage: req.flash('loginMessage')});
    }else{
        res.redirect('/');
    }
});

router.post('/login', passport.authenticate('local-login',{
    successRedirect: '/profile',
    failureRedirect: '/login',
    failureFlash: true
}));

router.get('/profile',passportConfig.isAuthenticated,function(req,res,next){
    User
        .findById(req.user._id)
        .populate('history.item')
        .exec(function(err,foundUser){
             if(err) return next(err);
             res.render('accounts/profile',{
              user: foundUser
             })
        });
});

router.get('/signup', function(req,res){
   if(!req.user){ 
    res.render('accounts/signup.ejs',{errors: req.flash('errors')});
   }else{
     return res.redirect('/');
   }
});

router.post('/signup' ,function(req,res,next){
 
  async.waterfall([
    function(callback){
    var user = new User();
    user.profile.name = req.body.name;
    if(!req.body.email){
        req.flash('errors',"Email field is require for signup.");
        return res.redirect('/signup');
    }
    user.email = req.body.email;
    if(!req.body.password){
        req.flash('errors',"Password field is require for signup.");
        return res.redirect('/signup');
    }
    user.password = req.body.password;
    user.profile.picture = user.gravatar();
    User.findOne({email: req.body.email}, function(err, existingUser){
        if(existingUser){
            req.flash('errors',"User with that email already exists.");
            res.redirect('/signup');
        }else{
            user.save(function(err){
                if(err){
                    return next(err);
                }else{
                   callback(null,user);
                }
            });
        }
    });
  },
  function(user){
    var cart = new Cart();
    cart.owner = user._id;
    cart.save(function(err){
      if (err) return next(err);
      req.logIn(user,function(err){
      if(err) return next(err);
        res.redirect('/profile');
      }); 
    }); 
  }
 ])
});

module.exports = router;