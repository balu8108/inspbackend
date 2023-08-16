const express= require('express');
const { registerStudent, routechecking } = require('../controllers/studentController');
const router=express.Router();

router.route('/check').post(routechecking)
router.route('/register').post(registerStudent)
module.exports=router;

// dynamic routing ,encrypted token,protected apis
// token will change immediately  for every user 
// Route will  be there {exampleDomain.com/{token}}
//exampleDomain.com-->redirect to their login page
//After successfull login -->test portal and video portal


//---- exampleDomain.com/{token}
//token-->backend->santosh's api (token)-->mobile no and subscription plan;
// Auth middleware (back-end) -> mobile no & subscription plan 
// rest api that will  help the user to get the filtered videos..
//statistics or attendance nhi chahiye 
//kick or block feature 