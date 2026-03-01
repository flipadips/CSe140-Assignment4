RYAN WONG
ryrwong@ucsc.edu

For Assignment 4:
Used ChatGPT and Gemini mainly for fixing up the Shader/Verrex shader. Also used it formatting and implmenting the new sphere/triangle class. Also used it for implmenting the spotlight. 


For Assingment 3:
Used ChatGPT and mainly gemini for restructing many of the code, and helping with the effciency and drawing the overall map. Furthermore, helped with creating the buttons on the front page for HTML, and how to chooose the block/texture to place.

For assignment 2:
Generated lines of code for helping create the custom poke animation, speicfically these lines:

function clamp01(x) { return Math.max(0, Math.min(1, x)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function smoothstep01(t) {
  t = clamp01(t);
  return t * t * (3 - 2 * t);
}

Also used ChatGPT for helping with the math when drawing the spheres, and adjusting camera angles.
  let rect = ev.target.getBoundingClientRect();
  let x = ev.clientX - rect.left;
  let y = ev.clientY - rect.top;

    const downT = (t - (g_pokeRaiseT + g_pokeHoldT)) / g_pokeLowerT;
    const a = smoothstep01(t / g_pokeRaiseT);

Turn on all animations to enable the smooth ones


THE ASSIGNMENT IS DONE IN HelloPoint1.html and HelloPoint1.js

For most of the assignment, I followed the video tutorials. 

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

Used this website specifically for these functions. 

Some functions I got help from chatGPT, specifially these ones.

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

// Helper: one "stroke" = one triangle wedge from p1->p2 with thickness t
function strokeTri(p1, p2, thick, col) {
// perpendicular unit
const px = -dy / len;
const py =  dx / len;

// make a skinny triangle: p1, p2, and p1 shifted perpendicular
const x3 = x1 + px * thick;
const y3 = y1 + py * thick;

pushColoredTri([x1, y1, x2, y2, x3, y3], col);
}

I also had used ChatGPT to get the right coordinates to even out the triangles for my picture.