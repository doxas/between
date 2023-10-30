precision highp float;
uniform vec2 resolution;
uniform float resourceAspect;
uniform sampler2D inputTexture;
uniform vec3 hsv;
uniform float sobel;
uniform float temperature; // -1.67 ~ 1.67
uniform float tint; // -1.67 ~ 1.67
uniform float contrastIntensity; // 0.0 ~ 1.0
uniform float mosaic; // 1.0 ~ 400.0
uniform float bayer; // 1.0 ~ 400.0
uniform float toon;
uniform float toonMin;
uniform float toonMax;
uniform vec2 shift; // -0.2 ~ 0.2
uniform vec2 noiseIntensity; // -10.0 ~ 10.0
uniform vec2 noiseScale; // 1.0 ~ 500.0
uniform float noiseTime; // 0.0 ~ 1.0
uniform vec2 sNoiseIntensity; // -0.5~ 0.5
uniform vec2 sNoiseScale; // 0.0 ~ 10.0
uniform float sNoiseTime; // 0.0 ~ 10.0
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

//
// Description : Array and textureless GLSL 2D simplex noise function.
//      Author : Ian McEwan, Ashima Arts.
//  Maintainer : stegu
//     Lastmod : 20110822 (ijm)
//     License : Copyright (C) 2011 Ashima Arts. All rights reserved.
//               Distributed under the MIT License. See LICENSE file.
//               https://github.com/ashima/webgl-noise
//               https://github.com/stegu/webgl-noise
//

