var router = require('express').Router();
var Category = require('../models/category');

router.get('/add-category',function(req,res){
  if(!req.user) return res.redirect('/login');
  return res.render('admin/add-category',{message: req.flash('message')});
});

router.post('/add-category',function(req,res,next){
   if(!req.user) return res.json("Login First.");
   var category = new Category;
   if(!req.body.category){
   	  req.flash('message',"Category name required.");
   	  return res.redirect('/add-category');
   }
   category.name = req.body.category;
   category.save(function(err){
      if(err) return next(err);
      req.flash('message',"Successfully added "+ category.name +" category.");
      return res.redirect('/add-category');
   });
});

module.exports = router;