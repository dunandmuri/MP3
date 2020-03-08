// GAME SETUP
var initialState = SKIPSETUP ? "playing" : "setup";
var gameState = new GameState({state: initialState});
var cpuBoard = new Board({autoDeploy: true, name: "cpu"});
var playerBoard = new Board({autoDeploy: SKIPSETUP, name: "player"});
var cursor = new Cursor();

//NEW
var failCount = 0;
var successCount = 0;

var failCountPlayer = 0;
var successCountPlayer = 0;

var playerRoast = ["Miss. you're unlucky", "Miss. wow you're bad", "Miss. maybe next time", "Miss. I'm going to win."];
var playerPraise = ["Hit. Good job", "Hit. You were lucky.", "Hit. Stop cheating.", "Hit. Stop that!"];

var failures = ["I am unlucky", "I'm just distracted", "Ignore that.", "That never happened"];
var successes = ["Meant to be", "You dont stand a chance", "I wasn't even trying", "Can't stop me"];

var lieCount = 0;

// UI SETUP
setupUserInterface();

// selectedTile: The tile that the player is currently hovering above
var selectedTile = false;

// grabbedShip/Offset: The ship and offset if player is currently manipulating a ship
var grabbedShip = false;
var grabbedOffset = [0, 0];

// isGrabbing: Is the player's hand currently in a grabbing pose
var isGrabbing = false;

// MAIN GAME LOOP
// Called every time the Leap provides a new frame of data
Leap.loop({ hand: function(hand) {

  // Clear any highlighting at the beginning of the loop
  unhighlightTiles();

  // TODO: 4.1, Moving the cursor with Leap data
  // Use the hand data to control the cursor's screen position
  var cursorPosition = [hand.screenPosition()[0]-100, hand.screenPosition()[1]+180];
  cursor.setScreenPosition(cursorPosition);
  // TODO: 4.1
  // Get the tile that the player is currently selecting, and highlight it
  //selectedTile = ?
  selectedTile = getIntersectingTile(cursorPosition);
  if(selectedTile!=false){
    highlightTile(selectedTile, "#7CD3A2");
  }

  // SETUP mode
  if (gameState.get('state') == 'setup') {
    background.setContent("<h1>battleship</h1><h3 style='color: #7CD3A2;'>deploy ships</h3>");
    // TODO: 4.2, Deploying ships
    //  Enable the player to grab, move, rotate, and drop ships to deploy them

    // First, determine if grabbing pose or not
    //isGrabbing = false;
    isGrabbing = (hand.grabStrength > .65) ? true : false;

    // Grabbing, but no selected ship yet. Look for one.
    // TODO: Update grabbedShip/grabbedOffset if the user is hovering over a ship
    if (!grabbedShip && isGrabbing) {
        grabbedShip = getIntersectingShipAndOffset(cursorPosition).ship;
        grabbedOffset = getIntersectingShipAndOffset(cursorPosition).offset;
    }

    // Has selected a ship and is still holding it
    // TODO: Move the ship
    else if (grabbedShip && isGrabbing) {
      //grabbedShip.setScreenPosition([0,0]);
      //grabbedShip.setScreenRotation(0);
      grabbedShip.setScreenPosition([hand.screenPosition()[0]-200, hand.screenPosition()[1]+100]);
      grabbedShip.setScreenRotation(-1*hand.roll()-.5);
    }

    // Finished moving a ship. Release it, and try placing it.
    // TODO: Try placing the ship on the board and release the ship
    else if (grabbedShip && !isGrabbing) {
      placeShip(grabbedShip);
      grabbedShip = false;
    }
  }

  // PLAYING or END GAME so draw the board and ships (if player's board)
  // Note: Don't have to touch this code
  else {
    if (gameState.get('state') == 'playing') {
      background.setContent("<h1>battleship</h1><h3 style='color: #7CD3A2;'>game on</h3>");
      turnFeedback.setContent(gameState.getTurnHTML());
    }
    else if (gameState.get('state') == 'end') {
      var endLabel = gameState.get('winner') == 'player' ? 'you won!' : 'game over';
      background.setContent("<h1>battleship</h1><h3 style='color: #7CD3A2;'>"+endLabel+"</h3>");
      turnFeedback.setContent("");
    }

    var board = gameState.get('turn') == 'player' ? cpuBoard : playerBoard;
    // Render past shots
    board.get('shots').forEach(function(shot) {
      var position = shot.get('position');
      var tileColor = shot.get('isHit') ? Colors.RED : Colors.YELLOW;
      highlightTile(position, tileColor);
    });

    // Render the ships
    playerBoard.get('ships').forEach(function(ship) {
      if (gameState.get('turn') == 'cpu') {
        var position = ship.get('position');
        var screenPosition = gridOrigin.slice(0);
        screenPosition[0] += position.col * TILESIZE;
        screenPosition[1] += position.row * TILESIZE;
        ship.setScreenPosition(screenPosition);
        if (ship.get('isVertical'))
          ship.setScreenRotation(Math.PI/2);
      } else {
        ship.setScreenPosition([-500, -500]);
      }
    });

    // If playing and CPU's turn, generate a shot
    if (gameState.get('state') == 'playing' && gameState.isCpuTurn() && !gameState.get('waiting')) {
      gameState.set('waiting', true);
      generateCpuShot();
    }
  }
}}).use('screenPosition', {scale: LEAPSCALE});

