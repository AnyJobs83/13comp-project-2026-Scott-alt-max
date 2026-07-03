// Consts and Variables
const INFORMATIONPANELWIDTH = 150;
const GAMEWIDTH = Math.min(window.innerWidth * 0.7, window.innerHeight * 0.7);
const GAMEHEIGHT = Math.min(window.innerWidth * 0.7, window.innerHeight * 0.7);
const MAZEWALLCOLOR = "Black";
const MAZEWALLWIDTH = 3;

var SquaresWide = 0;
var SquaresTall = 0;
let smallButton, mediumButton, bigButton, stupidBigButton;
let Player, FinishSquare, MazeWall, MazeWalls;

var PlayerSpeed = 0.2;
var PlayerMaxSpeed = 5;

// Game variables
var GameState = 0;
const TEXTSIZE = 25;
var GameSeconds = 2;
var SecondsLeft;
var CurrentFrame = 0;

// Firebase functions and variables to get the highscores working
var HighScore;
var haveUpdatedHighScore = false;

async function updateHighScore(_highScore) {
    haveUpdatedHighScore = true;

    const userID = await getUserIDFirebase();

    var filePath = "userPublicDetails/" + userID + "/mazeGameHighScore";
    writeFirebase(filePath, _highScore);
}
async function readHighScore(userID) {
    var filePath = "userPublicDetails/" + userID + "/mazeGameHighScore";
    return readFirebase(filePath);
}

// Rest of game code

// For the middle squares of the maze, a 6 means part of the maze, a 5 means a part of the trail, and a 4 means not part of the maze or trail,
// and for the walls, a 3 means an edge wall, a 2 means a wall, a 1 means a gap, and a 0 mean a corner
// Example 4 by 4 maze:
/* var Maze =  [[0, 3, 0, 3, 0, 3, 0, 3, 0],
                [3, 4, 2, 4, 2, 4, 2, 4, 3],
                [0, 2, 0, 2, 0, 2, 0, 2, 0],
                [3, 4, 2, 4, 2, 4, 2, 4, 3],
                [0, 2, 0, 2, 0, 2, 0, 2, 0],
                [3, 4, 2, 4, 2, 4, 2, 4, 3],
                [0, 2, 0, 2, 0, 2, 0, 2, 0],
                [3, 4, 2, 4, 2, 4, 2, 4, 3],
                [0, 3, 0, 3, 0, 3, 0, 3, 0]];*/

// Functions to create the inital template of the maze, pictured above
var Maze = [];
function InitialiseMaze() {
    Maze.length = 0;
    Maze.push(CreateWallRow(true));
    Maze.push(CreateSquareRow());
    for (var i = 0; i < SquaresTall - 1; i++) {
        Maze.push(CreateWallRow(false));
        Maze.push(CreateSquareRow());
    }
    Maze.push(CreateWallRow(true));

    function CreateWallRow(IsTopOrBottomWall) {
        var MazeRow = [];
        for (var i = 0; i < SquaresWide; i++) {
            MazeRow.push(0);
            if (IsTopOrBottomWall) {
                MazeRow.push(3);
            } else {
                MazeRow.push(2);
            }
        }
        MazeRow.push(0);
        return MazeRow;
    }
    function CreateSquareRow() {
        var MazeRow = [];
        MazeRow.push(3);
        MazeRow.push(4);
        for (var i = 0; i < SquaresWide - 1; i++) {
            MazeRow.push(2);
            MazeRow.push(4);
        }
        MazeRow.push(3);
        return MazeRow;
    }
}

