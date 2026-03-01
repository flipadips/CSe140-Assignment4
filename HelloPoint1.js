 // ColoredPoint.js (c) 2012 matsuda
// Vertex shader program
// Ryan Wong
// ryrwong@ucsc.edu
// all comments for code in ReadME
// Turn on all animations to enable the smooth ones
var VSHADER_SOURCE = `
  attribute vec4 a_Position;
  attribute vec2 a_UV;
  attribute vec3 a_Normal;
  varying vec2 v_UV;
  varying vec3 v_Normal; 
  varying vec3 v_VertPos;
  uniform mat4 u_ModelMatrix;
  uniform mat4 u_NormalMatrix;
  uniform mat4 u_GlobalRotateMatrix;
  uniform mat4 u_ViewMatrix;
  uniform mat4 u_ProjectionMatrix;
  void main() {
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_GlobalRotateMatrix * u_ModelMatrix * a_Position;
    v_UV = a_UV;
    v_Normal = normalize(vec3(u_NormalMatrix * vec4(a_Normal, 0.0)));
    v_VertPos = vec3(u_ModelMatrix * a_Position);
  }`;

var FSHADER_SOURCE =`
precision highp float;
  varying vec2 v_UV;
  varying vec3 v_Normal;
  varying vec3 v_VertPos;
  uniform vec4 u_FragColor;
  uniform sampler2D u_Sampler0;
  uniform sampler2D u_Sampler1;
  uniform sampler2D u_Sampler2;
  uniform int u_whichTexture;
  uniform vec3 u_cameraPos;  
  uniform int u_lightOn;
  uniform vec3 u_lightPos;
  uniform vec3 u_lightColor; 
  uniform int u_spotLightOn;
  uniform vec3 u_spotLightPos;
  uniform vec3 u_spotLightColor;
  uniform vec3 u_spotLightDir;
  uniform float u_spotLightCutoff;
  void main() {
    vec4 baseColor;
    if (u_whichTexture == -3){
      baseColor = vec4((v_Normal+1.0)/2.0, 1.0);
    } else if (u_whichTexture == -2) {
      baseColor = u_FragColor;
    } else if (u_whichTexture == 0) {
      baseColor = texture2D(u_Sampler1, v_UV);
    } else if (u_whichTexture == 1) {
      baseColor = texture2D(u_Sampler0, v_UV); 
    } else if (u_whichTexture == 2) {
      baseColor = texture2D(u_Sampler2, v_UV); 
    } else {
      baseColor = vec4(v_UV, 1.0, 1.0); 
    }

    vec3 N = normalize(v_Normal);
    vec3 V = normalize(u_cameraPos - v_VertPos);
    float shininess = 10.0;
    vec3 ambient = vec3(baseColor) * 0.3; 
    vec3 L_point = normalize(u_lightPos - v_VertPos);
    vec3 R_point = reflect(-L_point, N);
    float nDotL_point = max(dot(N, L_point), 0.0);
    vec3 diffuse_point = u_lightColor * vec3(baseColor) * nDotL_point;
    float specAmount_point = pow(max(dot(V, R_point), 0.0), shininess);
    vec3 specular_point = u_lightColor * specAmount_point * 0.5;
    vec3 diffuse_spot = vec3(0.0);
    vec3 specular_spot = vec3(0.0);
    if (u_spotLightOn == 1) {
        vec3 L_spot = normalize(u_spotLightPos - v_VertPos);
        vec3 R_spot = reflect(-L_spot, N);
        vec3 lightToSurface = -L_spot; 
        float spotDot = dot(lightToSurface, normalize(u_spotLightDir));
        if (spotDot > u_spotLightCutoff) {
            float spotFactor = pow(spotDot, 2.0);
            float nDotL_spot = max(dot(N, L_spot), 0.0);
            diffuse_spot = u_spotLightColor * vec3(baseColor) * nDotL_spot * spotFactor;
            float specAmount_spot = pow(max(dot(V, R_spot), 0.0), shininess);
            specular_spot = u_spotLightColor * specAmount_spot * 0.5 * spotFactor;
        }
    }

    if (u_whichTexture == 1 || u_whichTexture == -3) {
        gl_FragColor = baseColor; 
    } else {
        if (u_lightOn == 1) {
            gl_FragColor = vec4(ambient + diffuse_point + specular_point + diffuse_spot + specular_spot, baseColor.a);
        } else {
            gl_FragColor = baseColor; 
        }
    }
  }`;


let canvas;
let gl;
let a_Position;
let u_FragColor;
let u_ModelMatrix;
let u_GlobalRotateMatrix;
let u_ProjectionMatrix
let u_ViewMatrix;
let u_UV;
let v_UV;
let a_UV;
let u_Sampler2;
let a_Normal;
let u_lightPos;
let g_lightColor = [1.0, 1.0, 1.0];
let u_lightColor;
let u_cameraPos;
let u_NormalMatrix;
let g_lightAnimation = true;
let g_lightOn = true;
let u_lightOn;

let g_spotLightOn = true;
let g_spotLightPos = [0, 2, 0];
let g_spotLightColor = [1.0, 0.0, 0.0];
let g_spotLightDir = [0.0, -1.0, 0.0];
let g_spotLightCutoff = Math.cos(45.0 * Math.PI / 180.0); 

