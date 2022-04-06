//import the require dependencies
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const mysql = require('mysql2');
const session = require('express-session');
const cookieParser = require('cookie-parser');
//used for file upload
const cors = require('cors');
const multer = require('multer');
const path = require('path');
//used for password encryption
const bcrypt = require('bcrypt');
const { response } = require('express');
const saltRounds = 10;


const storage = multer.diskStorage({
    destination:(req,file,cb) =>{
        cb(null,"./");
    },
    filename: function(req,file,cb){
        const ext = file.mimetype.split("/")[1];
        cb(null, 'uploads/'+file.originalname);

    }
});
const upload = multer({
    storage: storage
})
app.use(express.json());
//use cors to allow cross origin resource sharing
app.use(
    cors({
        origin: 'http://localhost:3000', 
        methods: ["GET", "POST"],
        credentials: true
    })
);

//Allow Access Control
app.use(function(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS,POST,PUT,DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers');
    res.setHeader('Cache-Control', 'no-cache');
    next();
  });

app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));

const db = mysql.createConnection({
    user: "root",
    host: "localhost",
    password: "password",
    database: "loginsystem"
});
//register api
app.post('/register', (req,res) => {
    let name = req.body.name;
    let email = req.body.email;
    let password = req.body.password;

    bcrypt.hash(password, saltRounds, (err, hash) => {
        db.query(
            "INSERT INTO users (name, email, password) VALUES (?,?,?)",
            [name, email,hash],
            (err, result) => {
            if(err) {
                res.send({err: err})
            }
            if (result){
                //return succes to front end
                res.writeHead(200,{
                    'Content-Type' : 'text/plain'
                })
                res.end("Successful Login");
            }
            else{
                //return unsuccesful to front end
                res.writeHead(201,{
                    'Content-Type' : 'text/plain'
                })
                res.end("Unsuccessful Login");
            }
            }
        );
    })
    
});

//register new shop 
app.post('/registerShop', function (req, res) {

    db.query(
        "SELECT * FROM users WHERE shopname=?",
        [req.body.shopName],
        (err, result) => {
        if(err) {
            res.send({err: err})
        }
        if (result.length > 0 ){
            res.writeHead(201,{
                'Content-Type' : 'text/plain'
            })
            res.end("NAME TAKEN");
        }
        else{
            db.query(
                "UPDATE users SET shopname=? WHERE name=?",
                [req.body.shopName,req.body.username]
            );
            //return unsuccesful to front end
            res.writeHead(200,{
                'Content-Type' : 'text/plain'
            })
            res.end("SHOP NAME VALID");
        }
        }
    );
});

//log in api
app.post('/login', (req,res) => {
    let email = req.body.email;
    let password = req.body.password;
    db.query(
        "SELECT * FROM users WHERE email = ?",
        email,
        (err, result) => {
        if(err) {
            res.send({err: err})
        }
        if (result.length > 0){
            bcrypt.compare(password, result[0].password, (err, response) => {
                if (response){
                    res.cookie('cookie',req.body.email,{maxAge: 900000, httpOnly: false, path : '/'});
                    //email and password match
                    res.writeHead(200,{
                        'Content-Type' : 'text/plain'
                    })
                    res.end("Successful Login");
                } else {
                    //password does not match account
                    res.writeHead(201,{
                        'Content-Type' : 'text/plain'
                    })
                    res.end("Unsuccessful Login");
                }
            });
        }
        else{
            //user account does not exist
            res.writeHead(201,{
                'Content-Type' : 'text/plain'
            })
            res.end("Unsuccessful Login");
        }
        }
    );
});
//API got get shop items and details
app.post("/getShopData", (req, res)=>{
    let shopDetails = [];
    let owner = false; 
    db.query(
        "SELECT * FROM products WHERE shopname=?",
        [req.body.shopname],
        (err, result) => {
        if(err) {
            res.send({err: err})
        }else{   
            //shopDetails.push(result);
            shopDetails.push(result);
            db.query(
                "SELECT * FROM users WHERE shopname=?",
                [req.body.shopname],
                (err, myresult) => {
                if(err) {
                    res.send({err: err})
                }else{
                    console.log(myresult[0].email);
                   
                    if(myresult[0].email==req.body.username){
                        owner = true;
                    }
                    console.log(owner);
                    shopDetails.push(myresult);
                    shopDetails.push(owner);
                    console.log(shopDetails);
                    res.send(JSON.stringify(shopDetails));
                }
                }
            );
        }
        }
    );
});
//get profile api
app.get("/retrieveprofile", (req, res)=> {
    let user = req.query.user;
    console.log(user);
    db.query(
      "SELECT * FROM users WHERE email= ?",
      [user],
      (err, result) =>{
        if(err) {
            res.send({err: err})
        } else {
          response.json(result);
        }
      }
    );
  });