// Functions to create the trails in the maze
function InitaliseRandomMazeSquare() {
    // Always initialise the bottom-right square for debugging, 
    // Then, always start the 1st random walk from the top-left, that will be the solution
    var SquareX = SquaresWide * 2 - 1;
    var SquareY = SquaresTall * 2 - 1;
    Maze[SquareY][SquareX] = 6;

    // Return the number of squares added to the maze (1)
    return 1;
}
function RandomWalk(WantToLogTrail) {
    // Create a 2D array that stores the array co-ordinates of the squares in the random walk
    var RandomWalkCoordinates = [];

    // Start at the top-left square
    var SquareX = 1;
    var SquareY = 1;

    // If the starting co-ordinates are already a part of the maze, keep trying random ones until you find a square that isnt
    while (Maze[SquareY][SquareX] == 6) {
        SquareX = Math.floor(Math.random() * SquaresWide) * 2 + 1;
        SquareY = Math.floor(Math.random() * SquaresTall) * 2 + 1;
    }
    Maze[SquareY][SquareX] = 5;
    RandomWalkCoordinates.push([SquareX, SquareY]);
    
    // Keep walking around the maze until the trail reaches the maze
    var ReachedTheMaze = false;
    while (!ReachedTheMaze) {
        // Pick a random direction
        switch (Math.floor(Math.random() * 4)) {
            case 0:
                // Go up

                // See if next wall is edge wall, if it is, restart with another direction
                if (IsNextWallAnEdge(SquareX, (SquareY - 1))) { break; }

                // See if next square is part of trail, if it is, backtrack until it gets back to the square
                if (IsNextSquarePartOfTrail(SquareX, (SquareY - 2))) { Backtrack(SquareX, (SquareY - 2)); }

                // See if next square is part of maze, if it is, break the while loop
                if (isNextSquarePartOfMaze(SquareX, (SquareY - 2))) { ReachedTheMaze = true; }

                // Move, add the direction to the random walk array, mark the new square as part of the trail
                // and add the new coordinates to the random walk array
                SquareY -= 2;
                Maze[SquareY][SquareX] = 5;
                RandomWalkCoordinates.push([SquareX, SquareY]);
                break;
            case 1:
                // Go right

                if (IsNextWallAnEdge((SquareX + 1), SquareY)) { break; }
                if (IsNextSquarePartOfTrail((SquareX + 2), SquareY)) { Backtrack((SquareX + 2), SquareY); }
                if (isNextSquarePartOfMaze((SquareX + 2), SquareY)) { ReachedTheMaze = true; }

                SquareX += 2;
                Maze[SquareY][SquareX] = 5;
                RandomWalkCoordinates.push([SquareX, SquareY]);
                break;
            case 2:
                // Go down   
                
                if (IsNextWallAnEdge(SquareX, (SquareY + 1))) { break; }
                if (IsNextSquarePartOfTrail(SquareX, (SquareY + 2))) { Backtrack(SquareX, (SquareY + 2)); }
                if (isNextSquarePartOfMaze(SquareX, (SquareY + 2))) { ReachedTheMaze = true; }

                SquareY += 2;
                Maze[SquareY][SquareX] = 5;
                RandomWalkCoordinates.push([SquareX, SquareY]);
                break;
            case 3:
                // Go left

                if (IsNextWallAnEdge((SquareX - 1), SquareY)) { break; }
                if (IsNextSquarePartOfTrail((SquareX - 2), SquareY)) { Backtrack((SquareX - 2), SquareY); }
                if (isNextSquarePartOfMaze((SquareX - 2), SquareY)) {  ReachedTheMaze = true; }
                
                SquareX -= 2;
                Maze[SquareY][SquareX] = 5;
                RandomWalkCoordinates.push([SquareX, SquareY]);
        }
    }
    if (WantToLogTrail) {
    }
    
    // Iterate over the random walk array and change each square to part of the maze, 
    // and each wall to a gap by taking the average co-ordinates of two adjacent parts of the trail
    var NumberOfSquaresAddedToMaze = 0;
    for (var i = 0; i < RandomWalkCoordinates.length - 1; i++) {
        NumberOfSquaresAddedToMaze++;
        var MazeX = RandomWalkCoordinates[i][0];
        var MazeY = RandomWalkCoordinates[i][1];

        var NextMazeX = RandomWalkCoordinates[i + 1][0];
        var NextMazeY = RandomWalkCoordinates[i + 1][1];

        Maze[MazeY][MazeX] = 6;
        Maze[(MazeY + NextMazeY) / 2][(MazeX + NextMazeX) / 2] = 1;
    }
    Maze[SquareY][SquareX] = 6;
    
    // Return the number of squares added to the maze
    return NumberOfSquaresAddedToMaze;

    function Backtrack(targetX, targetY) {
        // Backtrack through the random walk coordinates array, removing all items as it goes, until it reaches the target
        // Also change those coordinates to not be a part of the trail anymore
        while ((RandomWalkCoordinates[RandomWalkCoordinates.length - 1][0] != targetX) || 
                RandomWalkCoordinates[RandomWalkCoordinates.length - 1][1] != targetY) {
            Maze[RandomWalkCoordinates[RandomWalkCoordinates.length - 1][1]][RandomWalkCoordinates[RandomWalkCoordinates.length - 1][0]] = 4;
            RandomWalkCoordinates.pop();
        }
        // Delete the co-ordinates that the trail is currently on, and add them back in the same logic as for just moving up
        RandomWalkCoordinates.pop();
    }
    function IsNextWallAnEdge(wallX, wallY) {
        if (Maze[wallY][wallX] == 3) {
            // console.log("Reached an edge");
            return true;
        } else {
            return false;
        }
    }
    function IsNextSquarePartOfTrail(squareX, squareY) {
        if (Maze[squareY][squareX] == 5) {
            // console.log("Gone back to the trail");
            return true;
        } else {
            return false;
        }
    }
    function isNextSquarePartOfMaze(squareX, squareY) {
        if (Maze[squareY][squareX] == 6) {
            // console.log("Reached the a part of the maze");
            return true;
        } else {
            return false;
        }
    }
}

