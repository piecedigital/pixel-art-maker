// initial stuff
NodeList.prototype.map = Array.prototype.map;
NodeList.prototype.slice = Array.prototype.slice;

// console.log(canvas);
var workArea = document.getElementsByClassName("work-area")[0];
var tools = workArea.getElementsByClassName("tools-container")[0];
var brushes = workArea.getElementsByClassName("brushes")[0];
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

var makeCanvas = function (overlay, w, h, ratio, newCanvas) {
  var ratio = ratio || PIXEL_RATIO;
  var thisCanvas = newCanvas ? document.createElement("canvas") : (overlay ? brushoverlay : canvas);
  thisCanvas.width = w * ratio;
  thisCanvas.height = h * ratio;
  // thisCanvas.style.width = w + "px";
  // thisCanvas.style.height = h + "px";
  thisCanvas.getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);
  return thisCanvas;
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
  if(Object.prototype.toString.call(canvas) !== "[object HTMLCanvasElement]") return;// console.error("1st argument needs to be an HTML canvas element");
  if(typeof contextValue !== "string") return;// console.error("2nd argument needs to be a string denoting a 2d or 3d context of the canvas");

  var canvas = makeCanvas(false, w,h), brushoverlay = makeCanvas(true, w,h);
  var ctx = canvas.getContext(contextValue);

  listenerFunctions.click = function (e) {
    drawPixel(mouseGridPosition(e, {
      pixel,
      canvas,
      ctx,
      w,
      h
    }))
  };
  canvas.addEventListener("click", listenerFunctions.click);

  listenerFunctions.mousemove = function(e) {
    var mouseData = mouseGridPosition(e, {
      pixel,
      canvas,
      ctx,
      w,
      h
    });
    if(e.button === 0 && e.buttons === 1) {
      console.log(e.button, e.buttons);
      drawPixel(mouseData);
    }
    drawTool(mouseData);
  };
  canvas.addEventListener("mousemove", listenerFunctions.mousemove);
}

var brushTool = "pencil";

function mouseGridPosition(e,
  {
    pixel,
    canvas,
    ctx,
    w,
    h
  }) {
  if(!canvas) ({ canvas, context: ctx } = getCanvasAndContext());
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
  var data = {
    left: x,
    top: y,
    right: w/pixel,
    bottom: h/pixel,
    canvasWidth: w,
    canvasHeight: h,
    pixel,
    canvas,
    context: ctx,
    drawnPixelWidth: w/pixel,
    drawnPixelHeight: h/pixel,
  };
  data.centerX = data.left + (data.right / 2);
  data.centerY = data.top + (data.bottom / 2);
  // console.log(data);
  return data;
}

function drawPixel (data) {
  var {
    left,
    top,
    right,
    bottom,
    centerX,
    centerY,
    pixel,
    canvas,
    context: ctx
  } = data;

  // console.log(canvas);
  switch (brushTool) {
    case "pencil":
      ctx.globalCompositeOperation = "source-over"
      ctx.fillStyle = colorElement.value;
      ctx.fillRect(left, top, right, bottom);
    break;
    case "eraser":
      ctx.globalCompositeOperation = "destination-out"
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.fillRect(left, top, right, bottom);
    break;
  }

  markUnsavedFrame(currentFrame);
}

function drawTool(data) {
  var { canvas, context: ctx } = getCanvasAndContext(false, true);

  clearCanvas(true);
  drawPixel(Object.assign(data, {
    canvas,
    context: ctx
  }));
}

function setTool(toolName) {
  // console.log(toolName);
  brushes.querySelector(".brush-show").className = "brush-show " + toolName;
  brushTool = toolName;
}

function clearCanvas(overlay) {
  // get canvas
  var data = getCanvasAndContext(false, overlay);
  var canvas = data.canvas;
  var ctx = data.context;
  // console.log("clear", canvas);
  // erase
  ctx.globalCompositeOperation = "destination-out"
  ctx.fillStyle = "rgba(255,255,255,1)";
  ctx.fillRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);
  // return to original comp
  ctx.globalCompositeOperation = "source-over"
}

var framesArray = [], currentFrame = 0, playbackRunning = false, playbackInterval = null, unsavedFrame = false;