//Route to get All Books when user visits the Home Page
app.post('/getproducts', (req,res)=>{
    //console.log("Inside Home");
    let term = '%' + req.body.term +'%';
    let minPrice = req.body.minPrice;
    let maxPrice = req.body.maxPrice;
    let sortBy = req.body.selectedOption;
    let myquery;
    let vaules;
    //check if price range is active
    //oerder by default is ascending order
    if (minPrice >=0 && maxPrice>0){
        myquery = "SELECT * FROM products WHERE (name LIKE N?) AND (price BETWEEN ? AND ?) ORDER BY ??";
        values = [term, minPrice, maxPrice, sortBy]
    }else{
        //return regular query
        myquery = "SELECT * FROM products WHERE name LIKE N? ORDER BY ??";
        values = [term, sortBy]
    }
    db.query(
        myquery,values,
        (err, result) =>{
          if(err) {
              res.send({err: err})
          } else {
            //console.log("Products : ",JSON.stringify(result));
            res.send(JSON.stringify(result));
          }
        }
      );    
})


app.post('/getitem', function (req, res) {
    //console.log(req.body)
    db.query(
        "SELECT * FROM products WHERE id=? ",
        [req.body.id],
        (err, result) => {
        if (result.length > 0 ){
           // {user}JSON.stringify(books)
            //return succes to front end
            res.writeHead(201,{
                'Content-Type' : 'text/plain'
            })
            res.end(JSON.stringify(result));
        }
        }
    );
});

//Store selected item to favorites DB
app.post('/addToFavorites', (req,res) => {
        db.query(
            "INSERT INTO favorites (user,itemId) VALUES (?,?)",
            [req.body.username,req.body.id],
            (err, result) => {
            if(err) {
                res.send({err: err})
            }
            if (result){
                //ITEM STORED SUCCESSFULLY
                res.writeHead(200,{
                    'Content-Type' : 'text/plain'
                })
                res.end("Successful Insert");
            }
            else{
                //FAILED TO ADD ITEM TO FAVORITES DB
                res.writeHead(201,{
                    'Content-Type' : 'text/plain'
                })
                res.end("Unsuccessful Insert");
            }
            }
        );
   // })
    
});
//api to retrieve user favorites 
app.post('/getMyFavorites', (req,res)=>{
    console.log(req.body);
    console.log("Inside Fvorites");

    db.query(
        "SELECT itemId, quantity FROM favorites WHERE user=?",[req.body.username],
        (err, result) =>{
          if(err) {
              res.send({err: err})
          } else {
            
            let items = [];
            let quantity = [];
            
            result.map((re)=>items.push(re.itemId));
            result.map((re)=>quantity.push(re.quantity));
            console.log(items);
            //console.log("Cart Items : ",JSON.stringify(result));
            //res.send(JSON.stringify(result));
            if(items.length >0){
                const query = "SELECT * FROM products WHERE id in (?"+",?".repeat(items.length-1)+")";
                
                db.query(query, items, function (err, result) {
                    if (err) {
                      throw err;
                    } else {
                      let quantityPrice = 0;
                      result.map((re, index) => (re.quantity = quantity[index]));
                      //result.map((re,index)=>(quantityPrice = re.price * quantity[index] + quantityPrice))
                      //let mycombinedresult = [];
                      //mycombinedresult.push(result);
                      //mycombinedresult.push(quantityPrice.toString())
                      //console.log("Purchased History: ",JSON.stringify(mycombinedresult));
                      res.send(JSON.stringify(result));
                      
                    }
                  });
                } else {
                  res.end("EMPTY");
                }
            }
          }
        );
      });
