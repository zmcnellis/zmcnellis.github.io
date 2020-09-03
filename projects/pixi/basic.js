var renderer = PIXI.autoDetectRenderer(window.innerWidth, window.innerHeight,{backgroundColor : 0x1099bb});
document.body.appendChild(renderer.view);

window.addEventListener("resize", onresize);

var w = window.innerWidth;
var h = window.innerHeight;

window.onresize = function (event){
    w = window.innerWidth;
    h = window.innerHeight;

    //this part resizes the canvas but keeps ratio the same
    renderer.view.style.width = w + "px";
    renderer.view.style.height = h + "px";

    //this part adjusts the ratio:
    renderer.resize(w,h);

    bunny.position.y = h-100;
    bunny.position.x = w/2;

    bg.height = h;
    bg2.position.y = h-160;
    bg3.position.y = h-960;
}

// create the root of the scene graph
var stage = new PIXI.Container();
var myContainer = new PIXI.Container();

// create a texture from an image path
var texture = PIXI.Texture.fromImage('./zach.gif');
var bg_texture = PIXI.Texture.fromImage('./BG.jpg');
var bg2_texture = PIXI.Texture.fromImage('./BG_2.png');
var bg3_texture = PIXI.Texture.fromImage('./BG_3.png');


var bg = new PIXI.extras.TilingSprite(bg_texture, 100000, renderer.height);
var bg2 = new PIXI.extras.TilingSprite(bg2_texture, 100000, 160);
var bg3 = new PIXI.extras.TilingSprite(bg3_texture, 100000, 960);

// create a new Sprite using the texture
var bunny = new PIXI.Sprite(texture);

var style = {
    font : 'bold italic 36px Arial',
    fill : '#F7EDCA',
    stroke : '#4a1850',
    strokeThickness : 1,
    dropShadow : true,
    dropShadowColor : '#000000',
    dropShadowAngle : Math.PI / 6,
    dropShadowDistance : 6
};

var basicText = new PIXI.Text('Zachary McNellis', style);
basicText.x = 30;
basicText.y = 0;

var timeText = new PIXI.Text('0');
timeText.x = w-60;
timeText.y = 0;

// center the sprite's anchor point
bunny.anchor.x = 0.5;
bunny.anchor.y = 0.5;

// move the sprite to the center of the screen
bunny.position.x = w/2;
bunny.position.y = h-100;

bunny.scale.x = 0.4;
bunny.scale.y = 0.4;

bunny.xVel = 0.0;
bunny.yVel = 0.0;
bg.xVel = 0.0;
bg2.xVel = 0.0;
bg3.xVel = 0.0;

bg2.position.y = h-160;
bg3.position.y = h-960;

// starting position
bg.position.x = -800;
bg2.position.x = -800;
bg3.position.x = -800;

myContainer.addChild(bg);
myContainer.addChild(bg3);
myContainer.addChild(bg2);
myContainer.addChild(basicText);
myContainer.addChild(timeText);
myContainer.addChild(bunny);

var gravity = 0.5;
var jumping = false;

stage.addChild(myContainer);

var startTime = Date.now();

//Capture the keyboard arrow keys
var left = keyboard(37),
	up = keyboard(38),
	right = keyboard(39),
	down = keyboard(40);


//Left arrow key `press` method
left.press = function() {
	bunny.xVel = 0.0;
    bg.xVel = -2.0;
    bg2.xVel = -8.0;
    bg3.xVel = -5.0;

//Change the cat's velocity when the key is pressed

};

//Left arrow key `release` method
left.release = function() {
	bunny.xVel = 0.0;
    bg.xVel = 0.0;
    bg2.xVel = 0.0;
    bg3.xVel = 0.0;
//If the left arrow has been released, and the right arrow isn't down,
//and the cat isn't moving vertically:
//Stop the cat

};

//Up
up.press = function() {
	if (!jumping) {
		bunny.yVel = -12.0;
		jumping = true;
	}
};
up.release = function() {

};

//Right
right.press = function() {
	bunny.xVel = 0.0;
    bg.xVel = 2;
    bg2.xVel = 8;
    bg3.xVel = 5;
};
right.release = function() {
	bunny.xVel = 0.0;
    bg.xVel = 0.0;
    bg2.xVel = 0.0;
    bg3.xVel = 0.0;
};

//Down
down.press = function() {

};
down.release = function() {

};

// start animating
animate();

function keyboard(keyCode) {
  var key = {};
  key.code = keyCode;
  key.isDown = false;
  key.isUp = true;
  key.press = undefined;
  key.release = undefined;
  //The `downHandler`
  key.downHandler = function(event) {
    if (event.keyCode === key.code) {
      if (key.isUp && key.press) key.press();
      key.isDown = true;
      key.isUp = false;
    }
    event.preventDefault();
  };

  //The `upHandler`
  key.upHandler = function(event) {
    if (event.keyCode === key.code) {
      if (key.isDown && key.release) key.release();
      key.isDown = false;
      key.isUp = true;
    }
    event.preventDefault();
  };

  //Attach event listeners
  window.addEventListener(
    "keydown", key.downHandler.bind(key), false
  );
  window.addEventListener(
    "keyup", key.upHandler.bind(key), false
  );
  return key;
}

function animate() {
    requestAnimationFrame(animate);

    var currTime = Date.now();
    var elapsedTime = currTime - startTime;
    timeText.setText(parseInt(elapsedTime/1000));

    if (jumping) {
    	if (bunny.position.y > h-100) {
    		bunny.position.y = h-100;
    		bunny.yVel = 0;
    		jumping = false;
    	}
    	else {
    		bunny.yVel += gravity;
    	}
	}

    bunny.position.x += bunny.xVel;
    bunny.position.y += bunny.yVel;

    bg.position.x -= bg.xVel;
    bg2.position.x -= bg2.xVel;
    bg3.position.x -= bg3.xVel;




	// console.log(bunny.xVel);

    
    // bunny.position.x += bunny.xVel;

    /* if (bunny.position.x > 720) {
    	bunny.xVel = 0;
    }
    else if (bunny.position.x < 80) {
    	bunny.xVel = 0;
    } */
    // just for fun, let's rotate mr rabbit a littl

    // render the container
    renderer.render(stage);
}
