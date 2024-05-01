precision highp float;
uniform int blend;
uniform sampler2D firstTexture;
uniform sampler2D secondTexture;
varying vec2 vTexCoord;

void main() {
  vec3 firstColor = texture2D(firstTexture, vTexCoord).rgb;
  vec3 secondColor = texture2D(secondTexture, vTexCoord).rgb;

  vec3 outColor = vec3(0.0);
  if (blend == 0) {
    outColor = secondColor;
  } else if (blend == 1) {
    outColor = firstColor + secondColor;
  } else if (blend == 2) {
    outColor = firstColor - secondColor;
  } else if (blend == 3) {
    outColor = secondColor - firstColor;
  } else if (blend == 4) {
    outColor = firstColor * secondColor;
  } else if (blend == 5) {
    vec3 one = (1.0 - firstColor);
    vec3 two = (1.0 - secondColor);
    outColor = 1.0 - one * two;
  } else if (blend == 6) {
    outColor = min(firstColor, secondColor);
  } else if (blend == 7) {
    outColor = max(firstColor, secondColor);
  }

  // final output
  gl_FragColor = vec4(outColor, 1.0);
}
