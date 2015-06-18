var activeStory;
function showPage(url) {
    function showComments(title, id) {
        $.get('/api/comments/' + id, {}, function (data, status) {
            function addComments(list, comments) {
                for(var i = 0; i < comments.length; i++) {
                    var comment = comments[i];
                    if(Array.isArray(comment)) {
                        var newList = $('<ul></ul>');
                        list.append(newList);
                        addComments(newList, comment);
                    } else {
                        var $comment = $('<div class="comment"></div>');
                        var $close = $('<div style="float:right"><a>❌</a></div>');
                        $comment.html(comment.text +
                                      "<p/>--</br>" +
                                      '<a href="https://news.ycombinator.com/' +
                                      comment.voteLink + '" target="_blank">' +
                                      '▴</a> ' +
                                      '<a href="https://news.ycombinator.com/' +
                                      comment.userLink + '" target="_blank">' +
                                      comment.user + '</a>');
                        $comment.prepend($close);
                        $close.click($comment, function(e) {
                            e.data.parent().remove();
                        });
                        list.append($comment);
                    }
                }
            }

            comments = JSON.parse(data);
            $comments = $('#comments');
            $comments.html('');
            addComments($comments, comments);
        });
    };

    $('body').html('<div id="topbar">' +
                   'Hacker News Reader' + 
                   ' <span onClick="javascript:showPage(\'/api/home\');">[Home]</span>' + 
                   ' <span onClick="javascript:showPage(\'/api/new\');">[New]</span>' + 
                   '</div><div id="main"></div>');
    var $main = $('#main');
    var $sidebar = $('<div id="sidebar"></div>');
    var $comments = $('<div id="comments"></div>');
    $main.append($sidebar);
    $main.append($comments);

    $.get(url, {}, function (data, status) {
        stories = JSON.parse(data);
        for(var i = 0; i < stories.length; i++) {
            var story = stories[i];
            var $story = $('<div class="story"></div>');
            $story.html('<a href="' + story.link + '" target="_blank">' +
                        story.title + "</a><br/>[<a id='" +
                        story.id + "'>" + story.comments + "</a>]");
            $story.click([$story, story], function (e) {
                if(activeStory) {
                    activeStory.attr("class", "story");
                }
                $story = e.data[0];
                story = e.data[1];
                activeStory = $story
                $story.attr("class", "storyActive");
                showComments(story.title, story.commentsLink);
                window.scrollTo(0,0);
            });
            $('#sidebar').append($story);
        }
    });
}

$(document).ready(function () {
    showPage('/api/home');
});

