var path = require("path");
var gm = require("gm");

// console.log(gm().__proto__);
module.exports = function (data, cb) {
  var source = data.source,
  filename = data.filename,
  fileCount = data.fileCount,
  framerate = data.framerate;
  var frameDelay = (1000/framerate) * (.1); // (1000 / frameDelay || 1000 / 15) * .1;
  console.log(
    "filename: " + filename + "\r\n" +
    "fileCount: " + fileCount + "\r\n" +
    "framerate: " + framerate + "/s\r\n" +
    "frameDelay: " + frameDelay + "/ds"
  );
  var arr = [];
  for (var i = 0; i < fileCount; i++) {
    arr.push({
      in: path.join(__dirname, "public", source, "frame" + i + ".png"),
      // [i === 7 ? "dispose" : ""]: i === 7 ? "previous" : "none",
      delay: frameDelay
    });
  }

  var current = makeGif(gm().dispose("previous"), arr);
  // console.log(current);
  current.write(path.join(__dirname, "images", filename + ".gif"), function (err) {
    if(err) {
      console.error(err.stack, err);
      cb({
        success: false,
        message: err.message || err
      });
    } else {
      console.log("done");
      cb({
        success: true,
        message: "gif created"
      });
    }
  });
}
function appendImages(gm, arr) {
  if(checkObjectType(arr) === "array") {

    arr.map(function (data) {
      // if string is should just be an image
      if(typeof data === "string") {
        gm.append(data);
      } else if(checkObjectType(data) === "object") {
        // if object we probably want to just append commands at once
        Object.keys(data).map(function (command) {
          // check if the command exists for gm
          if(gm.__proto__[command]) {
            // call the command with the value
            data.append = data.img || data.append;
            switch (command) {
              case "delay":
                if(data[command]) gm[command](data[command]);
                break;
              default:
              gm[command](data[command]);
            }
          }
        });
      }
    });

  }
  return gm;
}

function makeGif(gm, arr) {
  var start = true;
  if(typeof gm !== "function") start = false;
  if(checkObjectType(arr) === "array") {

    arr.map(function (data) {
      // if string is should just be an image
      if(typeof data === "string") {
        if(start) {
          gm = gm().in(data);
        } else {
          gm = gm.in(data);
        }
      } else if(checkObjectType(data) === "object") {
        // if object we probably want to just append commands at once
        // save the image source for last
        var inPut = data.image || data.img || data.pic || data.in;
        delete data.image;
        delete data.img;
        delete data.pic;
        delete data.in;
        Object.keys(data).map(function (command) {
          // check if the command exists for gm
          // console.log(data);
          if(start || gm.__proto__[command]) {
            // call the command with the value
            if(start) {
              gm = cleanDataInput( gm(), command, data[command] );
              start = false;
            } else {
              gm = cleanDataInput( gm, command, data[command] );
            }
          }
        });
        // now add the image source
        gm.in(inPut);
      }
    });

  }

  function cleanDataInput(gm, command, value) {
    // gm()[command](data[command])
    switch (command) {
      case "delay":
          if(value) gm[command](value);
        break;
      default:
        gm[command](value);
    }
    return gm;
  }
  return gm;
}

function checkObjectType(obj) {
  switch (Object.prototype.toString.call(obj)) {
    case "[object Object]": return "object";
    case "[object Array]": return "array";
  }
}
