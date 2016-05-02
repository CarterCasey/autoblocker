/* index.js
 * 
 * Back-end server for collecting user data during the training period
 * for the MaxEnt AutoBlocker. Recieves POST requests of the JSON form
 * { id : <int>, blocked: [<int>], friends: [<int>], followers: [<int>] }
 * 
 * On any failure to validate a request, returns 400 to user. Othwerise,
 * 200 is returned.
 * 
 * Data is saved directly to disk under the user's ID. Yes, this is silly,
 * but I'm planning on running this server on a Raspberry Pi, and since
 * MongoDB (the fastest)
 */
var app = require("express")();
var body_parser = require("body-parser");
var fs = require("fs");

var MAX_LIST = 1000;

function main ()
{
    app.use(body_parser.json()).use(body_parser.urlencoded({ extended: true }));
    app.use(function (err, request, response, next) {
        response.sendStatus(err.status);
    });

    app.post("/", function (request, response) {
        data = request.body;
        
        if (validate(data)) {
            store(data);
            response.sendStatus(200);
        } else {
            response.sendStatus(400);
        }
    });

    app.listen(8000);
}

function isInt (val) { return !isNaN(val) && val === parseInt(val); }

function validate (data)
{
    if (!data.id || !data.friends || !data.followers || !data.blocked) return false;
    
    if (!isInt(data.id)) return false;
    
    var data_ok = true;      
  
    [data.friends, data.followers, data.blocked].map(function (member) {        
        data_ok = data_ok && Array.isArray(member);
        
        member.map(function (id) {
            data_ok = data_ok && isInt(id);
        });
    });
    
    return data_ok;
}

function store (data)
{
    var clean_data = {
        id:data.id,
        blocked:data.blocked.slice(0, MAX_LIST),
        friends:data.friends.slice(0, MAX_LIST),
        followers:data.followers.slice(0, MAX_LIST),
    };

    // WARNING: This will overwrite previously written data.
    fs.writeFile(data.id.toString(), JSON.stringify(clean_data), function (err) {
       if (err) console.error(err);
    });
}

main();