// Initialise the maze and create all the paths in it
function CreateMaze() {
    // While there are still squares not part of the maze, keep doing the random walk function until the maze is finished
    var NumberOfSquaresAddedToMaze = 0;
    var NumberOfSquaresInMaze = SquaresTall * SquaresWide;
    InitialiseMaze();
    NumberOfSquaresAddedToMaze += InitaliseRandomMazeSquare();

    // For the first random walk, log the co-ordinates of the trail for debugging
    if (NumberOfSquaresInMaze > 1) {
        NumberOfSquaresAddedToMaze += RandomWalk(true);
    }
    while (NumberOfSquaresAddedToMaze < NumberOfSquaresInMaze) {
        NumberOfSquaresAddedToMaze += RandomWalk(false);
    }
}

// Functions to draw the maze
function DrawMaze() {
    CreateMaze();
    for (var i = 0; i < SquaresTall; i++) {
        DrawHorisontalWalls(i * 2);
        DrawVerticalWalls(i * 2 + 1);
    }
    DrawHorisontalWalls(SquaresTall * 2);
    
    function DrawHorisontalWalls(MazeY) {
        for (var i = 0; i < SquaresWide; i++) {
            var WallValue = Maze[MazeY][i * 2 + 1];
            if (WallValue == 2 || WallValue == 3) {
                MakeWall(i, (Math.floor(MazeY / 2)), (i + 1), (Math.floor(MazeY / 2)));
            }
        }
    }
    function DrawVerticalWalls(MazeY) {
        for (var i = 0; i <= SquaresWide; i++) {
            var WallValue = Maze[MazeY][i * 2];
            if (WallValue == 2 || WallValue == 3) {
                MakeWall(i, (Math.floor(MazeY / 2)), i, (Math.floor(MazeY / 2) + 1));
            }
        }
    }
    function MakeWall(StartingX, StartingY, EndingX, EndingY) {
        // Function that takes in two co-ordinates and make a wall between them
        // Make the grid a 21 by 21 square, and pass in points to that square
    
        // Create new sprite
        var HorisontalWallGap = GAMEWIDTH / SquaresWide;
        var VerticalWallGap = GAMEHEIGHT / SquaresTall;
    
        var WallX = HorisontalWallGap * StartingX + (HorisontalWallGap * EndingX - HorisontalWallGap * StartingX) / 2;
        var WallY = VerticalWallGap * StartingY + (VerticalWallGap * EndingY - VerticalWallGap * StartingY) / 2;
        var WallWidth = HorisontalWallGap * EndingX - HorisontalWallGap * StartingX + MAZEWALLWIDTH;
        var WallHeight = VerticalWallGap * EndingY - VerticalWallGap * StartingY + MAZEWALLWIDTH;
        MazeWall = new Sprite(WallX, WallY, WallWidth, WallHeight, "k");
        MazeWall.color = "#6B5C7D";
    
        MazeWalls.add(MazeWall);
    }
}

