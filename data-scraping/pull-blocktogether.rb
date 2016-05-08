#!/bin/env ruby
#
# pull-blocktogether.rb
#
# ...
# 

require 'nokogiri'
require 'open-uri'

require 'oauth2'

require 'json'

def main
	blocktogether_uri = ARGV[0]

	bt_page = Nokogiri::HTML(open(blocktogether_uri)) 

	user = bt_page.css("a.screen-name")[0].text.gsub(/[\s@]/, "")

	pages = bt_page.css(".nav-page a").map do |a|
		blocktogether_uri + "?page=" + a.text
	end

	user_data = {
		"name" => user,
		"blocks" => (fetchBlocks pages),
		"friends" => (fetchFriends user),
		"followers" => (fetchFollowers user),
	}

	File.open("user-data/" + user, "w") do |data_file|
		data_file.write(JSON.generate(user_data))
	end

end

def fetchBlocks(pages)
	pages.map do |page|
		Nokogiri::HTML(open(page)).css(".blocked-user a.screen-name").map do |a|
			a.text.strip
		end
	end
end

def fetchFriends(screen_name)
	fetchTwitterData(screen_name, "/1.1/friends/ids.json")
end

def fetchFollowers(screen_name)
	fetchTwitterData(screen_name, "/1.1/followers/ids.json")
end

def fetchTwitterData(screen_name, path)
	secret = File.open("secret", "r") { |s| s.read.strip }

	options = {
		:site => "https://api.twitter.com" ,
		:token_url => "/oauth2/token"
	}

	client = OAuth2::Client.new("tZqXTGS6HsUqHutJjnbTmiEjR", secret, options)

	token = client.client_credentials.get_token

	cursor = "-1"
	all_ids = []
	request_count = 0

	until cursor == "0"
		ids, cursor = token.get(path, :params => {
			:screen_name => screen_name,
			:stringify_ids => true,
			:cursor => -1,
		}, :opts => { :parse => :json }).parsed.values_at("ids", "next_cursor_str")

		all_ids += ids

		request_count++

		(sleep 900) if (request_count % 15 == 0)
	end

	all_ids
end

main