let u_spotLightOn;
let u_spotLightPos;
let u_spotLightColor;
let u_spotLightDir;
let u_spotLightCutoff;
// let g_globalAngle = 0;
let g_globalAngle = 0;
let g_globalAngleX = 0;
let g_globalAngleY = 0;

// Poke animation variables
let g_pokeAnimation = false;
let g_pokeStartTime = 0;

// Save pose so we can return smoothly after the poke
let g_pokeSavedYellow = 0;
let g_pokeSavedWingTip = 0;
let g_pokeSavedWingFeather = 0;


const g_pokeTargetYellow = 90;
const g_pokeTargetWingTip = 0;
const g_pokeTargetFeather = 0;


const g_pokeRaiseT = 0.25;
const g_pokeHoldT  = 0.50;
const g_pokeLowerT = 0.25;

// Helpers
function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function smoothstep01(t) {
  t = clamp01(t);
  return t * t * (3 - 2 * t);
}

function setUpWebGL() {
    // Retrieve <canvas> element
  canvas = document.getElementById('webgl');

  // Get the rendering context for WebGL
  // gl = getWebGLContext(canvas);
  gl = canvas.getContext("webgl", {preserveDrawingBuffer: true});
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
  gl.enable(gl.DEPTH_TEST);
}
function connectVariablesToGLSL() {
    // Initialize shaders
  if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
    //console.log("VERTEX SHADER:\n" + VSHADER_SOURCE);
    // console.log("FRAG SHADER:\n" + FSHADER_SOURCE);
    console.log('Failed to intialize shaders.');
    return;
  }

  // // Get the storage location of a_Position
  a_Position = gl.getAttribLocation(gl.program, 'a_Position');
  if (a_Position < 0) {
    console.log('Failed to get the storage location of a_Position');
    return;
  }
  
  a_UV = gl.getAttribLocation(gl.program, 'a_UV');
  if (a_UV < 0) {
    console.log('Failed to get the storage location of a_UV');
    return;
  }

  a_Normal = gl.getAttribLocation(gl.program, 'a_Normal');
  if (a_Normal < 0) { 
    console.log('Failed to get the storage location of a_Normal');
  }

  u_lightOn = gl.getUniformLocation(gl.program, 'u_lightOn');
  if (!u_lightOn) {
    console.log('Failed to get u_lightOn');
  }
  
  // Get the storage location of u_FragColor
  u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
  if (!u_FragColor) {
    console.log('Failed to get the storage location of u_FragColor');
    return;
  }

  u_lightPos = gl.getUniformLocation(gl.program, 'u_lightPos');
  if (!u_lightPos) {
    console.log('Failed to get the storage location of u_lightPos');
    return;
  }

  u_spotLightOn = gl.getUniformLocation(gl.program, 'u_spotLightOn');
  u_spotLightPos = gl.getUniformLocation(gl.program, 'u_spotLightPos');
  u_spotLightColor = gl.getUniformLocation(gl.program, 'u_spotLightColor');
  u_spotLightDir = gl.getUniformLocation(gl.program, 'u_spotLightDir');
  u_spotLightCutoff = gl.getUniformLocation(gl.program, 'u_spotLightCutoff');
  
  u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
  if(!u_ModelMatrix){
    console.log('Failed to get the storage location of u_ModelMatrix');
    return;
  }

  u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
  if(!u_ViewMatrix){
    console.log('Failed to get the storage location of u_ViewMatrix');
    return;
  }

  u_ProjectionMatrix = gl.getUniformLocation(gl.program, 'u_ProjectionMatrix');
  if(!u_ProjectionMatrix){
    console.log('Failed to get the storage location of u_ProjectionMatrix');
    return;
  }

  // Get the storage location of u_Sampler
  u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler0');
  if (!u_Sampler) {
    console.log('Failed to get the storage location of u_Sampler0');
    return false;
  }

  u_Sampler1 = gl.getUniformLocation(gl.program, 'u_Sampler1');
    if (!u_Sampler1) {
    console.log('Failed to get the storage location of u_Sampler1');
    return false;
    }

  u_whichTexture = gl.getUniformLocation(gl.program, 'u_whichTexture');
  if (!u_whichTexture) {
    console.log('Failed to get the storage location of u_whichTexture');
    return;
  }

  u_Sampler2 = gl.getUniformLocation(gl.program, 'u_Sampler2');
  if (u_Sampler2 === null) {
    console.log('Failed to get the storage location of u_Sampler2');
    return false;
  }

  u_lightColor = gl.getUniformLocation(gl.program, 'u_lightColor');
  u_cameraPos = gl.getUniformLocation(gl.program, 'u_cameraPos');
  u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');

  if (!u_lightColor || !u_cameraPos || !u_NormalMatrix) {
    console.log('Failed to get new lighting storage locations');
  }

  // u_Size = gl.getUniformLocation(gl.program, 'u_Size');
  // if(!u_Size) {
  //  console.log('Failed to get the storage location of u_Size');
  //  return;
  // }

  u_GlobalRotateMatrix = gl.getUniformLocation(gl.program, 'u_GlobalRotateMatrix');
  if(!u_GlobalRotateMatrix) {
    console.log('Failed to get the storage location of u_GlobalRotateMatrix');
    return;
  }

  var identityM = new Matrix4();
  gl.uniformMatrix4fv(u_ModelMatrix, false, identityM.elements);
}

