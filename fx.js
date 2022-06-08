// ==UserScript==
// @name         jstris+
// @namespace    http://tampermonkey.net/
// @version      1.0.0
// @description  among us
// @author       orz
// @match        https://*.jstris.jezevec10.com/*
// @grant        none
// ==/UserScript==

let JSTRIS_FX = function() {
  'use strict';
  let configVars = [
    "DISABLE_LINECLEAR_ANIMATION",
    "DISABLE_PLACE_BLOCK_ANIMATION"
  ]
  for (var i of configVars)
    window[i] = localStorage.getItem(i);

  window.lerp = (start, end, amt) => {
    return (1 - amt) * start + amt * end;
  }

  window.initGFXCanvas = (obj, refCanvas) => {
    obj.GFXCanvas = refCanvas.cloneNode(true);
    /*
    obj.GFXCanvas = document.createElement("canvas");
    obj.GFXCanvas.className = "layer mainLayer gfxLayer";
    obj.GFXCanvas.height = refCanvas.height;
    obj.GFXCanvas.width = refCanvas.width;
    obj.GFXCanvas.style = refCanvas.style;
    */
    obj.GFXCanvas.className = "layer mainLayer gfxLayer";
    obj.GFXctx = obj.GFXCanvas.getContext("2d")
    obj.GFXctx.clearRect(0, 0, obj.GFXCanvas.width, obj.GFXCanvas.height);
    refCanvas.parentNode.appendChild(obj.GFXCanvas);
  }


  window.addEventListener("load", function() {

    console.log("=== jstris plus loaded ===");

    // -- injection below --
    console.log(window.Game);
    if (window.Game) {
      console.log("aowiefjeaw");
      const oldReadyGo = Game.prototype.readyGo
      Game.prototype.readyGo = function() {
        console.log("aoifwejawoifje")
        let val = oldReadyGo.apply(this, arguments)

        if (!this.GFXCanvas || !this.GFXCanvas.parentNode) {
          console.log("yah");
          window.initGFXCanvas(this, this.canvas);
        }

        this.GFXQueue = [];

        this.GFXLoop = () => {
          if (!this.GFXQueue) this.GFXQueue = [];

          this.GFXctx.clearRect(0, 0, this.GFXCanvas.width, this.GFXCanvas.height);

          this.GFXQueue = this.GFXQueue.filter(e => e.process.call(e, this.GFXctx));

          if (this.GFXQueue.length)
            requestAnimationFrame(this.GFXLoop);
        }


        window.game = this;

        return val;
      }
    }

    if (window.SlotView) {
      const oldOnResized = SlotView.prototype.onResized;
      SlotView.prototype.onResized = function() {
        console.log("onResized called");
        if (this.g.GFXCanvas && Replayer.prototype.isPrototypeOf(this.g) && false) {
          console.log("onResized called on slotview with gfx canvas");
          if (this.g.GFXCanvas.parentNode) {
            this.g.GFXCanvas.parentNode.removeChild(this.g.GFXCanvas);
          }
        }

        return oldOnResized.apply(this, arguments);
      }
    }

    // -- injection below --
    const oldInitReplay = Replayer.prototype.initReplay
    Replayer.prototype.initReplay = function() {
      let val = oldInitReplay.apply(this, arguments)

      // SlotViews have replayers attached to them, don't want to double up on the canvases
      //if (SlotView.prototype.isPrototypeOf(this.v))
      //    return;

      window.replayer = this;

      if (!this.GFXCanvas || !this.GFXCanvas.parentNode || !this.GFXCanvas.parentNode == this.v.canvas.parentNode) {
        window.initGFXCanvas(this, this.v.canvas);
        console.log("replayer initializing gfx canvas");
        console.log(this.v.canvas);
      }

      this.GFXQueue = [];

      this.block_size = this.v.block_size;

      this.GFXLoop = () => {
        if (!this.GFXQueue) this.GFXQueue = [];

        this.GFXctx.clearRect(0, 0, this.GFXCanvas.width, this.GFXCanvas.height);

        this.GFXQueue = this.GFXQueue.filter(e => e.process.call(e, this.GFXctx));

        if (this.GFXQueue.length)
          requestAnimationFrame(this.GFXLoop);
      }

      this.v.canvas.parentNode.appendChild(this.GFXCanvas);

      return val;
    }

    const oldLineClears = GameCore.prototype.checkLineClears;
    GameCore.prototype.checkLineClears = function() {

      //console.log(this.GFXCanvas);

      if (!this.GFXCanvas || window.DISABLE_LINECLEAR_ANIMATION)
        return oldLineClears.apply(this, arguments);

      let oldAttack = this.gamedata.attack;

      for (var row = 0; row < 20; row++) {
        var cleared = 0
        for (var col = 0; col < 10; col++) {
          let block = this.matrix[row][col];
          if (9 === block) { // solid garbage
            break;
          };
          if (0 !== block) {
            cleared++
          }
        };
        if (10 === cleared) {

          let attack = this.gamedata.attack - oldAttack;

          shake(this.GFXCanvas.parentNode, Math.min(1 + attack * 5, 50))



          this.GFXQueue.push({
            opacity: 1,
            row,
            blockSize: this.block_size,
            amountParted: 0,
            process: function(ctx) {
              if (this.opacity <= 0)
                return false;

              var x1 = 1;
              var x2 = this.blockSize * 5 + this.amountParted;
              var y = 1 + this.row * this.blockSize;

              // Create gradient
              var leftGradient = ctx.createLinearGradient(0, 0, this.blockSize * 5 - this.amountParted, 0);
              leftGradient.addColorStop(0, `rgba(255,255,255,${this.opacity})`);
              leftGradient.addColorStop(1, `rgba(255,170,0,0)`);
              // Fill with gradient
              ctx.fillStyle = leftGradient;
              ctx.fillRect(x1, y, this.blockSize * 5 - this.amountParted, this.blockSize);

              // Create gradient
              var rightGradient = ctx.createLinearGradient(0, 0, this.blockSize * 5 - this.amountParted, 0);
              rightGradient.addColorStop(0, `rgba(255,170,0,0)`);
              rightGradient.addColorStop(1, `rgba(255,255,255,${this.opacity})`);
              // Fill with gradient
              ctx.fillStyle = rightGradient;
              ctx.fillRect(x2, y, this.blockSize * 5 - this.amountParted, this.blockSize);

              this.amountParted = window.lerp(this.amountParted, this.blockSize * 5, 0.3);
              this.opacity -= 0.07;

              return true;
            }

          })
        }
      }
      return oldLineClears.apply(this, arguments);

    }
    // have to do this so we can properly override ReplayerCore
    Replayer.prototype.checkLineClears = GameCore.prototype.checkLineClears;

    Replayer.prototype.playSound = () => {
      Game.prototype.playSound.apply({
        ...this,
        SEenabled: true,
        R: {
          sfx: true
        }
      }, arguments);
    };


    // placement animation
    const oldPlaceBlock = GameCore.prototype.placeBlock
    GameCore.prototype.placeBlock = function(col, row, time) {

      if (!this.GFXCanvas || DISABLE_PLACE_BLOCK_ANIMATION)
        return oldPlaceBlock.apply(this, arguments);

      const block = this.blockSets[this.activeBlock.set]
        .blocks[this.activeBlock.id]
        .blocks[this.activeBlock.rot];

      let val = oldPlaceBlock.apply(this, arguments);


      // flashes the piece once you place it
      this.GFXQueue.push({
        opacity: 0.5,
        col,
        row,
        blockSize: this.block_size,
        block,
        process: function(ctx) {
          if (this.opacity <= 0)
            return false;

          ctx.fillStyle = `rgba(255,255,255,${this.opacity})`;
          this.opacity -= 0.07;

          for (var i = 0; i < this.block.length; i++) {
            for (var j = 0; j < this.block[i].length; j++) {

              if (!this.block[i][j])
                continue;

              var x = 1 + (this.col + j) * this.blockSize
              var y = 1 + (this.row + i) * this.blockSize

              ctx.fillRect(x, y, this.blockSize, this.blockSize);
            }
          }
          return true;
        }
      })

      var trailLeftBorder = 10;
      var trailRightBorder = 0;
      var trailBottom = 0;
      for (var i = 0; i < block.length; i++) {
        for (var j = 0; j < block[i].length; j++) {
          if (!block[i][j])
            continue;
          trailLeftBorder = Math.max(Math.min(trailLeftBorder, j), 0);
          trailRightBorder = Math.min(Math.max(trailRightBorder, j), 10);
          trailBottom = Math.max(trailBottom, i);
        }
      }

      // flashes the piece once you place it
      this.GFXQueue.push({
        opacity: 0.1,
        col,
        row,
        blockSize: this.block_size,
        trailTop: 1,
        block,
        trailLeftBorder,
        trailRightBorder,
        trailBottom,
        process: function(ctx) {
          if (this.opacity <= 0)
            return false;

          var {
            trailLeftBorder,
            trailRightBorder,
            trailBottom
          } = this;

          var row = this.row + trailBottom

          var gradient = ctx.createLinearGradient(0, 0, 0, row * this.blockSize - this.trailTop);
          gradient.addColorStop(0, `rgba(255,255,255,0)`);
          gradient.addColorStop(1, `rgba(255,255,255,${this.opacity})`);

          // Fill with gradient
          ctx.fillStyle = gradient;
          ctx.fillRect((this.col + trailLeftBorder) * this.blockSize, this.trailTop, (trailRightBorder - trailLeftBorder + 1) * this.blockSize, row * this.blockSize - this.trailTop);

          const middle = (trailLeftBorder + trailRightBorder) / 2

          this.trailLeftBorder = window.lerp(trailLeftBorder, middle, 0.1);
          this.trailRightBorder = window.lerp(trailRightBorder, middle, 0.1);

          this.opacity -= 0.0125;

          return true;
        }
      })



      requestAnimationFrame(this.GFXLoop);

    }
    // have to do this so we can properly override ReplayerCore
    Replayer.prototype.placeBlock = GameCore.prototype.placeBlock;
  })

  // modal UI inject
  //var img = document.createElement("IMG");
  //img.src = "https://i.pinimg.com/736x/4a/a1/b0/4aa1b05b25a687d05bc807a13410b6e5.jpg";


  // https://jsfiddle.net/12aueufy/1/
  var shakingElements = [];

  var shake = function(element, magnitude = 16, numberOfShakes = 15, angular = false) {
    if (!element) return;

    //First set the initial tilt angle to the right (+1)
    var tiltAngle = 1;

    //A counter to count the number of shakes
    var counter = 1;

    //The total number of shakes (there will be 1 shake per frame)

    //Capture the element's position and angle so you can
    //restore them after the shaking has finished
    var startX = 0,
      startY = 0,
      startAngle = 0;

    // Divide the magnitude into 10 units so that you can
    // reduce the amount of shake by 10 percent each frame
    var magnitudeUnit = magnitude / numberOfShakes;

    //The `randomInt` helper function
    var randomInt = (min, max) => {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    //Add the element to the `shakingElements` array if it
    //isn't already there


    if (shakingElements.indexOf(element) === -1) {
      //console.log("added")
      shakingElements.push(element);

      //Add an `updateShake` method to the element.
      //The `updateShake` method will be called each frame
      //in the game loop. The shake effect type can be either
      //up and down (x/y shaking) or angular (rotational shaking).
      if (angular) {
        angularShake();
      } else {
        upAndDownShake();
      }
    }

    //The `upAndDownShake` function
    function upAndDownShake() {

      //Shake the element while the `counter` is less than
      //the `numberOfShakes`
      if (counter < numberOfShakes) {

        //Reset the element's position at the start of each shake
        element.style.transform = 'translate(' + startX + 'px, ' + startY + 'px)';

        //Reduce the magnitude
        magnitude -= magnitudeUnit;

        //Randomly change the element's position
        var randomX = randomInt(-magnitude, magnitude);
        var randomY = randomInt(-magnitude, magnitude);

        element.style.transform = 'translate(' + randomX + 'px, ' + randomY + 'px)';

        //Add 1 to the counter
        counter += 1;

        requestAnimationFrame(upAndDownShake);
      }

      //When the shaking is finished, restore the element to its original
      //position and remove it from the `shakingElements` array
      if (counter >= numberOfShakes) {
        element.style.transform = 'translate(' + startX + ', ' + startY + ')';
        shakingElements.splice(shakingElements.indexOf(element), 1);
      }
    }

    //The `angularShake` function
    function angularShake() {
      if (counter < numberOfShakes) {
        console.log(tiltAngle);
        //Reset the element's rotation
        element.style.transform = 'rotate(' + startAngle + 'deg)';

        //Reduce the magnitude
        magnitude -= magnitudeUnit;

        //Rotate the element left or right, depending on the direction,
        //by an amount in radians that matches the magnitude
        var angle = Number(magnitude * tiltAngle).toFixed(2);
        console.log(angle);
        element.style.transform = 'rotate(' + angle + 'deg)';
        counter += 1;

        //Reverse the tilt angle so that the element is tilted
        //in the opposite direction for the next shake
        tiltAngle *= -1;

        requestAnimationFrame(angularShake);
      }

      //When the shaking is finished, reset the element's angle and
      //remove it from the `shakingElements` array
      if (counter >= numberOfShakes) {
        element.style.transform = 'rotate(' + startAngle + 'deg)';
        shakingElements.splice(shakingElements.indexOf(element), 1);
        //console.log("removed")
      }
    }

  };


  const css = `
body {font-family: Arial, Helvetica, sans-serif;}

/* The Modal (background) */
.modal {
  display: none; /* Hidden by default */
  position: fixed; /* Stay in place */
  z-index: 1; /* Sit on top */
  left: 0;
  top: 0;
  width: 100%; /* Full width */
  height: 100%; /* Full height */
  overflow: auto; /* Enable scroll if needed */
  background-color: rgb(0,0,0); /* Fallback color */
  background-color: rgba(0,0,0,0.4); /* Black w/ opacity */
  -webkit-animation-name: fadeIn; /* Fade in the background */
  -webkit-animation-duration: 0.4s;
  animation-name: fadeIn;
  animation-duration: 0.4s
}

/* Modal Content */
.modal-content {
  position: fixed;
  bottom: 0;
  background-color: #fefefe;
  width: 100%;
  -webkit-animation-name: slideIn;
  -webkit-animation-duration: 0.4s;
  animation-name: slideIn;
  animation-duration: 0.4s
}

/* The Close Button */
.close {
  color: white;
  float: right;
  font-size: 28px;
  font-weight: bold;
}

.close:hover,
.close:focus {
  color: #000;
  text-decoration: none;
  cursor: pointer;
}

.modal-header {
  padding: 2px 16px;
  background-color: #5cb85c;
  color: white;
}

.modal-body {padding: 2px 16px;}

.modal-footer {
  padding: 2px 16px;
  background-color: #5cb85c;
  color: white;
}

/* Add Animation */
@-webkit-keyframes slideIn {
  from {bottom: -300px; opacity: 0}
  to {bottom: 0; opacity: 1}
}

@keyframes slideIn {
  from {bottom: -300px; opacity: 0}
  to {bottom: 0; opacity: 1}
}

@-webkit-keyframes fadeIn {
  from {opacity: 0}
  to {opacity: 1}
}

@keyframes fadeIn {
  from {opacity: 0}
  to {opacity: 1}
}`;
}