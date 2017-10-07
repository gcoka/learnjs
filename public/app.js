"use strict";

var learnjs = {};

learnjs.appOnReady = function () {
    window.onhashchange = function () {
        learnjs.showView(window.location.hash);
    };
    learnjs.showView(window.location.hash);
}

learnjs.triggerEvent = function(name, args) {
    $(".view-container>*").trigger(name, args);
}

learnjs.landingView = function(){
    return learnjs.template("landing-view");
}

learnjs.problemView = function (data) {
    var problemNumber = parseInt(data, 10);
    var view = $(".templates .problem-view").clone();
    var problemData = learnjs.problems[problemNumber - 1];
    var resultFlash = view.find(".result");

    function checkAnswer() {
        var answer = view.find(".answer").val();
        var test = problemData.code.replace("__", answer) + "; problem();";
        return eval(test);
    }

    function checkAnswerClick() {
        if(checkAnswer()){
            
            learnjs.flashElement(resultFlash, learnjs.buildCorrectFlash(problemNumber));
        }else{
            learnjs.flashElement(resultFlash, "Incorrect!");
        }
        // prevent not to page reload
        return false; 
    }

    view.find(".check-btn").click(checkAnswerClick);
    var title = "Problem #" + problemNumber;
    view.find(".title").text(title);
    if(problemNumber < learnjs.problems.length) {
        var buttonItem = learnjs.template("skip-btn");
        buttonItem.find("a").attr("href", "#problem-" + (problemNumber+1));
        $(".nav-list").append(buttonItem);
        view.bind("removingView", function(){
            buttonItem.remove();
        })
    }
    learnjs.applyObject(problemData, view);
    return view;
}

learnjs.buildCorrectFlash = function(problemNumber){
    var correctFlash = learnjs.template("correct-flash");
    var link = correctFlash.find("a");
    if(problemNumber < learnjs.problems.length) {
        link.attr("href", "#problem-" + (problemNumber + 1));
    }else{
        link.attr("href", "");
        link.text("You're Finished!");
    }
    return correctFlash;
}

learnjs.showView = function (hash) {
    var routes = {
        "#problem": learnjs.problemView,
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

learnjs.applyObject = function(obj, elem){
    for (var key in obj){
        elem.find('[data-name="' + key + '"]').text(obj[key]);
    }
}

learnjs.flashElement = function(elem, content) {
    elem.fadeOut("fast", function() {
        elem.html(content);
        elem.fadeIn();
    });
}

learnjs.template = function(name){
    return $(".templates ." + name).clone();
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