const POINT = 0;
const TRIANGLE = 1;
const CIRCLE = 2;

// Global Variables to UI
let g_selectedColor = [1.0, 1.0, 1.0, 1.0];
let g_SelectedSize = 5;
let g_selectedType = POINT;
let g_selectedSegments = 10;
let g_yellowAngle = 0;
let g_yellowAnimation = false;
let g_wingTipAngle = 0;
let g_wingTipAnimation = false
let g_wingFeatherAngle = 0;
let g_wingFeatherAnimation = false;
let g_selectedTexture = -2;
let g_currentBlockColor = [1.0, 1.0, 1.0, 1.0];
let g_normalOn = false;
let g_lightPos = [0,1,2];

function AddActionsForHtmlUI() {
  document.getElementById('NormalOn').onclick = function() {
    g_normalOn = true;
    console.log("Normal Mode: ON", g_normalOn); // Debug statement
  };
  
  document.getElementById('NormalOff').onclick = function() {
    g_normalOn = false;
    console.log("Normal Mode: OFF", g_normalOn);
  };

  document.getElementById('lightSlideX').addEventListener('mousemove', function(ev) { if(ev.buttons == 1) { g_lightPos[0] = this.value/100; renderAllShapes(); } });
  document.getElementById('lightSlideY').addEventListener('mousemove', function(ev) { if(ev.buttons == 1) { g_lightPos[1] = this.value/100; renderAllShapes(); } });
  document.getElementById('lightSlideZ').addEventListener('mousemove', function(ev) { if(ev.buttons == 1) { g_lightPos[2] = this.value/100; renderAllShapes(); } });

  document.getElementById('lightAnimationOnButton').onclick = function() { g_lightAnimation = true; };
  document.getElementById('lightAnimationOffButton').onclick = function() { g_lightAnimation = false; };

  document.getElementById('lightColorR').addEventListener('mousemove', function(ev) { if(ev.buttons == 1) { g_lightColor[0] = this.value/100; renderAllShapes(); } });
  document.getElementById('lightColorG').addEventListener('mousemove', function(ev) { if(ev.buttons == 1) { g_lightColor[1] = this.value/100; renderAllShapes(); } });
  document.getElementById('lightColorB').addEventListener('mousemove', function(ev) { if(ev.buttons == 1) { g_lightColor[2] = this.value/100; renderAllShapes(); } });


  document.getElementById('lightOn').onclick = function() { g_lightOn = true; renderAllShapes(); };
  document.getElementById('lightOff').onclick = function() { g_lightOn = false; renderAllShapes(); };


  // Spotlight Position Sliders
  document.getElementById('spotPosX').addEventListener('mousemove', function(ev) { 
      if(ev.buttons == 1) { g_spotLightPos[0] = this.value/100; renderAllShapes(); } 
  });
  document.getElementById('spotPosY').addEventListener('mousemove', function(ev) { 
      if(ev.buttons == 1) { g_spotLightPos[1] = this.value/100; renderAllShapes(); } 
  });
  document.getElementById('spotPosZ').addEventListener('mousemove', function(ev) { 
      if(ev.buttons == 1) { g_spotLightPos[2] = this.value/100; renderAllShapes(); } 
  });

  document.getElementById('Green').onclick = function() {g_selectedColor = [0.0, 1.0, 0.0, 1.0]; };
  document.getElementById('Red').onclick = function() {g_selectedColor = [1.0, 0.0, 0.0, 1.0]; };
  document.getElementById('clearButton').onclick = function() {g_shapesList = []; renderAllShapes()};
  
  document.getElementById('animationYellowOnButton').onclick = function() {g_yellowAnimation = true;};
  document.getElementById('animationYellowOffButton').onclick = function() {g_yellowAnimation = false};
  
  document.getElementById('redSlide').addEventListener('mouseup', function() {g_selectedColor[0] = this.value/100;});
  document.getElementById('greenSlide').addEventListener('mouseup', function() {g_selectedColor[1] = this.value/100;});
  document.getElementById('blueSlide').addEventListener('mouseup', function() {g_selectedColor[2] = this.value/100;});

  document.getElementById('sizeSlide').addEventListener('mouseup', function() {g_SelectedSize = this.value;});
  document.getElementById('pointButton').onclick = function() {g_selectedType=POINT};
  document.getElementById('triButton').onclick = function() {g_selectedType=TRIANGLE};
  document.getElementById('circleButton').onclick = function() {g_selectedType=CIRCLE};
  document.getElementById('angleSlide').addEventListener('mousemove', function() {g_globalAngle = this.value; renderAllShapes();});
  document.getElementById('yellowSlide').addEventListener('mousemove', function() {g_yellowAngle = this.value; renderAllShapes();});

  document.getElementById('animationWingTipOnButton').onclick = function() {g_wingTipAnimation = true;};
  document.getElementById('animationWingTipOffButton').onclick = function() {g_wingTipAnimation = false};
  document.getElementById('wingTipSlide').addEventListener('mousemove', function() {g_wingTipAngle = this.value; renderAllShapes();});

  document.getElementById('animationWingFeatherOnButton').onclick = function() {g_wingFeatherAnimation = true;};
  document.getElementById('animationWingFeatherOffButton').onclick = function() {g_wingFeatherAnimation = false};
  document.getElementById('wingFeatherSlide').addEventListener('mousemove', function() {g_wingFeatherAngle = this.value; renderAllShapes();});

  document.getElementById('texWood').onclick = function() { g_selectedTexture = 2; }; // wood.jpg
  document.getElementById('texGrass').onclick = function() { g_selectedTexture = 0; }; // grass.jpg
  document.getElementById('texSky').onclick = function() { g_selectedTexture = 1; }; // sky.jpg
  document.getElementById('texColor').onclick = function() { g_selectedTexture = -2; }; // solid

  // Color Selectors
  document.getElementById('colorR').onclick = function() { g_currentBlockColor = [1, 0, 0, 1]; };
  document.getElementById('colorO').onclick = function() { g_currentBlockColor = [1, 0.5, 0, 1]; };
  document.getElementById('colorY').onclick = function() { g_currentBlockColor = [1, 1, 0, 1]; };
  document.getElementById('colorG').onclick = function() { g_currentBlockColor = [0, 1, 0, 1]; };
  document.getElementById('colorB').onclick = function() { g_currentBlockColor = [0, 0, 1, 1]; };
  document.getElementById('colorV').onclick = function() { g_currentBlockColor = [0.5, 0, 1, 1]; };

  const segSlide = document.getElementById('segmentSlide');
  const segVal = document.getElementById('segmentVal');

  segSlide.addEventListener('input', function () {g_selectedSegments = parseInt(this.value);
    segVal.innerHTML = this.value;
  });

}