// Create all of the sprites
function CreateSprites(_SquaresWide, _SquaresTall) {
    // Change the squares wide and squares tall to the variables
    SquaresWide = _SquaresWide;
    SquaresTall = _SquaresTall;
    var SquareWidth = GAMEWIDTH / SquaresWide - MAZEWALLWIDTH;
    var SquareHeight = GAMEHEIGHT / SquaresTall - MAZEWALLWIDTH;
    var PlayerWidth =  0.5 * SquareWidth;
    var PlayerHeight = 0.5 * SquareHeight;

    // Player sprite
    var PlayerStartingX = (GAMEWIDTH / SquaresWide - PlayerWidth);
    var PlayerStartingY = (GAMEHEIGHT / SquaresTall - PlayerHeight);
    Player = new Sprite(PlayerStartingX, PlayerStartingY, PlayerWidth, PlayerHeight, "d");
    Player.strokeWeight = 0;
    Player.color = "#FF69B4";

    // Make the finish square
    FinishSquare = new Sprite(GAMEWIDTH - PlayerWidth, GAMEHEIGHT - PlayerHeight, SquareWidth, SquareHeight, "k");
    FinishSquare.color = "Green";
    FinishSquare.strokeWeight = 0;
    FinishSquare.collides(Player, WinGame);
    function WinGame() {
        EndGame(2);
    }

    // Draw the walls
    MazeWalls = new Group();
    DrawMaze();
    MazeWalls.color = MAZEWALLCOLOR;
}
function StartGame(_MazeSquaresWide, _MazeSquaresTall, _GameSeconds) {
    // Set the time for how long the game runs
    GameSeconds = _GameSeconds;

    // Remove the buttons
    smallButton.remove();
    mediumButton.remove();
    bigButton.remove();
    stupidBigButton.remove();

    // Change the gamestate to 1 (Running)
    GameState = 1;

    // Start the timer
    SecondsLeft = GameSeconds;

    // Make the sprites
    CreateSprites(_MazeSquaresWide, _MazeSquaresTall);

    // Reset haveUpdatedHighScore so user can update their highscore again
    haveUpdatedHighScore = false;

    // Get the user ID
    userID = getUserIDFirebase();

    // Get the highscore now because it is async
    readHighScore(userID).then((result) => {
        HighScore = result;
    });
}
function EndGame(gameState) {
    // Remove the sprites
    MazeWalls.remove();
    Player.remove();
    FinishSquare.remove();
    GameState = gameState;
    MakeButtons();
}
function MakeButtons() {
    // Create buttons to start the game
    smallButton = createButton('CreateSmallGame');
    smallButton.position(0, 100);
    smallButton.mousePressed(CreateSmallGame);

    mediumButton = createButton('CreateMediumGame');
    mediumButton.position(0, 120);
    mediumButton.mousePressed(CreateMediumGame);
    
    bigButton = createButton('CreateBigGame');
    bigButton.position(0, 140);
    bigButton.mousePressed(CreateBigGame);
    
    stupidBigButton = createButton('CreateStupidBigGame');
    stupidBigButton.position(0, 160);
    stupidBigButton.mousePressed(CreateStupidBigGame);

    function CreateSmallGame() {
        StartGame(2, 2, 3);
    }
    function CreateMediumGame() {
        StartGame(5, 5, 7);
    }
    function CreateBigGame() {
        StartGame(20, 20, 25);
    }
    function CreateStupidBigGame() {
        StartGame(50, 50, 150);
    }
}

// Setup function
function setup() {
    const canvas = createCanvas(GAMEWIDTH + INFORMATIONPANELWIDTH, GAMEHEIGHT);
    canvas.parent("maze-game-container");
    MakeButtons();
}

