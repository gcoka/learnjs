"use strict";

var learnjs = {};

learnjs.appOnReady = function () {
    window.onhashchange = function () {
        learnjs.showView(window.location.hash);
    };
    learnjs.showView(window.location.hash);
    learnjs.identity.done(learnjs.addProfileLink);
}

learnjs.triggerEvent = function (name, args) {
    $(".view-container>*").trigger(name, args);
}

learnjs.landingView = function () {
    return learnjs.template("landing-view");
}

learnjs.profileView = function () {
    var view = learnjs.template("profile-view");
    learnjs.identity.done(function (identity) {
        view.find(".email").text(identity.email);
    });
    return view;
}

learnjs.problemView = function (problemNoHash) {
    var problemNumber = parseInt(problemNoHash, 10);
    var view = $(".templates .problem-view").clone();
    var problemData = learnjs.problems[problemNumber - 1];
    var resultFlash = view.find(".result");
    var answer = view.find(".answer");

    function checkAnswer() {
        var test = problemData.code.replace("__", answer.val()) + "; problem();";
        return eval(test);
    }

    function checkAnswerClick() {
        if (checkAnswer()) {
            learnjs.flashElement(resultFlash, learnjs.buildCorrectFlash(problemNumber));
            learnjs.saveAnswer(problemNumber, answer.val());
        } else {
            learnjs.flashElement(resultFlash, "Incorrect!");
        }
        // prevent not to page reload
        return false;
    }

    view.find(".check-btn").click(checkAnswerClick);
    var title = "Problem #" + problemNumber;
    view.find(".title").text(title);
    if (problemNumber < learnjs.problems.length) {
        var buttonItem = learnjs.template("skip-btn");
        buttonItem.find("a").attr("href", "#problem-" + (problemNumber + 1));
        $(".nav-list").append(buttonItem);
        view.bind("removingView", function () {
            buttonItem.remove();
        })
    }
    learnjs.applyObject(problemData, view);
    learnjs.fetchAnswer(problemNumber).then(function(data){
        if(data.Item){
            answer.val(data.Item.answer);
        }
    });
    return view;
}

learnjs.buildCorrectFlash = function (problemNumber) {
    var correctFlash = learnjs.template("correct-flash");
    var link = correctFlash.find("a");
    if (problemNumber < learnjs.problems.length) {
        link.attr("href", "#problem-" + (problemNumber + 1));
    } else {
        link.attr("href", "");
        link.text("You're Finished!");
    }
    return correctFlash;
}

learnjs.showView = function (hash) {
    var routes = {
        "#problem": learnjs.problemView,
        "#profile": learnjs.profileView,
        "#": learnjs.landingView,
        "": learnjs.landingView
    };
    var hashParts = hash.split("-");
    var viewFn = routes[hashParts[0]];
    if (viewFn) {
        learnjs.triggerEvent("removingView", []);
        $(".view-container").empty().append(viewFn(hashParts[1]));
    }

}

learnjs.applyObject = function (obj, elem) {
    for (var key in obj) {
        elem.find('[data-name="' + key + '"]').text(obj[key]);
    }
}

learnjs.flashElement = function (elem, content) {
    elem.fadeOut("fast", function () {
        elem.html(content);
        elem.fadeIn();
    });
}

learnjs.template = function (name) {
    return $(".templates ." + name).clone();
};

learnjs.addProfileLink = function (profile) {
    var link = learnjs.template("profile-link");
    link.find("a").text(profile.email);
    $(".signin-bar").prepend(link);
}

learnjs.poolId = "ap-northeast-1:7f339c56-d9be-4584-8e98-4c225e97eced";

learnjs.awsRefresh = function () {
    var deferred = new $.Deferred();
    AWS.config.credentials.refresh(function (err) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(AWS.config.credentials.identityId);
        }
    });
    return deferred.promise();
}

learnjs.identity = new $.Deferred();

function googleSignIn(googleUser) {

    function refresh() {
        return gapi.auth2.getAuthInstance().signIn({
            prompt: "login"
        }).then(function (userUpdate) {
            var creds = AWS.config.credentials;
            var newToken = userUpdate.getAuthResponse().id_token;
            creds.params.Logins["accounts.google.com"] = newToken;
            return learnjs.awsRefresh();
        });
    }

    var id_token = googleUser.getAuthResponse().id_token;
    AWS.config.update({
        region: "ap-northeast-1",
        credentials: new AWS.CognitoIdentityCredentials({
            IdentityPoolId: learnjs.poolId,
            Logins: {
                "accounts.google.com": id_token
            }
        })
    });

    learnjs.awsRefresh().then(function (id) {
        learnjs.identity.resolve({
            id: id,
            email: googleUser.getBasicProfile().getEmail(),
            refresh: refresh
        });
    });
}

learnjs.sendDbRequest = function (req, retry) {
    var promise = new $.Deferred();
    req.on("error", function (error) {
        if (error.code === "CredentialsError") {
            learnjs.identity.then(function (identity) {
                return identity.refresh().then(function () {
                    return retry();
                }, function (resp) {
                    // where does this resp come from?
                    promise.reject(resp);
                });
            });
        } else {
            promise.reject(error);
        }
    });
    req.on("success", function (resp) {
        promise.resolve(resp.data);
    });
    req.send();
    return promise;
}

learnjs.saveAnswer = function (problemId, answer) {
    return learnjs.identity.then(function (identity) {
        var db = new AWS.DynamoDB.DocumentClient();
        var item = {
            TableName: "learnjs-gcoka",
            Item: {
                userId: identity.id,
                problemId: problemId,
                answer: answer
            }
        };
        return learnjs.sendDbRequest(db.put(item), function () {
            return learnjs.saveAnswer(problemId, answer);
        });
    });
}

learnjs.fetchAnswer = function(problemId) {
    return learnjs.identity.then(function(identity){
        var db = new AWS.DynamoDB.DocumentClient();
        var item = {
            TableName: "learnjs-gcoka",
            Key: {
                userId: identity.id,
                problemId: problemId
            }
        };
        return learnjs.sendDbRequest(db.get(item), function() {
            return learnjs.fetchAnswer(problemId);
        });
    })
};

learnjs.problems = [
    {
        description: "What is truth?",
        code: "function problem() { return __;}"
    },
    {
        description: "simple math",
        code: "function problem() { return 42 === 6 * __;}"
    },
];