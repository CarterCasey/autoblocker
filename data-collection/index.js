/* index.js
 * 
 * Back-end server for collecting user data during the training period
 * for the MaxEnt AutoBlocker. Has two components: user authorization,
 * and data collection.
 * 
 * User Authorization:
 * 
 * 
 * Data Collection:
 * Recieves POST requests of the JSON form
 * { id : <int>, blocked: [<int>], friends: [<int>], followers: [<int>] }
 * 
 * On any failure to validate a request, returns 400 to user. Othwerise,
 * 200 is returned.
 * 
 * Data is saved directly to disk under the user's ID. Yes, this is silly,
 * but I'm planning on running this server on a Raspberry Pi, and since
 * MongoDB (the fastest way to get started for me) isn't available, I'm
 * sticking to the simplest possible form of storage. 
 */
var app = require("express")();
var body_parser = require("body-parser");
var url = require("url");
var fs = require("fs");

var OAuth = require("oauth").OAuth;

var MAX_LIST = 1000;

var USER_URL = "https://api.twitter.com/1.1/account/verify_credentials.json" +
               "?include_entities=false&skip_status=true"                    ;

var BLOCKS_URL = "https://api.twitter.com/1.1/blocks/ids.json" +
                 "?stringify_ids=true&cursor=-1"               ;
                 
var FRIENDS_PARTIAL = "https://api.twitter.com/1.1/friends/ids.json"      +
                      "?cursor=-1&stringify_ids=true&count=1000&user_id=" ;
                  
var FOLLOWERS_PARTIAL = "https://api.twitter.com/1.1/followers/ids.json"    +
                        "?cursor=-1&stringify_ids=true&count=1000&user_id=" ;

function loadSecret() { return fs.readFileSync("secret").toString().replace(/\s/, ""); }

function main ()
{
    app.use(body_parser.json()).use(body_parser.urlencoded({ extended: true }));
    app.use(function (err, request, response, next) {
        response.sendStatus(err.status);
    });
    
    var oa = buildOAuth();
    
    app.get("/auth/twitter", function (request, response) {
        oa.getOAuthRequestToken(function (err, token, secret, results) {
            if (err) {
                response.sendStatus(err.status || 400);
            } else {
                request.session = {};
                request.session.oauth = { token:token, secret:secret };
                response.redirect(
                    "https://api.twitter.com/oauth/authorize?oauth_token=" + token
                );
            } 
        });
    });
    
    // TODO: Clean up this mess of callbacks.
    app.get("/collect_data", function(request, full_response) {
        var query = url.parse(request.url, true).query;
        
        var token = query.oauth_token;
        var secret = loadSecret();
        var verifier = query.oauth_verifier;
        
        oa.getOAuthAccessToken(token, secret, verifier, function (err, access_token, access_secret, results) {
            oa.get(USER_URL, access_token, access_secret, function (err, user_data, response) {
                if (err) {
                    full_response.sendStatus(err.status || 400);
                } else {
                    var id = JSON.parse(user_data).id_str;
                    var friends_url = FRIENDS_PARTIAL + id;
                    var followers_url = FOLLOWERS_PARTIAL + id;                    
                    
                    oa.get(BLOCKS_URL, access_token, access_secret, function (err, blocks_data, response) {
                        if (err) {
                            full_response.sendStatus(err.status || 400);
                        } else {
                            oa.get(friends_url, access_token, access_secret, function (err, friends_data, response) {
                                if (err) {
                                    full_response.sendStatus(err.status || 400);
                                } else {
                                    oa.get(followers_url, access_token, access_secret, function (err, followers_data, response) {
                                        if (err) {
                                            full_response.sendStatus(err.status || 400);
                                        } else {
                                            console.log(id, blocks_data, friends_data, followers_data);
                                            store(id, JSON.parse(blocks_data).ids, JSON.parse(friends_data).ids, JSON.parse(followers_data).ids);
                                        }
                                    });
                                }
                            });
                        }
                    });
               }
            }); 
        });
    });

    app.listen(8000);
}

function isInt (val) { return !isNaN(val) && val === parseInt(val); }

function store (id, blocks, friends, followers)
{
    var clean_data = {
        id:id,
        blocks:blocks.slice(0, MAX_LIST),
        friends:friends.slice(0, MAX_LIST),
        followers:followers.slice(0, MAX_LIST),
    };

    // WARNING: This will overwrite previously written data.
    fs.writeFile(id.toString(), JSON.stringify(clean_data), function (err) {
       if (err) console.error(err);
    });
}

function buildOAuth ()
{
    var secret = loadSecret();
    
    return new OAuth(
        "https://api.twitter.com/oauth/request_token",
        "https://api.twitter.com/oauth/access_token",
        "tZqXTGS6HsUqHutJjnbTmiEjR",
        secret,
        "1.0",
        "http://127.0.0.1:8000/collect_data",
        "HMAC-SHA1"
    );
}

main();