// Draw loop
function draw() {
    background("#355C7D");
    switch (GameState) {
        case 0:
            // Game hasn't started yet
            // Show the text for the start screen
	        textSize(TEXTSIZE);
            textAlign(CENTER, TOP);
            text("W, A, S, D to move", (GAMEWIDTH + INFORMATIONPANELWIDTH) / 2, GAMEHEIGHT / 2 - (TEXTSIZE + 25));
            text("Try to get from the top-left, to the bottom-right,", (GAMEWIDTH + INFORMATIONPANELWIDTH) / 2, GAMEHEIGHT / 2);
            text("in the amount of time given", (GAMEWIDTH + INFORMATIONPANELWIDTH) / 2, GAMEHEIGHT / 2 + (TEXTSIZE + 5));
            text("Press 'r' to restart", (GAMEWIDTH + INFORMATIONPANELWIDTH) / 2, GAMEHEIGHT / 2 + (TEXTSIZE * 2 + 30));
            break;
        case 1:
            // Game is running

            // Timer
            CurrentFrame++;
            if (CurrentFrame == 60) {
                SecondsLeft--;
                CurrentFrame = 0;
            }

            // Check if the game is over, or that the user has pressed restart (r)
            if (SecondsLeft == 0) {
                EndGame(3);
                break;
            } if (kb.pressing('r')) {
                EndGame(0);
                break;
            }

            // Text
	        textSize(TEXTSIZE);
            textAlign(CENTER, TOP);
            text("Time:", GAMEWIDTH + (INFORMATIONPANELWIDTH / 2), 15);
	        textSize(TEXTSIZE * 3);
            text(SecondsLeft, GAMEWIDTH + (INFORMATIONPANELWIDTH / 2), TEXTSIZE * 1.5 + 20);
            
	        textSize(TEXTSIZE);
            text("Restart: 'r'", GAMEWIDTH + (INFORMATIONPANELWIDTH / 2), TEXTSIZE * 7);
            
            // Controls
            if (kb.pressing('left') && Player.vel.x > -PlayerMaxSpeed) {
                Player.vel.x -= PlayerSpeed;
            } if (kb.pressing('right') && Player.vel.x < PlayerMaxSpeed) {
                Player.vel.x += PlayerSpeed;
            } if (kb.pressing('up') && Player.vel.y > -PlayerMaxSpeed) {
                Player.vel.y -= PlayerSpeed;
            } if (kb.pressing('down') && Player.vel.y < PlayerMaxSpeed) {
                Player.vel.y += PlayerSpeed;
            }
            break;
        case 2:
            // Game has finished, player won
	        textSize(TEXTSIZE);
            textAlign(CENTER, CENTER);
            text("You Won", (GAMEWIDTH + INFORMATIONPANELWIDTH) / 2, GAMEHEIGHT / 2);
            text("You had " + SecondsLeft + " seconds left", (GAMEWIDTH + INFORMATIONPANELWIDTH) / 2, GAMEHEIGHT / 2 + TEXTSIZE + 5);
            text("Your high score is " + HighScore, (GAMEWIDTH + INFORMATIONPANELWIDTH) / 2, GAMEHEIGHT / 2 + TEXTSIZE * 2 + 10);
            
            // Send highscore to firebase
            if (SecondsLeft > HighScore && !haveUpdatedHighScore) {
                updateHighScore(SecondsLeft);
            }
            break;
        case 3:
            // Game has finished, player lost
            textSize(TEXTSIZE);
            textAlign(CENTER, CENTER);
            text("You Lost", (GAMEWIDTH + INFORMATIONPANELWIDTH) / 2, GAMEHEIGHT / 2);
            text("You had " + SecondsLeft + " seconds left", (GAMEWIDTH + INFORMATIONPANELWIDTH) / 2, GAMEHEIGHT / 2 + TEXTSIZE + 5);
            text("Your high score is " + HighScore, (GAMEWIDTH + INFORMATIONPANELWIDTH) / 2, GAMEHEIGHT / 2 + TEXTSIZE * 2 + 10);

            // Send highscore to firebase
            if (SecondsLeft > HighScore && !haveUpdatedHighScore) {
                updateHighScore(SecondsLeft);
            }
            break;
        default:
            // Throw an error is gamestate is none of the above
            console.log("GameState varibale is invalid");
    }
}

window.setup = setup;
window.draw = draw;