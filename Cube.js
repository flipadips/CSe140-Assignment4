/*
class Cube{
    constructor(){
        this.type = "cube";
        // this.position = [0.0, 0.0, 0.0];
        this.color = [1.0, 1.0, 1.0, 1.0];
        // this.size = 5.0;
        // this.segments = 10;
        this.matrix = new Matrix4();
        this.textureNum = -1;
        this.cubeVerts = [
  // Front face
  0,0,0, 1,1,0, 1,0,0,  0,0,0, 0,1,0, 1,1,0,
  // Back face
  0,0,1, 1,1,1, 1,0,1,  0,0,1, 0,1,1, 1,1,1,
  // Top face
  0,1,0, 1,1,1, 1,1,0,  0,1,0, 0,1,1, 1,1,1,
  // Bottom face
  0,0,0, 1,0,1, 1,0,0,  0,0,0, 0,0,1, 1,0,1,
  // Left face
  0,0,0, 0,1,1, 0,1,0,  0,0,0, 0,0,1, 0,1,1,
  // Right face
  1,0,0, 1,1,1, 1,1,0,  1,0,0, 1,0,1, 1,1,1
];
    }

render() {
    var rgba = this.color;
    gl.uniform1i(u_whichTexture, this.textureNum);
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    // FRONT
    drawTriangle3DUV([0,0,0, 1,1,0, 1,0,0], [0,0, 1,1, 1,0]);
    drawTriangle3DUV([0,0,0, 0,1,0, 1,1,0], [0,0, 0,1, 1,1]);

    // BACK
    drawTriangle3DUV([0,0,1, 1,0,1, 1,1,1], [0,0, 1,0, 1,1]);
    drawTriangle3DUV([0,0,1, 1,1,1, 0,1,1], [0,0, 1,1, 0,1]);

    // TOP
    drawTriangle3DUV([0,1,0, 0,1,1, 1,1,1], [0,0, 0,1, 1,1]);
    drawTriangle3DUV([0,1,0, 1,1,1, 1,1,0], [0,0, 1,1, 1,0]);

    // BOTTOM
    drawTriangle3DUV([0,0,0, 1,0,0, 1,0,1], [0,1, 1,1, 1,0]);
    drawTriangle3DUV([0,0,0, 1,0,1, 0,0,1], [0,1, 1,0, 0,0]);

    // LEFT
    drawTriangle3DUV([0,0,0, 0,0,1, 0,1,1], [0,0, 1,0, 1,1]);
    drawTriangle3DUV([0,0,0, 0,1,1, 0,1,0], [0,0, 1,1, 0,1]);

    // RIGHT
    drawTriangle3DUV([1,0,0, 1,1,0, 1,1,1], [0,0, 0,1, 1,1]);
    drawTriangle3DUV([1,0,0, 1,1,1, 1,0,1], [0,0, 1,1, 1,0]);
}

// Add these arrays to your global scope or as static properties to the class
// Add to Cube constructor

// Inside your Cube class
renderfast() {
    var rgba = this.color;

    // Pass the texture number (-2 for color)
    gl.uniform1i(u_whichTexture, this.textureNum);

    // Pass the color of the cube
    gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);

    // Pass the matrix to u_ModelMatrix
    gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

    // Initialize buffer if not already done
    // Note: ensure a_Position is globally accessible
    if (gl.getAttributeBuffer === undefined) { 
        // Create buffer logic if you don't have a helper
    }

    // Bind and write all 36 vertices at once
    var vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.cubeVerts), gl.DYNAMIC_DRAW);

    // Link to a_Position attribute
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    // Draw all 12 triangles (36 vertices) in one call
    gl.drawArrays(gl.TRIANGLES, 0, 36);
}

}
*/
class Cube {
    constructor() {
        this.type = "cube";
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.matrix = new Matrix4();
        this.textureNum = -1;

        // 36 points for 12 triangles (6 faces * 2 triangles * 3 vertices)
        this.cubeVerts = new Float32Array([
          0,0,0, 1,1,0, 1,0,0,  0,0,0, 0,1,0, 1,1,0, // Front
          0,0,1, 1,1,1, 1,0,1,  0,0,1, 0,1,1, 1,1,1, // Back
          0,1,0, 1,1,1, 1,1,0,  0,1,0, 0,1,1, 1,1,1, // Top
          0,0,0, 1,0,1, 1,0,0,  0,0,0, 0,0,1, 1,0,1, // Bottom
          0,0,0, 0,1,1, 0,1,0,  0,0,0, 0,0,1, 0,1,1, // Left
          1,0,0, 1,1,1, 1,1,0,  1,0,0, 1,0,1, 1,1,1  // Right
        ]);

        // Corresponding UVs for all 36 vertices
        this.cubeUVs = new Float32Array([
          0,0, 1,1, 1,0,  0,0, 0,1, 1,1, // Front
          0,0, 1,1, 1,0,  0,0, 0,1, 1,1, // Back
          0,0, 1,1, 1,0,  0,0, 0,1, 1,1, // Top
          0,0, 1,1, 1,0,  0,0, 0,1, 1,1, // Bottom
          0,0, 1,1, 1,0,  0,0, 0,1, 1,1, // Left
          0,0, 1,1, 1,0,  0,0, 0,1, 1,1  // Right
        ]);

        this.cubeNormals = new Float32Array([
          0,0,-1, 0,0,-1, 0,0,-1,  0,0,-1, 0,0,-1, 0,0,-1,
          0,0,1,  0,0,1,  0,0,1,   0,0,1,  0,0,1,  0,0,1,
          0,1,0,  0,1,0,  0,1,0,   0,1,0,  0,1,0,  0,1,0,
          0,-1,0, 0,-1,0, 0,-1,0,  0,-1,0, 0,-1,0, 0,-1,0,
          -1,0,0, -1,0,0, -1,0,0,  -1,0,0, -1,0,0, -1,0,0,
          1,0,0,  1,0,0,  1,0,0,   1,0,0,  1,0,0,  1,0,0
        ]);
    }

    renderfast() {
        var rgba = this.color;
        gl.uniform1i(u_whichTexture, this.textureNum);
        gl.uniform4f(u_FragColor, rgba[0], rgba[1], rgba[2], rgba[3]);
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        var normalMatrix = new Matrix4();
        normalMatrix.setInverseOf(this.matrix);
        normalMatrix.transpose();
        gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);

        var vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.cubeVerts, gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        var uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.cubeUVs, gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_UV);

        var normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.cubeNormals, gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Normal);

        gl.drawArrays(gl.TRIANGLES, 0, 36);
    }
}