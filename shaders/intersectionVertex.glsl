attribute float translucent;
varying float vTranslucent;
varying vec2 vUv;
varying vec3 vPosition;

void main( void ) {
  
  vUv = uv;
  vPosition = position;
  vTranslucent = translucent;
  if(vTranslucent == 0.0){
    vPosition.z += 5.0;
  }
  gl_Position = projectionMatrix * modelViewMatrix * vec4(vPosition, 1);
  
}