function initTextures(gl, n) {
  var tex0 = gl.createTexture();
  var img0 = new Image();
  img0.onload = function() { SentTextureToGLSL(gl, n, tex0, u_Sampler, img0, 0); };
  img0.src = 'sky.jpg';

  var tex1 = gl.createTexture();
  var img1 = new Image();
  img1.onload = function() { SentTextureToGLSL(gl, n, tex1, u_Sampler1, img1, 1); };
  img1.src = 'grass.jpg';

  var tex2 = gl.createTexture();
  var img2 = new Image();
  img2.onload = function() { SentTextureToGLSL(gl, n, tex2, u_Sampler2, img2, 2); };
  img2.src = 'wood.jpg';

  return true;
}

function SentTextureToGLSL(gl, n, texture, u_Sampler, image, unit) {
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
  
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
  
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  gl.uniform1i(u_Sampler, unit);
}

function main() {

  setUpWebGL();
  connectVariablesToGLSL();
  initMap();
  AddActionsForHtmlUI();
  initTextures(gl,0);
  document.onkeydown = keydown;
  g_camera = new Camera();
  
  canvas.onmousemove = function(ev) {
    let deltaX = ev.clientX - g_camera.lastMouseX;
    let deltaY = ev.clientY - g_camera.lastMouseY;
    
    if (g_camera.lastMouseX !== 0 || g_camera.lastMouseY !== 0) {
        g_camera.panByMouse(deltaX, deltaY);
        //renderAllShapes();
    }
    
    g_camera.lastMouseX = ev.clientX;
    g_camera.lastMouseY = ev.clientY;
  };
  
  canvas.onmouseenter = function(ev) {
    g_camera.lastMouseX = ev.clientX;
    g_camera.lastMouseY = ev.clientY;
  };
  
  canvas.oncontextmenu = function(ev) {
    ev.preventDefault();
    return false;
  };
  
  canvas.onmousedown = function(ev) {
    if (ev.shiftKey) {
      g_pokeSavedYellow = Number(g_yellowAngle);
      g_pokeSavedWingTip = Number(g_wingTipAngle);
      g_pokeSavedWingFeather = Number(g_wingFeatherAngle);

      g_pokeAnimation = true;
      g_pokeStartTime = performance.now() / 1000.0;
    }
  };

  canvas.onmousedown = function(ev) {
    if (ev.buttons == 1) { // Left Click
        modifyBlock(true);
    } else if (ev.buttons == 2) { // Right Click
        modifyBlock(false);
    }
    // Note: renderAllShapes is called by your tick() function automatically
};

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  requestAnimationFrame(tick);
}

var g_startTime = performance.now()/1000.0;
var g_seconds = performance.now()/1000.0-g_startTime;

var g_frameCounter = 0;
var g_totalDuration = 0;

function tick() {
  var startTime = performance.now();

  g_seconds = performance.now()/1000.0 - g_startTime;
  updateAnimationAngles();
  renderAllShapes();
  var duration = performance.now() - startTime;
  g_totalDuration += duration;
  g_frameCounter++;

  if (g_frameCounter >= 10) {
    var avgDuration = g_totalDuration / 10;
    var fps = 1000 / avgDuration;

    sendTextToHtml(
      "ms: " + avgDuration.toFixed(2) + " | fps: " + fps.toFixed(1), 
      "fps"
    );

    g_frameCounter = 0;
    g_totalDuration = 0;
  }

  requestAnimationFrame(tick);
}

