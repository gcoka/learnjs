onmessage = function(e){
    try {
        postMessage(eval(e.data));
    }catch(ex){
        postMessage(false);
    }
}