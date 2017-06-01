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
var canvasLayers = workArea.querySelector(".canvas-layers");
// var canvasLayersTabs = workArea.querySelector(".canvas-layers-tabs");
var currentLayer = workArea.querySelector(".current-layer");

// variables
var listenerFunctions = {},
  brushTool = "pencil",
  framesArray = [],
  selectedFrameData = {},
  currentFrame = 0,
  layerCount = 0,
  playbackRunning = false,
  playbackInterval = null,
  unsavedFrame = false;

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
/* <canvas id="canvas" class="canvas" width="0" height="0"></canvas> */

var makeCanvas = function (overlay, w, h, layer, newCanvas) {
  var ratio = PIXEL_RATIO;
  var thisCanvas;
  if(newCanvas) {
    var c = document.createElement("canvas");
    c.className = "canvas";
    thisCanvas = c;
  } else {
    thisCanvas = overlay ? brushoverlay : window["canvas" + layer || canvasLayers];
  }

  thisCanvas.width = w * ratio;
  thisCanvas.height = h * ratio;
  thisCanvas.style.width = w * ratio + "px";
  thisCanvas.style.height = h * ratio + "px";
  thisCanvas.getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);
  return thisCanvas;
}
// ///////////////////////////////////////////////////////////

var colorElement = document.querySelector(".color");

function initCanvas(contextValue, pixel) {
  var //pixel = 32,
  editorDimensionMultiplier = (8*8) * 10,
  w = editorDimensionMultiplier/*pixel*( (pixel*pixel) / (2) * 10 )*/,
  h = editorDimensionMultiplier/*pixel*( (pixel*pixel) / (2) * 10 )*/;// Math.round( (32 / canvas.offsetWidth) * w);
  // console.log(editorDimensionMultiplier);
  // if(Object.prototype.toString.call(canvas) !== "[object HTMLCanvasElement]") return;// console.error("1st argument needs to be an HTML canvas element");
  if(typeof contextValue !== "string") return;// console.error("2nd argument needs to be a string denoting a 2d or 3d context of the canvas");

  var brushoverlay = makeCanvas(true, w, h);
  newLayer();

  // set the default values for the cursor so it starts neat
  drawTool(
    mouseGridPosition({
      offsetX: w/2,
      offsetY: h/2
    }, {
      pixel,
      w,
      h
    })
  );

  listenerFunctions.click = function (e) {
    drawPixel(mouseGridPosition(e, {
      pixel,
      w,
      h
    }))
  };
  brushoverlay.addEventListener("click", listenerFunctions.click);

  listenerFunctions.mousemove = function(e) {
    var mouseData = mouseGridPosition(e, {
      pixel,
      w,
      h
    });
    // console.log(e.button, e.buttons);
    if(e.button === 0 && e.buttons === 1) {
      drawPixel(mouseData);
    }
    drawTool(mouseData);
  };
  brushoverlay.addEventListener("mousemove", listenerFunctions.mousemove);
}

function appendNewCanvasLayer(w, h) {
  var c = makeCanvas(false, w, h, null, true);
  // var length = document.querySelectorAll(".canvas").length;
  // c.id = "canvas" + length;
  c.id = "canvas" + (layerCount - 1);
  canvasLayers.appendChild(c);
  return c;
}

function appendNewLayerOption() {
  var opt = document.createElement("option");
  var value = document.querySelectorAll(".canvas").length;
  opt.value = value;
  opt.innerText = value+1;
  currentLayer.appendChild(opt);
}

function newLayer() {
  layerCount++;
  appendNewLayerOption();
  appendNewCanvasLayer(brushoverlay.width, brushoverlay.height);
}

function mouseGridPosition(e,
  {
    pixel,
    // canvas,
    // ctx,
    w,
    h
  }) {
  var { canvas, context: ctx } = getCanvasAndContext();
  // console.log("click", e);
  var mX = e.offsetX;
  var mY = e.offsetY;
  // console.log( Math.round( (mX / canvas.offsetWidth) * pixel) );
  var pixelPlaceW = Math.floor( (mX / canvas.width) * pixel);
  var pixelPlaceH = Math.floor( (mY / canvas.height) * pixel);
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
    width: w/pixel,
    height: h/pixel,
  };
  data.centerX = data.left + (data.right / 2);
  data.centerY = data.top + (data.bottom / 2);
  // console.log(data);
  return data;
}

function drawPixel (data, dontChangeData, alwaysDraw) {
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
  var layerKey = "l" + currentLayer.value;
  var drawStyle = alwaysDraw ? "pencil" : brushTool;

  switch (drawStyle) {
    case "pencil":
      ctx.globalCompositeOperation = "source-over"
      ctx.fillStyle = colorElement.value;
      ctx.fillRect(left, top, right, bottom);
      // console.log(ctx.globalCompositeOperation);
      selectedFrameData["l" + currentLayer.value] = selectedFrameData[layerKey] || {};
      if(!dontChangeData) selectedFrameData[layerKey][centerX + "_" + centerY] = {
        top,
        right,
        bottom,
        left,
        centerX,
        centerY,
        pixel,
        canvas,
        context: ctx
      };
    break;
    case "eraser":
      ctx.globalCompositeOperation = "destination-out"
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.fillRect(left, top, right, bottom);
      selectedFrameData["l" + currentLayer.value] = selectedFrameData[layerKey] || {};
      if(!dontChangeData) delete selectedFrameData[layerKey][centerX + "_" + centerY];
    break;
  }

  // console.log(selectedFrameData);
  if(!dontChangeData) markUnsavedFrame(currentFrame);
}