// (sqrt(5) - 1)/4 = F4, used once below
#define F4 0.309016994374947451
float mod289(float x){return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec2  mod289(vec2 x) {return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec3  mod289(vec3 x) {return x - floor(x * (1.0 / 289.0)) * 289.0;}
vec4  mod289(vec4 x) {return x - floor(x * (1.0 / 289.0)) * 289.0;}
float permute(float x){return mod289(((x*34.0)+1.0)*x);}
vec3  permute(vec3 x) {return mod289(((x*34.0)+1.0)*x);}
vec4  permute(vec4 x) {return mod289(((x*34.0)+1.0)*x);}
float taylorInvSqrt(float r){return 1.79284291400159 - 0.85373472095314 * r;}
vec4  taylorInvSqrt(vec4 r) {return 1.79284291400159 - 0.85373472095314 * r;}
float snoise2D(vec2 v){
  const vec4 C = vec4(0.211324865405187,  // (3.0-sqrt(3.0))/6.0
                      0.366025403784439,  // 0.5*(sqrt(3.0)-1.0)
                     -0.577350269189626,  // -1.0 + 2.0 * C.x
                      0.024390243902439); // 1.0 / 41.0
  // First corner
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);

  // Other corners
  vec2 i1;
  //i1.x = step( x0.y, x0.x ); // x0.x > x0.y ? 1.0 : 0.0
  //i1.y = 1.0 - i1.x;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  // x0 = x0 - 0.0 + 0.0 * C.xx ;
  // x1 = x0 - i1 + 1.0 * C.xx ;
  // x2 = x0 - 1.0 + 2.0 * C.xx ;
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;

  // Permutations
  i = mod289(i); // Avoid truncation effects in permutation
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m * m;
  m = m * m;

  // Gradients: 41 points uniformly over a line, mapped onto a diamond.
  // The ring size 17*17 = 289 is close to a multiple of 41 (41*7 = 287)

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;

  // Normalise gradients implicitly by scaling m
  // Approximation of: m *= inversesqrt( a0*a0 + h*h );
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );

  // Compute final noise value at P
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
float snoise3D(vec3 v){
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  // First corner
  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

  // Other corners
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  //   x0 = x0 - 0.0 + 0.0 * C.xxx;
  //   x1 = x0 - i1  + 1.0 * C.xxx;
  //   x2 = x0 - i2  + 2.0 * C.xxx;
  //   x3 = x0 - 1.0 + 3.0 * C.xxx;
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy; // 2.0*C.x = 1/3 = C.y
  vec3 x3 = x0 - D.yyy;      // -1.0+3.0*C.x = -0.5 = -D.y

  // Permutations
  i = mod289(i);
  vec4 p = permute( permute( permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  // Gradients: 7x7 points over a square, mapped onto an octahedron.
  // The ring size 17*17 = 289 is close to a multiple of 49 (49*6 = 294)
  float n_ = 0.142857142857; // 1.0/7.0
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);  //  mod(p,7*7)

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );    // mod(j,N)

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  //vec4 s0 = vec4(lessThan(b0,0.0))*2.0 - 1.0;
  //vec4 s1 = vec4(lessThan(b1,0.0))*2.0 - 1.0;
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  //Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  // Mix final noise value
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
}
vec4 grad4(float j, vec4 ip){
  const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
  vec4 p,s;

  p.xyz = floor( fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
  p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
  s = vec4(lessThan(p, vec4(0.0)));
  p.xyz = p.xyz + (s.xyz*2.0 - 1.0) * s.www;

  return p;
}
float snoise4D(vec4 v){
  const vec4  C = vec4( 0.138196601125011,  // (5 - sqrt(5))/20  G4
                        0.276393202250021,  // 2 * G4
                        0.414589803375032,  // 3 * G4
                       -0.447213595499958); // -1 + 4 * G4

  // First corner
  vec4 i  = floor(v + dot(v, vec4(F4)) );
  vec4 x0 = v -   i + dot(i, C.xxxx);

  // Other corners

  // Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)
  vec4 i0;
  vec3 isX = step( x0.yzw, x0.xxx );
  vec3 isYZ = step( x0.zww, x0.yyz );
  //  i0.x = dot( isX, vec3( 1.0 ) );
  i0.x = isX.x + isX.y + isX.z;
  i0.yzw = 1.0 - isX;
  //  i0.y += dot( isYZ.xy, vec2( 1.0 ) );
  i0.y += isYZ.x + isYZ.y;
  i0.zw += 1.0 - isYZ.xy;
  i0.z += isYZ.z;
  i0.w += 1.0 - isYZ.z;

  // i0 now contains the unique values 0,1,2,3 in each channel
  vec4 i3 = clamp( i0, 0.0, 1.0 );
  vec4 i2 = clamp( i0-1.0, 0.0, 1.0 );
  vec4 i1 = clamp( i0-2.0, 0.0, 1.0 );

  //  x0 = x0 - 0.0 + 0.0 * C.xxxx
  //  x1 = x0 - i1  + 1.0 * C.xxxx
  //  x2 = x0 - i2  + 2.0 * C.xxxx
  //  x3 = x0 - i3  + 3.0 * C.xxxx
  //  x4 = x0 - 1.0 + 4.0 * C.xxxx
  vec4 x1 = x0 - i1 + C.xxxx;
  vec4 x2 = x0 - i2 + C.yyyy;
  vec4 x3 = x0 - i3 + C.zzzz;
  vec4 x4 = x0 + C.wwww;

  // Permutations
  i = mod289(i);
  float j0 = permute( permute( permute( permute(i.w) + i.z) + i.y) + i.x);
  vec4 j1 = permute( permute( permute( permute (
             i.w + vec4(i1.w, i2.w, i3.w, 1.0 ))
           + i.z + vec4(i1.z, i2.z, i3.z, 1.0 ))
           + i.y + vec4(i1.y, i2.y, i3.y, 1.0 ))
           + i.x + vec4(i1.x, i2.x, i3.x, 1.0 ));

  // Gradients: 7x7x6 points over a cube, mapped onto a 4-cross polytope
  // 7*7*6 = 294, which is close to the ring size 17*17 = 289.
  vec4 ip = vec4(1.0/294.0, 1.0/49.0, 1.0/7.0, 0.0) ;

  vec4 p0 = grad4(j0,   ip);
  vec4 p1 = grad4(j1.x, ip);
  vec4 p2 = grad4(j1.y, ip);
  vec4 p3 = grad4(j1.z, ip);
  vec4 p4 = grad4(j1.w, ip);

  // Normalise gradients
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  p4 *= taylorInvSqrt(dot(p4,p4));

  // Mix contributions from the five corners
  vec3 m0 = max(0.6 - vec3(dot(x0,x0), dot(x1,x1), dot(x2,x2)), 0.0);
  vec2 m1 = max(0.6 - vec2(dot(x3,x3), dot(x4,x4)            ), 0.0);
  m0 = m0 * m0;
  m1 = m1 * m1;
  return 49.0 * ( dot(m0*m0, vec3( dot( p0, x0 ), dot( p1, x1 ), dot( p2, x2 )))
                + dot(m1*m1, vec2( dot( p3, x3 ), dot( p4, x4 ) ) ) ) ;
}
float fsnoise      (vec2 c){return fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453);}
float fsnoiseDigits(vec2 c){return fract(sin(dot(c, vec2(0.129898, 0.78233))) * 437.585453);}
vec3 sobelOp(vec2 texCoord) {
  vec2 fragment = 1.0 / resolution;
  vec2 offset[9];
  offset[0] = vec2(-1.0,  1.0);
  offset[1] = vec2( 0.0,  1.0);
  offset[2] = vec2( 1.0,  1.0);
  offset[3] = vec2(-1.0,  0.0);
  offset[4] = vec2( 0.0,  0.0);
  offset[5] = vec2( 1.0,  0.0);
  offset[6] = vec2(-1.0, -1.0);
  offset[7] = vec2( 0.0, -1.0);
  offset[8] = vec2( 1.0, -1.0);
  float hKernel[9], vKernel[9];
  hKernel[0] =  1.0; hKernel[1] =  2.0; hKernel[2] =  1.0;
  hKernel[3] =  0.0; hKernel[4] =  0.0; hKernel[5] =  0.0;
  hKernel[6] = -1.0; hKernel[7] = -2.0; hKernel[8] = -1.0;
  vKernel[0] =  1.0; vKernel[1] =  0.0; vKernel[2] = -1.0;
  vKernel[3] =  2.0; vKernel[4] =  0.0; vKernel[5] = -2.0;
  vKernel[6] =  1.0; vKernel[7] =  0.0; vKernel[8] = -1.0;
  vec3 horizontal = vec3(0.0);
  vec3 vertical = vec3(0.0);
  for (int i = 0; i < 9; ++i) {
    vec2 coord = texCoord + offset[i] * fragment;
    horizontal += (grading(coord)).rgb * hKernel[i];
    vertical += (grading(coord)).rgb * vKernel[i];
  }
  return sqrt(horizontal * horizontal + vertical * vertical);
}
vec3 bayer8(ivec2 coord, vec3 color) {
  float limit = 0.0;
  int index = coord.x + coord.y * 8;
  if (index ==  0) {limit = 0.015625;}
  if (index ==  1) {limit = 0.515625;}
  if (index ==  2) {limit = 0.140625;}
  if (index ==  3) {limit = 0.640625;}
  if (index ==  4) {limit = 0.046875;}
  if (index ==  5) {limit = 0.546875;}
  if (index ==  6) {limit = 0.171875;}
  if (index ==  7) {limit = 0.671875;}
  if (index ==  8) {limit = 0.765625;}
  if (index ==  9) {limit = 0.265625;}
  if (index == 10) {limit = 0.890625;}
  if (index == 11) {limit = 0.390625;}
  if (index == 12) {limit = 0.796875;}
  if (index == 13) {limit = 0.296875;}
  if (index == 14) {limit = 0.921875;}
  if (index == 15) {limit = 0.421875;}
  if (index == 16) {limit = 0.203125;}
  if (index == 17) {limit = 0.703125;}
  if (index == 18) {limit = 0.078125;}
  if (index == 19) {limit = 0.578125;}
  if (index == 20) {limit = 0.234375;}
  if (index == 21) {limit = 0.734375;}
  if (index == 22) {limit = 0.109375;}
  if (index == 23) {limit = 0.609375;}
  if (index == 24) {limit = 0.953125;}
  if (index == 25) {limit = 0.453125;}
  if (index == 26) {limit = 0.828125;}
  if (index == 27) {limit = 0.328125;}
  if (index == 28) {limit = 0.984375;}
  if (index == 29) {limit = 0.484375;}
  if (index == 30) {limit = 0.859375;}
  if (index == 31) {limit = 0.359375;}
  if (index == 32) {limit = 0.0625;}
  if (index == 33) {limit = 0.5625;}
  if (index == 34) {limit = 0.1875;}
  if (index == 35) {limit = 0.6875;}
  if (index == 36) {limit = 0.03125;}
  if (index == 37) {limit = 0.53125;}
  if (index == 38) {limit = 0.15625;}
  if (index == 39) {limit = 0.65625;}
  if (index == 40) {limit = 0.8125;}
  if (index == 41) {limit = 0.3125;}
  if (index == 42) {limit = 0.9375;}
  if (index == 43) {limit = 0.4375;}
  if (index == 44) {limit = 0.78125;}
  if (index == 45) {limit = 0.28125;}
  if (index == 46) {limit = 0.90625;}
  if (index == 47) {limit = 0.40625;}
  if (index == 48) {limit = 0.25;}
  if (index == 49) {limit = 0.75;}
  if (index == 50) {limit = 0.125;}
  if (index == 51) {limit = 0.625;}
  if (index == 52) {limit = 0.21875;}
  if (index == 53) {limit = 0.71875;}
  if (index == 54) {limit = 0.09375;}
  if (index == 55) {limit = 0.59375;}
  if (index == 56) {limit = 1.0;}
  if (index == 57) {limit = 0.5;}
  if (index == 58) {limit = 0.875;}
  if (index == 59) {limit = 0.375;}
  if (index == 60) {limit = 0.96875;}
  if (index == 61) {limit = 0.46875;}
  if (index == 62) {limit = 0.84375;}
  if (index == 63) {limit = 0.34375;}
  return 1.0 - step(color, vec3(limit));
}
void main() {
  // original coordinate
  vec2 texCoord = vTexCoord;

  // smooth-noise
  vec2 sNoiseCoord = (10.0 + texCoord) * sNoiseScale;
  vec3 sn = (snoise3D(vec3(sNoiseCoord, sNoiseTime)) * 2.0 - 1.0) * vec3(sNoiseIntensity, 1.0);
  texCoord += sn.xy;

  // fs-noise
  vec2 noiseCoord = floor(texCoord * noiseScale) / noiseScale;
  float fn = fsnoise(noiseCoord + noiseTime);
  vec2 fNoiseCoord = step(fn, noiseTime) * fn * noiseIntensity;
  texCoord += fNoiseCoord * sign(noiseTime);

  // mosaic
  vec2 aspected = (texCoord * 2.0 - 1.0) * vec2(resourceAspect, 1.0);
  if (mosaic > 0.0) {
    texCoord = floor(aspected * mosaic + 0.5) / mosaic;
    texCoord = (texCoord / vec2(resourceAspect, 1.0)) * 0.5 + 0.5;
  }

  // rgb-shift and sobel
  vec2 rCoord = texCoord - shift;
  vec2 gCoord = texCoord;
  vec2 bCoord = texCoord + shift;
  vec3 rgb = vec3(
    grading(rCoord).r + sobelOp(rCoord).r * sobel,
    grading(gCoord).g + sobelOp(gCoord).g * sobel,
    grading(bCoord).b + sobelOp(bCoord).b * sobel
  );

  // toon
  if (toon > 1.0 && toonMax > toonMin) {
    float clampRange = toonMax - toonMin;
    vec3 clamped = (clamp(rgb, vec3(toonMin), vec3(toonMax)) - toonMin) / clampRange;
    vec3 floored = min((1.0 / (toon - 1.0)) * floor(clamped * toon), 1.0);
    rgb = vec3(toonMin) + floored * clampRange;
  }

  // bayer
  if (bayer > 0.0) {
    vec2 floorCoord = floor(aspected * bayer + 0.5);
    vec2 modulo = mod(floorCoord, 8.0);
    rgb = bayer8(ivec2(int(modulo.x), int(modulo.y)), rgb);
  }

  // final output
  gl_FragColor = vec4(rgb, 1.0);
}
