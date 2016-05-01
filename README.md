# MaxEnt AutoBlocker
Home base for the AutoBlocker twitter app. (AKA my final project for Natural Language Processing)

*Note: The remaining contents of this readme describe a more ambitious project than the one I'm currently attempting. It's the proposal I wrote up while thinking about what topic I'd like to explore for my final project, and while it would be good of me to clean it up to be more descriptive of the contents of this repo, writing code will almost certainly come first.*  

## Purpose

Many forms of social media involve exposure to outside sources without a robust
form of filtering. While one may block individual users on a case-by-case
basis, often this means the user has already been exposed to the negative
content, and has already had a negative experience. Rather than leaving the
user to fend for themself, I propose a filter that flags users and messages as
potentially negative before the user is ever exposed. Based on the user's
preferences, both implicit and explicit, the filter will judge whether the user
or message will be considered negative by the user. Ideally, it will also
classify the negativity as either directed (e.g. the user is sending abusive
language) or undirected (e.g. the user is discussing something triggering).  


## User filtering

The filter will evaluate a user based on two criteria:

### Association with other blocked/filtered users.

* Does the user belong to a cluster of users that the user doesn't like? (Graph Theory)

* Does the user generate content similar to that of other users the user doesn't like?

### Content the user typically generates.

* Is the content frequently similar to other content the user doesn't like?

* Does the content frequently contain words/ideas the user doesn't like?
        - Is the negative content directed at the user (abusive)?
        - Is the content negative without the generator being found at fault (triggering)?


## Message filtering

The filter will apply the above criteria and the following additional criteria:

### Content of the message.

* Is the content similar to other messages the user doesn't like?

* Does the message contain words/ideas the user doesn't like?
        - Is the negative content directed at the user (abusive)?
        - Is the content negative without the generator being found at fault (triggering)?

## Anonymous Message filtering

In the event that messages cannot be associated with a particular user, message
filtering can be applied without user filtering. To the same end, negative
anonymous messages could be associated with a special anonymous "user" - this
may (or may not) allow us to keep useful data for filtering.


## Implementation

The bulk of the filtering would be done using techniques from Natural Language
Processing, with the single exception of testing whether a user is clustered or
associated with other blocked users. This would require measurements from graph
theory.  

Possible measurements for determining whether to block/flag:

* Frequency with which words (bigrams?) are observed in content generated by blocked vs. approved users.
* Frequency with which words (bigrams?) are observed in blocked vs approved content.
* For the above, instead of simply looking at frequencies, look at sentiment.
* Difference between shortest path to blocked users and shortest path to approved users.

Once blocked, we can attempt to classify further: are we blocking abusive or triggering
content? This might require some further classification when the user does blocking.
We can use the same frequency analysis as above, but instead make comparisons between
content blocked because it was triggering and content blocked because it was abusive.