// processSpeech(transcript)
//  Is called anytime speech is recognized by the Web Speech API
// Input: 
//    transcript, a string of possibly multiple words that were recognized
// Output: 
//    processed, a boolean indicating whether the system reacted to the speech or not
var processSpeech = function(transcript) {
  // Helper function to detect if any commands appear in a string
  var userSaid = function(str, commands) {
    for (var i = 0; i < commands.length; i++) {
      if (str.indexOf(commands[i]) > -1)
        return true;
    }
    return false;
  };

  var processed = false;
  if (gameState.get('state') == 'setup') {
    // TODO: 4.3, Starting the game with speech
    // Detect the 'start' command, and start the game if it was said
    if (userSaid(transcript.toLowerCase(), ["start"])) {
      gameState.startGame();
      processed = true;
    }

    else if (userSaid(transcript.toLowerCase(), ["help"])){
      generateSpeech("Grab your battleship and drag it onto the board. Say start to continue.");
    }

/*    if (userSaid(transcript.toLowerCase(), ["ship"])){
      playerBoard.get('ships').forEach(function(ship) {
        console.log("SHIP");
        if(ship.get("length")==3){
          console.log("FOUND IT");
          ship.setScreenPosition(hand.screenPosition());
          ship.setScreenRotation(-1*hand.roll());
          placeShip(ship);
        }
      });

      //shipToPlace.setScreenPosition(hand.screenPosition());
    }*/
  }

  else if (gameState.get('state') == 'playing') {
    if (gameState.isPlayerTurn()) {
      // TODO: 4.4, Player's turn
      // Detect the 'fire' command, and register the shot if it was said
      if (userSaid(transcript.toLowerCase(), ["fire"])) {
        registerPlayerShot();

        processed = true;
      }
      else if (userSaid(transcript.toLowerCase(), ["help"])){
        generateSpeech("Point at a tile and say fire.");
      }
    }

    else if (gameState.isCpuTurn() && gameState.waitingForPlayer()) {
      // TODO: 4.5, CPU's turn
      // Detect the player's response to the CPU's shot: hit, miss, you sunk my ..., game over
      // and register the CPU's shot if it was said
      if (userSaid(transcript.toLowerCase(), ["miss"])) {
        var response = "miss";
        registerCpuShot(response);
        processed = true;
      }
      else if (userSaid(transcript.toLowerCase(), ["hit"])) {
        var response = "hit";
        registerCpuShot(response);
        processed = true;
      }
      else if (userSaid(transcript.toLowerCase(), ["sunk"])) {
        var response = "sunk";
        registerCpuShot(response);
        processed = true;
      }
      else if (userSaid(transcript.toLowerCase(), ["game over"])) {
        var response = "game over";
        registerCpuShot(response);
        processed = true;
      }
      else if (userSaid(transcript.toLowerCase(), ["help"])){
        generateSpeech("Tell me whether I hit, miss, sank, or caused game over.");
      }
    }
  }

  return processed;
};

