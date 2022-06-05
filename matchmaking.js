let JSTRIS_MM = function() {
  if (typeof Live != "function") {
    return
  }
  let queueinfo = document.createElement("div");
  let queueinfolist = document.createElement("li");
  queueinfo.style.color = "#bcc8d4"
  queueinfolist.appendChild(queueinfo)
  queueinfolist.style.float = "left"
  queueinfolist.style.display = "flex"
  queueinfolist.style.height = "60px"
  queueinfolist.style.flexDirection = "column"
  queueinfolist.style.justifyContent = "center"
  queueinfolist.style.minWidth = "100px"
  queueinfolist.style.alignItems = "center"
  queueinfo.innerHTML = "not connected to matchmaking"
  let cc = document.getElementsByClassName("nav navbar-nav navbar-right")[0]
  cc.prepend(queueinfolist);
  let liveListener = Live.prototype.authorize
  let CONNECTED = false
  Live.prototype.authorize = function() {
    let val = liveListener.apply(this, arguments)
    if (arguments[0] && arguments[0].token) {
      loadMM(arguments[0].token)
    }
    return val
  }

  function loadMM(token) {
    let HOST = "wss://freycat-mm.herokuapp.com/"
    let ws = new WebSocket(HOST);
    let QUEUEING = false
    let HOVERING = false

    let plist = document.createElement("li");
    let p = document.createElement("button");
    p.style.color = "white"
    p.style.border = "2px solid #1b998b"
    p.style.borderRadius = "2px"
    p.style.backgroundColor = "#375a7f"
    p.style.transitionDuration = "0.4s"
    p.style.width = "200px"
    p.id = "queueButton"
    p.innerHTML = "Enter Matchmaking"
    plist.appendChild(p)
    plist.style.float = "left"
    plist.style.display = "flex"
    plist.style.height = "60px"
    plist.style.flexDirection = "column"
    plist.style.justifyContent = "center"
    plist.style.minWidth = "120px"
    plist.style.alignItems = "center"

    let timeInQueue = 0;
    let timeInc = null
    let toMMSS = function(sec_num) {
      let minutes = Math.floor(sec_num / 60);
      let seconds = sec_num - (minutes * 60);
      if (minutes < 10) {
        minutes = "0" + minutes;
      }
      if (seconds < 10) {
        seconds = "0" + seconds;
      }
      return "" + minutes + ':' + seconds;
    }

    function ping() {
      ws.send(JSON.stringify({
        type: "ping"
      }))
    }

    function updateClock() {
      timeInQueue += 1
      updateBTN()

    }
    p.onmouseover = function() {
      HOVERING = true
      p.style.color = "white"
      p.style.backgroundColor = "#1b998b"
      updateBTN()
    };
    p.onmouseout = function() {
      HOVERING = false
      p.style.color = "white"
      p.style.backgroundColor = "#375a7f"
      updateBTN()
    };

    function updateBTN() {
      if (QUEUEING) {
        if (HOVERING) {
          p.innerHTML = "Cancel Matchmaking"
        } else {
          p.innerHTML = toMMSS(timeInQueue)
        }

      } else {
        p.innerHTML = "Enter Matchmaking"
      }
    }
    ws.onmessage = (event) => {
      console.log(event.data)
      let res = JSON.parse(event.data)
      if (res.type == "room") {
        QUEUEING = false
        window.joinRoom(res.rid)
        createjs.Sound.play("ding")
        document.title = "🚨Match Starting!"
        setTimeout(() => {
          document.title = "Jstris"
        }, 2000)
        updateBTN()
      } else if (res.type == "decline") {
        QUEUEING = false
        updateBTN()
        p.innerHTML = "Already In"
      } else if (res.type == "ping") {
        if (res.count > 0) {
          queueinfo.style.color = "#1b998b"
        } else {
          queueinfo.style.color = "#bcc8d4"
        }
        queueinfo.innerHTML = "" + res.count + " In Queue"
      } else if (res.type == "init") {
        CONNECTED = true
        cc.prepend(plist);
        queueinfo.innerHTML = "0 In Queue"
        console.log("JEAGUE LEAGUE CONNECTED")
      }
    };
    ws.onopen = function(event) {
      setInterval(ping, 10000)
      ws.send(JSON.stringify({
        type: "init",
        token: token
      }))
      p.onclick = function() {
        if (!CONNECTED) {
          return
        }
        if (QUEUEING) {
          clearInterval(timeInc)
          console.log("freycat dcing")
          ws.send(JSON.stringify({
            type: "disconnect"
          }))
        } else {
          console.log("freycat connecting")
          timeInQueue = 0
          clearInterval(timeInc)
          timeInc = setInterval(updateClock, 1000)
          ws.send(JSON.stringify({
            type: "connect"
          }))
        }
        QUEUEING = !QUEUEING
        updateBTN()
      };
    };

  }
}