//insert cart
app.post('/addToCart', (req,res) => {
    console.log(req.body);
    let name = req.body.username;
    let id = req.body.id;
    let quantity = req.body.quantity;
   // bcrypt.hash(password, saltRounds, (err, hash) => {
        db.query(
            "INSERT INTO cart (user,itemId,quantity) VALUES (?,?,?)",
            [name,id,quantity],
            (err, result) => {
            if(err) {
                res.send({err: err})
            }
            if (result){
                //return succes to front end
                res.writeHead(200,{
                    'Content-Type' : 'text/plain'
                })
                res.end("Successful Insert");
            }
            else{
                //return unsuccesful to front end
                res.writeHead(201,{
                    'Content-Type' : 'text/plain'
                })
                res.end("Unsuccessful Insert");
            }
            }
        );
   // })
    
});
//get cart and total price 
app.post('/getCart', (req,res)=>{
    console.log(req.body);
    console.log("Inside Cart");

    db.query(
        "SELECT itemId, quantity FROM cart WHERE user=?",[req.body.username],
        (err, result) =>{
          if(err) {
              res.send({err: err})
          } else {
            
            let items = [];
            let quantity = [];
            
            result.map((re)=>items.push(re.itemId));
            result.map((re)=>quantity.push(re.quantity));
            console.log(items);
            //console.log("Cart Items : ",JSON.stringify(result));
            //res.send(JSON.stringify(result));
            if(items.length >0){
                const query = "SELECT * FROM products WHERE id in (?"+",?".repeat(items.length-1)+")";
                
                db.query(query, items, function (err, result) {
                    if (err) {
                      throw err;
                    } else {
                      let quantityPrice = 0;
                      result.map((re, index) => (re.quantity = quantity[index]));
                      result.map((re,index)=>(quantityPrice = re.price * quantity[index] + quantityPrice))
                      console.log(quantityPrice)
                      let mycombinedresult = [];
                      mycombinedresult.push(result);
                      mycombinedresult.push(quantityPrice.toString())
                      console.log();
                      console.log(mycombinedresult);
                      //response.json(quantityPrice);
                      console.log("Cart Items : ",JSON.stringify(mycombinedresult));
                      res.send(JSON.stringify(mycombinedresult));
                      
                    }
                  });
                } else {
                  res.end("EMPTY");
                }
            }
          }
        );
      });
    
//get cart and total price 
app.post('/purchaseHistory', (req,res)=>{
    console.log(req.body);
    console.log("Inside Cart");

    db.query(
        "SELECT itemId, quantity FROM purchase WHERE user=?",[req.body.username],
        (err, result) =>{
          if(err) {
              res.send({err: err})
          } else {
            
            let items = [];
            let quantity = [];
            
            result.map((re)=>items.push(re.itemId));
            result.map((re)=>quantity.push(re.quantity));
            console.log(items);
            //console.log("Cart Items : ",JSON.stringify(result));
            //res.send(JSON.stringify(result));
            if(items.length >0){
                const query = "SELECT * FROM products WHERE id in (?"+",?".repeat(items.length-1)+")";
                
                db.query(query, items, function (err, result) {
                    if (err) {
                      throw err;
                    } else {
                      let quantityPrice = 0;
                      result.map((re, index) => (re.quantity = quantity[index]));
                      result.map((re,index)=>(quantityPrice = re.price * quantity[index] + quantityPrice))
                      let mycombinedresult = [];
                      mycombinedresult.push(result);
                      mycombinedresult.push(quantityPrice.toString())
                      //console.log("Purchased History: ",JSON.stringify(mycombinedresult));
                      res.send(JSON.stringify(mycombinedresult));
                      
                    }
                  });
                } else {
                  res.end("EMPTY");
                }
            }
          }
        );
      });
//api to handle confim purchase by user
app.post("/purchase", function (req, res) {
        const items = req.body.items;
        console.log(req.body);
        items.map((item) => {
          db.query(
            "INSERT INTO `purchase`(`itemId`, `user`,`quantity`, `total`) VALUES (?,?,?,?)",
            [item.id, req.body.username, item.quantity,req.body.total],
            function (error, res) {
              if (error) {
                throw error;
              }
            }
          );
        });
        items.map((item) => {
          db.query(
            "DELETE FROM `cart` WHERE `itemId`=? AND `user`=?",
            [item.id, req.body.username],
            function (error, res, fields) {
              if (error) {
                throw error;
              }
            }
          );
        });
        items.map((item) => {
          db.query(
            "UPDATE `products` SET `quantity`=`quantity`-? WHERE `id` = ?",
            [item.quantity, item.id],
            function (error, res, fields) {
              if (error) {
                throw error;
              }
            }
          );
        });
        items.map((item) => {
            db.query(
              "UPDATE `products` SET `salesCount`=`salesCount`+? WHERE `id` = ?",
              [item.quantity, item.id],
              function (error, res, fields) {
                if (error) {
                  throw error;
                }
              }
            );
          });
        res.send("SUCCESS");
      });