function setCurrentFrame(frame) {
  currentFrameDisplay.innerText = frame+1;


  var frameElems = frames.querySelectorAll(".frame");
  var currentFrameElem = frames.querySelector(".frame.frame-" + frame);
  if(frameElems)
    frameElems.map(function (frameElem) {
      frameElem.className = frameElem.className.replace(/(\s+)?current/, "");
    });
  // else
    // console.log("no elem");
  // set the new current frame after using the old one
  currentFrame = frame;
  if(currentFrameElem)
    currentFrameElem.className = currentFrameElem.className + " current";
  // else
    // console.log("no elem");
}

function storeImageData() {
  var ctx = canvas.getContext("2d");
  var data = ctx.getImageData(0, 0, canvas.offsetWidth, canvas.offsetHeight);
  // var place = framesArray.length > 0 ? framesArray.length - 1 : 0;
  framesArray[currentFrame] = data;
  markSavedFrame(currentFrame);
  updateDisplayFrame(currentFrame);
}

function markSavedFrame(frame) {
  unsavedFrame = false;
  var displayFrame = frames.querySelector(".frame.frame-" + frame);
  if(!displayFrame) return;
  if( displayFrame.className.match("saved") && !displayFrame.className.match("unsaved") ) return
  if( displayFrame.className.match("unsaved") ) {
    displayFrame.className = displayFrame.className.replace("unsaved", "saved");
  } else {
    displayFrame.className = displayFrame.className + " saved";
  }
}

function markUnsavedFrame(frame) {
  unsavedFrame = true;
  var displayFrame = frames.querySelector(".frame.frame-" + frame);
  if(!displayFrame) return;
  if( displayFrame.className.match("unsaved") ) return
  if( displayFrame.className.match("saved") ) {
    displayFrame.className = displayFrame.className.replace("saved", "unsaved");
  } else {
    displayFrame.className = displayFrame.className + " unsaved";
  }
}

function openImage(place) {
  var ctx = canvas.getContext("2d");
  if(framesArray[place]) ctx.putImageData(framesArray[place], 0, 0);
}

function goToFrame(place) {
  if(!checkUnsavedFrame()) return;
  openImage(place);
  setCurrentFrame(place);
}

function saveFrame() {
  // console.log("saved image");
  storeImageData();
}

function newFrame(emptyCanvas) {
  // console.log("next image", emptyCanvas);
  storeImageData();
  if(framesArray[framesArray.length-1]) {
    framesArray.push(void(0));
    addDisplayFrame(framesArray.length-1);
  }
  currentFrame = framesArray.length - 1;
  openImage(currentFrame - 1);
  setCurrentFrame(currentFrame);
  if(emptyCanvas) clearCanvas();
  // console.log(currentFrame, framesArray.length);
}

function removeFrame(place) {
  // removed image data from framesArray
  framesArray.splice(place, 1);
  editFrames(place, "remove");
}

function insertFrame(place) {
  framesArray.splice(place+1, 0, null)
  editFrames(place, "insert");
}

function editFrames(place, action) {
  var number = action === "remove" ? -1 : 1;
  if(action === "remove") {

    // remove display frame
    var frameElem = frames.querySelector(".frame.frame-" + place);
    // console.log("removing", place, frameElem);
    frames.removeChild(frameElem);
  }
  if(action === "insert") {
    insertDisplayFrame(place+1);
  }
  // change class and dataset of the frames ahead
  for(var i = place+1; i < framesArray.length+(action === "remove" ? 1 : -1); i++) {
    var elem = frames.querySelectorAll(".frame.frame-" + i).slice(-1)[0];
    // console.log("changing", i, elem, ".frame.frame-" + i);
    elem.className = elem.className.replace(/frame\-[0-9]+/, "frame-" + (i+number));
    elem.dataset.frame = (i+number);
  }


  if(currentFrame > place) currentFrame += number;
  setCurrentFrame(currentFrame);

  if(framesArray.length < 1) addDisplayFrame(0);
}

