
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vLightFront;
varying vec3 vNormal;

attribute float foliage;
varying float vFoliage;
attribute float displacement;
attribute float translucent;
varying float vTranslucent;

THREE.ShaderChunk['lights_lambert_pars_vertex']
THREE.ShaderChunk['shadowmap_pars_vertex']

void main( void ) {
  
  vUv = uv;
  vPosition = position;
  vNormal = normal;
  vFoliage = foliage;
  vTranslucent = translucent;
  vPosition.z -= displacement;
  vec3 transformedNormal = normalize( normalMatrix * normal );
  THREE.ShaderChunk['lights_lambert_vertex']
  THREE.ShaderChunk['shadowmap_vertex']
  gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1);
  
}
