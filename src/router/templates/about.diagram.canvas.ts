import type { ERData } from "./about.diagram.js";

// Identity tag that signals "this template literal contains JavaScript".
// Zero runtime cost (delegates to String.raw); the name enables syntax
// highlighting in editors with JS-in-template-literal support.

export function erDiagramSection(data: ERData): string {
  if (!data.entities.length) return "";
  const json = JSON.stringify(data);

  return /*html*/ `
  <h2>Data Model</h2>

  <div class="card" style="padding:0;overflow:hidden;position:relative;">
    <canvas id="er-canvas" style="width:100%;display:block;cursor:grab;"></canvas>
    <button id="er-dl" title="Download PNG" style="position:absolute;top:10px;right:14px;background:#161b22;border:1px solid #30363d;color:#7d8590;padding:4px 10px;border-radius:6px;font-size:11px;cursor:pointer;line-height:1.4;">↓ PNG</button>
  </div>

  <script>${
    /*js*/ `
    (function(){

    var D=${json};

    // ── Constants ─────────────────────────────────────────────────────────────────
    var NW=178,HH=34,FH=22,FP=10,ROW_GAP=44,COL_GAP=100,BR=8,BO=14,LGH=56;

    var C={bg:'#0d1117',nb:'#161b22',nh:'#1c2128',pb:'#0d1117',ph:'#161b22',
      bo:'#30363d',bs:'#58a6ff',tx:'#e6edf3',mu:'#7d8590',
      pk:'#e3b341',fk:'#79c0ff',m2o:'#58a6ff',o2o:'#34d399',m2m:'#818cf8'};

    // ── Canvas ────────────────────────────────────────────────────────────────────
    var cv = document.getElementById('er-canvas');
    var dpr = window.devicePixelRatio||1;
    var ctx = cv.getContext('2d');

    function resize(h){
      if(h)cv.style.height = h + 'px';
      var r = cv.getBoundingClientRect();
      cv.width = Math.round(r.width*dpr);
      cv.height = Math.round(r.height*dpr);
    }

    // ── Nodes & adjacency ─────────────────────────────────────────────────────────
    var nodes = D.entities.map(function(e){
      return{e:e,x:0,y:0,w:NW,h:HH+e.fields.length*FH+6};
    });

    var nIdx={};D.entities.forEach(function(e,i){nIdx[e.name]=i;});

    var adj=nodes.map(function(){return[];}); // forward
    var radj=nodes.map(function(){return[];}); // reverse

    D.relations.forEach(function(r){
      if(r.type==='many2many'&&r.through&&nIdx[r.through]!=null){
        var s=nIdx[r.source],p=nIdx[r.through],t=nIdx[r.target];
        if(s!=null&&p!=null&&s!==p){adj[s].push(p);radj[p].push(s);}
        if(t!=null&&p!=null&&t!==p){adj[t].push(p);radj[p].push(t);}
      }else{
        var s=nIdx[r.source],t=nIdx[r.target];
        if(s==null||t==null||s===t)return;
        adj[s].push(t);radj[t].push(s);
      }
    });

    // ── Layered layout (simplified Sugiyama) ──────────────────────────────────────
    var groups=[];

    function median(arr){
      if(!arr.length)return 0;
      var s=[].concat(arr).sort(function(a,b){return a-b;});
      return s[Math.floor(s.length/2)];
    }

    function computeLayout(W,H){
      var layer=nodes.map(function(){return 0;});
      var inDeg=nodes.map(function(){return 0;});
      adj.forEach(function(ts){ts.forEach(function(t){inDeg[t]++;});});
      var q=[],qi=0;
      for(var i=0;i<nodes.length;i++)if(inDeg[i]===0)q.push(i);
      if(!q.length)for(var i=0;i<nodes.length;i++)q.push(i);
      while(qi<q.length){
        var u=q[qi++];
        adj[u].forEach(function(v){if(layer[v]<=layer[u]){layer[v]=layer[u]+1;q.push(v);}});
      }
      var maxL=layer.reduce(function(m,l){return Math.max(m,l);},0);
      groups=[];
      for(var l=0;l<=maxL;l++)groups.push([]);
      for(var i=0;i<nodes.length;i++)groups[layer[i]].push(i);
      for(var l=1;l<=maxL;l++){
        var pp={};groups[l-1].forEach(function(i,p){pp[i]=p;});
        groups[l].sort(function(a,b){
          return median(radj[a].map(function(x){return pp[x]!=null?pp[x]:0;}))-
                median(radj[b].map(function(x){return pp[x]!=null?pp[x]:0;}));
        });
      }
      for(var l=maxL-1;l>=0;l--){
        var np={};groups[l+1].forEach(function(i,p){np[i]=p;});
        groups[l].sort(function(a,b){
          return median(adj[a].map(function(x){return np[x]!=null?np[x]:0;}))-
                median(adj[b].map(function(x){return np[x]!=null?np[x]:0;}));
        });
      }
      var colW=NW+COL_GAP;
      var totalW=(maxL+1)*colW-COL_GAP;
      var startX=Math.max(20,(W-totalW)/2);
      for(var l=0;l<=maxL;l++){
        var g=groups[l];
        var totalH=g.reduce(function(s,i){return s+nodes[i].h;},0)+(g.length-1)*ROW_GAP;
        var y=Math.max(20,(H-totalH)/2);
        g.forEach(function(i){nodes[i].x=startX+l*colW;nodes[i].y=y;y+=nodes[i].h+ROW_GAP;});
      }
    }

    function requiredH(){
      return Math.max(340,Math.min(720,groups.reduce(function(m,g){
        return Math.max(m,g.reduce(function(s,i){return s+nodes[i].h;},0)+(g.length-1)*ROW_GAP+LGH+70);
      },300)));
    }

    // ── View ──────────────────────────────────────────────────────────────────────
    var pan={x:0,y:0},zm=1;
    var origPos=[];

    function savePos(){origPos=nodes.map(function(n){return{x:n.x,y:n.y};});}

    function fitView(W,H){
      var x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
      nodes.forEach(function(n){x0=Math.min(x0,n.x);y0=Math.min(y0,n.y);x1=Math.max(x1,n.x+n.w);y1=Math.max(y1,n.y+n.h);});
      var pad=28,gW=x1-x0+pad*2,gH=y1-y0+pad*2;
      zm=Math.min(W/gW,(H-LGH)/gH,1);
      pan.x=(W-gW*zm)/2+pad*zm-x0*zm;
      pan.y=((H-LGH)-gH*zm)/2+pad*zm-y0*zm;
    }

    // ── Rendering ─────────────────────────────────────────────────────────────────
    function rr(x,y,w,h,r){
      if(ctx.roundRect){ctx.beginPath();ctx.roundRect(x,y,w,h,r);return;}
      ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);
      ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();
    }

    function edgePt(n,tx,ty){
      var cx=n.x+n.w/2,cy=n.y+n.h/2,dx=tx-cx,dy=ty-cy;
      if(!dx&&!dy)return{x:cx,y:cy};
      var s=Math.min((n.w/2)/Math.abs(dx||.001),(n.h/2)/Math.abs(dy||.001));
      return{x:cx+dx*s,y:cy+dy*s};
    }

    var badges=[];

    function pushBadge(x,y,ux,uy,many,col){
      badges.push({x:x,y:y,ux:ux,uy:uy,many:many,col:col});
    }

    // Badge: solid colored circle; crow's foot (many) or double-bar (one) in dark ink inside.
    // ux,uy points outward from the node — badge is offset BO px into the gap.
    // Crow's foot tines open toward the node (-x in rotated frame), tip toward line (+x).
    function drawBadge(b){
      var bx=b.x+b.ux*BO,by=b.y+b.uy*BO;
      ctx.fillStyle=b.col;ctx.strokeStyle=b.col;ctx.lineWidth=1;
      ctx.beginPath();ctx.arc(bx,by,BR,0,Math.PI*2);ctx.fill();ctx.stroke();
      ctx.save();ctx.translate(bx,by);ctx.rotate(Math.atan2(b.uy,b.ux));
      ctx.strokeStyle=C.bg;ctx.lineWidth=1.4;ctx.lineCap='round';
      ctx.beginPath();
      if(b.many){
        ctx.moveTo(-5,-4);ctx.lineTo(5,0);  // upper tine → tip
        ctx.moveTo(-5,4);ctx.lineTo(5,0);   // lower tine → tip
        ctx.moveTo(-5,0);ctx.lineTo(5,0);   // center line
        ctx.moveTo(-5,-4);ctx.lineTo(-5,4); // base bar (near node)
      }else{
        ctx.moveTo(-3,-5);ctx.lineTo(-3,5); // near bar
        ctx.moveTo(2,-5);ctx.lineTo(2,5);   // far bar
      }
      ctx.stroke();
      ctx.restore();
    }

    function ecol(t){return t==='one2one'?C.o2o:t==='many2many'?C.m2m:C.m2o;}

    // offset: pixels to shift perpendicular to the edge direction (for parallel edges)
    function drawEdgeLine(a,b,col,dashed,label,manyA,manyB,off){
      var p1=edgePt(a,b.x+b.w/2,b.y+b.h/2);
      var p2=edgePt(b,a.x+a.w/2,a.y+a.h/2);
      var dx=p2.x-p1.x,dy=p2.y-p1.y,d=Math.sqrt(dx*dx+dy*dy)||1;
      var ux=dx/d,uy=dy/d;
      var px=-uy*off,py=ux*off; // perpendicular shift
      var q1x=p1.x+px,q1y=p1.y+py,q2x=p2.x+px,q2y=p2.y+py;
      ctx.strokeStyle=col+'55';ctx.lineWidth=1.5;
      ctx.setLineDash(dashed?[5,4]:[]);
      ctx.beginPath();ctx.moveTo(q1x,q1y);ctx.lineTo(q2x,q2y);ctx.stroke();
      ctx.setLineDash([]);
      pushBadge(q1x,q1y,ux,uy,manyA,col);
      pushBadge(q2x,q2y,-ux,-uy,manyB,col);
      if(label){
        var mx=(q1x+q2x)/2,my=(q1y+q2y)/2;
        ctx.fillStyle=C.mu;ctx.font='10px monospace';ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText(label,mx-uy*14,my+ux*14);
        ctx.textBaseline='alphabetic';
      }
    }

    // canonical key for a node pair regardless of direction
    function pairKey(a,b){
      var ai=nodes.indexOf(a),bi=nodes.indexOf(b);
      return ai<bi?ai+'-'+bi:bi+'-'+ai;
    }

    function collectEdges(){
      var edges=[];
      D.relations.forEach(function(r){
        var col=ecol(r.type);
        if(r.type==='many2many'&&r.through&&nIdx[r.through]!=null){
          var sn=nodes[nIdx[r.source]],pn=nodes[nIdx[r.through]],tn=nodes[nIdx[r.target]];
          if(sn&&pn)edges.push({a:sn,b:pn,col:col,dashed:true,label:r.foreignKey||'',manyA:false,manyB:true,off:0});
          if(tn&&pn)edges.push({a:tn,b:pn,col:col,dashed:true,label:r.otherKey||'',manyA:false,manyB:true,off:0});
        }else{
          var sn=nodes[nIdx[r.source]],tn=nodes[nIdx[r.target]];
          if(sn&&tn&&sn!==tn){
            var manyA=r.carInverse?r.carInverse.endsWith('n'):r.type!=='one2one';
            var manyB=r.carDirect?r.carDirect.endsWith('n'):r.type==='many2many';
            edges.push({a:sn,b:tn,col:col,dashed:false,label:r.label,manyA:manyA,manyB:manyB,off:0});
          }
        }
      });
      // assign perpendicular offsets to parallel edges (same node pair)
      var cnt={},idx={};
      edges.forEach(function(e){var k=pairKey(e.a,e.b);cnt[k]=(cnt[k]||0)+1;});
      edges.forEach(function(e){
        var k=pairKey(e.a,e.b),n=cnt[k];
        var i=idx[k]=(idx[k]||0);
        e.off=n>1?(i-(n-1)/2)*16:0;
        idx[k]++;
      });
      return edges;
    }

    function drawNode(n){
      var x=n.x,y=n.y,w=n.w,h=n.h,e=n.e;
      var bg=e.isPivot?C.pb:C.nb,hd=e.isPivot?C.ph:C.nh;
      ctx.save();ctx.shadowColor='rgba(0,0,0,0.45)';ctx.shadowBlur=14;ctx.shadowOffsetY=4;
      ctx.fillStyle=bg;rr(x,y,w,h,7);ctx.fill();ctx.restore();
      ctx.fillStyle=bg;rr(x,y,w,h,7);ctx.fill();
      ctx.strokeStyle=n===drag?C.bs:C.bo;ctx.lineWidth=1.2;rr(x,y,w,h,7);ctx.stroke();
      ctx.fillStyle=hd;rr(x,y,w,HH,7);ctx.fill();ctx.fillRect(x,y+HH-7,w,7);
      ctx.strokeStyle=C.bo;ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(x,y+HH);ctx.lineTo(x+w,y+HH);ctx.stroke();
      ctx.fillStyle=e.isPivot?C.mu:C.tx;
      ctx.font='600 12px -apple-system,BlinkMacSystemFont,sans-serif';
      ctx.textAlign='left';ctx.textBaseline='middle';
      ctx.fillText(e.name,x+FP,y+HH/2);
      if(e.isPivot){
        ctx.fillStyle='#3d444d';ctx.font='9px monospace';ctx.textAlign='right';
        ctx.fillText('pivot',x+w-FP,y+HH/2);
      }
      e.fields.forEach(function(f,fi){
        var fy=y+HH+fi*FH+FH/2+3;
        ctx.fillStyle=C.mu;ctx.font='10px monospace';ctx.textAlign='right';ctx.textBaseline='middle';
        ctx.fillText(f.type,x+w-FP-(f.required&&!f.pk?14:0),fy);
        if(f.pk||f.fk){
          var tag=f.pk?'PK':'FK',tc=f.pk?C.pk:C.fk;
          ctx.fillStyle=tc+'22';ctx.strokeStyle=tc+'66';ctx.lineWidth=1;
          rr(x+FP,fy-6,12,12,2);ctx.fill();ctx.stroke();
          ctx.fillStyle=tc;ctx.font='7px monospace';ctx.textAlign='center';
          ctx.fillText(tag,x+FP+6,fy+0.5);
        }
        ctx.fillStyle=f.pk?C.pk:f.fk?C.fk:C.tx;
        ctx.font=(f.required&&!f.pk?'600 ':'')+'11px monospace';
        ctx.textAlign='left';ctx.textBaseline='middle';
        ctx.fillText(f.name,x+FP+(f.pk||f.fk?16:0),fy);
        if(f.required&&!f.pk){
          ctx.fillStyle='#f85149';ctx.beginPath();
          ctx.arc(x+w-FP-6,fy,2.5,0,Math.PI*2);ctx.fill();
        }
      });
      ctx.textBaseline='alphabetic';
    }

    function drawLegend(){
      var cvW=cv.width/dpr,cvH=cv.height/dpr;
      var y0=cvH-LGH,y1=cvH-LGH+18,y2=cvH-LGH+38;

      ctx.fillStyle='#161b22';
      ctx.fillRect(0,y0,cvW,LGH);
      ctx.strokeStyle='#30363d';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(0,y0);ctx.lineTo(cvW,y0);ctx.stroke();

      // Row 1: relation line types
      var types=[
        {c:C.m2o,l:'many2one',d:false},
        {c:C.o2o,l:'one2one',d:false},
        {c:C.m2m,l:'many2many',d:true}
      ];
      ctx.textAlign='left';ctx.textBaseline='middle';ctx.font='10px monospace';
      var x=14;
      types.forEach(function(it){
        ctx.strokeStyle=it.c;ctx.lineWidth=1.5;ctx.setLineDash(it.d?[4,3]:[]);
        ctx.beginPath();ctx.moveTo(x,y1);ctx.lineTo(x+14,y1);ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle=C.mu;
        ctx.fillText(it.l,x+18,y1);
        x+=18+ctx.measureText(it.l).width+22;
      });

      // Row 2: cardinality symbols
      function badge2(cx,cy,many,col){
        ctx.fillStyle=col;ctx.strokeStyle=col;ctx.lineWidth=1;
        ctx.beginPath();ctx.arc(cx,cy,6,0,Math.PI*2);ctx.fill();
        ctx.save();ctx.translate(cx,cy);
        ctx.strokeStyle=C.bg;ctx.lineWidth=1.2;ctx.lineCap='round';
        ctx.beginPath();
        if(many){
          ctx.moveTo(-4,-3);ctx.lineTo(4,0);ctx.moveTo(-4,3);ctx.lineTo(4,0);
          ctx.moveTo(-4,0);ctx.lineTo(4,0);ctx.moveTo(-4,-3);ctx.lineTo(-4,3);
        }else{
          ctx.moveTo(-2,-3);ctx.lineTo(-2,3);ctx.moveTo(2,-3);ctx.lineTo(2,3);
        }
        ctx.stroke();ctx.restore();
      }

      ctx.font='10px monospace';ctx.textAlign='left';ctx.textBaseline='middle';
      x=14;
      var pairs=[
        {a:false,b:true,col:C.m2o,l:'many2one (N:1)'},
        {a:false,b:false,col:C.o2o,l:'one2one (1:1)'},
        {a:false,b:true,col:C.m2m,l:'pivot edge (1:N)'}
      ];
      pairs.forEach(function(p){
        ctx.strokeStyle=p.col+'55';ctx.lineWidth=1.2;ctx.setLineDash(p.col===C.m2m?[4,3]:[]);
        ctx.beginPath();ctx.moveTo(x+8,y2);ctx.lineTo(x+56,y2);ctx.stroke();
        ctx.setLineDash([]);
        badge2(x+8,y2,p.a,p.col);
        badge2(x+56,y2,p.b,p.col);
        ctx.fillStyle=C.mu;ctx.font='10px monospace';ctx.textAlign='left';ctx.textBaseline='middle';
        ctx.fillText(p.l,x+66,y2);
        x+=66+ctx.measureText(p.l).width+24;
      });

      ctx.fillStyle='#3d444d';ctx.font='10px monospace';ctx.textAlign='right';ctx.textBaseline='middle';
      ctx.fillText('drag  ·  scroll to zoom  ·  dbl-click to reset',cvW-14,y2);
      ctx.textBaseline='alphabetic';
    }

    function draw(){
      var W=cv.width/dpr,H=cv.height/dpr;
      ctx.setTransform(dpr,0,0,dpr,0,0);
      ctx.clearRect(0,0,W,H);
      ctx.fillStyle=C.bg;ctx.fillRect(0,0,W,H);
      ctx.save();ctx.translate(pan.x,pan.y);ctx.scale(zm,zm);
      badges=[];
      var edges=collectEdges();
      edges.forEach(function(e){drawEdgeLine(e.a,e.b,e.col,e.dashed,e.label,e.manyA,e.manyB,e.off);});
      nodes.forEach(function(n){drawNode(n);});
      badges.forEach(function(b){drawBadge(b);});
      ctx.restore();
      drawLegend();
    }

    // ── Interaction ───────────────────────────────────────────────────────────────
    var drag=null,dox=0,doy=0,isPan=false,ps={x:0,y:0};

    function toW(mx,my){return{x:(mx-pan.x)/zm,y:(my-pan.y)/zm};}
    function hitTest(wx,wy){
      for(var i=nodes.length-1;i>=0;i--){var n=nodes[i];if(wx>=n.x&&wx<=n.x+n.w&&wy>=n.y&&wy<=n.y+n.h)return n;}
      return null;
    }

    cv.addEventListener('mousedown',function(ev){
      var r=cv.getBoundingClientRect(),mx=ev.clientX-r.left,my=ev.clientY-r.top;
      var w=toW(mx,my),h=hitTest(w.x,w.y);
      if(h){drag=h;dox=w.x-h.x;doy=w.y-h.y;}else{isPan=true;ps={x:mx-pan.x,y:my-pan.y};}
      cv.style.cursor='grabbing';
    });
    window.addEventListener('mousemove',function(ev){
      if(!drag&&!isPan)return;
      var r=cv.getBoundingClientRect(),mx=ev.clientX-r.left,my=ev.clientY-r.top;
      if(drag){var w=toW(mx,my);drag.x=w.x-dox;drag.y=w.y-doy;}
      else{pan.x=mx-ps.x;pan.y=my-ps.y;}
      draw();
    });
    window.addEventListener('mouseup',function(){drag=null;isPan=false;cv.style.cursor='grab';});
    cv.addEventListener('wheel',function(ev){
      ev.preventDefault();
      var r=cv.getBoundingClientRect(),mx=ev.clientX-r.left,my=ev.clientY-r.top;
      var d=ev.deltaY<0?1.1:0.91,nz=Math.max(0.25,Math.min(3,zm*d));
      pan.x=mx-(mx-pan.x)*(nz/zm);pan.y=my-(my-pan.y)*(nz/zm);zm=nz;draw();
    },{passive:false});
    cv.addEventListener('dblclick',function(){
      nodes.forEach(function(n,i){n.x=origPos[i].x;n.y=origPos[i].y;});
      var r=cv.getBoundingClientRect();fitView(r.width,r.height);draw();
    });
    window.addEventListener('resize',function(){
      resize();var r=cv.getBoundingClientRect();
      computeLayout(r.width,r.height);savePos();fitView(r.width,r.height);draw();
    });

    document.getElementById('er-dl').addEventListener('click',function(){
      var SCALE=3;
      var cw=cv.width/dpr,ch=cv.height/dpr;
      var oc=document.createElement('canvas');
      oc.width=Math.round(cw*SCALE);oc.height=Math.round(ch*SCALE);
      var sav={cv:cv,ctx:ctx,dpr:dpr};
      cv=oc;ctx=oc.getContext('2d');dpr=SCALE;
      draw();
      cv=sav.cv;ctx=sav.ctx;dpr=sav.dpr;
      var a=document.createElement('a');
      a.download='er-diagram.png';a.href=oc.toDataURL('image/png');a.click();
    });

    // ── Init ──────────────────────────────────────────────────────────────────────
    requestAnimationFrame(function(){
      resize();
      var r=cv.getBoundingClientRect();
      computeLayout(r.width,r.height);
      var h=requiredH();
      resize(h);r=cv.getBoundingClientRect();
      computeLayout(r.width,r.height);
      savePos();fitView(r.width,r.height);draw();
    });
    })();
      `
  }</script>`;
}
