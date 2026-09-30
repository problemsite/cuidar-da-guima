// =====================================================================
//  PÓS-EFEITOS (WebGL): grão de filme, vinheta, aberração cromática,
//  glitch, ondulação, dessaturação, flash. Também faz a imagem ocupar
//  a tela inteira ("cover"). Se WebGL falhar, mostra o canvas direto.
// =====================================================================
(function () {
  const G = (window.G = window.G || {});
  const FX = (G.FX = { ok: false });

  const VS = `attribute vec2 p; varying vec2 uv; void main(){ uv = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }`;
  const FS = `
  precision mediump float;
  varying vec2 uv;
  uniform sampler2D tex;
  uniform vec2 cover;      // quanto do mundo aparece (0..1)
  uniform vec2 shake;
  uniform float t, grain, vig, chroma, wave, glitch, desat, bright, contrast, invert, scan, barrel, tintA, flashA, zoom;
  uniform vec3 tint, flashC;
  uniform vec2 zoomC;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  void main(){
    vec2 q = uv;
    // barril leve
    vec2 d = q - 0.5;
    q = 0.5 + d * (1.0 + barrel * dot(d,d)) / (1.0 + barrel * 0.5);
    // mapear para o mundo (cover) + zoom de câmera
    vec2 w = 0.5 + (q - 0.5) * cover;
    vec2 centro = mix(vec2(0.5), zoomC, clamp((zoom - 1.0) * 1.6, 0.0, 1.0));
    centro = clamp(centro, vec2(0.5 / zoom), vec2(1.0 - 0.5 / zoom));
    w = centro + (w - 0.5) / zoom;
    w += shake;
    // ondulação
    w.x += sin(w.y * 38.0 + t * 3.1) * wave * 0.004 + sin(w.y * 7.0 - t * 1.3) * wave * 0.006;
    w.y += cos(w.x * 21.0 + t * 2.3) * wave * 0.002;
    // glitch em blocos
    if (glitch > 0.0) {
      float by = floor(w.y * 24.0);
      float n = h(vec2(by, floor(t * 14.0)));
      if (n < glitch * 0.55) w.x += (h(vec2(by, floor(t*9.0)+3.0)) - 0.5) * 0.18 * glitch;
      float bx = floor(w.x * 16.0);
      if (h(vec2(bx, by + floor(t*20.0))) < glitch * 0.06) w += (vec2(h(vec2(bx,by)), h(vec2(by,bx))) - 0.5) * 0.1;
    }
    w.y = 1.0 - w.y;
    float ca = chroma * 0.004 + glitch * 0.012;
    vec3 c;
    c.r = texture2D(tex, w + vec2(ca, 0.0)).r;
    c.g = texture2D(tex, w).g;
    c.b = texture2D(tex, w - vec2(ca, 0.0)).b;
    // cor
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(c, vec3(l), desat);
    c = (c - 0.5) * contrast + 0.5 + bright;
    c = mix(c, c * tint, tintA);
    c = mix(c, 1.0 - c, invert);
    // linhas / grão
    c -= scan * 0.06 * (0.5 + 0.5 * sin(uv.y * 1400.0));
    float g = h(uv * vec2(1920.0, 1080.0) + fract(t * 7.13) * 100.0) - 0.5;
    c += g * grain;
    // vinheta
    vec2 v = uv - 0.5;
    float vv = smoothstep(0.35, 0.95, length(v * vec2(1.25, 1.0)) * (0.9 + vig * 0.35));
    c *= 1.0 - vv * vig;
    c = mix(c, flashC, flashA);
    // fora do mundo = preto
    if (w.x < 0.0 || w.x > 1.0 || w.y < 0.0 || w.y > 1.0) c = vec3(0.0);
    gl_FragColor = vec4(c, 1.0);
  }`;

  let gl, prog, tex, U = {}, tela;

  FX.iniciar = function (canvasTela) {
    tela = canvasTela;
    try {
      gl = tela.getContext('webgl', { antialias: false, alpha: false, preserveDrawingBuffer: false });
      if (!gl) return false;
      const sh = (tipo, src) => {
        const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'p');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      ['tex', 'cover', 'shake', 't', 'grain', 'vig', 'chroma', 'wave', 'glitch', 'desat', 'bright', 'contrast', 'invert', 'scan', 'barrel', 'tint', 'tintA', 'flashC', 'flashA', 'zoom', 'zoomC']
        .forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));
      FX.ok = true;
    } catch (e) {
      console.warn('WebGL indisponível, usando modo simples.', e);
      FX.ok = false;
    }
    return FX.ok;
  };

  FX.desenhar = function (fonte, p) {
    const W = tela.width, H = tela.height;
    gl.viewport(0, 0, W, H);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, fonte);
    const esc = Math.max(W / fonte.width, H / fonte.height);
    gl.uniform2f(U.cover, W / esc / fonte.width, H / esc / fonte.height);
    gl.uniform2f(U.shake, p.sx || 0, p.sy || 0);
    gl.uniform1f(U.t, p.t);
    gl.uniform1f(U.grain, p.grain); gl.uniform1f(U.vig, p.vig); gl.uniform1f(U.chroma, p.chroma);
    gl.uniform1f(U.wave, p.wave); gl.uniform1f(U.glitch, p.glitch); gl.uniform1f(U.desat, p.desat);
    gl.uniform1f(U.bright, p.bright); gl.uniform1f(U.contrast, p.contrast); gl.uniform1f(U.invert, p.invert);
    gl.uniform1f(U.scan, p.scan); gl.uniform1f(U.barrel, p.barrel);
    gl.uniform3fv(U.tint, p.tint); gl.uniform1f(U.tintA, p.tintA);
    gl.uniform3fv(U.flashC, p.flashC); gl.uniform1f(U.flashA, p.flashA);
    gl.uniform1f(U.zoom, p.zoom || 1); gl.uniform2f(U.zoomC, p.zx !== undefined ? p.zx : 0.5, p.zy !== undefined ? p.zy : 0.5);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };
})();
