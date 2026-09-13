import * as THREE from 'three';
export function waterMaterial(ocean=false){
 return new THREE.ShaderMaterial({uniforms:{uTime:{value:0},uDay:{value:1},uScale:{value:ocean?.10:1},uSun:{value:new THREE.Vector3(-1,1,1).normalize()},uDeep:{value:new THREE.Color(ocean?0x267d96:0x386f70)},uShallow:{value:new THREE.Color(ocean?0x5aa7b3:0x76aead)}},side:THREE.DoubleSide,
 vertexShader:`varying vec3 vWorld;void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,
 fragmentShader:`uniform float uTime;uniform float uDay;uniform float uScale;uniform vec3 uSun;uniform vec3 uDeep;uniform vec3 uShallow;varying vec3 vWorld;
 void main(){
 vec2 p=vWorld.xz*uScale;float t=uTime;
 vec3 N=normalize(vec3(.095*sin(p.x*58.+p.y*27.+t*1.1)+.035*sin(p.y*170.-t*1.7),1.,.065*cos(p.y*72.-p.x*21.+t*.9)+.03*cos(p.x*145.+t*1.3)));
 vec3 V=normalize(cameraPosition-vWorld),R=reflect(-V,N),H=normalize(V+uSun);
 float fresnel=.08+.65*pow(1.-max(dot(N,V),0.),4.);
 vec3 sky=mix(vec3(.72,.82,.84),vec3(.34,.57,.73),clamp(R.y,0.,1.));
 float swell=.5+.5*sin(p.x*4.+p.y*3.+sin(p.y*8.)*.3+t*.18);
 vec3 base=mix(uDeep,uShallow,.24+swell*.18);
 vec3 col=mix(base,sky,fresnel)*(.35+.65*uDay);
 float spec=pow(max(dot(N,H),0.),190.)*.8+pow(max(dot(N,H),0.),850.)*1.5;
 col+=spec*vec3(1.,.84,.58)*uDay*max(uSun.y,0.);
 col+=pow(.5+.5*sin(p.x*230.+p.y*125.+t),18.)*.008*uDay;
 gl_FragColor=vec4(col,1.);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
}