function updateAnimationAngles(){
  if (g_lightAnimation) {
    // Radius of the light's orbit
    const lightRadius = 3.0; 
    
    // Calculate new X and Z positions using sine and cosine for a circle
    g_lightPos[0] = Math.cos(g_seconds) * lightRadius;
    g_lightPos[2] = Math.sin(g_seconds) * lightRadius;
    
    // Optional: Keep Y constant, or make it bob up and down
    // g_lightPos[1] = 2.0 + Math.sin(g_seconds * 2.0); 
  }

  if(g_yellowAnimation){
    g_yellowAngle = (45*Math.sin(g_seconds));    
  }
  if(g_wingTipAnimation){
    g_wingTipAngle = (45*Math.sin(g_seconds * 2));
  }
  if(g_wingFeatherAnimation){
    g_wingFeatherAngle = (30*Math.sin(g_seconds * 3));
  }
  
  // poke animation - wings do directly up and then go down
if (g_pokeAnimation) {
  const t = g_seconds - g_pokeStartTime;
  const total = g_pokeRaiseT + g_pokeHoldT + g_pokeLowerT;

  if (t < g_pokeRaiseT) {
    // raise the arms
    const a = smoothstep01(t / g_pokeRaiseT);
    g_yellowAngle = lerp(g_pokeSavedYellow, g_pokeTargetYellow,  a);
    g_wingTipAngle = lerp(g_pokeSavedWingTip, g_pokeTargetWingTip, a);
    g_wingFeatherAngle = lerp(g_pokeSavedWingFeather, g_pokeTargetFeather, a);

  } else if (t < g_pokeRaiseT + g_pokeHoldT) {
    // hold at top
    g_yellowAngle = g_pokeTargetYellow;
    g_wingTipAngle = g_pokeTargetWingTip;
    g_wingFeatherAngle = g_pokeTargetFeather;

  } else if (t < total) {
    // lower the arms
    const downT = (t - (g_pokeRaiseT + g_pokeHoldT)) / g_pokeLowerT;
    const a = smoothstep01(downT);
    g_yellowAngle = lerp(g_pokeTargetYellow,  g_pokeSavedYellow, a);
    g_wingTipAngle = lerp(g_pokeTargetWingTip, g_pokeSavedWingTip, a);
    g_wingFeatherAngle = lerp(g_pokeTargetFeather, g_pokeSavedWingFeather, a);

  } else {
    // restore original pose
    g_pokeAnimation = false;

    if (!g_yellowAnimation) g_yellowAngle = g_pokeSavedYellow;
    if (!g_wingTipAnimation) g_wingTipAngle = g_pokeSavedWingTip;
    if (!g_wingFeatherAnimation) g_wingFeatherAngle = g_pokeSavedWingFeather;
  }
}
}

var g_shapesList = [];

function click(ev) {
  [x,y] = convertCoordinatesEventToGL(ev);
  let point;
  if(g_selectedType == POINT) {
    point = new Point();
  } else if (g_selectedType == TRIANGLE){
    point = new Triangle();
  } else {
    point = new Circle();
    point.segments = g_selectedSegments;
  }
  point.position = [x, y];
  point.color = g_selectedColor.slice();
  point.size = g_SelectedSize;
  g_shapesList.push(point);

  renderAllShapes();
}

function convertCoordinatesEventToGL(ev){
  var x = ev.clientX; // x coordinate of a mouse pointer
  var y = ev.clientY; // y coordinate of a mouse pointer
  var rect = ev.target.getBoundingClientRect();

  x = ((x - rect.left) - canvas.width/2)/(canvas.width/2);
  y = (canvas.height/2 - (y - rect.top))/(canvas.height/2);
  return([x,y]);
}

var g_eye=[0,0,3];
var g_at=[0,0,-100];
var g_up=[0,1,0];

// forward = d=at-eyes
// d=d.normalize();
//eye = eye+d
// at = at + d

// backward subtract d

//left is bound to A
// d = at-eye
// left = d.cross(up) need to implement cross
// left = left.normalize()
// eye = eye - left
// left = d x up;

// right negative direction (or reverse vector)
// cross product with vectir

// q and e keys, keep eyepoint but look in new direction (rotate)
// calculate new vector
// eye at origin and calculate atp (at point in eye coord system)
// atp = dir = at eye;
// theta = arctan(y,x);
// theta = theta +5 degrees (radians)
// new x = r * cos(theta)
// new y = r * sin(theta)
// dir vector = (new x, new y)
// AT = eye + d;

function keydown(ev) {
    if (ev.keyCode == 87) { // W
        g_camera.moveForward();
    }
    else if (ev.keyCode == 83) { // S
        g_camera.back();
    }
    else if (ev.keyCode == 65) { // A
        g_camera.moveLeft();
    }
    else if (ev.keyCode == 68) { // D
        g_camera.moveRight();
    }
    else if (ev.keyCode == 81) { // Q
        g_camera.panLeft();
    }
    else if (ev.keyCode == 69) { // E
        g_camera.panRight();
    }
    renderAllShapes();
}