function createDisplayFrame(place) {
  var frame = document.createElement("div");
  frame.className = "frame frame-" + place;
  frame.dataset.frame = place;
  frame.addEventListener("click", function (e) {
    var place = parseInt(frame.dataset.frame);
    // check if they're okay with leaving the frame with unsaved data

    if(!checkUnsavedFrame()) return;
    // console.log(place);
    try {
      markSavedFrame(currentFrame);
      openImage(place);
    } catch (e) {
      // console.error(e);
    }
    setCurrentFrame(place);
  });
  return frame;
}

function addDisplayFrame(place) {
  var frame = createDisplayFrame(place);
  frames.appendChild(frame)
}

function insertDisplayFrame(place) {
  place = parseInt(place);
  var frame = createDisplayFrame(place);
  var nextFrame = frames.querySelector(".frame.frame-" + (place))
  // console.log("action insert", place, nextFrame);
  frames.insertBefore(frame, nextFrame);
}

function updateDisplayFrame(place) {
  var image;
  if(framesArray[place]) {
    image = document.createElement("img");
    image.src = getImageDataURL(framesArray[place]);
  }

  var frame = document.querySelector(".frame.frame-" + place);
  frame.innerHTML = "";
  if(image) frame.appendChild(image);
}

function remove(place) {
  place = parseInt(place) || currentFrame;
  // if(!framesArray[place]) return alert("This frame has no saved data");
  removeFrame(place);
  if(currentFrame === place) openImage(place);
}

function insert(place) {
  place = parseInt(place) || currentFrame;
  insertFrame(place);
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
  // console.log(parseInt(framerate.value));
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
  resetFrames();
  addDisplayFrame(0);
  setCurrentFrame(0);
  initCanvas(canvas, "2d", parseInt(pixelByPixel.value));
}

// populate options
for(var i = 1; i <= 16; i++) {
  var opt = document.createElement("option");
  opt.value = i*8;
  opt.innerText = (i*8) + "x" + (i*8);
  pixelByPixel.appendChild(opt);
}

function getCanvasAndContext(isNew, overlay) {
  // isNew - if true, returns a new canvas
  // ovelay - if true, returns the overlay canvas
  var thisCanvas = overlay ? brushoverlay : canvas;
  // http://stackoverflow.com/a/934925/4107851
  var tempCanvas = isNew ? makeCanvas(overlay, canvas.offsetWidth, canvas.offsetHeight, null, true) : brushoverlay;
  // console.log(tempCanvas);
  var ctx = tempCanvas.getContext("2d");
  return {
    canvas: tempCanvas,
    context: ctx
  };
}

function submitImages() {
  if(!checkUnsavedFrame()) return;
  // var imageBlobs = [];
  var imageDataURLs = [];
  framesArray.map(function (imageData, ind) {
    if(!imageData) return;
    // console.log("working on saving images");
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
      data = JSON.parse(data);
      console.log(data);
      var url = "http://" + location.host + "/get-file/" + data.filename;
      window["download-link"].href = url;
      window["download-link"].innerText = url;
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
  // console.log("parsing image data url");
  var parsedURL = url.replace(/^data:image\/(png|jpg);base64,/, "");
  // console.log(parsedURL);
  return parsedURL;
}

function endOfArray(arr, ind) {
  // console.log("end of array");
  return arr.length - 1 === ind;
}

function checkUnsavedFrame() {
  if(unsavedFrame) {
    return confirm("The current frame has not been saved. Are you sure you want to continue?");
  }
  return true;
}

function checkDelete() {
  return confirm("Are you sure you want to delete this frame?");
}

// buttons events
document.addEventListener("keydown", function (e) {
  // console.log(e);
  switch (e.key.toLowerCase()) {
    case "e": setTool("eraser"); break;
    case "q": setTool("pencil"); break;
    case "c": if(e.ctrlKey) clearCanvas(); break;
    case "n": newFrame(e.shiftKey); break;
    case "s": saveFrame(); break;
    case "[": if(e.ctrlKey) goToFrame(currentFrame-1); break;
    case "]": if(e.ctrlKey) goToFrame(currentFrame+1); break;
  }
});

window["download-link"].addEventListener("click", function () {
  setTimeout(function () {
    window["download-link"].href= "#";
    window["download-link"].innerText= "";
  }, 100);
})
