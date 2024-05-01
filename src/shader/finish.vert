attribute vec2 position;
attribute vec2 texCoord;
attribute vec2 offset;
uniform vec2 crevice;
uniform vec2 mouse;
uniform float canvasAspect;
uniform float resourceAspect;
uniform float vertexScale;
varying vec2 vTexCoord;
void main() {
  vec2 edge = (1.0 - abs(position));
  float creviceRatio = 1.0 - max(crevice.x, crevice.y);

  vec2 m = mouse * 5.0; // interaction intensity

  vec2 t = texCoord * 2.0 - 1.0;
  t = t + vec2(m.x, -m.y) * edge * crevice / creviceRatio;
  vTexCoord = t * 0.5 + 0.5;

  vec2 o = offset * crevice;
  vec2 p = position * creviceRatio + o + m * edge * crevice;
  if (resourceAspect > 1.0) {
    p.y /= resourceAspect;
  } else {
    p.x *= resourceAspect;
  }
  if (canvasAspect > 1.0) {
    p.x /= canvasAspect;
  } else {
    p.y *= canvasAspect;
  }

  gl_Position = vec4(p * vertexScale, 0.0, 1.0);
}