// TODO: 4.4, Player's turn
// Generate CPU speech feedback when player takes a shot
var registerPlayerShot = function() {
  //selectedTile = getIntersectingTile(cursorPosition);

  // TODO: CPU should respond if the shot was off-board
  if (!selectedTile) {
    generateSpeech("You missed the board");
  }

  // If aiming at a tile, register the player's shot
  else {
    var shot = new Shot({position: selectedTile});
    var result = cpuBoard.fireShot(shot);

    // Duplicate shot
    if (!result) return;

    // TODO: Generate CPU feedback in three cases
    // Game over
    if (result.isGameOver) {
      generateSpeech("You won");

      gameState.endGame("player");
      return;
    }
    // Sunk ship
    else if (result.sunkShip) {
      var shipName = result.sunkShip.get('type');
      generateSpeech("You sank the " + shipName)

    }
    // Hit or miss
    else {
      var isHit = result.shot.get('isHit');
      if(isHit==true){
        successCountPlayer+=1;
        failCountPlayer=0;
        if(successCountPlayer>=2){
          generateSpeech(playerPraise[Math.floor((Math.random() * 4))]);
        }
        else{
          generateSpeech("You hit");
        }
      }
      if(isHit==false){
        successCountPlayer=0;
        failCountPlayer+=1;
        if(failCountPlayer>=3){
          generateSpeech(playerRoast[Math.floor((Math.random() * 4))]);         
        }
        else{
          generateSpeech("You missed");
        }
      }
    }

    if (!result.isGameOver) {
      // TODO: Uncomment nextTurn to move onto the CPU's turn
      nextTurn();
    }
  }
};

// TODO: 4.5, CPU's turn
// Generate CPU shot as speech and blinking
var cpuShot;
var generateCpuShot = function() {
  // Generate a random CPU shot
  cpuShot = gameState.getCpuShot();
  var tile = cpuShot.get('position');
  var rowName = ROWNAMES[tile.row]; // e.g. "A"
  var colName = COLNAMES[tile.col]; // e.g. "5"

  // TODO: Generate speech and visual cues for CPU shot
  generateSpeech("Firing at " + rowName + " " + colName);
  blinkTile(tile);
};

// TODO: 4.5, CPU's turn
// Generate CPU speech in response to the player's response
// E.g. CPU takes shot, then player responds with "hit" ==> CPU could then say "AWESOME!"
var registerCpuShot = function(playerResponse) {
  // Cancel any blinking
  unblinkTiles();
  var result = playerBoard.fireShot(cpuShot);

  // NOTE: Here we are using the actual result of the shot, rather than the player's response
  // In 4.6, you may experiment with the CPU's response when the player is not being truthful!

  // TODO: Generate CPU feedback in three cases
  // Game over
  if (result.isGameOver) {
    if(playerResponse != "game over"){
      generateSpeech("Actually, I win!");
    }
    else{
      generateSpeech("I win!");
    }
    gameState.endGame("cpu");
    return;
  }
  // Sunk ship
  else if (result.sunkShip) {
    if(playerResponse == "miss"){
      lieCount+=1;
      generateSpeech("That's a lie. Battleship sunk.");
    }
    else if(playerResponse == "hit" || playerResponse == "game over"){
      generateSpeech("Not quite. I sank one.");
    }
    else{
      generateSpeech("You're going down.");
    }
    var shipName = result.sunkShip.get('type');
  }
  // Hit or miss
  else {

    var isHit = result.shot.get('isHit');

    if(isHit==true){
      if(playerResponse == "miss"){
        lieCount+=1;
        generateSpeech("That's a lie. I hit.");
      }
      else if(playerResponse == "sunk" || playerResponse == "game over"){
        generateSpeech("Not yet. I just hit.");
      }
      else if(successCount>=2){
        generateSpeech(successes[Math.floor((Math.random() * 4))]);
      }
      else{
        generateSpeech("Awesome!");
      }
      successCount+=1;
      failCount=0;
    }
    if(isHit==false){
      successCount = 0;
      failCount+=1;
      if(playerResponse!="miss"){
        lieCount+=1
        generateSpeech("Don't let me win, I missed.");
      }
      else if(failCount>=3){
        generateSpeech(failures[Math.floor((Math.random() * 4))]);
      }
      else{
        generateSpeech("Ok.");
      }

    }
  }

  if(lieCount>=4){
    generateSpeech("I don't play with liars.");
    gameState.endGame("cpu");
    return;
  }


  if (!result.isGameOver) {
    // TODO: Uncomment nextTurn to move onto the player's next turn
    nextTurn();
  }
};

