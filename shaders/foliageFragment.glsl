
uniform sampler2D texture;

uniform vec3 highlight;

varying vec2 vUv;
varying vec3 vPosition;

vec3 layerColor(vec3 color1, vec3 color2, float alpha) {
  return mix(color1, color2, alpha);
}


void main(){
  // Texture loading
  gl_FragColor = texture2D( texture, vUv );
  gl_FragColor.r += highlight.r;
  gl_FragColor.g += highlight.g;
  gl_FragColor.b += highlight.b;
  gl_FragColor = normalize(gl_FragColor);

}