function drawTool(data) {
  // var { canvas, context: ctx } = getCanvasAndContext(false, true);
  // clearCanvas(true);
  // drawPixel(Object.assign(data, {
  //   canvas,
  //   context: ctx
  // }));
  // console.log(cursor);
  cursor.style.left = data.centerX - (data.width / 2) + "px";
  cursor.style.top = data.centerY - (data.height / 2) + "px";
  cursor.style.width = data.width + "px";
  cursor.style.height = data.height + "px";
}

function setTool(toolName) {
  // console.log(toolName);
  brushes.querySelector(".brush-show").className = "brush-show " + toolName;
  brushTool = toolName;
  cursor.className = toolName;
}

function clearCanvas(overlay, full) {
  console.log("clearing canvas");
  // get canvas
  var ctx, ctxArr = [];

  if(full) {
    for (var i = 0; i < document.querySelectorAll(".canvas").length; i++) {
      ctx = window["canvas" + i].getContext("2d");
      ctxArr.push(ctx);
    }
  } else {
    ctx = window["canvas" + currentLayer.value].getContext("2d");
    ctxArr.push(ctx);
  }
  // console.log("clear", canvas);
  // erase
  ctxArr.map(ctx => {
    ctx.globalCompositeOperation = "destination-out"
    ctx.fillStyle = "rgba(255,255,255,1)";
    ctx.fillRect(0, 0, brushoverlay.width, brushoverlay.height);
    // return to original comp
    ctx.globalCompositeOperation = "source-over";
  })
  // console.trace();
  selectedFrameData = null;
  selectedFrameData = {};
}

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

function setLayerFrame(layer) {
  currentLayer.value = layer;
}

function storeImageData() {
  var dataStr = JSON.stringify(selectedFrameData);
  var data = JSON.parse(dataStr);
  // console.log(data === selectedFrameData);
  framesArray[currentFrame] = data;
  // console.log(framesArray[currentFrame] === selectedFrameData);
  // console.log(framesArray);
  markSavedFrame(currentFrame);
  updateDisplayFrame(currentFrame);
}

function markSavedFrame(frame) {
  // console.log(frame);
  unsavedFrame = false;
  var displayFrame = frames.querySelector(".frame.frame-" + frame);
  if(!displayFrame) return;
  // if( displayFrame.className.match("saved") && !displayFrame.className.match("unsaved") ) return
  // console.log(displayFrame);
  // if( displayFrame.className.match("unsaved") ) {
  //   displayFrame.className = displayFrame.className.replace("unsaved", "saved");
  // } else {
  //   displayFrame.className = displayFrame.className + " saved";
  // }
  displayFrame.removeClass("unsaved");
  displayFrame.addClass("saved");
}

function markUnsavedFrame(frame) {
  // console.log(console.trace());
  unsavedFrame = true;
  var displayFrame = frames.querySelector(".frame.frame-" + frame);
  if(!displayFrame) return;
  // if( displayFrame.className.match("unsaved") ) return
  // if( displayFrame.className.match("saved") ) {
  //   displayFrame.className = displayFrame.className.replace("saved", "unsaved");
  // } else {
  //   displayFrame.className = displayFrame.className + " unsaved";
  // }
  displayFrame.removeClass("saved");
  displayFrame.addClass("unsaved");
}

function openImage(place) {
  // var layers = Object.keys(framesArray[place]);
  // console.log("open:", place, "|", "layers:", framesArray[place]);
  // var len = layers.length;
  // var len = layerCount;

  var canvas, ctx;
  if(framesArray[place]) {
    var layers = objDataToImageData(framesArray[place], true);
    // console.log("layers", layers);
    layers.map((imageData, ind) => {
      canvas = window["canvas" + ind];
      // console.log("canvas", canvas);
      ctx = canvas.getContext("2d");
      // console.log("image data", imageData);
      // console.log("image obj data", framesArray[place]["l" + ind]);
      ctx.putImageData(imageData, 0, 0);
    })
  }
  selectedFrameData = JSON.parse(JSON.stringify(framesArray[place]));
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
    image.src = getImageDataURL(objDataToImageData(framesArray[place]));
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
    brushoverlay.removeEventListener(funcName, listenerFunctions[funcName]);
  });
}

function resetFrames() {
  framesArray = [];
  currentFrame = 0;
  frames.innerHTML = "";
}

