precision highp float;
uniform float resourceAspect;
uniform sampler2D inputTexture;
uniform vec3 hsv;
uniform float temperature; // -1.67 ~ 1.67
uniform float tint; // -1.67 ~ 1.67
uniform float contrastIntensity; // 0.0 ~ 1.0
uniform float mosaic; // 1.0 ~ 200.0
uniform vec2 shift; // -0.2 ~ 0.2
varying vec2 vTexCoord;

const float EPS = 1.0e-10;
const float PI  = 3.1415926;
const float PI2 = PI * 2.0;
const float DIV = 10.0 / 6.0;

mat3 LIN_2_LMS_MAT = mat3(
  3.90405e-1, 5.49941e-1, 8.92632e-3,
  7.08416e-2, 9.63172e-1, 1.35775e-3,
  2.31082e-2, 1.28021e-1, 9.36245e-1
);
mat3 LMS_2_LIN_MAT = mat3(
  2.85847e+0, -1.62879e+0, -2.48910e-2,
  -2.10182e-1,  1.15820e+0,  3.24281e-4,
  -4.18120e-2, -1.18169e-1,  1.06867e+0
);

vec3 whiteBalance(vec3 diffuse, float te, float ti){
  // Range ~[-1.67;1.67] works best
  float t1 = te * DIV;
  float t2 = ti * DIV;
  // Get the CIE xy chromaticity of the reference white point.
  // Note: 0.31271 = x value on the D65 white point
  float x = 0.31271 - t1 * (t1 < 0.0 ? 0.1 : 0.05);
  float standardIlluminantY = 2.87 * x - 3.0 * x * x - 0.27509507;
  float y = standardIlluminantY + t2 * 0.05;
  // Calculate the coefficients in the LMS space.
  vec3 w1 = vec3(0.949237, 1.03542, 1.08728); // D65 white point

  // CIExyToLMS
  float Y = 1.0;
  float X = Y * x / y;
  float Z = Y * (1.0 - x - y) / y;
  float L = 0.7328 * X + 0.4296 * Y - 0.1624 * Z;
  float M = -0.7036 * X + 1.6975 * Y + 0.0061 * Z;
  float S = 0.0030 * X + 0.0136 * Y + 0.9834 * Z;
  vec3 w2 = vec3(L, M, S);

  vec3 balance = vec3(w1.x / w2.x, w1.y / w2.y, w1.z / w2.z);

  vec3 lms = LIN_2_LMS_MAT * diffuse;
  lms *= balance;
  return LMS_2_LIN_MAT * lms;
}

vec3 RGB2HSV(vec3 color){
  vec3 c = min(color, 1.0);
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

  float d = q.x - min(q.w, q.y);
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + EPS)), d / (q.x + EPS), q.x);
}

vec3 HSV2RGB(vec3 color){
  vec3 c = min(color, 1.0);
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

vec3 contrast(vec3 color, float base){
  float b = (base * 2.0 - 1.0) * 0.5;
  return color + vec3(
    atan((color.r * 2.0 - 1.0) * b),
    atan((color.g * 2.0 - 1.0) * b),
    atan((color.b * 2.0 - 1.0) * b)
  );
}

vec3 grading(vec2 texCoord) {
  vec4 samplerColor = texture2D(inputTexture, texCoord);
  vec3 balanced = whiteBalance(samplerColor.rgb, temperature, tint);
  vec3 contrasted = contrast(balanced, contrastIntensity);
  vec3 hsvColor = RGB2HSV(contrasted);
  hsvColor.x = fract(hsvColor.x + hsv.x);
  hsvColor.y = clamp(hsvColor.y + hsv.y, 0.0, 1.0);
  hsvColor.z = clamp(hsvColor.z + hsv.z, 0.0, 1.0);
  return HSV2RGB(hsvColor);
}

void main() {
  vec2 texCoord = vTexCoord;

  if (mosaic > 0.0) {
    texCoord = (vTexCoord * 2.0 - 1.0) * vec2(resourceAspect, 1.0);
    texCoord = floor(texCoord * mosaic + 0.5) / mosaic;
    texCoord = (texCoord / vec2(resourceAspect, 1.0)) * 0.5 + 0.5;
  }

  vec2 rCoord = texCoord - shift;
  vec2 gCoord = texCoord;
  vec2 bCoord = texCoord + shift;
  vec3 rgb = vec3(
    grading(rCoord).r,
    grading(gCoord).g,
    grading(bCoord).b
  );
  gl_FragColor = vec4(rgb, 1.0);
}
