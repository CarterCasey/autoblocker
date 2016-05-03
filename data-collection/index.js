/* index.js
 * 
 * Back-end server for collecting user data during the training period
 * for the MaxEnt AutoBlocker. Gets user authorization, then requests
 * ID, block list, following list, and followers list.
 * 
 * All data is saved directly to disk - this is innefficient, yes,
 * but I'm running off of a Rasperry Pi and can't install the
 * database with which I'm most familiar (MongoDB).
 */
var express = require("express");
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
    var app = express();
    
    app.use(body_parser.json()).use(body_parser.urlencoded({ extended: true }));
    app.use(function (err, rq, rs, nx) { response.sendStatus(err.status); });
    
    var oa = buildOAuth();
    
    app.get("/auth/twitter", authorize(oa));
    
    // TODO: Clean up this mess of callbacks.
    app.get("/collect_data", collectData(oa));

    app.listen(8000);
}

function authorize(oa)
{
    return function (request, response) {
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
    }
}


function collectData (oa)
{
    return function (request, full_response) {
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
                                            store(id, JSON.parse(blocks_data).ids, JSON.parse(friends_data).ids, JSON.parse(followers_data).ids);
                                            full_response.redirect("http://autoblocker.cartercasey.com/thanks.html");
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        });
    }
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
        "http://home.cartercasey.com:8000/collect_data",
        "HMAC-SHA1"
    );
}

main();
