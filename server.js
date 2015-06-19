var express = require('express');
var request = require('request');
var htmlparser = require('htmlparser2');
var app = express();

var server = app.listen(8080, function () {

    var host = server.address().address;
    var port = server.address().port;
    
    var logger = require('morgan');
    
    app.use(express.static('./'));
    app.use(logger("combined", {}));

    function processFrontPage(res, url) {
    }

    function getFrontPage(url, res) {
        html = request(url, function (error, response, body) {
            var stories = [];
            if(!error) {
                var lookForA = false, foundA = false, textIndex = 0;
                var table = 0, id = 0, story;
                var parser = new htmlparser.Parser({
                    onopentag: function (name, attribs) {
                        var as = "";
                        if(name === 'table') {
                            table++;
                        }
                        if(table == 2) {
                            if(!lookForA) {
                                if(name === 'td' && attribs.class === 'title') {
                                    lookForA = true;
                                    story = { 'id': id++ }
                                }
                            } else {
                                if(name === 'a') {
                                    foundA = true;
                                    lookForA = false;
                                    href = attribs.href;
                                }
                            }
                        }
                    },
                    onclosetag: function (name, attribs) {
                        if(name === 'table') {
                            table--;
                        }
                    },
                    ontext: function(text) {
                        if(text == 'More')
                            foundA = false;

                        if(foundA) {
                            switch(textIndex) {
                            case 0:
                                story.title = text;
                                story.link = href;
                                break;
                            case 1:
                                story.author = text;
                                break;
                            case 2:
                                story.when = text;
                                break;
                            case 3:
                                if(text.indexOf('comment') >= 0 ||
                                   text.indexOf('discuss') == 0) {
                                    story.comments = text;
                                    story.commentsLink = href;
                                    stories.push(story);
                                    textIndex = -1;
                                } else {
                                    // for those HN job stories
                                    story.title = text;
                                    story.link = href;
                                    textIndex = 0;
                                }
                                break;
                            }
                            textIndex++;
                            lookForA = true;
                            foundA = false;
                        }
                    }
                });

                parser.write(body);
            }
            res.send(JSON.stringify(stories));
        });
    }

    app.get("/api/home", function (req, res) {
        getFrontPage("https://news.ycombinator.com", res);
    });
    
    app.get("/api/new", function (req, res) {
        getFrontPage("https://news.ycombinator.com/newest", res);
    });
    
    app.get("/api/comments/item", function (req, res) {
        html = request("https://news.ycombinator.com/item?id=" + req.query.id, function (error, response, body) {
            var comments = [];
            if(!error) {
                var id = 0, foundUser = false, foundComment = false, foundFont = false;
                var comment, indent, prevIndent = 0;
                var indentStack = [];

                var parser = new htmlparser.Parser({
                    onopentag: function (name, attribs) {
                        if(name == 'a') {
                            if(attribs.href.indexOf('vote') === 0) {
                                comment = { text: "", voteLink: attribs.href }
                            } else if(attribs.href.indexOf('user') === 0) {
                                foundUser = true;
                                comment.user =  attribs.href.split('=')[1];
                                comment.userLink = attribs.href;
                            } else if(attribs.href.indexOf('reply') === 0) {
                                comment.replyLink =  attribs.href;
                            }
                        }
                        if(name == 'span' && attribs.class == 'comment') {
                            foundComment = true;
                        }
                        if(foundComment && name == 'font') {
                            foundFont = true;
                        }
                        if(foundFont && name == 'p') {
                            comment.text += '<p/>';
                        }
                        if(name == 'img' && attribs.src == 's.gif') {
                            prevIndent = indent;
                            indent = Math.trunc(attribs.width / 40);
                        }

                    }, 
                    onclosetag: function (name, attribs) {

                        function insertComment(comments, comment, depth) {
                            if(depth === 0) {
                                comments.push([comment]);
                            } else {
                                var tmp = comments;
                                while(--depth >= 0 &&
                                      Array.isArray(tmp[tmp.length-1])) {
                                    tmp = tmp[tmp.length-1];
                                }
                                tmp.push([comment]);
                            }
                        }

                        if(foundFont && name == 'font') {
                            insertComment(comments, comment, indent);
                            foundFont = false;
                        }
                    },
                    ontext: function(text) {
                        if(foundUser) {
                            comment.user = text;
                            foundUser = false;
                        }
                        if(foundFont) {
                            comment.text += text
                            foundComment = false;
                        }
                    }
                });

                parser.write(body);
            }
            res.send(JSON.stringify(comments));
        });
    });
    
    console.log('HN Reader server listening on port: %s', port);

});