var g_map = [];
function initMap() {
  g_map = [];
  for (let i = 0; i < 32; i++) {
    let row = [];
    for (let j = 0; j < 32; j++) {
      if (i == 0 || i == 31 || j == 0 || j == 31) {
        row.push(1); 
      } 
      else if (i >= 10 && i <= 14 && j >= 10 && j <= 14) {
        if (i == 12 && j == 10) row.push(0); // Doorway
        else if (i == 10 || i == 14 || j == 10 || j == 14) row.push(3); 
        else row.push(0);
      }
      else if (i == 18 && j == 12) {
        row.push(10);
      }
      else {
        row.push(0);
      }
    }
    g_map.push(row);
  }
}

var g_mapCube = new Cube();

function drawMap() {
  for (let x = 0; x < 32; x++) {
    for (let y = 0; y < 32; y++) {
      let blockData = g_map[x][y];
      
      if (typeof blockData === 'object') {
        let hMax = blockData.height;
        if (hMax <= 0) continue;
        for (let h = 0; h < hMax; h++) {
          g_mapCube.matrix.setIdentity();
          g_mapCube.matrix.translate(x - 16, -0.75 + h, y - 16);
          g_mapCube.textureNum = blockData.texture;
          g_mapCube.color = blockData.color;
          g_mapCube.renderfast();
        }
      } 
      else if (blockData > 0) {
        if (blockData === 10) {
          drawDetailedTree(x, y); 
        } else {
          for (let h = 0; h < blockData; h++) {
            g_mapCube.matrix.setIdentity();
            g_mapCube.matrix.translate(x - 16, -0.75 + h, y - 16);
            
            g_mapCube.textureNum = (blockData === 3) ? 2 : -2; 
            g_mapCube.color = [1, 1, 1, 1];
            g_mapCube.renderfast();
          }
        }
      }
    }
  }
}

function drawDetailedTree(x, y) {
  for (let h = 0; h < 3; h++) {
    g_mapCube.color = [0.4, 0.2, 0.1, 1.0]; 
    g_mapCube.textureNum = -2;
    g_mapCube.matrix.setIdentity();
    g_mapCube.matrix.translate(x - 16, -0.75 + h, y - 16);
    g_mapCube.renderfast();
  }

  g_mapCube.color = [0.1, 0.6, 0.1, 1.0];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      g_mapCube.matrix.setIdentity();
      g_mapCube.matrix.translate((x + dx) - 16, -0.75 + 3, (y + dy) - 16); 
      g_mapCube.renderfast();
    }
  }
}


function modifyBlock(isAdding) {
    let targetX = Math.floor(g_camera.at.elements[0] + 16);
    let targetY = Math.floor(g_camera.at.elements[2] + 16);

    if (targetX >= 0 && targetX < 32 && targetY >= 0 && targetY < 32) {
        if (isAdding) {
            g_map[targetX][targetY] = {
                height: (g_map[targetX][targetY].height || 0) + 1,
                texture: g_selectedTexture,
                color: [...g_currentBlockColor]
            };
        } else {
            if (g_map[targetX][targetY].height > 0) {
                g_map[targetX][targetY].height -= 1;
            }
        }
    }
}



