// This must be done when the js file is first loaded
var scriptFiles = document.getElementsByTagName("script");
var THIS_JS_FILE = scriptFiles[scriptFiles.length-1].src;

(function(window) {
    var AmaraIframeController = function() {
	var iframes = [];
	var loadingDivs = [];
	var timers = [];
	var iframeDomain = '';
	var resize = function(index, width, height) {
            if (iframes[index].style.visibility == "visible")
                iframes[index].parentNode.style.height = "";
	    iframes[index].width = 0;
	    iframes[index].width = width;
	    iframes[index].height = height;
	};
	var updateContent = function(index, content) {
	    iframes[index].innerHTML = content;
	};
	var updateLoading = function(index) {
	    iframes[index].parentNode.style.backgroundColor = "transparent";
	    iframes[index].style.visibility = "visible";
	    iframes[index].style.opacity = 1;
	    loadingDivs[index].style.display = "none";
	};
	this.resizeReceiver = function(e) {
	    if (e.data.initDone)
		window.clearInterval(timers[e.data.index]);
	    if (e.data.resize)
		resize(e.data.index, e.data.width, e.data.height);
	    if (e.data.content)
		updateContent(e.data.index, e.data.content);
	    if (e.data.videoReady)
                updateLoading(e.data.index);
	};
	this.initIframes = function() {
	    var elements = document.getElementsByClassName("amara-embed");
	    var parser = document.createElement('a');
	    window.addEventListener('message', this.resizeReceiver, false);
	    parser.href = THIS_JS_FILE;
	    iframeDomain = "http://" + parser.host;
	    for (var i = 0 ; i < elements.length ; i++) {
		var currentDiv = elements[i];
                var loadingDiv = document.createElement("DIV");
                if (currentDiv.dataset.width)
                    currentDiv.style.width = currentDiv.dataset.width;
                if (currentDiv.dataset.height)
                    currentDiv.style.height = (36 + parseInt(currentDiv.dataset.height)) + "px";
                currentDiv.style.backgroundColor = "#ddd";
                if (currentDiv.dataset.height)
                    loadingDiv.style.paddingTop = ((36 + parseInt(currentDiv.dataset.height)) / 2 - 50) + "px";
                else
                    loadingDiv.style.paddingTop = "200px";
                loadingDiv.style.textAlign = "center";
                loadingImg = document.createElement("IMG");
                loadingImg.src = loadingImg.src = "{{ static_url }}/images/embedder/loading.gif";
                loadingDiv.appendChild(loadingImg);
                currentDiv.appendChild(loadingDiv); 

		var iframe = document.createElement("IFRAME");
		iframe.src = "http://" + parser.host + "/embedder-widget-iframe/?data=" +
		    encodeURIComponent(JSON.stringify(currentDiv.dataset));
		iframe.style.border = "none";
		iframe.style.overflow = "hidden";
		iframe.scrolling = "no";
		iframe.style.visibility = "hidden";
		iframe.style.opacity = 0;
		currentDiv.appendChild(iframe);
		loadingDivs.push(loadingDiv);
		iframes.push(iframe);
	    }
	};
	this.initResize = function() {
	    var controller = this;
	    var newIndex = 0;
	    iframes.forEach(function(iframe, index) {
		timers.push(window.setInterval(function() {
		    controller.postToIframe(iframe, index);
		}
					       ,100));
	    });
	};

	this.postToIframe = function(iframe, index) {
	    if (iframe.contentWindow) {
		iframe.contentWindow.postMessage({fromIframeController: true, index: index}, iframeDomain);
	    }
	};
    };
    window.AmaraIframeController = AmaraIframeController;

    var initIframeController = function() {
	var controller = new window.AmaraIframeController();
	controller.initIframes();
	controller.initResize();
    };
    window.initIframeController = initIframeController;

})(window);

if(window.attachEvent) {
    window.attachEvent('onload', window.initIframeController);
} else {
    if(window.onload) {
        var curronload = window.onload;
        var newonload = function() {
            curronload();
            window.initIframeController();
        };
        window.onload = newonload;
    } else {
        window.onload = window.initIframeController;
    }
}
