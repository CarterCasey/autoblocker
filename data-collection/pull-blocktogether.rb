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

	File.open("name-keyed/" + user, "w") do |data_file|
		data_file.write(JSON.generate(user_data))
	end
end

def fetchBlocks(pages)
	puts "Scraping names from Block Together"
	pages.map do |page|
		puts "Page: " + page
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
		:site => "https://api.twitter.com",
		:token_url => "/oauth2/token"
	}

	client = OAuth2::Client.new("tZqXTGS6HsUqHutJjnbTmiEjR", secret, options)

	token = client.client_credentials.get_token

	cursor = "-1"
	all_ids = []
	request_count = 0

	puts "Requesting IDs from " + path

	until cursor == "0"
		puts "Requests: " + request_count.to_s
		puts "Cursor: " + cursor
		puts "IDs: " + all_ids.length.to_s

		ids, cursor = token.get(path, :params => {
			:screen_name => screen_name,
			:stringify_ids => true,
			:cursor => cursor,
		}, :opts => { :parse => :json }).parsed.values_at("ids", "next_cursor_str")

		all_ids += ids

		request_count += 1

		(sleep 900) if (request_count % 15 == 0)
	end

	all_ids
end

main