// uploads
app.use('/', express.static(path.join(__dirname, '/')));
//update profile api
app.post('/update' ,upload.single('image'), (req,res) => {
    console.log(req.file);
    if(req.file==undefined){
        imagename="";
    }
    let username = req.body.username;
    //fisrt retrieve profile info from user
    db.query(
        "SELECT * FROM users WHERE email= ?",
        [username],
        (err, myresult) =>{
          if(err) {
            res.send({err: err})
          }else{
            //if value entry is blank, db will update
            //else leave value the same
            console.log(myresult);
            let result = Object.assign({}, ...myresult);
            let image = "";
            if(req.file ==undefined){
                image = result.image;
            }else{
                image = req.file.filename;
            }
            let name = req.body.name ==="" ? result.name : req.body.name;
            let email = req.body.email ==="" ? result.email : req.body.email;
            let about = req.body.about ==="" ? result.about : req.body.about;
            let phone = req.body.phone ==="" ? result.phone : req.body.phone;
            let address = req.body.address ==="" ? result.address : req.body.address;
            let country = req.body.country ==="" ? result.country : req.body.country;
            let birthday = req.body.birthday ==="" ? result.birthday : req.body.birthday;
            let city = req.body.city ==="" ? result.city : req.body.city;
            //update db 
            if(myresult.length>0){
                db.query(
                "UPDATE users SET name=?, email= ?, about =?, phoneNum=?, address=?, country=?, birthday=?, city=?, picture=? WHERE email=?",
                [name,email,about,phone,address,country,birthday,city,image,username],
                (err, result1) => {
                if (result1){    
                    console.log(result1);
                    res.writeHead(200,{
                        'Content-Type' : 'text/plain'
                    });
                    res.end("Successful Update");
                } else {
                    //password does not match account
                    res.writeHead(201,{
                        'Content-Type' : 'text/plain'
                    })
                    res.end("Not able to update");
                }
                });
            }else{
                res.end("Unsuccessful Login");
            }

          }
        });
});

app.post('/shopImageUpdate' ,upload.single('image'), (req,res) => {
    console.log(req.file);
    let username = req.body.username;
    //fisrt retrieve profile info from user
    db.query(
        "UPDATE users SET shopimage=? WHERE email= ?",
        [req.file.filename, username],
        (err, result) =>{
            if (result){    
                res.writeHead(200,{
                    'Content-Type' : 'text/plain'
                });
                res.end("Successful Update");
            } else {
                //password does not match account
                res.writeHead(201,{
                    'Content-Type' : 'text/plain'
                })
                res.end("Not able to update");
            }
        }
      );

});
app.post('/editItem' ,upload.single('image'), (req,res) => {
    console.log(req.file);
    console.log(req.body);
    let username = req.body.username;
    //fisrt retrieve profile info from user
    db.query(
        "SELECT * FROM products WHERE name=?",
        [req.body.itemname],
        (err, result) =>{
            if (result){    
                db.query(
                    "UPDATE products SET name=?,price=? WHERE name=?",
                    [req.body.itemname,req.body.price,req.body.itemname],
                    (err, result1) =>{
                        if (result1){    
                            res.writeHead(200,{
                                'Content-Type' : 'text/plain'
                            });
                            res.end("Successful Added");
                        } else {
                            //password does not match account
                            res.writeHead(201,{
                                'Content-Type' : 'text/plain'
                            })
                            res.end("Not able to add");
                        }
                    });
            } else {
                //password does not match account
                res.writeHead(201,{
                    'Content-Type' : 'text/plain'
                })
                res.end("Not able to add");
            }
        }
      );
    }
);
app.post('/addItem' ,upload.single('image'), (req,res) => {
    console.log(req.file);
    console.log(req.body);
    let username = req.body.username;
    //fisrt retrieve profile info from user
    db.query(
        "SELECT * FROM users Where email=?",
        [username],
        (err, result) =>{
            if (result){  
                db.query(
                    "INSERT INTO products (name, category,price,description, shopOwner, quantity, salesCount, image, shopname) VALUES(?,?,?,?,?,?,?,?,?)",
                    [req.body.itemname,req.body.category, req.body.price,req.body.description, username, req.body.quantity,0,req.file.filename,result[0].shopname],
                    (err, result1) =>{
                        if (result1){    
                            res.writeHead(200,{
                                'Content-Type' : 'text/plain'
                            });
                            res.end("Successful Added");
                        } else {
                            //password does not match account
                            res.writeHead(201,{
                                'Content-Type' : 'text/plain'
                            })
                            res.end("Not able to add");
                        }
                    });
            } else {
                //password does not match account
                res.writeHead(201,{
                    'Content-Type' : 'text/plain'
                })
                res.end("Not able to add");
            }
        }
      );

});

//start your server on port 3001
app.listen(3001);
console.log("Server Listening on port 3001");