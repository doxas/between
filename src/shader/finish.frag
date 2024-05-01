precision highp float;
uniform sampler2D firstTexture;
uniform sampler2D secondTexture;
varying vec2 vTexCoord;

void main() {
  vec4 firstColor = texture2D(firstTexture, vTexCoord);
  vec4 secondColor = texture2D(secondTexture, vTexCoord);

  // final output
  gl_FragColor = firstColor + secondColor;
}