function renderAllShapes() {
  var startTime = performance.now();
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  gl.uniformMatrix4fv(u_ProjectionMatrix, false, g_camera.projectionMatrix.elements);
  gl.uniformMatrix4fv(u_ViewMatrix, false, g_camera.viewMatrix.elements);
  
  var globalRotMat = new Matrix4();
  //globalRotMat.rotate(g_globalAngleX, 1, 0, 0);
  //globalRotMat.rotate(g_globalAngle + g_globalAngleY, 0, 1, 0);
  gl.uniformMatrix4fv(u_GlobalRotateMatrix, false, globalRotMat.elements);

  // Create a base matrix for the horizontal eagle orientation
  drawMap();
  var eagleBase = new Matrix4();
  eagleBase.rotate(45, 1, 0, 0);

  // Eagle colors
  var brownBody = [0.55, 0.35, 0.2, 1.0];
  var darkBrown = [0.4, 0.25, 0.15, 1.0];
  var whiteHead = [0.95, 0.95, 0.9, 1.0];
  var yellow = [0.95, 0.8, 0.2, 1.0];
  var black = [0.1, 0.1, 0.1, 1.0];

  gl.uniform1i(u_lightOn, g_lightOn ? 1 : 0);
  gl.uniform3f(u_lightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);
  gl.uniform3f(u_cameraPos, g_camera.eye.elements[0], g_camera.eye.elements[1], g_camera.eye.elements[2]);

  // Pass Point Light
  gl.uniform3f(u_lightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  gl.uniform3f(u_lightColor, g_lightColor[0], g_lightColor[1], g_lightColor[2]);

  // Pass Spotlight
  gl.uniform1i(u_spotLightOn, g_spotLightOn ? 1 : 0);
  gl.uniform3f(u_spotLightPos, g_spotLightPos[0], g_spotLightPos[1], g_spotLightPos[2]);
  gl.uniform3f(u_spotLightColor, g_spotLightColor[0], g_spotLightColor[1], g_spotLightColor[2]);
  gl.uniform3f(u_spotLightDir, g_spotLightDir[0], g_spotLightDir[1], g_spotLightDir[2]);
  gl.uniform1f(u_spotLightCutoff, g_spotLightCutoff);

  var floor = new Cube();
  floor.textureNum = 0;
  floor.matrix.translate(0, -.751, 0.0);
  floor.matrix.scale(32, 0.001, 32);
  floor.matrix.translate(-.5, 0, -0.5);
  floor.renderfast();

  var sky = new Cube();
  if (g_normalOn) {
      sky.textureNum = -3;
  } else {
      sky.textureNum = 1; 
  }
  sky.matrix.scale(-15, -15, -15); 
  sky.matrix.translate(-0.5, -0.5, -0.5);
  sky.renderfast();

  gl.uniform3f(u_lightPos, g_lightPos[0], g_lightPos[1], g_lightPos[2]);

  var light = new Cube();
  light.color = [g_lightColor[0], g_lightColor[1], g_lightColor[2], 1];
  light.textureNum = -2;
  light.matrix.translate(g_lightPos[0], g_lightPos[1], g_lightPos[2]);
  light.matrix.scale(0.1, 0.1, 0.1);
  light.matrix.translate(-0.5, 5, -0.5);
  light.renderfast();

  var circle = new Sphere();
  circle.matrix.translate(-.1, 1, -0.5);
  if (g_normalOn) {
      circle.textureNum = -3;
  } else {
      circle.textureNum = -2; 
  }
   circle.render();
  if (g_spotLightOn) {
      var spotLightCube = new Cube();
      spotLightCube.color = [g_spotLightColor[0], g_spotLightColor[1], g_spotLightColor[2], 1];
      spotLightCube.textureNum = -2;
      spotLightCube.matrix.translate(g_spotLightPos[0], g_spotLightPos[1], g_spotLightPos[2]);
      spotLightCube.matrix.scale(0.1, 0.1, 0.1);
      spotLightCube.matrix.translate(-0.5, -0.5, -0.5);
      spotLightCube.renderfast();
  }
  /*
  // body
  var body = new Cube();
  body.color = brownBody;
  body.textureNum = 0;
  body.matrix = new Matrix4(eagleBase);
  body.matrix.translate(-0.2, -0.3, -0.15);
  body.matrix.scale(0.4, 0.6, 0.3);
  body.render();
  
  // head
  var head = new Cube();
  //head.color = whiteHead;
  head.matrix = new Matrix4(eagleBase);
  head.matrix.translate(-0.15, 0.3, -0.125);
  head.matrix.scale(0.3, 0.3, 0.25);
  head.render();
  
  // beak
  var beak = new Cube();
  beak.color = yellow;
  beak.matrix = new Matrix4(eagleBase);
  beak.matrix.translate(0, 0.54, 0.15);
  beak.matrix.scale(0.15, 0.1, 0.15);
  beak.matrix.translate(-0.5, -0.5, -0.5);
  beak.render();

  // eyes - uses spheres
  var leftEye = new Sphere();
  leftEye.color = black;
  leftEye.segments = 8;
  leftEye.matrix = new Matrix4(eagleBase);
  leftEye.matrix.translate(-0.1, 0.6, 0.15);
  leftEye.matrix.scale(0.05, 0.05, 0.05);
  leftEye.matrix.translate(-0.5, -0.5, -0.5);
  leftEye.render();

  var rightEye = new Sphere();
  rightEye.color = black;
  rightEye.segments = 8;
  rightEye.matrix = new Matrix4(eagleBase);
  rightEye.matrix.translate(0.14, 0.6, 0.15);
  rightEye.matrix.scale(0.05, 0.05, 0.05);
  rightEye.matrix.translate(-0.5, -0.5, -0.5);
  rightEye.render();
    
  // left main wing
  var leftWing = new Cube();
  leftWing.color = darkBrown;
  leftWing.matrix = new Matrix4(eagleBase);
  leftWing.matrix.translate(-0.2, 0.1, 0);
  leftWing.matrix.rotate(-g_yellowAngle, 0, 0, 1);
  var leftWingMatrix = new Matrix4(leftWing.matrix);
  leftWing.matrix.scale(0.5, 0.15, 0.25);
  leftWing.matrix.translate(-1, -0.5, -0.5);
  leftWing.render();

  // .eft secondary wing
  var leftWingTip = new Cube();
  leftWingTip.color = brownBody;
  leftWingTip.matrix = leftWingMatrix;
  leftWingTip.matrix.translate(-0.5, 0, 0);
  leftWingTip.matrix.rotate(-g_wingTipAngle, 0, 0, 1);
  var leftWingTipMatrix = new Matrix4(leftWingTip.matrix);
  leftWingTip.matrix.scale(0.3, 0.1, 0.2);
  leftWingTip.matrix.translate(-1, -0.5, -0.5);
  leftWingTip.render();

  // left wing secondary
  var leftWingFeather = new Cube();
  leftWingFeather.color = [0.3, 0.2, 0.1, 1.0];
  leftWingFeather.matrix = leftWingTipMatrix;
  leftWingFeather.matrix.translate(-0.3, 0, 0);
  leftWingFeather.matrix.rotate(-g_wingFeatherAngle, 0, 0, 1);
  leftWingFeather.matrix.scale(0.2, 0.08, 0.15);
  leftWingFeather.matrix.translate(-1, -0.5, -0.5);
  leftWingFeather.render();

  // right wing main
  var rightWing = new Cube();
  rightWing.color = darkBrown;
  rightWing.matrix = new Matrix4(eagleBase);
  rightWing.matrix.translate(0.2, 0.1, 0);
  rightWing.matrix.rotate(g_yellowAngle, 0, 0, 1);
  var rightWingMatrix = new Matrix4(rightWing.matrix);
  rightWing.matrix.scale(0.5, 0.15, 0.25);
  rightWing.matrix.translate(0, -0.5, -0.5);
  rightWing.render();

  // right wing secondary
  var rightWingTip = new Cube();
  rightWingTip.color = brownBody;
  rightWingTip.matrix = rightWingMatrix;
  rightWingTip.matrix.translate(0.5, 0, 0);
  rightWingTip.matrix.rotate(g_wingTipAngle, 0, 0, 1);
  var rightWingTipMatrix = new Matrix4(rightWingTip.matrix);
  rightWingTip.matrix.scale(0.3, 0.1, 0.2);
  rightWingTip.matrix.translate(0, -0.5, -0.5);
  rightWingTip.render();

  // right wing feathers
  var rightWingFeather = new Cube();
  rightWingFeather.color = [0.3, 0.2, 0.1, 1.0];
  rightWingFeather.matrix = rightWingTipMatrix;
  rightWingFeather.matrix.translate(0.3, 0, 0);
  rightWingFeather.matrix.rotate(g_wingFeatherAngle, 0, 0, 1);
  rightWingFeather.matrix.scale(0.2, 0.08, 0.15);
  rightWingFeather.matrix.translate(0, -0.5, -0.5);
  rightWingFeather.render();
    
  // main tail part
  var tail = new Cube();
  tail.color = darkBrown;
  tail.matrix = new Matrix4(eagleBase);
  tail.matrix.translate(0, -0.3, -0.15);
  tail.matrix.rotate(45, 1, 0, 0);
  tail.matrix.scale(0.35, 0.3, 0.15);
  tail.matrix.translate(-0.5, -0.5, -0.5);
  tail.render();

  // outer part of the tail
  var tailFan = new Cube();
  tailFan.color = brownBody;
  tailFan.matrix = new Matrix4(eagleBase);
  tailFan.matrix.translate(0, -0.45, -0.3);
  tailFan.matrix.rotate(45, 1, 0, 0);
  tailFan.matrix.scale(0.5, 0.15, 0.1);
  tailFan.matrix.translate(-0.5, -0.5, -0.5);
  tailFan.render();

  // legs
  var leftLeg = new Cube();
  leftLeg.color = yellow;
  leftLeg.matrix = new Matrix4(eagleBase);
  leftLeg.matrix.translate(-0.1, -0.40, 0);
  leftLeg.matrix.scale(0.08, 0.3, 0.08);
  leftLeg.matrix.translate(-0.5, -0.5, -0.5);
  leftLeg.render();

  var rightLeg = new Cube();
  rightLeg.color = yellow;
  rightLeg.matrix = new Matrix4(eagleBase);
  rightLeg.matrix.translate(0.1, -0.40, 0);
  rightLeg.matrix.scale(0.08, 0.3, 0.08);
  rightLeg.matrix.translate(-0.5, -0.5, -0.5);
  rightLeg.render();

  // feet (talons)
  var leftTalon = new Cube();
  leftTalon.color = darkBrown;
  leftTalon.matrix = new Matrix4(eagleBase);
  leftTalon.matrix.translate(-0.1, -0.55, 0.05);
  leftTalon.matrix.scale(0.12, 0.05, 0.15);
  leftTalon.matrix.translate(-0.5, -0.5, -0.5);
  leftTalon.render();

  var rightTalon = new Cube();
  rightTalon.color = darkBrown;
  rightTalon.matrix = new Matrix4(eagleBase);
  rightTalon.matrix.translate(0.1, -0.55, 0.05);
  rightTalon.matrix.scale(0.12, 0.05, 0.15);
  rightTalon.matrix.translate(-0.5, -0.5, -0.5);
  rightTalon.render();
  */

}

function sendTextToHtml(text, htmlID){
  var htmlElm = document.getElementById(htmlID);
  if(!htmlElm){
    consol.log("failed to get HTML elm");
    return;
  }
  htmlElm.innerHTML = text;
}

let g_customTriBuffer = null;

function drawCustomTriangle(verts6) {
  // verts6 = [x1,y1, x2,y2, x3,y3]
  if (!g_customTriBuffer) {
    g_customTriBuffer = gl.createBuffer();
    if (!g_customTriBuffer) {
      console.log("Failed to create buffer for custom triangles");
      return;
    }
  }
  // https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bindBuffer
  gl.bindBuffer(gl.ARRAY_BUFFER, g_customTriBuffer);
  // https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bufferData
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts6), gl.DYNAMIC_DRAW);

  // https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/vertexAttribPointer
  gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
  // https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/enableVertexAttribArray
  gl.enableVertexAttribArray(a_Position);

  // https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/drawArrays
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

// this function help written with chatGPT
function pushColoredTri(verts6, rgba) {
  g_shapesList.push({
    type: "customTri",
    verts: verts6,
    color: rgba.slice(),
    render: function () {
      gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
      drawCustomTriangle(this.verts);
    }
  });
}