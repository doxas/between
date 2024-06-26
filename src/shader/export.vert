attribute vec2 position;
attribute vec2 texCoord;
attribute vec2 offset;
uniform vec2 crevice;
uniform vec2 mouse;
varying vec2 vTexCoord;
void main() {
  vec2 edge = (1.0 - abs(position));
  float creviceRatio = 1.0 - max(crevice.x, crevice.y);

  vec2 m = mouse * 5.0; // interaction intensity

  vec2 t = texCoord * 2.0 - 1.0;
  t = t + vec2(m.x, -m.y) * edge * crevice / creviceRatio;
  vTexCoord = t * 0.5 + 0.5;

  vec2 o = offset * crevice * edge;
  vec2 p = position + o + m * edge * crevice;

  gl_Position = vec4(p, 0.0, 1.0);
}
