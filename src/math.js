// Column-major transforms. No runtime dependencies or network requests.
const M = {
 identity:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),
 mul(a,b){const c=new Float32Array(16);for(let j=0;j<4;j++)for(let i=0;i<4;i++)c[j*4+i]=a[i]*b[j*4]+a[4+i]*b[j*4+1]+a[8+i]*b[j*4+2]+a[12+i]*b[j*4+3];return c;},
 translation(x,y,z){let a=M.identity();a[12]=x;a[13]=y;a[14]=z;return a;},
 scale(x,y=x,z=x){let a=M.identity();a[0]=x;a[5]=y;a[10]=z;return a;},
 rx(t){let a=M.identity(),c=Math.cos(t),s=Math.sin(t);a[5]=c;a[6]=s;a[9]=-s;a[10]=c;return a;},
 ry(t){let a=M.identity(),c=Math.cos(t),s=Math.sin(t);a[0]=c;a[2]=-s;a[8]=s;a[10]=c;return a;},
 rz(t){let a=M.identity(),c=Math.cos(t),s=Math.sin(t);a[0]=c;a[1]=s;a[4]=-s;a[5]=c;return a;},
 transform(a,p,w=1){return [a[0]*p[0]+a[4]*p[1]+a[8]*p[2]+a[12]*w,a[1]*p[0]+a[5]*p[1]+a[9]*p[2]+a[13]*w,a[2]*p[0]+a[6]*p[1]+a[10]*p[2]+a[14]*w,a[3]*p[0]+a[7]*p[1]+a[11]*p[2]+a[15]*w];},
 ortho(l,r,b,t,n,f){return new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]);},
 perspective(fov,aspect,n,f){let d=1/Math.tan(fov/2);return new Float32Array([d/aspect,0,0,0,0,d,0,0,0,0,(f+n)/(n-f),-1,0,0,2*f*n/(n-f),0]);},
 look(eye,at,up=[0,1,0]){const z=V.norm(V.sub(eye,at)),x=V.norm(V.cross(up,z)),y=V.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,eye),-V.dot(y,eye),-V.dot(z,eye),1]);},
 inverse(a){let r=Array.from({length:4},(_,i)=>[a[i],a[4+i],a[8+i],a[12+i],...Array.from({length:4},(_,j)=>i===j?1:0)]);for(let i=0;i<4;i++){let k=i;for(let j=i+1;j<4;j++)if(Math.abs(r[j][i])>Math.abs(r[k][i]))k=j;[r[i],r[k]]=[r[k],r[i]];let d=r[i][i];if(Math.abs(d)<1e-12)return M.identity();for(let j=0;j<8;j++)r[i][j]/=d;for(let k=0;k<4;k++)if(k!==i){let d=r[k][i];for(let j=0;j<8;j++)r[k][j]-=d*r[i][j];}}let o=new Float32Array(16);for(let i=0;i<4;i++)for(let j=0;j<4;j++)o[j*4+i]=r[i][j+4];return o;}
};
const V={add:(a,b)=>a.map((v,i)=>v+b[i]),sub:(a,b)=>a.map((v,i)=>v-b[i]),mul:(a,t)=>a.map(v=>v*t),dot:(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0),cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],norm(a){let l=Math.hypot(...a)||1;return a.map(v=>v/l);}};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),lerp=(a,b,t)=>a+(b-a)*t;
const compose=(...ms)=>ms.reduce((a,b)=>M.mul(a,b),M.identity());
const tr=(p,s=[1,1,1],rot=0)=>compose(M.translation(...p),M.ry(rot),M.scale(...s));
function nearestPath(x,z,path){let best={distance:Infinity};for(let i=0;i<path.length-1;i++){let a=path[i],b=path[i+1],dx=b[0]-a[0],dz=b[1]-a[1],len=Math.hypot(dx,dz),t=clamp(((x-a[0])*dx+(z-a[1])*dz)/(len*len),0,1),px=a[0]+dx*t,pz=a[1]+dz*t,dist=Math.hypot(x-px,z-pz);if(dist<best.distance)best={x:px,z:pz,s:a[2]+len*t,distance:dist};}return best;}
function pointOnPath(s,path){s=clamp(s,0,path.at(-1)[2]);for(let i=0;i<path.length-1;i++){let a=path[i],b=path[i+1];if(s<=b[2]){let t=(s-a[2])/(b[2]-a[2]);return [lerp(a[0],b[0],t),lerp(a[1],b[1],t)];}}return path.at(-1).slice(0,2);}

const PATH_POINTS=[[-11,18],[9,7],[-8,-4],[6,-15],[-3,-27.4]];
