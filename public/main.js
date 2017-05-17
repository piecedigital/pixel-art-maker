// initial stuff
NodeList.prototype.map = Array.prototype.map;

// console.log(canvas);
var workArea = document.getElementsByClassName("work-area")[0];
var tools = workArea.getElementsByClassName("tools-container")[0];
var frames = workArea.getElementsByClassName("frames")[0];
var pixelByPixel = tools.getElementsByClassName("pixel-by-pixel")[0];
var currentFrameDisplay = tools.getElementsByClassName("current-frame")[0];
var framerate = tools.getElementsByClassName("framerate")[0];

// http://stackoverflow.com/a/15666143/4107851
var PIXEL_RATIO = (function () {
  var ctx = document.createElement("canvas").getContext("2d"),
  dpr = window.devicePixelRatio || 1,
  bsr = ctx.webkitBackingStorePixelRatio ||
  ctx.mozBackingStorePixelRatio ||
  ctx.msBackingStorePixelRatio ||
  ctx.oBackingStorePixelRatio ||
  ctx.backingStorePixelRatio || 1;

  return dpr / bsr;
})();

var makeCanvas = function (w, h, ratio, newCanvas) {
  var ratio = ratio || PIXEL_RATIO;
  var canvas = newCanvas ? document.createElement("canvas") : workArea.getElementsByTagName("canvas")[0];
  canvas.width = w * ratio;
  canvas.height = h * ratio;
  // canvas.style.width = w + "px";
  // canvas.style.height = h + "px";
  canvas.getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);
  return canvas;
}
// ///////////////////////////////////////////////////////////

var colorElement = document.querySelector(".color");

var listenerFunctions = {};

function initCanvas(canvas, contextValue, pixel) {
  var //pixel = 32,
  editorDimensionMultiplier = (16*4) * 10,
  w = editorDimensionMultiplier/*pixel*( (pixel*pixel) / (2) * 10 )*/,
  h = editorDimensionMultiplier/*pixel*( (pixel*pixel) / (2) * 10 )*/;// Math.round( (32 / canvas.offsetWidth) * w);
  // console.log(editorDimensionMultiplier);
  if(Object.prototype.toString.call(canvas) !== "[object HTMLCanvasElement]") return console.error("1st argument needs to be an HTML canvas element");
  if(typeof contextValue !== "string") return console.error("2nd argument needs to be a string denoting a 2d or 3d context of the canvas");

  var canvas = makeCanvas(w,h);
  var ctx = canvas.getContext(contextValue);

  listenerFunctions.click = function (e) {
    drawPixel(e, {
      pixel,
      canvas,
      ctx,
      w,
      h
    })
  };
  canvas.addEventListener("click", listenerFunctions.click);

  listenerFunctions.mousemove = function(e) {
    if(e.button === 0 && e.buttons === 1) drawPixel(e, {
      pixel,
      canvas,
      ctx,
      w,
      h
    });
  };
  canvas.addEventListener("mousemove", listenerFunctions.mousemove);
}

function drawPixel (e, {
  pixel,
  canvas,
  ctx,
  w,
  h
}) {
  // console.log("click", e);
  var mX = e.offsetX;
  var mY = e.offsetY;
  // console.log( Math.round( (mX / canvas.offsetWidth) * pixel) );
  var pixelPlaceW = Math.floor( (mX / canvas.offsetWidth) * pixel);
  var pixelPlaceH = Math.floor( (mY / canvas.offsetHeight) * pixel);
  var x = (pixelPlaceW/pixel) * w;
  var y = (pixelPlaceH/pixel) * h;
  // console.log(pixelPlaceW, x);
  // console.log(ctx.globalCompositeOperation);
  if(e.ctrlKey) {
    ctx.globalCompositeOperation = "destination-out"
    ctx.fillStyle = "rgba(255,255,255,1)";
  } else {
    ctx.globalCompositeOperation = "source-over"
    ctx.fillStyle = colorElement.value;
  }
  ctx.fillRect(x, y, w/pixel, h/pixel);

  markUnsavedFrame(currentFrame);
}

function clearCanvas() {
  // get canvas
  var data = getCanvasAndContext();
  var canvas = data.canvas;
  var ctx = data.context;
  console.log("clear", canvas);
  // erase
  ctx.globalCompositeOperation = "destination-out"
  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
  // return to original comp
  ctx.globalCompositeOperation = "source-over"
}

var framesArray = [], currentFrame = 0, playbackRunning = false, playbackInterval = null;

function setCurrentFrame(frame) {
  currentFrameDisplay.innerText = frame+1;
  currentFrame = frame;
}

function storeImageData() {
  var ctx = canvas.getContext("2d");
  var data = ctx.getImageData(0, 0, canvas.offsetWidth, canvas.offsetHeight);
  // var place = framesArray.length > 0 ? framesArray.length - 1 : 0;
  framesArray[currentFrame] = data;
  markSavedFrame(currentFrame);
  // return currentFrame;
}

function markSavedFrame(frame) {
  var displayFrame = frames.querySelector(".frame.frame-" + frame);
  if( displayFrame.className.match("saved") && !displayFrame.className.match("unsaved") ) return
  if( displayFrame.className.match("unsaved") ) {
    displayFrame.className = displayFrame.className.replace("unsaved", "saved");
  } else {
    displayFrame.className = displayFrame.className + " saved";
  }
}

