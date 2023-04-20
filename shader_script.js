function main() {
    // Get A WebGL context
    /** @type {HTMLCanvasElement} */
    const canvas = document.querySelector("#canvas");
    const gl = canvas.getContext("webgl");
    if (!gl) {
        return;
    }

    const vs = `
    // an attribute will receive data from a buffer
    attribute vec4 a_position;

    // all shaders have a main function
    void main() {

      // gl_Position is a special variable a vertex shader
      // is responsible for setting
      gl_Position = a_position;
    }
  `;

    const fs = `
    precision highp float;

    uniform vec2 iResolution;
    uniform vec2 iMouse;
    uniform float iTime;
 
    float warp = 0.75; // simulate curvature of CRT monitor
    float scan = 0.75; // simulate darkness between scanlines

    void mainImage(out vec4 fragColor,in vec2 fragCoord)
	{
        // squared distance from center
        vec2 uv = fragCoord/iResolution.xy;
        vec2 dc = abs(0.5-uv);
        dc *= dc;
    
        // warp the fragment coordinates
        uv.x -= 0.5; uv.x *= 1.0+(dc.y*(0.3*warp)); uv.x += 0.5;
        uv.y -= 0.5; uv.y *= 1.0+(dc.x*(0.4*warp)); uv.y += 0.5;

        // sample inside boundaries, otherwise set to black
        if (uv.y > 1.0 || uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0)
            fragColor = vec4(0.0,0.0,0.0,1.0);
        else
    	{
            // determine if we are drawing in a scanline
            float apply = abs(sin(fragCoord.y)*0.5*scan);
            float transparency = float(0);
            if(apply>0.2)
                transparency = apply/4.0;
            // sample the texture
    	    fragColor = vec4(apply, apply, apply, float(1)-apply);
        }
	}
 
    void main() {
        mainImage(gl_FragColor, gl_FragCoord.xy);
    }
  `;

    // setup GLSL program
    const program = webglUtils.createProgramFromSources(gl, [vs, fs]);

    // look up where the vertex data needs to go.
    const positionAttributeLocation = gl.getAttribLocation(program, "a_position");

    // look up uniform locations
    const resolutionLocation = gl.getUniformLocation(program, "iResolution");
    const mouseLocation = gl.getUniformLocation(program, "iMouse");
    const timeLocation = gl.getUniformLocation(program, "iTime");

    // Create a buffer to put three 2d clip space points in
    const positionBuffer = gl.createBuffer();

    // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // fill it with a 2 triangles that cover clipspace
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,  // first triangle
        1, -1,
        -1, 1,
        -1, 1,  // second triangle
        1, -1,
        1, 1,
    ]), gl.STATIC_DRAW);

    let mouseX = 0;
    let mouseY = 0;

    function setMousePosition(e) {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = rect.height - (e.clientY - rect.top) - 1;  // bottom is 0 in WebGL
    }

    canvas.addEventListener('mousemove', setMousePosition);
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        setMousePosition(e.touches[0]);
    }, { passive: false });

    function render(time) {
        time *= 0.001;  // convert to seconds

        webglUtils.resizeCanvasToDisplaySize(gl.canvas);

        // Tell WebGL how to convert from clip space to pixels
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        // Tell it to use our program (pair of shaders)
        gl.useProgram(program);

        // Turn on the attribute
        gl.enableVertexAttribArray(positionAttributeLocation);

        // Bind the position buffer.
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

        // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
        gl.vertexAttribPointer(
            positionAttributeLocation,
            2,          // 2 components per iteration
            gl.FLOAT,   // the data is 32bit floats
            false,      // don't normalize the data
            0,          // 0 = move forward size * sizeof(type) each iteration to get the next position
            0,          // start at the beginning of the buffer
        );

        gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);
        gl.uniform2f(mouseLocation, mouseX, mouseY);
        gl.uniform1f(timeLocation, time);

        gl.drawArrays(
            gl.TRIANGLES,
            0,     // offset
            6,     // num vertices to process
        );

        requestAnimationFrame(render);
    }
    requestAnimationFrame(render);
}

main();
