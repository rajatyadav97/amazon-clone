var router = require('express').Router();
var Product = require('../models/product');
var Category = require('../models/category');
var Cart = require('../models/cart');
var async = require('async');
var User = require('../models/user');
var stripe = require('stripe')('sk_test_G9edG417T5YR5zcxkZkpRJTO');

function paginate(req, res, next) {

  var perPage = 12;
  var page = req.params.page - 1;

  Product
    .find()
    .skip( perPage * page)
    .limit( perPage )
    .populate('category')
    .exec(function(err, products) {
      if (err) return next(err);
      Product.count().exec(function(err, count) {
        if (err) return next(err);
        return res.render('main/product-main', {
          products: products,
          pages: count / perPage
        });
      });
    });

}


router.get('/',function(req, res,next){
  paginate(req,res,next);
});

router.get('/page/:page',function(req,res,next){
  paginate(req,res,next);
})



router.get('/products/:id', function(req, res, next) {
  Product
    .find({ category: req.params.id })
    .populate('category')
    .exec(function(err, products) {
      if (err) return next(err);
      res.render('main/category', {
        products: products
      });
    });
});

router.get('/product/:id', function(req,res,next){
   Product.findById(req.params.id,function(err,product){
      if(err) return next(err);
      res.render('main/product',{product: product});
   });
});

router.post('/product/:id',function(req,res,next){
    Cart.findOne({owner: req.user._id},function(err,cart){
        if(err) return next(err);
        cart.items.push({
            item: req.params.id,
            price: parseFloat(req.body.priceValue),
            quantity: parseInt(req.body.quantity)
        });
        cart.total = (cart.total+parseFloat(req.body.priceValue)).toFixed(2);
        cart.save(function(err){
           if(err) return next(err);
           return res.redirect('/cart');
        });
    });
});

router.get('/cart',function(req,res,next){
    Cart
        .findOne({owner: req.user._id})
        .populate('items.item')
        .exec(function(err,cart){
             if(err) return next(err);
             res.render('main/cart',{
                foundCart: cart,
                message: req.flash('message')
             }); 
        });
});   

router.post('/remove',function(req,res,next){
    Cart.findOne({owner: req.user._id},function(err,foundCart){
        if(err) return next(err);
        foundCart.items.pull(String(req.body.item));
        foundCart.total -= parseFloat(req.body.priceValue).toFixed(2);
        foundCart.save(function(err){
          if(err) return next(err);
          req.flash('message',"Successfully removed the item")
          return res.redirect('/cart');
        }) 
    });
});


router.post('/payment', function(req, res, next) {

  var stripeToken = req.body.stripeToken;
  var currentCharges = Math.round(req.body.stripeMoney * 100);
  stripe.customers.create({
    source: stripeToken,
  }).then(function(customer) {
    return stripe.charges.create({
      amount: currentCharges,
      currency: 'inr',
      customer: customer.id
    });
  }).then(function(charge) {
    async.waterfall([
      function(callback) {
        Cart.findOne({ owner: req.user._id }, function(err, cart) {
          callback(err, cart);
        });
      },
      function(cart, callback) {
        User.findOne({ _id: req.user._id }, function(err, user) {
          if (user) {
            for (var i = 0; i < cart.items.length; i++) {
              user.history.push({
                item: cart.items[i].item,
                paid: cart.items[i].price
              });
            }

            user.save(function(err, user) {
              if (err) return next(err);
              callback(err, user);
            });
          }
        });
      },
      function(user) {
        Cart.update({ owner: user._id }, { $set: { items: [], total: 0 }}, function(err, updated) {
          if (updated) {
            res.redirect('/profile');
          }
        });
      }
    ]);
  });


});

Product.createMapping(function(err, mapping) {
  if (err) {
    console.log("error creating mapping");
    console.log(err);
  } else {
    console.log("Mapping created");
    console.log(mapping);
  }
});

var stream = Product.synchronize();
var count = 0;

stream.on('data', function() {
  count++;
});

stream.on('close', function() {
  console.log("Indexed " + count + " documents");
});

stream.on('error', function(err) {
  console.log(err);
});

router.post('/search',function(req,res,next){
   res.redirect('/search?q=' + req.body.q);
});

router.get('/search', function(req, res, next) {
  if (req.query.q) {
    Product.search({
      query_string: { query: req.query.q}
    }, function(err, results) {
      results:
      if (err) return next(err);
      var data = results.hits.hits.map(function(hit) {
        return hit;
      });
      return res.render('main/result-search', {
        query: req.query.q,
        data: data
      });
    });
  }
});



module.exports = router;