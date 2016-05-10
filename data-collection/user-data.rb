#!/bin/env ruby

require 'oauth2'
require 'json'

def main
	file_name = ARGV[0]

	name_keyed = (file_name =~ /name-keyed\//)

	preliminary_data = File.open(file_name, "r") do |user_file|
		JSON.parse(user_file.read)
	end

	populated_data = populateData(preliminary_data, name_keyed)

	user_id = populated_data["user_id"] || preliminary_data["screen_name"]
	File.open("populated-data/" + user_id, "w") do |data_file|
		data_file.write(JSON.generate(populated_data))
	end
end

def populateData(preliminary_data, name_keyed)
	id_type = (name_keyed ? "screen_name" : "user_id")

	populated_data = {
		id_type => preliminary_data[id_type],
		"user" => fetchUserData(preliminary_data[id_type], name_keyed),
		"blocks" => [], "friends" => [], "followers" => []
	}

	others = preliminary_data.values_at("blocks", "friends", "followers")
	min_length = others.map{ |arr| arr.length }.min

	min_length.times do |i|
		["blocks", "friends", "followers"].each do |other_type|
			users = preliminary_data[other_type]
			populated_data[other_type] << fetchUserData(users[i], name_keyed)
		end
	end

	populated_data
end

def fetchUserData(user_id, name_keyed)
	puts user_id
	fetchTwitterData("/1.1/statuses/user_timeline.json", {
		(name_keyed ? :screen_name : :user_id) => user_id,
		:count => 100, :trim_user => true
	})
end

def fetchTwitterData(path, params)
	secret = File.open("secret", "r") { |s| s.read.strip }

	options = {
		:site => "https://api.twitter.com",
		:token_url => "/oauth2/token"
	}

	client = OAuth2::Client.new("tZqXTGS6HsUqHutJjnbTmiEjR", secret, options)

	token = client.client_credentials.get_token

	begin 
		token.get(path, :params => params, :opts => { :parse => :json }).parsed
	rescue OAuth2::Error => e
		if e.code == "Not authorized."
			user_id = params[:user_id] || params[:screen_name] 
			puts "Not authorized to fetch #{user_id}"
			return nil
		elsif e.response.headers["x-rate-limit-remaining"] == "0"
			remaining = e.response.headers["x-rate-limit-reset"].to_i - Time.new.to_i
			puts "Sleeping #{remaining} seconds to reset rate limit"
			sleep remaining
			token.get(path, :params => params, :opts => { :parse => :json }).parsed
		else
			raise e
		end
	end
end

main