function markUnsavedFrame(frame) {
  var displayFrame = frames.querySelector(".frame.frame-" + frame);
  if( displayFrame.className.match("unsaved") ) return
  if( displayFrame.className.match("saved") ) {
    displayFrame.className = displayFrame.className.replace("saved", "unsaved");
  } else {
    displayFrame.className = displayFrame.className + " unsaved";
  }
}

function openImage(place) {
  var ctx = canvas.getContext("2d");
  ctx.putImageData(framesArray[place], 0, 0);
}

function saveFrame() {
  console.log("saved image");
  storeImageData();
}

function newFrame() {
  console.log("next image");
  storeImageData();
  if(framesArray[framesArray.length-1]) {
    framesArray.push(void(0));
    addDisplayFrame(framesArray.length-1);
  }
  currentFrame = framesArray.length - 1;
  openImage(currentFrame - 1);
  setCurrentFrame(currentFrame);
  // console.log(currentFrame, framesArray.length);
}

function addDisplayFrame(place) {
  var frame = document.createElement("div");
  frame.className = "frame frame-" + place;
  frame.addEventListener("click", function () {
    try {
      markSavedFrame(currentFrame);
      openImage(place);
    } catch (e) {
      console.error(e);
    }
    setCurrentFrame(place);
  });
  frames.appendChild(frame)
}

function removeListeners() {
  // console.log("removing listeners");
  Object.keys(listenerFunctions).map(function(funcName) {
    canvas.removeEventListener(funcName, listenerFunctions[funcName]);
  });
}

function resetFrames() {
  framesArray = [];
  currentFrame = 0;
  frames.innerHTML = "";
}

function playbackFrames() {
  if(playbackRunning) return;
  playbackRunning = true;
  enableOrDisableTools("playback", "disable");
  var f = 0;
  console.log(parseInt(framerate.value));
  var tick = function() {
    setTimeout(function() {
      if(!playbackRunning) return;
      openImage(f);
      f++; if(f >= framesArray.length) f = 0;
      if(playbackRunning) tick();
    }, 1000/parseInt(framerate.value));
  }
  tick();
}

function stopPlayback() {
  if(!playbackRunning) return;
  playbackRunning = false;
  // clearInterval(playbackInterval);
  openImage(currentFrame);
  enableOrDisableTools("playback", "enable");
}

function enableOrDisableTools(whichTools, action) {
  var firstOpt = action === "disable" ? true : false;
  switch (whichTools) {
    case "playback":
      var list = tools.querySelectorAll(".play-lock");
      // console.log("list");
      // console.log(list);
      list.map(function (elem) {
        // console.log(elem);
        framerate.style.pointerEvents = "all";
        elem.style.pointerEvents = firstOpt ? "none" : "";
        elem.style.opacity = firstOpt ? .5 : "";
      });
    break;
  }
}

function createCanvas() {
  // console.log(parseInt(pixelByPixel.value));
  removeListeners();
  setCurrentFrame(0);
  resetFrames();
  addDisplayFrame(0);
  initCanvas(canvas, "2d", parseInt(pixelByPixel.value));
}

// populate options
for(var i = 1; i <= 16; i++) {
  var opt = document.createElement("option");
  opt.value = i*8;
  opt.innerText = (i*8) + "x" + (i*8);
  pixelByPixel.appendChild(opt);
}

function getCanvasAndContext(isNew) {
  // http://stackoverflow.com/a/934925/4107851
  var tempCanvas = isNew ? makeCanvas(canvas.offsetWidth, canvas.offsetHeight, null, true) : canvas;
  // console.log(tempCanvas);
  var ctx = tempCanvas.getContext("2d");
  return {
    canvas: tempCanvas,
    context: ctx
  };
}

function submitImages() {
  // var imageBlobs = [];
  var imageDataURLs = [];
  framesArray.map(function (imageData, ind) {
    if(!imageData) return;
    console.log("working on saving images");
    var parsedDataURL = parseImageDataURL(getImageDataURL(imageData));
    imageDataURLs.push(parsedDataURL);
    // getImageBlob(function (blob) {
    //   imageBlobs.push(blob);
    //   if(endOfArray(framesArray, ind)) sendImageBlobs(imageBlobs);
    // });
  });
  sendImageDataURLs(imageDataURLs);
}

function sendImageDataURLs(dataURLs) {
  // console.log("image data URLs");
  // console.log(dataURLs);
  var dataToSend = {};
  dataURLs.map(function (dataURL, ind) {
    dataToSend["frame" + ind] = dataURL;
  });
  // console.log(dataToSend);

  ajax({
    url: "/upload?framerate=" + framerate.value,
    type: "POST",
    data: JSON.stringify(dataToSend),
    success(data) {
      console.log(data);
    },
    error(data) {
      console.error(data);
    }
  });
}

function getImageDataURL(imageData) {
  if(!imageData) return;
  // console.log("getting image data url");
  var data = getCanvasAndContext(true);
  var tempCanvas = data.canvas;
  var ctx = data.context;

  // place image data
  ctx.putImageData(imageData, 0, 0);
  // extract dataURL
  var url = tempCanvas.toDataURL("image/png");
  // console.log(url);
  return url;
}

function parseImageDataURL(url) {
  console.log("parsing image data url");
  var parsedURL = url.replace(/^data:image\/(png|jpg);base64,/, "");
  // console.log(parsedURL);
  return parsedURL;
}

function endOfArray(arr, ind) {
  console.log("end of array");
  return arr.length - 1 === ind;
}
