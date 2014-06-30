
uniform sampler2D texture_grass;
uniform sampler2D texture_bare;
uniform sampler2D texture_snow;
uniform sampler2D texture_rock;

uniform bool show_ring;
uniform float ring_width;
uniform vec4 ring_color;
uniform vec3 ring_center;
uniform float ring_radius;

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vLightFront;
varying vec3 vNormal;

varying float vFoliage;
varying float vTranslucent;

THREE.ShaderChunk['shadowmap_pars_fragment']

float dist_falloff(float distance, float falloff) {
  float alpha = (falloff - distance) / falloff;
  if (alpha < 0.0) {
    alpha = 0.0;
  }
  if (alpha > 1.0) {
    alpha = 1.0;
  }
  return alpha;
}


vec3 layerColor(vec3 color1, vec3 color2, float alpha) {
  return mix(color1, color2, alpha);
}


void main(){
  // Texture loading
  vec3 diffuseBare = texture2D( texture_bare, vUv * 2.0).rgb;
  vec3 diffuseGrass = texture2D( texture_grass, vUv * 2.0 ).rgb;
  vec3 diffuseSnow = texture2D( texture_snow, vUv ).rgb;
  vec3 diffuseRock= texture2D( texture_rock, vUv * 5.0 ).rgb;
  
  // Get base texture
  vec3 fragcolor = diffuseRock;
  
  // Grass texture
  fragcolor = layerColor(fragcolor, diffuseGrass,
                         dist_falloff(1.0 - vNormal.z,0.5));
  // Dirt texture
  fragcolor = layerColor(fragcolor, diffuseBare,
                          dist_falloff(vFoliage,300.0));
  // Snow texture
  fragcolor = layerColor(fragcolor, diffuseSnow,
                          dist_falloff(200.0 - vPosition.z,50.0));
  
  gl_FragColor=vec4(fragcolor, 1.0);

  //gl_FragColor = vec4(0.5, 0.2, 1.0, 1.0);
  gl_FragColor.xyz = gl_FragColor.xyz * vLightFront;
  THREE.ShaderChunk['shadowmap_fragment']

  float distance = sqrt((vPosition.x - ring_center.x) * (vPosition.x - ring_center.x) + 
    (vPosition.y - ring_center.y) * (vPosition.y - ring_center.y));

  if(show_ring == true && 
      distance < ring_radius - ring_width / 2.0) {
    gl_FragColor.r += ring_color.r / 2.0;
    gl_FragColor.b += ring_color.b / 2.0;
    gl_FragColor.g += ring_color.g / 2.0;
    gl_FragColor.a += ring_color.a / 2.0;
    gl_FragColor = normalize(gl_FragColor);
  }
  if(show_ring == true && 
      distance < ring_radius + ring_width / 2.0 && 
      distance > ring_radius - ring_width / 2.0) {
    gl_FragColor.r += ring_color.r;
    gl_FragColor.b += ring_color.b;
    gl_FragColor.g += ring_color.g;
    gl_FragColor.a += ring_color.a;
    gl_FragColor = normalize(gl_FragColor);
  }
  gl_FragColor.a = vTranslucent;
}