function resetLayers() {
  // reset select element
  currentLayer.value = 0;
  currentLayer.innerHTML = "";
  // reset cavas containment element
  canvasLayers.innerHTML = "";
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

// initiates a new work area
function createCanvas() {
  // console.log(parseInt(pixelByPixel.value));
  selectedFrameData = null;
  selectedFrameData = {};
  currentLayer.value = 0;
  layerCount = 0;
  framesArray = [],
  currentFrame = 0,
  playbackRunning = false,
  playbackInterval = null,
  unsavedFrame = false;
  removeListeners();
  resetFrames();
  resetLayers();
  addDisplayFrame(0);
  setCurrentFrame(0);
  initCanvas("2d", parseInt(pixelByPixel.value));
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
  var thisCanvas = overlay ? brushoverlay : window["canvas" + currentLayer.value];
  var tempCanvas = isNew ? makeCanvas(overlay, brushoverlay.width, brushoverlay.height, null, true) : thisCanvas;
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
    var parsedDataURL = parseImageDataURL(getImageDataURL(objDataToImageData(imageData)));
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
  var gpc = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "source-over"
  // console.log(ctx.globalCompositeOperation);
  ctx.putImageData(imageData, 0, 0);
  // extract dataURL
  var url = tempCanvas.toDataURL("image/png");
  // console.log(url);
  ctx.globalCompositeOperation = gpc;
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

function objDataToImageData(data, perLayer) {
  var CnC = getCanvasAndContext(true);
  var { canvas, context: ctx } = CnC;
  canvas.className = "test";
  var dataOnLayer = [];

  Object.keys(data).map(function (layer) {
    var layerData = data[layer];
    // console.log("layerData", layer, layerData);
    Object.keys(layerData).map(function (key) {
      var pixelData = layerData[key];
      // console.log("pixeldata", key, pixelData);
      drawPixel(Object.assign(pixelData, CnC), true, true);
      // if we need to get the data for individual layers
    })
    // get the iamge data
    if(perLayer) {
      dataOnLayer.push( ctx.getImageData(0, 0, brushoverlay.width, brushoverlay.height) );

      ctx.globalCompositeOperation = "destination-out"
      ctx.fillStyle = "rgba(255,255,255,1)";
      ctx.fillRect(0, 0, brushoverlay.width, brushoverlay.height);
      // return to original comp
      ctx.globalCompositeOperation = "source-over"
    }
  })

  // console.log("blah");
  // console.log(canvas, ctx);
  // console.log(canvas.toDataURL("image/png"));
  // console.log(imageData);
  // console.log("per layer", perLayer);
  if(perLayer) {
    // console.log(dataOnLayer);
    return dataOnLayer;
  } else {
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return imageData;
  }
}

// buttons events
document.addEventListener("keydown", function (e) {
  // console.log(e);
  switch (e.key.toLowerCase()) {
    case "e": setTool("eraser"); break;
    case "q": setTool("pencil"); break;
    case "c": if(e.ctrlKey) clearCanvas(); break;
    case "n": newFrame(e.shiftKey); break;
    case "s": if(!e.ctrlKey) e.shiftKey ? setTool("select") : saveFrame(); break;
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

HTMLElement.prototype.hasClass = function(stringOrArray) {
  if(!this.className) return false;

  var proceed = function(type) {
    var yes = false;

    switch (type) {
      case "Array": yes = stringOrArray.map(check) || yes; break;
      case "String": yes = check(stringOrArray); break;
    }
    return yes;
  }

  var check = function(text) {
    return this.className.split(" ").indexOf(text) >= 0;
  }.bind(this);

  var type = Object.prototype.toString.call(stringOrArray).match(/([a-z]+)]/i)[1];
  switch (type) {
    case "String":
    case "Array":
      return proceed(type);
    break;
  }
}

HTMLElement.prototype.addClass = function(stringOrArray) {
  var proceed = function(type) {
    switch (type) {
      case "Array": stringOrArray.map(add).join(" "); break;
      case "String": add(stringOrArray); break;
    }
  }

  var add = function(text) {
    var arr = this.className ? this.className.split(" ") : [];
    if(arr.indexOf(text) !== -1) return;
    arr.push(text);
    var joined = arr.join(" ");
    this.className = joined;
  }.bind(this);

  var type = Object.prototype.toString.call(stringOrArray).match(/([a-z]+)]/i)[1];
  proceed(type);
}

HTMLElement.prototype.removeClass = function(stringOrArray) {
  var proceed = function(type) {
    switch (type) {
      case "Array": stringOrArray.map(remove).join(" "); break;
      case "String": remove(stringOrArray); break;
    }
  }

  var remove = function(text) {
    var arr = this.className ? this.className.split(" ") : [];
    var place = arr.indexOf(text);
    if(place < 0) return this.className;
    arr.splice(place, 1);
    this.className = arr.join(" ");
  }.bind(this);

  var type = Object.prototype.toString.call(stringOrArray).match(/([a-z]+)]/i)[1];
  proceed(type);
}
